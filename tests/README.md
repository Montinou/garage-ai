# Testing Framework for Garage AI Agents System

This comprehensive testing framework provides thorough test coverage for the AI agents system, addressing critical gaps identified in the QA analysis.

## Overview

The testing framework includes:
- **Unit Tests**: Test individual components, agents, and utility functions
- **Integration Tests**: Test API endpoints and database operations
- **End-to-End Tests**: Test complete user workflows and system integration
- **Security Tests**: Test for SQL injection, XSS, and input validation vulnerabilities
- **Performance Tests**: Verify system performance and scalability

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── mocks/                      # Mock implementations
│   ├── server.ts               # MSW mock server setup
│   ├── supabase.ts            # Supabase API mocks
│   └── agent-api.ts           # Agent API endpoint mocks
├── fixtures/                   # Test data and fixtures
│   └── agent-fixtures.ts      # Agent-related test data
├── utils/                      # Test utilities and helpers
│   └── test-utils.tsx         # Custom render functions and helpers
├── unit/                       # Unit tests
│   ├── agents/                # Agent class tests
│   ├── api/                   # API endpoint tests
│   └── security/              # Security vulnerability tests
├── integration/               # Integration tests
│   └── database/              # Database integration tests
├── e2e/                       # End-to-end tests
│   ├── page-objects/          # Page object models
│   ├── global-setup.ts        # E2E test setup
│   ├── global-teardown.ts     # E2E test cleanup
│   └── *.test.ts              # E2E test files
└── README.md                  # This file
```

## Test Coverage Targets

- **Backend (Agents & APIs)**: 95% coverage for critical paths
- **Frontend Components**: 90% coverage
- **Security-Critical Endpoints**: 100% coverage
- **E2E Workflows**: Core user journeys covered

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables for testing:
```bash
cp .env.example .env.test
# Edit .env.test with test database credentials
```

### Unit & Integration Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### End-to-End Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npx playwright test --headed
```

## Test Categories

### 1. Unit Tests

#### Agent Tests (`tests/unit/agents/`)
- **BaseAgent.test.ts**: Tests core agent functionality including:
  - Agent initialization and configuration
  - Job processing and retry logic
  - Message handling and communication
  - Memory operations and health checks
  - Error handling and cleanup

- **OrchestratorAgent.test.ts**: Tests orchestration functionality:
  - Workflow execution and management
  - Agent discovery and load balancing
  - Step dependency resolution
  - Concurrent workflow handling

#### API Tests (`tests/unit/api/`)
- **orchestrate.test.ts**: Tests orchestration API endpoints:
  - POST /api/agents/orchestrate - Start workflows
  - GET /api/agents/orchestrate - Get workflow status  
  - DELETE /api/agents/orchestrate - Cancel workflows
  - Input validation and error handling

#### Security Tests (`tests/unit/security/`)
- **security.test.ts**: Comprehensive security testing:
  - SQL injection prevention
  - XSS attack prevention
  - Input validation and sanitization
  - Rate limiting and DoS prevention
  - Information disclosure prevention

### 2. Integration Tests

#### Database Integration
- Test Supabase operations
- Validate data integrity
- Test transaction handling
- Verify multi-tenant isolation

### 3. End-to-End Tests

#### Agent Workflow Tests (`tests/e2e/`)
- **agent-workflow.test.ts**: Complete workflow testing:
  - Dashboard functionality
  - Workflow orchestration
  - Real-time updates
  - Error handling
  - Accessibility and responsiveness

## Test Utilities

### Mock Server (MSW)
- Intercepts HTTP requests during testing
- Provides consistent API responses
- Simulates error conditions
- Located in `tests/mocks/server.ts`

### Test Fixtures
- Pre-defined test data for consistent tests
- Agent configurations, jobs, and results
- Located in `tests/fixtures/agent-fixtures.ts`

### Custom Test Utilities
- React testing utilities with providers
- Mock implementations for external services
- Helper functions for common test operations
- Located in `tests/utils/test-utils.tsx`

## Writing Tests

### Best Practices

1. **Test Structure**: Follow the AAA pattern (Arrange, Act, Assert)
2. **Isolation**: Each test should be independent and not rely on others
3. **Mocking**: Mock external dependencies appropriately
4. **Assertions**: Use specific, meaningful assertions
5. **Cleanup**: Ensure proper cleanup after each test

### Example Unit Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent } from '../../../agents/base/BaseAgent';
import { mockSupabase, mockConfig } from '../../utils/test-utils';

describe('BaseAgent', () => {
  let testAgent: TestAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    testAgent = new TestAgent();
  });

  it('should process job successfully', async () => {
    const job = createMockAgentJob();
    
    const result = await testAgent.processJob(job);
    
    expect(result.success).toBe(true);
    expect(result.agentId).toBe(testAgent.agentId);
  });
});
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from './page-objects/AgentDashboardPage';

test('should orchestrate workflow successfully', async ({ page }) => {
  const dashboardPage = new AgentDashboardPage(page);
  await dashboardPage.goto();
  
  const workflowId = await dashboardPage.startOrchestration('vehicle-data-pipeline', {
    sources: ['https://example.com']
  });
  
  const status = await dashboardPage.waitForWorkflowCompletion(workflowId);
  expect(status).toBe('completed');
});
```

## Security Testing

The security test suite covers:

### SQL Injection Prevention
- Tests malicious SQL in parameters
- Validates parameterized queries
- Checks nested object sanitization

### XSS Prevention
- Tests script tag injection
- Validates output escaping
- Checks error message sanitization

### Input Validation
- Enforces payload size limits
- Validates parameter types
- Prevents prototype pollution

### DoS Prevention
- Tests rate limiting
- Handles circular references
- Prevents resource exhaustion

## Performance Testing

Performance tests verify:
- Dashboard load times < 5 seconds
- Large dataset handling efficiency
- Concurrent workflow processing
- Memory usage optimization

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

### Coverage Reporting

Coverage reports are generated in multiple formats:
- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`
- LCOV: `coverage/lcov.info`

## Debugging Tests

### Unit Test Debugging
```bash
# Run single test file
npm run test -- BaseAgent.test.ts

# Run tests with verbose output
npm run test -- --reporter=verbose

# Debug with VS Code
# Set breakpoints and use "Debug Test" in test file
```

### E2E Test Debugging
```bash
# Run with browser visible
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Generate trace for failed tests
npx playwright test --trace=on
```

## Troubleshooting

### Common Issues

1. **Test timeouts**: Increase timeout values in test configuration
2. **Mock server issues**: Check MSW server setup in `tests/setup.ts`
3. **Database connection**: Verify test database credentials
4. **E2E test failures**: Check if development server is running

### Environment Variables

Required for testing:
```env
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

## Continuous Improvement

### Metrics to Monitor
- Test coverage percentages
- Test execution time
- Flaky test rates
- Security vulnerability detection

### Regular Maintenance
- Update test fixtures with new features
- Review and update mock implementations
- Maintain E2E test stability
- Update security test vectors

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Add appropriate fixtures** for new data types
3. **Update mocks** for new API endpoints
4. **Add E2E tests** for new user workflows
5. **Update documentation** as needed

### Test Naming Conventions
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Security tests: `*.security.test.ts`

This testing framework ensures the reliability, security, and performance of the AI agents system while providing comprehensive coverage of all critical functionality.