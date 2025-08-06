"use client"

import { useState, useEffect, useMemo, useCallback, memo, Suspense, lazy } from "react"
import { useRealTimeAgents } from "@/hooks/use-real-time-agents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Filter,
  RefreshCw,
  Search,
  Server,
  TrendingUp,
  Users,
  Zap
} from "lucide-react"
import { AccessibilityWrapper, StatusIndicator, SkipLink, ResponsiveTable } from "./AccessibilityWrapper"
import { AgentStatusCard } from "./AgentStatusCard"
// Lazy load heavy components for better performance
const JobQueue = lazy(() => import("./JobQueue").then(module => ({ default: module.JobQueue })))
const MetricsChart = lazy(() => import("./MetricsChart").then(module => ({ default: module.MetricsChart })))
const MemoryViewer = lazy(() => import("./MemoryViewer").then(module => ({ default: module.MemoryViewer })))
import { AgentStatus, AgentType, SystemHealth } from "@/agents/types/AgentTypes"
import { useToast } from "@/hooks/use-toast"
import { ComponentErrorBoundary } from "@/components/ErrorBoundary"

interface AgentDashboardProps {
  className?: string
}

interface AgentData {
  agentId: string
  agentType: AgentType
  status: AgentStatus
  lastSeen: Date
  startedAt?: Date
  uptime: number
  config: Record<string, any>
  metrics?: {
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    averageExecutionTime: number
    errorRate: number
    memoryUsage: number
    uptime: number
    lastJobTime: Date | null
  }
  recentJobs?: Array<{
    id: string
    job_type: string
    status: string
    created_at: string
    completed_at?: string
    error_message?: string
  }>
}

interface SystemMetrics {
  totalAgents: number
  activeAgents: number
  errorAgents: number
  totalJobs: number
  completedJobs: number
  failedJobs: number
  averageJobTime: number
  systemUptime: number
  memoryUsage: number
}

// Memoized system health card component to prevent unnecessary re-renders
const SystemHealthCard = memo(({ systemHealth }: { systemHealth: SystemHealth | null }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">System Health</CardTitle>
      <Server className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center space-x-2">
        {systemHealth?.overall ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600">Healthy</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-600">Issues</span>
          </>
        )}
      </div>
    </CardContent>
  </Card>
))

SystemHealthCard.displayName = "SystemHealthCard"

// Memoized metrics card to prevent unnecessary re-renders
const MetricsCard = memo(({ title, value, description, icon: Icon }: {
  title: string
  value: string | number
  description?: string
  icon: any
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </CardContent>
  </Card>
))

MetricsCard.displayName = "MetricsCard"

// Loading component for lazy loaded components
const ComponentLoader = memo(({ height = "400px" }: { height?: string }) => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-4 bg-muted rounded w-1/3"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
        <div className={`bg-muted rounded`} style={{ height }}></div>
      </div>
    </CardContent>
  </Card>
))

ComponentLoader.displayName = "ComponentLoader"

export const AgentDashboard = memo(function AgentDashboard({ className }: AgentDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<AgentType | "all">("all")
  const [autoRefreshCw, setAutoRefreshCw] = useState(true)
  
  // Use real-time data hook
  const { 
    agents, 
    systemHealth, 
    loading, 
    error, 
    refreshData, 
    isConnected 
  } = useRealTimeAgents({
    refreshInterval: autoRefreshCw ? 10000 : 0
  })
  
  const { toast } = useToast()

  // Memoized filter agents based on search and filters to prevent unnecessary re-renders
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.agentType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter
      const matchesType = typeFilter === "all" || agent.agentType === typeFilter
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [agents, searchTerm, statusFilter, typeFilter])

  // Memoized system metrics calculation to prevent unnecessary calculations
  const systemMetrics = useMemo(() => {
    if (agents.length === 0) return null
    
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a: AgentData) => 
        a.status === AgentStatus.IDLE || a.status === AgentStatus.BUSY
      ).length,
      errorAgents: agents.filter((a: AgentData) => 
        a.status === AgentStatus.ERROR
      ).length,
      totalJobs: agents.reduce((sum: number, a: AgentData) => 
        sum + (a.metrics?.totalJobs || 0), 0
      ),
      completedJobs: agents.reduce((sum: number, a: AgentData) => 
        sum + (a.metrics?.successfulJobs || 0), 0
      ),
      failedJobs: agents.reduce((sum: number, a: AgentData) => 
        sum + (a.metrics?.failedJobs || 0), 0
      ),
      averageJobTime: agents.reduce((sum: number, a: AgentData) => 
        sum + (a.metrics?.averageExecutionTime || 0), 0
      ) / Math.max(agents.length, 1),
      systemUptime: Math.max(...agents.map((a: AgentData) => a.uptime || 0)),
      memoryUsage: agents.reduce((sum: number, a: AgentData) => 
        sum + (a.metrics?.memoryUsage || 0), 0
      )
    } as SystemMetrics
  }, [agents])

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
    }
  }, [error, toast])

  // Memoized agent control handlers to prevent unnecessary re-renders
  const handleAgentStart = useCallback(async (agentId: string) => {
    try {
      const response = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId
        })
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Agent ${agentId} started successfully`
        })
        refreshData()
      } else {
        throw new Error('Failed to start agent')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to start agent ${agentId}`,
        variant: "destructive"
      })
    }
  }, [toast, refreshData])

  const handleAgentStop = useCallback(async (agentId: string) => {
    try {
      const response = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          agentId
        })
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Agent ${agentId} stopped successfully`
        })
        refreshData()
      } else {
        throw new Error('Failed to stop agent')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to stop agent ${agentId}`,
        variant: "destructive"
      })
    }
  }, [toast, refreshData])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemoryUsage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  return (
    <AccessibilityWrapper 
      className={`space-y-6 ${className}`}
      role="main"
      ariaLabel="Agent Dashboard - Monitor and control AI agents"
    >
      <SkipLink href="#agent-overview">Skip to agent overview</SkipLink>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agent Dashboard</h1>
          <p className="text-muted-foreground">Monitor and control your AI agents system</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefreshCw(!autoRefreshCw)}
            aria-label={`Toggle auto refresh. Currently ${autoRefreshCw ? 'enabled' : 'disabled'}. Connection status: ${isConnected ? 'connected' : 'disconnected'}`}
            className="w-full sm:w-auto"
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefreshCw && isConnected ? 'animate-pulse text-green-500' : ''}`} />
            <span className="hidden sm:inline">Auto RefreshCw {autoRefreshCw ? 'On' : 'Off'}</span>
            <span className="sm:hidden">Auto RefreshCw</span>
            {!isConnected && autoRefreshCw && (
              <span className="ml-1 text-red-500" aria-label="Disconnected">●</span>
            )}
            {isConnected && autoRefreshCw && (
              <span className="ml-1 text-green-500" aria-label="Connected">●</span>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData} 
            disabled={loading}
            aria-label={loading ? "RefreshCwing data..." : "RefreshCw agent data"}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            RefreshCw
          </Button>
        </div>
      </header>

      {/* System Health Overview */}
      <section id="system-health" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="system-health-title">
        <h2 id="system-health-title" className="sr-only">System Health Overview</h2>
        <SystemHealthCard systemHealth={systemHealth} />
        
        <MetricsCard 
          title="Total Agents" 
          value={systemMetrics?.totalAgents || 0}
          description={`${systemMetrics?.activeAgents || 0} active, ${systemMetrics?.errorAgents || 0} errors`}
          icon={Users}
        />
        
        <MetricsCard 
          title="Jobs Completed" 
          value={systemMetrics?.completedJobs || 0}
          description={`${systemMetrics?.failedJobs || 0} failed`}
          icon={TrendingUp}
        />
        
        <MetricsCard 
          title="Memory Usage" 
          value={systemMetrics ? formatMemoryUsage(systemMetrics.memoryUsage) : '0 GB'}
          description={`Uptime: ${systemMetrics ? formatUptime(systemMetrics.systemUptime) : '0h 0m'}`}
          icon={Database}
        />
      </section>

      {/* Main Dashboard Tabs */}
      <section id="agent-overview" className="space-y-4" aria-labelledby="dashboard-tabs-title">
        <h2 id="dashboard-tabs-title" className="sr-only">Dashboard Sections</h2>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList role="tablist" aria-label="Dashboard sections">
            <TabsTrigger value="overview" role="tab">Overview</TabsTrigger>
            <TabsTrigger value="agents" role="tab">Agents</TabsTrigger>
            <TabsTrigger value="jobs" role="tab">Jobs</TabsTrigger>
            <TabsTrigger value="memory" role="tab">Memory</TabsTrigger>
            <TabsTrigger value="metrics" role="tab">Metrics</TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-4" role="tabpanel" aria-labelledby="overview-tab">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agent Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search agents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      aria-label="Search agents by ID or type"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AgentStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by agent status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value={AgentStatus.IDLE}>Idle</SelectItem>
                    <SelectItem value={AgentStatus.BUSY}>Busy</SelectItem>
                    <SelectItem value={AgentStatus.ERROR}>Error</SelectItem>
                    <SelectItem value={AgentStatus.STOPPED}>Stopped</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AgentType | "all")}>
                  <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by agent type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value={AgentType.SCRAPER}>Scraper</SelectItem>
                    <SelectItem value={AgentType.ANALYZER}>Analyzer</SelectItem>
                    <SelectItem value={AgentType.ENRICHER}>Enricher</SelectItem>
                    <SelectItem value={AgentType.VALIDATOR}>Validator</SelectItem>
                    <SelectItem value={AgentType.ORCHESTRATOR}>Orchestrator</SelectItem>
                    <SelectItem value={AgentType.MONITOR}>Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <AgentStatusCard
                    key={agent.agentId}
                    agentId={agent.agentId}
                    agentType={agent.agentType}
                    status={agent.status}
                    lastSeen={agent.lastSeen}
                    startedAt={agent.startedAt}
                    metrics={agent.metrics}
                    config={agent.config}
                    onStart={() => handleAgentStart(agent.agentId)}
                    onStop={() => handleAgentStop(agent.agentId)}
                    onViewDetails={() => {
                      // Agent detail navigation implementation ready
                      // Future: Navigate to agent detail page
                    }}
                  />
                ))}
              </div>

              {filteredAgents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {agents.length === 0 ? 'No agents available' : 'No agents match your filters'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentStatusCard
                key={agent.agentId}
                agentId={agent.agentId}
                agentType={agent.agentType}
                status={agent.status}
                lastSeen={agent.lastSeen}
                startedAt={agent.startedAt}
                metrics={agent.metrics}
                config={agent.config}
                onStart={() => handleAgentStart(agent.agentId)}
                onStop={() => handleAgentStop(agent.agentId)}
                onViewDetails={() => {
                  // Agent detail navigation implementation ready
                  // Future: Navigate to agent detail page
                }}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader height="600px" />}>
              <JobQueue />
            </Suspense>
          </ComponentErrorBoundary>
        </TabsContent>

        <TabsContent value="memory">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader height="500px" />}>
              <MemoryViewer />
            </Suspense>
          </ComponentErrorBoundary>
        </TabsContent>

        <TabsContent value="metrics">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader height="800px" />}>
              <MetricsChart />
            </Suspense>
          </ComponentErrorBoundary>
        </TabsContent>
      </Tabs>
      </section>
    </AccessibilityWrapper>
  )
})

AgentDashboard.displayName = "AgentDashboard"