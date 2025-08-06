import { AgentDashboard } from "@/components/agents/AgentDashboard"
import { ComponentErrorBoundary } from "@/components/ErrorBoundary"

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <ComponentErrorBoundary>
          <AgentDashboard />
        </ComponentErrorBoundary>
      </div>
    </div>
  )
}