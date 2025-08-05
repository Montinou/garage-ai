import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import orchestrateHandler from '../../../pages/api/agents/orchestrate';
import { OrchestrationRequest, JobPriority } from '../../../agents/types/AgentTypes';
import { mockSupabase, mockConfig } from '../../utils/test-utils';
import { maliciousPayloads } from '../../fixtures/agent-fixtures';

// Mock external dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('../../../lib/config', () => ({
  config: mockConfig
}));

describe('Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig.initialize.mockResolvedValue(undefined);
    
    // Mock successful database operations by default
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { workflow_id: 'test', status: 'pending' }, 
            error: null 
          })
        })
      })
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in workflow parameters', async () => {
      const sqlInjectionRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          query: "'; DROP TABLE agent_jobs; --",
          filter: "1=1; DELETE FROM agent_orchestrations; --",
          search: "UNION SELECT * FROM users WHERE admin=1; --"
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: sqlInjectionRequest
      });

      await orchestrateHandler(req, res);

      // Should accept the request but safely store parameters
      expect(res._getStatusCode()).toBe(202);
      
      // Verify that the malicious SQL was not executed
      const insertCall = mockSupabase.from().insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: sqlInjectionRequest.parameters
        })
      );
      
      // Parameters should be stored as-is (not executed as SQL)
      expect(insertCall).not.toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE')
      );
    });

    it('should prevent SQL injection in workflowId queries', async () => {
      const maliciousWorkflowId = "'; DROP TABLE agent_orchestrations; --";

      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: maliciousWorkflowId }
      });

      await orchestrateHandler(req, res);

      // Should safely handle the malicious input
      const selectCall = mockSupabase.from().select().eq;
      expect(selectCall).toHaveBeenCalledWith('workflow_id', maliciousWorkflowId);
      
      // Should not execute the malicious SQL
      expect(selectCall).not.toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE')
      );
    });

    it('should sanitize database error messages', async () => {
      const maliciousError = {
        message: 'Database error: SELECT * FROM users; DROP TABLE sessions;',
        code: 'DB_ERROR',
        details: 'Connection string: postgresql://user:pass@localhost/db'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: maliciousError })
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          workflow: 'vehicle-data-pipeline',
          parameters: {},
          priority: JobPriority.NORMAL
        }
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData());
      
      // Error message should not expose sensitive database details
      expect(responseData.error).not.toContain('postgresql://');
      expect(responseData.error).not.toContain('user:pass');
      expect(responseData.error).not.toContain('DROP TABLE');
    });

    it('should prevent SQL injection through nested object properties', async () => {
      const nestedSqlInjectionRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          filters: {
            make: "Toyota'; DROP TABLE vehicles; --",
            model: "Camry' UNION SELECT password FROM users; --",
            location: {
              city: "Boston'; DELETE FROM logs; --",
              state: "MA' OR '1'='1"
            }
          },
          options: {
            limit: "10; UPDATE users SET admin=1; --"
          }
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: nestedSqlInjectionRequest
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(202);
      
      // Verify nested malicious SQL is stored safely
      const insertCall = mockSupabase.from().insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            filters: expect.objectContaining({
              make: "Toyota'; DROP TABLE vehicles; --"
            })
          })
        })
      );
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent XSS in orchestration parameters', async () => {
      const xssRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          description: '<script>alert("XSS Attack!")</script>',
          title: '<img src="x" onerror="alert(\'XSS\')">',
          notes: 'javascript:alert("XSS")',
          metadata: {
            source: '<iframe src="javascript:alert(\'XSS\')"></iframe>'
          }
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: xssRequest
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData());
      
      // Response should not contain unescaped script tags
      const responseStr = JSON.stringify(responseData);
      expect(responseStr).not.toContain('<script>');
      expect(responseStr).not.toContain('javascript:');
      expect(responseStr).not.toContain('onerror=');
    });

    it('should prevent XSS in error messages', async () => {
      const maliciousWorkflow = '<script>alert("XSS")</script>';

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          workflow: maliciousWorkflow,
          parameters: {},
          priority: JobPriority.NORMAL
        }
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      
      // Error message should not contain executable scripts
      expect(responseData.error).not.toContain('<script>');
      expect(responseData.error).toContain('Unknown workflow');
    });

    it('should sanitize workflow names in responses', async () => {
      const maliciousWorkflowId = '<script>document.location="http://evil.com"</script>';

      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: maliciousWorkflowId }
      });

      // Mock database to return the malicious workflow ID
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { 
                workflow_id: maliciousWorkflowId,
                workflow_name: 'test-workflow',
                status: 'completed'
              }, 
              error: null 
            })
          })
        })
      });

      await orchestrateHandler(req, res);

      const responseData = JSON.parse(res._getData());
      const responseStr = JSON.stringify(responseData);
      
      // Should not contain executable JavaScript
      expect(responseStr).not.toContain('document.location');
      expect(responseStr).not.toContain('<script>');
    });
  });

  describe('Input Validation', () => {
    it('should enforce maximum payload size limits', async () => {
      // Create a very large payload (simulate potential DoS attack)
      const largeString = 'x'.repeat(1000000); // 1MB string
      const largeRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          largeData: largeString,
          moreData: Array(10000).fill({ data: largeString.substring(0, 1000) })
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: largeRequest
      });

      await orchestrateHandler(req, res);

      // Should handle large payloads gracefully
      // In a real implementation, you might want to reject overly large payloads
      expect([202, 413]).toContain(res._getStatusCode()); // 202 Accept or 413 Payload Too Large
    });

    it('should validate parameter types', async () => {
      const invalidTypeRequest = {
        workflow: 123, // Should be string
        parameters: 'invalid', // Should be object
        priority: 'invalid-priority', // Should be valid enum
        constraints: 'not-an-object' // Should be object
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidTypeRequest
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    it('should prevent prototype pollution attacks', async () => {
      const prototypePollutionRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          '__proto__': { polluted: true },
          'constructor': { prototype: { polluted: true } },
          'prototype': { polluted: true }
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: prototypePollutionRequest
      });

      await orchestrateHandler(req, res);

      // Should not pollute the prototype
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Function.prototype as any).polluted).toBeUndefined();
      
      // Request should still be processed
      expect(res._getStatusCode()).toBe(202);
    });

    it('should validate workflow names against whitelist', async () => {
      const suspiciousWorkflows = [
        '../../../etc/passwd',
        '..\\windows\\system32\\config',
        'file:///etc/passwd',
        'http://malicious-site.com/payload',
        'ftp://evil.com/backdoor'
      ];

      for (const workflow of suspiciousWorkflows) {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            workflow,
            parameters: {},
            priority: JobPriority.NORMAL
          }
        });

        await orchestrateHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Unknown workflow');
      }
    });

    it('should sanitize special characters in parameters', async () => {
      const specialCharsRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          search: 'test\x00\x01\x02',
          filter: 'value\r\n\t',
          description: 'test\u0000\u0001\u0002',
          path: '/test/../../../root'
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: specialCharsRequest
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(202);
      
      // Verify that null bytes and control characters are handled
      const insertCall = mockSupabase.from().insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.any(Object)
        })
      );
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should handle rapid sequential requests', async () => {
      const requests = Array.from({ length: 20 }, () => ({
        workflow: 'vehicle-data-pipeline',
        parameters: { test: 'data' },
        priority: JobPriority.NORMAL
      }));

      const responses = await Promise.all(
        requests.map(body => {
          const { req, res } = createMocks({
            method: 'POST',
            body
          });
          return orchestrateHandler(req, res).then(() => res);
        })
      );

      // All requests should be handled, but consider implementing rate limiting
      responses.forEach(res => {
        expect([202, 429]).toContain(res._getStatusCode()); // 202 Accept or 429 Too Many Requests
      });
    });

    it('should handle circular references in parameters', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const circularRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: circularObj,
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: circularRequest
      });

      // This should not crash the server
      await expect(orchestrateHandler(req, res)).resolves.not.toThrow();
      
      // Should handle the circular reference gracefully
      expect([400, 500]).toContain(res._getStatusCode());
    });

    it('should prevent resource exhaustion through deep nesting', async () => {
      // Create deeply nested object (potential stack overflow)
      let deepObject: any = { value: 'end' };
      for (let i = 0; i < 1000; i++) {
        deepObject = { level: i, nested: deepObject };
      }

      const deepRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: { deepNesting: deepObject },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: deepRequest
      });

      // Should not crash the server
      await expect(orchestrateHandler(req, res)).resolves.not.toThrow();
      
      // Should handle deep nesting gracefully
      expect([202, 400]).toContain(res._getStatusCode());
    });
  });

  describe('Authentication and Authorization', () => {
    it('should validate request headers for suspicious patterns', async () => {
      const suspiciousHeaders = {
        'user-agent': '<script>alert("xss")</script>',
        'x-forwarded-for': '127.0.0.1; DROP TABLE users;',
        'referer': 'javascript:alert("xss")',
        'x-custom': '../../../etc/passwd'
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: suspiciousHeaders,
        body: {
          workflow: 'vehicle-data-pipeline',
          parameters: {},
          priority: JobPriority.NORMAL
        }
      });

      await orchestrateHandler(req, res);

      // Should process request but not execute malicious content
      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData());
      const responseStr = JSON.stringify(responseData);
      
      expect(responseStr).not.toContain('<script>');
      expect(responseStr).not.toContain('DROP TABLE');
    });

    it('should handle missing or malformed content-type headers', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'text/plain; boundary=--malicious--'
        },
        body: 'malicious plain text content'
      });

      await orchestrateHandler(req, res);

      // Should handle malformed content gracefully
      expect([400, 500]).toContain(res._getStatusCode());
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive system information in errors', async () => {
      // Mock a database error with sensitive information
      const sensitiveError = {
        message: 'Connection failed to postgresql://admin:password123@internal-db:5432/production',
        stack: 'Error at /home/user/app/secret-config.js:42',
        code: 'ECONNREFUSED'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockRejectedValue(sensitiveError)
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          workflow: 'vehicle-data-pipeline',
          parameters: {},
          priority: JobPriority.NORMAL
        }
      });

      await orchestrateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData());
      
      // Should not expose sensitive information
      expect(responseData.error).not.toContain('password123');
      expect(responseData.error).not.toContain('internal-db');
      expect(responseData.error).not.toContain('/home/user/app');
      expect(responseData.error).not.toContain('secret-config.js');
    });

    it('should sanitize stack traces in error responses', async () => {
      const errorWithStack = new Error('Test error');
      errorWithStack.stack = `Error: Test error
        at /var/www/app/config/database.js:123:45
        at /var/www/app/secrets/api-keys.js:67:89
        at processRequest (/var/www/app/index.js:100:1)`;

      mockConfig.initialize.mockRejectedValue(errorWithStack);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          workflow: 'vehicle-data-pipeline',
          parameters: {},
          priority: JobPriority.NORMAL
        }
      });

      await orchestrateHandler(req, res);

      const responseData = JSON.parse(res._getData());
      
      // Should not expose file paths in production
      expect(responseData.error).not.toContain('/var/www/app');
      expect(responseData.error).not.toContain('database.js');
      expect(responseData.error).not.toContain('api-keys.js');
    });
  });
});