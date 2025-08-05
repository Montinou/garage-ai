import { Page, Locator, expect } from '@playwright/test';

export class AgentDashboardPage {
  readonly page: Page;
  readonly agentStatusCards: Locator;
  readonly orchestrateButton: Locator;
  readonly workflowSelect: Locator;
  readonly parametersInput: Locator;
  readonly submitButton: Locator;
  readonly workflowResults: Locator;
  readonly metricsSection: Locator;
  readonly jobQueue: Locator;
  readonly memoryViewer: Locator;
  readonly logsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentStatusCards = page.locator('[data-testid="agent-status-card"]');
    this.orchestrateButton = page.locator('[data-testid="orchestrate-button"]');
    this.workflowSelect = page.locator('[data-testid="workflow-select"]');
    this.parametersInput = page.locator('[data-testid="parameters-input"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.workflowResults = page.locator('[data-testid="workflow-results"]');
    this.metricsSection = page.locator('[data-testid="metrics-section"]');
    this.jobQueue = page.locator('[data-testid="job-queue"]');
    this.memoryViewer = page.locator('[data-testid="memory-viewer"]');
    this.logsSection = page.locator('[data-testid="logs-section"]');
  }

  async goto() {
    await this.page.goto('/agents');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad() {
    await expect(this.agentStatusCards.first()).toBeVisible({ timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async getAgentStatuses() {
    await this.waitForDashboardLoad();
    const cards = await this.agentStatusCards.all();
    const statuses = [];
    
    for (const card of cards) {
      const agentType = await card.locator('[data-testid="agent-type"]').textContent();
      const status = await card.locator('[data-testid="agent-status"]').textContent();
      const load = await card.locator('[data-testid="agent-load"]').textContent();
      
      statuses.push({
        type: agentType?.trim(),
        status: status?.trim(),
        load: load?.trim()
      });
    }
    
    return statuses;
  }

  async startOrchestration(workflow: string, parameters: Record<string, any>) {
    await this.orchestrateButton.click();
    
    // Wait for orchestration modal
    await this.page.waitForSelector('[data-testid="orchestration-modal"]');
    
    // Select workflow
    await this.workflowSelect.click();
    await this.page.locator(`[data-testid="workflow-option-${workflow}"]`).click();
    
    // Enter parameters
    await this.parametersInput.fill(JSON.stringify(parameters));
    
    // Submit
    await this.submitButton.click();
    
    // Wait for submission confirmation
    await expect(this.page.locator('[data-testid="orchestration-success"]')).toBeVisible();
    
    // Get workflow ID from response
    const workflowId = await this.page.locator('[data-testid="workflow-id"]').textContent();
    return workflowId?.trim();
  }

  async waitForWorkflowCompletion(workflowId: string, timeout: number = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await this.page.reload();
      await this.waitForDashboardLoad();
      
      const workflowCard = this.page.locator(`[data-testid="workflow-${workflowId}"]`);
      
      if (await workflowCard.isVisible()) {
        const status = await workflowCard.locator('[data-testid="workflow-status"]').textContent();
        
        if (status === 'completed' || status === 'failed') {
          return status;
        }
      }
      
      await this.page.waitForTimeout(2000); // Poll every 2 seconds
    }
    
    throw new Error(`Workflow ${workflowId} did not complete within ${timeout}ms`);
  }

  async getWorkflowResults(workflowId: string) {
    const workflowCard = this.page.locator(`[data-testid="workflow-${workflowId}"]`);
    await expect(workflowCard).toBeVisible();
    
    const status = await workflowCard.locator('[data-testid="workflow-status"]').textContent();
    const steps = await workflowCard.locator('[data-testid="workflow-step"]').all();
    
    const stepResults = [];
    for (const step of steps) {
      const name = await step.locator('[data-testid="step-name"]').textContent();
      const stepStatus = await step.locator('[data-testid="step-status"]').textContent();
      stepResults.push({ name: name?.trim(), status: stepStatus?.trim() });
    }
    
    return {
      status: status?.trim(),
      steps: stepResults
    };
  }

  async getMetrics() {
    await expect(this.metricsSection).toBeVisible();
    
    const totalJobs = await this.metricsSection.locator('[data-testid="total-jobs"]').textContent();
    const successfulJobs = await this.metricsSection.locator('[data-testid="successful-jobs"]').textContent();
    const failedJobs = await this.metricsSection.locator('[data-testid="failed-jobs"]').textContent();
    const averageTime = await this.metricsSection.locator('[data-testid="average-time"]').textContent();
    
    return {
      totalJobs: parseInt(totalJobs?.trim() || '0'),
      successfulJobs: parseInt(successfulJobs?.trim() || '0'),
      failedJobs: parseInt(failedJobs?.trim() || '0'),
      averageTime: parseFloat(averageTime?.trim() || '0')
    };
  }

  async getQueuedJobs() {
    await expect(this.jobQueue).toBeVisible();
    
    const jobs = await this.jobQueue.locator('[data-testid="queued-job"]').all();
    const queuedJobs = [];
    
    for (const job of jobs) {
      const id = await job.locator('[data-testid="job-id"]').textContent();
      const type = await job.locator('[data-testid="job-type"]').textContent();
      const priority = await job.locator('[data-testid="job-priority"]').textContent();
      
      queuedJobs.push({
        id: id?.trim(),
        type: type?.trim(),
        priority: priority?.trim()
      });
    }
    
    return queuedJobs;
  }

  async getMemoryEntries() {
    await expect(this.memoryViewer).toBeVisible();
    
    const entries = await this.memoryViewer.locator('[data-testid="memory-entry"]').all();
    const memoryEntries = [];
    
    for (const entry of entries) {
      const key = await entry.locator('[data-testid="memory-key"]').textContent();
      const type = await entry.locator('[data-testid="memory-type"]').textContent();
      const accessCount = await entry.locator('[data-testid="access-count"]').textContent();
      
      memoryEntries.push({
        key: key?.trim(),
        type: type?.trim(),
        accessCount: parseInt(accessCount?.trim() || '0')
      });
    }
    
    return memoryEntries;
  }

  async refreshDashboard() {
    await this.page.reload();
    await this.waitForDashboardLoad();
  }

  async waitForAgentStatus(agentType: string, expectedStatus: string, timeout: number = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const statuses = await this.getAgentStatuses();
      const agent = statuses.find(s => s.type === agentType);
      
      if (agent && agent.status === expectedStatus) {
        return true;
      }
      
      await this.page.waitForTimeout(1000);
      await this.refreshDashboard();
    }
    
    throw new Error(`Agent ${agentType} did not reach status ${expectedStatus} within ${timeout}ms`);
  }

  async cancelWorkflow(workflowId: string) {
    const workflowCard = this.page.locator(`[data-testid="workflow-${workflowId}"]`);
    await expect(workflowCard).toBeVisible();
    
    await workflowCard.locator('[data-testid="cancel-workflow"]').click();
    
    // Confirm cancellation
    await this.page.locator('[data-testid="confirm-cancel"]').click();
    
    // Wait for cancellation confirmation
    await expect(this.page.locator('[data-testid="cancellation-success"]')).toBeVisible();
  }

  async viewLogs(agentType?: string) {
    await expect(this.logsSection).toBeVisible();
    
    if (agentType) {
      await this.logsSection.locator(`[data-testid="filter-${agentType}"]`).click();
    }
    
    const logEntries = await this.logsSection.locator('[data-testid="log-entry"]').all();
    const logs = [];
    
    for (const entry of logEntries) {
      const timestamp = await entry.locator('[data-testid="log-timestamp"]').textContent();
      const level = await entry.locator('[data-testid="log-level"]').textContent();
      const message = await entry.locator('[data-testid="log-message"]').textContent();
      const agent = await entry.locator('[data-testid="log-agent"]').textContent();
      
      logs.push({
        timestamp: timestamp?.trim(),
        level: level?.trim(),
        message: message?.trim(),
        agent: agent?.trim()
      });
    }
    
    return logs;
  }

  async verifyDashboardAccessibility() {
    // Check for proper ARIA labels and roles
    await expect(this.page.locator('[role="main"]')).toBeVisible();
    await expect(this.page.locator('[aria-label="Agent Dashboard"]')).toBeVisible();
    
    // Check keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Check for proper heading structure
    await expect(this.page.locator('h1')).toBeVisible();
    
    return true;
  }

  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.waitForDashboardLoad();
    await expect(this.agentStatusCards.first()).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.waitForDashboardLoad();
    await expect(this.agentStatusCards.first()).toBeVisible();
    
    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.waitForDashboardLoad();
    await expect(this.agentStatusCards.first()).toBeVisible();
    
    return true;
  }
}