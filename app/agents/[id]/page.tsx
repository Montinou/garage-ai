"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft,
  Activity,
  Clock,
  Database,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
  Eye
} from "lucide-react"
import { AgentStatus, AgentType, JobStatus } from "@/agents/types/AgentTypes"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { MetricsChart } from "@/components/agents/MetricsChart"

interface AgentDetailData {
  agentId: string
  agentType: AgentType
  status: AgentStatus
  lastSeen: Date
  startedAt: Date
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
  recentJobs: Array<{
    id: string
    job_type: string
    status: JobStatus
    created_at: Date
    started_at?: Date
    completed_at?: Date
    error_message?: string
    payload?: any
    result?: any
  }>
}

const statusConfig = {
  [AgentStatus.IDLE]: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    badgeVariant: "secondary" as const,
    label: "Idle"
  },
  [AgentStatus.STARTING]: {
    icon: Play,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    badgeVariant: "secondary" as const,
    label: "Starting"
  },
  [AgentStatus.RUNNING]: {
    icon: Activity,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    badgeVariant: "default" as const,
    label: "Running"
  },
  [AgentStatus.BUSY]: {
    icon: Activity,
    color: "bg-blue-500",
    textColor: "text-blue-600", 
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    badgeVariant: "secondary" as const,
    label: "Busy"
  },
  [AgentStatus.STOPPING]: {
    icon: Square,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    badgeVariant: "outline" as const,
    label: "Stopping"
  },
  [AgentStatus.STOPPED]: {
    icon: Square,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    badgeVariant: "outline" as const,
    label: "Stopped"
  },
  [AgentStatus.ERROR]: {
    icon: AlertCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20", 
    badgeVariant: "destructive" as const,
    label: "Error"
  },
  [AgentStatus.PAUSED]: {
    icon: RotateCcw,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    badgeVariant: "outline" as const,
    label: "Paused"
  },
  [AgentStatus.INITIALIZING]: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    badgeVariant: "secondary" as const,
    label: "Initializing"
  }
}

const jobStatusConfig = {
  [JobStatus.PENDING]: { label: "Pending", variant: "secondary" as const },
  [JobStatus.RUNNING]: { label: "Running", variant: "default" as const },
  [JobStatus.COMPLETED]: { label: "Completed", variant: "default" as const },
  [JobStatus.FAILED]: { label: "Failed", variant: "destructive" as const },
  [JobStatus.CANCELLED]: { label: "Cancelled", variant: "outline" as const },
  [JobStatus.RETRYING]: { label: "Retrying", variant: "secondary" as const }
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const [agent, setAgent] = useState<AgentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch agent details
  const fetchAgentDetails = async () => {
    try {
      const response = await fetch(`/api/agents/status?agentId=${agentId}`)
      const data = await response.json()
      
      if (data.success) {
        setAgent(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch agent details')
      }
    } catch (error) {
      console.error('Error fetching agent details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch agent details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails()
      const interval = setInterval(fetchAgentDetails, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [agentId])

  // Mock data for demonstration
  useEffect(() => {
    if (agentId) {
      const mockAgent: AgentDetailData = {
        agentId,
        agentType: AgentType.SCRAPER,
        status: AgentStatus.BUSY,
        lastSeen: new Date(Date.now() - 30000),
        startedAt: new Date(Date.now() - 3600000),
        uptime: 3600,
        config: {
          maxConcurrency: 5,
          timeout: 30000,
          retries: 3,
          target: "https://example.com"
        },
        metrics: {
          totalJobs: 150,
          successfulJobs: 142,
          failedJobs: 8,
          averageExecutionTime: 12.5,
          errorRate: 0.053,
          memoryUsage: 52428800,
          uptime: 3600,
          lastJobTime: new Date(Date.now() - 300000)
        },
        recentJobs: [
          {
            id: "job_001",
            job_type: "scrape_listings",
            status: JobStatus.RUNNING,
            created_at: new Date(Date.now() - 300000),
            started_at: new Date(Date.now() - 180000),
            payload: { url: "https://example.com/listings" }
          },
          {
            id: "job_002",
            job_type: "scrape_details",
            status: JobStatus.COMPLETED,
            created_at: new Date(Date.now() - 600000),
            started_at: new Date(Date.now() - 580000),
            completed_at: new Date(Date.now() - 400000),
            result: { scraped: 25, errors: 0 }
          },
          {
            id: "job_003",
            job_type: "scrape_images",
            status: JobStatus.FAILED,
            created_at: new Date(Date.now() - 900000),
            started_at: new Date(Date.now() - 880000),
            error_message: "Connection timeout"
          }
        ]
      }
      setAgent(mockAgent)
      setLoading(false)
    }
  }, [agentId])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemoryUsage = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const calculateDuration = (job: any) => {
    if (job.completed_at && job.started_at) {
      const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
      return `${Math.round(duration / 1000)}s`
    }
    if (job.started_at) {
      const duration = Date.now() - new Date(job.started_at).getTime()
      return `${Math.round(duration / 1000)}s (running)`
    }
    return "-"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
              <p className="text-muted-foreground mb-4">The agent with ID "{agentId}" could not be found.</p>
              <Button onClick={() => router.push('/agents')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[agent.status]
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/agents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agent Details</h1>
              <p className="text-muted-foreground">Monitor and manage agent {agent.agentId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={statusInfo.badgeVariant} className={statusInfo.textColor}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Agent Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Agent Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Agent ID</h3>
                <p className="font-mono text-sm">{agent.agentId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
                <p className="capitalize">{agent.agentType}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Uptime</h3>
                <p>{formatUptime(agent.uptime)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Seen</h3>
                <p>{formatDistanceToNow(agent.lastSeen)} ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        {agent.metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agent.metrics.totalJobs}</div>
                <p className="text-xs text-muted-foreground">
                  {agent.metrics.successfulJobs} successful, {agent.metrics.failedJobs} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((agent.metrics.successfulJobs / agent.metrics.totalJobs) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Error rate: {(agent.metrics.errorRate * 100).toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agent.metrics.averageExecutionTime.toFixed(1)}s</div>
                <p className="text-xs text-muted-foreground">
                  Last job: {agent.metrics.lastJobTime 
                    ? formatDistanceToNow(agent.metrics.lastJobTime) + ' ago'
                    : 'Never'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMemoryUsage(agent.metrics.memoryUsage)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Information */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agent.recentJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-sm">{job.id}</TableCell>
                          <TableCell>{job.job_type}</TableCell>
                          <TableCell>
                            <Badge variant={jobStatusConfig[job.status].variant}>
                              {jobStatusConfig[job.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>{calculateDuration(job)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(job.created_at)} ago
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Agent Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(agent.config).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-border/50">
                      <div>
                        <h4 className="font-medium">{key}</h4>
                      </div>
                      <div className="font-mono text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsChart />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}