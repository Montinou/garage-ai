"use client"

import { useState, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  MoreHorizontal,
  Pause,
  Play,
  StopCircle,
  Zap,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import { AgentStatus, AgentType } from "@/agents/types/AgentTypes"
import { formatDistanceToNow } from "date-fns"

interface AgentStatusCardProps {
  agentId: string
  agentType: AgentType
  status: AgentStatus
  lastSeen: Date
  startedAt?: Date
  currentJob?: {
    id: string
    type: string
    progress?: number
    startedAt: Date
  }
  metrics?: {
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    averageExecutionTime: number
    errorRate: number
    memoryUsage: number
    uptime: number
  }
  config?: Record<string, unknown>
  onStart?: () => void
  onStop?: () => void
  onPause?: () => void
  onViewDetails?: () => void
}

const statusConfig = {
  [AgentStatus.IDLE]: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    label: "Idle"
  },
  [AgentStatus.BUSY]: {
    icon: Activity,
    color: "bg-blue-500",
    textColor: "text-blue-600", 
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "Busy"
  },
  [AgentStatus.ERROR]: {
    icon: AlertCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20", 
    label: "Error"
  },
  [AgentStatus.STOPPED]: {
    icon: StopCircle,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    label: "Stopped"
  },
  [AgentStatus.INITIALIZING]: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "Initializing"
  }
}

const agentTypeLabels = {
  [AgentType.SCRAPER]: "Scraper",
  [AgentType.ANALYZER]: "Analyzer", 
  [AgentType.ENRICHER]: "Enricher",
  [AgentType.VALIDATOR]: "Validator",
  [AgentType.ORCHESTRATOR]: "Orchestrator",
  [AgentType.MONITOR]: "Monitor"
}

// Error boundary component for agent status card
const AgentStatusError = memo(({ error, onRetry, agentId }: { 
  error: string; 
  onRetry: () => void; 
  agentId: string 
}) => (
  <Card className="border-destructive">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h4 className="text-sm font-semibold text-destructive">Agent Error</h4>
          <p className="text-xs text-muted-foreground mt-1">Agent {agentId}</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    </CardContent>
  </Card>
))

AgentStatusError.displayName = "AgentStatusError"

export const AgentStatusCard = memo(function AgentStatusCard({
  agentId,
  agentType,
  status,
  lastSeen,
  _startedAt,
  currentJob,
  metrics,
  _config,
  onStart,
  onStop,
  onPause,
  onViewDetails
}: AgentStatusCardProps) {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  
  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon
  const isActive = status === AgentStatus.IDLE || status === AgentStatus.BUSY
  
  // Handle agent errors (reserved for future use)
  // const handleError = (error: string) => {
  //   setHasError(true)
  //   setErrorMessage(error)
  // }
  
  // Retry mechanism
  const handleRetry = () => {
    setHasError(false)
    setErrorMessage("")
    // Trigger a refresh or retry action
    onViewDetails?.() // Use onViewDetails as a fallback to refresh
  }
  
  // Show error state if agent has errors
  if (hasError || status === AgentStatus.ERROR) {
    const displayError = hasError ? errorMessage : "Agent is in error state"
    return <AgentStatusError error={displayError} onRetry={handleRetry} agentId={agentId} />
  }

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemoryUsage = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${statusInfo.color} animate-pulse`} />
            <div>
              <CardTitle className="text-lg">{agentTypeLabels[agentType]}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{agentId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isActive ? "default" : "secondary"} className={statusInfo.bgColor}>
              <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.textColor}`} />
              {statusInfo.label}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Job */}
        {currentJob && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Job</span>
              <Badge variant="outline" className="text-xs">
                {currentJob.type}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Started {formatDistanceToNow(currentJob.startedAt)} ago</span>
                <span className="font-mono">{currentJob.id.slice(0, 8)}...</span>
              </div>
              {currentJob.progress !== undefined && (
                <Progress value={currentJob.progress} className="h-2" />
              )}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-sm font-medium">
                  {metrics.totalJobs > 0 
                    ? Math.round((metrics.successfulJobs / metrics.totalJobs) * 100)
                    : 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Time</p>
                <p className="text-sm font-medium">{metrics.averageExecutionTime.toFixed(1)}s</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-sm font-medium">{metrics.totalJobs}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="text-sm font-medium">{formatMemoryUsage(metrics.memoryUsage)}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Status Information */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last seen {formatDistanceToNow(lastSeen)} ago</span>
          {metrics && (
            <span>Uptime: {formatUptime(metrics.uptime)}</span>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            {status === AgentStatus.STOPPED && onStart && (
              <Button size="sm" variant="outline" onClick={onStart}>
                <Play className="w-3 h-3 mr-1" />
                Start
              </Button>
            )}
            {(status === AgentStatus.IDLE || status === AgentStatus.BUSY) && onPause && (
              <Button size="sm" variant="outline" onClick={onPause}>
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
            )}
            {status !== AgentStatus.STOPPED && onStop && (
              <Button size="sm" variant="outline" onClick={onStop}>
                <StopCircle className="w-3 h-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

AgentStatusCard.displayName = "AgentStatusCard"