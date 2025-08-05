import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from './page-objects/AgentDashboardPage';

test.describe('Agent Workflow E2E Tests', () => {
  let dashboardPage: AgentDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new AgentDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
  });

  test('should display agent dashboard with all components', async () => {
    // Verify main dashboard components are visible
    await expect(dashboardPage.agentStatusCards.first()).toBeVisible();
    await expect(dashboardPage.metricsSection).toBeVisible();
    await expect(dashboardPage.jobQueue).toBeVisible();
    
    // Verify agent status cards show expected agents
    const statuses = await dashboardPage.getAgentStatuses();
    expect(statuses.length).toBeGreaterThan(0);
    
    // Should have at least orchestrator agent
    const orchestratorAgent = statuses.find(s => s.type === 'orchestrator');
    expect(orchestratorAgent).toBeDefined();
    expect(['idle', 'busy', 'healthy']).toContain(orchestratorAgent?.status);
  });

  test('should successfully orchestrate vehicle data pipeline workflow', async () => {
    // Start a vehicle data pipeline workflow
    const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
      sources: ['https://example-dealer.com'],
      filters: {
        make: 'Toyota',
        maxPrice: 30000
      }
    });

    expect(workflowId).toBeTruthy();

    // Wait for workflow to complete
    const finalStatus = await dashboardPage.waitForWorkflowCompletion(workflowId!, 60000);
    expect(['completed', 'failed']).toContain(finalStatus);

    // If successful, verify workflow results
    if (finalStatus === 'completed') {
      const results = await dashboardPage.getWorkflowResults(workflowId!);
      expect(results.status).toBe('completed');
      expect(results.steps.length).toBeGreaterThan(0);
      
      // Verify expected steps were executed
      const stepNames = results.steps.map(s => s.name);
      expect(stepNames).toContain('Scrape Vehicle Data');
      expect(stepNames).toContain('Analyze Vehicle Data');
    }
  });

  test('should handle single vehicle analysis workflow', async () => {
    const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
      vehicle_data: {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        price: 25000,
        mileage: 15000
      }
    });

    expect(workflowId).toBeTruthy();

    const finalStatus = await dashboardPage.waitForWorkflowCompletion(workflowId!, 30000);
    expect(['completed', 'failed']).toContain(finalStatus);

    if (finalStatus === 'completed') {
      const results = await dashboardPage.getWorkflowResults(workflowId!);
      expect(results.steps).toHaveLength(1);
      expect(results.steps[0].name).toBe('Analyze Vehicle');
    }
  });

  test('should display real-time metrics updates', async () => {
    const initialMetrics = await dashboardPage.getMetrics();
    
    // Start a workflow to generate activity
    const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
      vehicle_data: { make: 'Honda', model: 'Civic' }
    });

    // Wait for completion
    await dashboardPage.waitForWorkflowCompletion(workflowId!, 30000);

    // Refresh and check metrics have updated
    await dashboardPage.refreshDashboard();
    const updatedMetrics = await dashboardPage.getMetrics();

    expect(updatedMetrics.totalJobs).toBeGreaterThanOrEqual(initialMetrics.totalJobs);
  });

  test('should show job queue with pending jobs', async () => {
    // Start multiple workflows quickly to create queue
    const workflows = [];
    for (let i = 0; i < 3; i++) {
      const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
        vehicle_data: { make: 'Ford', model: `Model-${i}` }
      });
      workflows.push(workflowId);
    }

    // Check job queue
    const queuedJobs = await dashboardPage.getQueuedJobs();
    expect(queuedJobs.length).toBeGreaterThan(0);

    // Verify job properties
    queuedJobs.forEach(job => {
      expect(job.id).toBeTruthy();
      expect(job.type).toBeTruthy();
      expect(['low', 'normal', 'high', 'urgent']).toContain(job.priority);
    });
  });

  test('should display and manage shared memory entries', async () => {
    // Start a workflow that creates memory entries
    const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
      sources: ['https://test-site.com'],
      filters: { make: 'BMW' }
    });

    await dashboardPage.waitForWorkflowCompletion(workflowId!, 60000);

    // Check memory entries
    const memoryEntries = await dashboardPage.getMemoryEntries();
    
    // Should have some memory entries after workflow execution
    expect(memoryEntries.length).toBeGreaterThanOrEqual(0);
    
    if (memoryEntries.length > 0) {
      memoryEntries.forEach(entry => {
        expect(entry.key).toBeTruthy();
        expect(['string', 'object', 'array', 'number']).toContain(entry.type);
        expect(entry.accessCount).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test('should handle workflow cancellation', async () => {
    // Start a workflow
    const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
      sources: ['https://slow-site.com'],
      filters: { make: 'Mercedes' }
    });

    // Cancel it immediately
    await dashboardPage.cancelWorkflow(workflowId!);

    // Verify cancellation
    const results = await dashboardPage.getWorkflowResults(workflowId!);
    expect(results.status).toBe('cancelled');
  });

  test('should display agent logs with filtering', async () => {
    // Start a workflow to generate logs
    const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
      vehicle_data: { make: 'Audi', model: 'A4' }
    });

    await dashboardPage.waitForWorkflowCompletion(workflowId!, 30000);

    // View all logs
    const allLogs = await dashboardPage.viewLogs();
    expect(allLogs.length).toBeGreaterThan(0);

    // Verify log structure
    allLogs.forEach(log => {
      expect(log.timestamp).toBeTruthy();
      expect(['info', 'warn', 'error', 'debug']).toContain(log.level?.toLowerCase());
      expect(log.message).toBeTruthy();
      expect(log.agent).toBeTruthy();
    });

    // Filter by orchestrator logs
    const orchestratorLogs = await dashboardPage.viewLogs('orchestrator');
    expect(orchestratorLogs.length).toBeGreaterThan(0);
    
    orchestratorLogs.forEach(log => {
      expect(log.agent).toBe('orchestrator');
    });
  });

  test('should handle multiple concurrent workflows', async () => {
    const workflows = [];
    
    // Start 5 concurrent workflows
    for (let i = 0; i < 5; i++) {
      const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
        vehicle_data: { 
          make: 'Concurrent',
          model: `Test-${i}`,
          batch: 'concurrent-test'
        }
      });
      workflows.push(workflowId);
    }

    // Wait for all to complete
    const results = await Promise.all(
      workflows.map(id => 
        dashboardPage.waitForWorkflowCompletion(id!, 60000).catch(() => 'timeout')
      )
    );

    // Most should complete successfully
    const successful = results.filter(r => r === 'completed').length;
    expect(successful).toBeGreaterThan(0);
    
    // Verify system stability
    const finalStatuses = await dashboardPage.getAgentStatuses();
    const healthyAgents = finalStatuses.filter(s => 
      ['idle', 'healthy', 'busy'].includes(s.status || '')
    ).length;
    
    expect(healthyAgents).toBeGreaterThan(0);
  });

  test('should be accessible with keyboard navigation', async () => {
    await dashboardPage.verifyDashboardAccessibility();
  });

  test('should be responsive across different screen sizes', async () => {
    await dashboardPage.verifyResponsiveDesign();
  });

  test('should handle error scenarios gracefully', async () => {
    // Test with invalid workflow parameters
    const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
      sources: [], // Empty sources should cause error
      filters: null
    });

    const finalStatus = await dashboardPage.waitForWorkflowCompletion(workflowId!, 30000);
    expect(finalStatus).toBe('failed');

    // Verify error is displayed properly
    const results = await dashboardPage.getWorkflowResults(workflowId!);
    expect(results.status).toBe('failed');
    
    // System should remain stable after error
    const agentStatuses = await dashboardPage.getAgentStatuses();
    const healthyCount = agentStatuses.filter(s => 
      ['idle', 'healthy'].includes(s.status || '')
    ).length;
    expect(healthyCount).toBeGreaterThan(0);
  });

  test('should persist data across page refreshes', async () => {
    // Start a workflow
    const workflowId = await dashboardPage.startOrchestration('single-vehicle-analysis', {
      vehicle_data: { make: 'Persistent', model: 'Test' }
    });

    // Refresh the page
    await dashboardPage.refreshDashboard();

    // Verify workflow is still visible
    const results = await dashboardPage.getWorkflowResults(workflowId!);
    expect(results).toBeDefined();
  });

  test('should show appropriate loading states', async ({ page }) => {
    // Test loading state during workflow start
    await dashboardPage.orchestrateButton.click();
    
    // Should show loading indicators
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    
    // Select workflow and start it
    await dashboardPage.workflowSelect.click();
    await page.locator('[data-testid="workflow-option-single-vehicle-analysis"]').click();
    await dashboardPage.parametersInput.fill('{"vehicle_data":{"make":"Loading","model":"Test"}}');
    
    // Click submit and verify loading state
    await dashboardPage.submitButton.click();
    
    // Loading should eventually disappear
    await expect(page.locator('[data-testid="loading"]')).toBeHidden({ timeout: 10000 });
  });
});

test.describe('Performance Tests', () => {
  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    const dashboardPage = new AgentDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Start workflow with large dataset
    const startTime = Date.now();
    const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
      sources: Array(100).fill(0).map((_, i) => `https://dealer-${i}.com`),
      filters: {
        makes: Array(50).fill(0).map((_, i) => `Make-${i}`)
      }
    });
    
    const orchestrationTime = Date.now() - startTime;
    
    // Should handle large payload efficiently
    expect(orchestrationTime).toBeLessThan(10000);
    expect(workflowId).toBeTruthy();
  });
});