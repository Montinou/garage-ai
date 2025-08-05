import { AgentDashboard } from "@/components/agents/AgentDashboard"

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <AgentDashboard />
      </div>
    </div>
  )
}