# AI Agents System Guide

This document provides a comprehensive guide to the AI agents system implemented in the garage-ai project.

## Overview

The AI agents system is a robust, scalable infrastructure for managing automated tasks such as vehicle data scraping, analysis, enrichment, and validation. It provides:

- **Distributed Agent Architecture**: Multiple specialized agents working together
- **Message-Based Communication**: Inter-agent communication via message bus
- **Persistent Memory**: Shared memory system for data caching and state management
- **Job Orchestration**: Workflow management and job scheduling
- **Health Monitoring**: System health checks and metrics collection
- **Error Handling**: Comprehensive error handling with retry mechanisms

## Architecture Components

### 1. Base Agent (`BaseAgent.ts`)
Abstract base class that all agents extend, providing:
- Job processing with retry logic and timeouts
- Error handling and logging
- Metrics collection
- Message handling
- Memory operations
- Health checks

### 2. Agent Types (`AgentTypes.ts`)
Comprehensive type definitions for:
- Agent configurations and states
- Job definitions and results
- Message formats
- Memory structures
- Orchestration workflows
- API responses

### 3. Message Bus (`MessageBus.ts`)
Inter-agent communication system featuring:
- Topic-based pub/sub messaging
- Message persistence in database
- Automatic message expiration
- Wildcard topic subscriptions
- Message processing with retries

### 4. Shared Memory (`SharedMemory.ts`)
Distributed memory system with:
- Local caching with LRU eviction
- Database persistence
- TTL-based expiration
- Tag-based querying
- Access statistics tracking

### 5. Configuration System (`config.ts`)
Environment and configuration management:
- Environment variable validation
- Edge Config integration
- Default configuration handling
- Runtime configuration updates

## Environment Variables

The system requires the following environment variables:

### Required Variables
```bash
# Vercel Services
BLOB_READ_WRITE_TOKEN=your_blob_token
EDGE_CONFIG=your_edge_config_id
VERCEL_OIDC_TOKEN=your_oidc_token

# AI Services
GOOGLE_AI_API_KEY=your_google_ai_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Application
NODE_ENV=development|production|test
NEXT_PUBLIC_APP_URL=your_app_url
```

## Database Schema

The system uses the following database tables:

### Core Tables
- `agent_jobs`: Job execution tracking
- `agent_memory`: Persistent agent memory
- `agent_metrics`: Performance metrics
- `agent_messages`: Inter-agent communication
- `agent_orchestrations`: Workflow execution

All tables include:
- UUID primary keys
- Timestamps for tracking
- JSON payloads for flexibility
- Proper indexing for performance
- Row Level Security (RLS) policies

## API Endpoints

### Orchestration API (`/api/agents/orchestrate`)
- `POST`: Start workflow execution
- `GET`: Get workflow status
- `DELETE`: Cancel workflow

### Status API (`/api/agents/status`)
- `GET`: Agent status and system health
- Query parameters: `type`, `agentId`, `health`

### Memory API (`/api/agents/memory`)
- `GET`: Query memory entries
- `POST`: Set memory entry
- `PUT`: Update memory entry
- `DELETE`: Delete memory entry

## Creating Custom Agents

### 1. Extend BaseAgent
```typescript
import { BaseAgent } from '../agents/base/BaseAgent';
import { AgentJob, AgentResult } from '../agents/types/AgentTypes';

export class MyCustomAgent extends BaseAgent {
  constructor() {
    super('my_custom_agent', {
      maxRetries: 3,
      timeout: 60000,
      enableLogging: true,
      enableMetrics: true
    });
  }

  async execute(job: AgentJob): Promise<AgentResult> {
    // Your agent logic here
    try {
      const result = await this.performWork(job.payload);
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        agentId: this.agentId
      };
    } catch (error) {
      throw error; // BaseAgent handles retries and error reporting
    }
  }

  private async performWork(payload: any): Promise<any> {
    // Implement your specific logic
    return { processed: true };
  }
}
```

### 2. Agent-Specific Initialization
```typescript
export class MyCustomAgent extends BaseAgent {
  protected async onInitialize(): Promise<void> {
    // Custom initialization logic
    await this.loadConfiguration();
    await this.setupExternalConnections();
  }
}
```

### 3. Using Agent Memory
```typescript
// Store data
await this.storeMemory('last_processed_item', itemId, 3600000); // 1 hour TTL

// Retrieve data
const lastItem = await this.getMemory('last_processed_item');
```

### 4. Sending Messages
```typescript
// Send to specific agent
await this.sendMessage('target_agent_id', { action: 'process', data: someData });

// Broadcast to all agents of a type
await this.broadcastToAgentType('scraper', { command: 'pause' });
```

## Workflow Orchestration

### Defining Workflows
```typescript
const workflowDefinition = {
  id: 'my-workflow',
  name: 'My Custom Workflow',
  steps: [
    {
      id: 'step1',
      name: 'First Step',
      type: 'agent',
      agentType: AgentType.SCRAPER,
      inputs: ['source_urls'],
      outputs: ['raw_data'],
      dependencies: [],
      optional: false
    },
    {
      id: 'step2',
      name: 'Second Step',
      type: 'agent',
      agentType: AgentType.ANALYZER,
      inputs: ['raw_data'],
      outputs: ['analyzed_data'],
      dependencies: ['step1'],
      optional: false
    }
  ],
  errorHandling: {
    retryStrategy: 'exponential',
    maxRetries: 3,
    continueOnError: false
  },
  timeout: 300000
};
```

### Starting Workflows
```typescript
const request: OrchestrationRequest = {
  workflow: 'my-workflow',
  parameters: {
    source_urls: ['https://example.com/vehicles']
  },
  priority: JobPriority.HIGH
};

// POST to /api/agents/orchestrate
```

## System Initialization

### Automatic Initialization
```typescript
import { initializeAgentSystem } from '../lib/agent-system';

const result = await initializeAgentSystem();
if (result.success) {
  console.log('Agent system ready');
} else {
  console.error('Initialization failed:', result.errors);
}
```

### Manual Configuration
```typescript
import { config } from '../lib/config';

await config.initialize();
config.updateAgentConfig({
  maxConcurrentJobs: 20,
  defaultJobTimeout: 600000 // 10 minutes
});
```

## Monitoring and Health Checks

### System Status
```typescript
import { getSystemStatus } from '../lib/agent-system';

const status = await getSystemStatus();
console.log('System health:', status.status);
console.log('Active agents:', status.activeAgents);
console.log('Job statistics:', {
  total: status.totalJobs,
  completed: status.completedJobs,
  failed: status.failedJobs,
  pending: status.pendingJobs
});
```

### Agent Health Checks
```typescript
const agent = new MyCustomAgent();
const health = await agent.healthCheck();
console.log('Agent healthy:', health.healthy);
```

## Error Handling and Logging

### Structured Logging
```typescript
// In your agent
this.log('Processing started', { jobId: job.id, itemCount: items.length });
this.logError('Processing failed', error);
```

### Error Recovery
The system automatically handles:
- **Retries**: Exponential backoff with jitter
- **Timeouts**: Configurable per job
- **Circuit Breaking**: Agents return to idle after failures
- **Dead Letter**: Failed jobs are preserved for analysis

## Performance Optimization

### Memory Management
- Configure cache sizes appropriately
- Use TTL for temporary data
- Regular cleanup of expired entries

### Database Optimization
- Proper indexing on query columns
- Connection pooling
- Batch operations where possible

### Concurrency Control
- Set appropriate `maxConcurrentJobs`
- Use job priorities effectively
- Monitor system resources

## Testing

### Unit Testing
```typescript
import { runTests } from '../scripts/test-agent-system';

await runTests(); // Comprehensive system tests
```

### Integration Testing
- Test agent communication
- Verify database operations
- Validate workflow execution

## Deployment Considerations

### Environment Setup
1. Deploy database schema
2. Configure environment variables
3. Set up Edge Config (optional)
4. Initialize system on startup

### Scaling
- Horizontal scaling via multiple instances
- Database read replicas for high read loads
- Message queue for job distribution

### Monitoring
- System health endpoints
- Metrics collection
- Alert configuration

## Troubleshooting

### Common Issues
1. **Configuration Errors**: Check environment variables
2. **Database Connection**: Verify Supabase credentials
3. **Agent Initialization**: Check logs for specific errors
4. **Job Failures**: Review error messages and retry counts

### Debug Mode
```typescript
const agent = new MyAgent({
  enableLogging: true,
  enableMetrics: true
});
```

### System Diagnostics
```bash
# Check system health
curl -X GET /api/agents/status?health=true

# View agent metrics
curl -X GET /api/agents/status

# Check memory usage
curl -X GET /api/agents/memory?stats=true
```

## Best Practices

1. **Agent Design**: Keep agents focused on single responsibilities
2. **Error Handling**: Always handle errors gracefully
3. **Resource Management**: Clean up resources in agent cleanup methods
4. **Logging**: Use structured logging with appropriate detail levels
5. **Testing**: Write comprehensive tests for agent logic
6. **Monitoring**: Set up health checks and metrics collection
7. **Documentation**: Document agent behavior and configuration options

This system provides a robust foundation for building scalable, maintainable AI agents that can handle complex workflows in production environments.