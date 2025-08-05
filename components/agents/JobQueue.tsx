"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  Timer,
  Activity,
  RefreshCw
} from "lucide-react"
import { JobStatus, JobPriority, AgentType } from "@/agents/types/AgentTypes"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface Job {
  id: string
  agent_id: string
  agent_type: AgentType
  job_type: string
  status: JobStatus
  priority: JobPriority
  payload: any
  result?: any
  error_message?: string
  retry_count: number
  max_retries: number
  scheduled_at?: Date
  started_at?: Date
  completed_at?: Date
  failed_at?: Date
  expires_at?: Date
  created_at: Date
  updated_at: Date
  metadata?: any
}

interface JobQueueProps {
  className?: string
}

const statusConfig = {
  [JobStatus.PENDING]: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "Pending"
  },
  [JobStatus.RUNNING]: {
    icon: Activity,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "Running"
  },
  [JobStatus.COMPLETED]: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    label: "Completed"
  },
  [JobStatus.FAILED]: {
    icon: XCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    label: "Failed"
  },
  [JobStatus.CANCELLED]: {
    icon: Square,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    label: "Cancelled"
  },
  [JobStatus.RETRYING]: {
    icon: RotateCcw,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    label: "Retrying"
  }
}

const priorityConfig = {
  [JobPriority.LOW]: { label: "Low", variant: "secondary" as const },
  [JobPriority.NORMAL]: { label: "Normal", variant: "outline" as const },
  [JobPriority.HIGH]: { label: "High", variant: "default" as const },
  [JobPriority.URGENT]: { label: "Urgent", variant: "destructive" as const }
}

// Loading skeleton for job table
const JobTableSkeleton = memo(() => (
  <Card>
    <CardContent className="p-0">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
))

JobTableSkeleton.displayName = "JobTableSkeleton"

// Error boundary component
const JobQueueError = memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Card className="border-destructive">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-destructive">Failed to load job queue</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </CardContent>
  </Card>
))

JobQueueError.displayName = "JobQueueError"

export const JobQueue = memo(function JobQueue({ className }: JobQueueProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">("all")
  const [agentTypeFilter, setAgentTypeFilter] = useState<AgentType | "all">("all")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  // Memoized filter jobs to prevent unnecessary re-computations
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.job_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.agent_id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || job.status === statusFilter
      const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter
      const matchesAgentType = agentTypeFilter === "all" || job.agent_type === agentTypeFilter
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAgentType
    })
  }, [jobs, searchTerm, statusFilter, priorityFilter, agentTypeFilter])

  // Memoized group jobs by status
  const jobsByStatus = useMemo(() => ({
    active: filteredJobs.filter(job => 
      job.status === JobStatus.PENDING || 
      job.status === JobStatus.RUNNING || 
      job.status === JobStatus.RETRYING
    ),
    completed: filteredJobs.filter(job => job.status === JobStatus.COMPLETED),
    failed: filteredJobs.filter(job => 
      job.status === JobStatus.FAILED || 
      job.status === JobStatus.CANCELLED
    )
  }), [filteredJobs])

  // Improved fetch jobs with better error handling
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: Implement actual job fetching API endpoint
      // For now, using mock data
      const mockJobs: Job[] = [
        {
          id: "job_001",
          agent_id: "scraper_001",
          agent_type: AgentType.SCRAPER,
          job_type: "scrape_marketplace",
          status: JobStatus.RUNNING,
          priority: JobPriority.HIGH,
          payload: { url: "https://example.com", filters: {} },
          retry_count: 0,
          max_retries: 3,
          created_at: new Date(Date.now() - 300000),
          updated_at: new Date(Date.now() - 60000),
          started_at: new Date(Date.now() - 180000)
        },
        {
          id: "job_002", 
          agent_id: "analyzer_001",
          agent_type: AgentType.ANALYZER,
          job_type: "analyze_listings",
          status: JobStatus.COMPLETED,
          priority: JobPriority.NORMAL,
          payload: { data: [] },
          result: { processed: 150, errors: 2 },
          retry_count: 0,
          max_retries: 3,
          created_at: new Date(Date.now() - 600000),
          updated_at: new Date(Date.now() - 300000),
          started_at: new Date(Date.now() - 580000),
          completed_at: new Date(Date.now() - 300000)
        }
      ]
      setJobs(mockJobs)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error fetching jobs:', error)
      setError(errorMessage)
      toast({
        title: "Error",
        description: "Failed to fetch job queue",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Job control handlers
  const handleCancelJob = async (jobId: string) => {
    try {
      // TODO: Implement job cancellation API
      toast({
        title: "Success",
        description: `Job ${jobId} cancelled successfully`
      })
      fetchJobs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to cancel job ${jobId}`,
        variant: "destructive"
      })
    }
  }

  const handleRetryJob = async (jobId: string) => {
    try {
      // TODO: Implement job retry API
      toast({
        title: "Success",
        description: `Job ${jobId} queued for retry`
      })
      fetchJobs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to retry job ${jobId}`,
        variant: "destructive"
      })
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      // TODO: Implement job deletion API
      toast({
        title: "Success",
        description: `Job ${jobId} deleted successfully`
      })
      fetchJobs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete job ${jobId}`,
        variant: "destructive"
      })
    }
  }

  const calculateDuration = (job: Job) => {
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

  const JobRow = ({ job }: { job: Job }) => {
    const statusInfo = statusConfig[job.status]
    const StatusIcon = statusInfo.icon
    const priorityInfo = priorityConfig[job.priority]

    return (
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-mono text-sm">{job.id.slice(0, 8)}...</TableCell>
        <TableCell>{job.job_type}</TableCell>
        <TableCell>
          <Badge variant={statusInfo.bgColor} className={statusInfo.textColor}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={priorityInfo.variant}>
            {priorityInfo.label}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-sm">{job.agent_id.slice(0, 8)}...</TableCell>
        <TableCell>{calculateDuration(job)}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDistanceToNow(job.created_at)} ago
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedJob(job)}
            >
              <Eye className="w-3 h-3" />
            </Button>
            {job.status === JobStatus.RUNNING && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelJob(job.id)}
              >
                <Square className="w-3 h-3" />
              </Button>
            )}
            {(job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRetryJob(job.id)}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteJob(job.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  // Show error state if there's an error
  if (error) {
    return <JobQueueError error={error} onRetry={fetchJobs} />
  }

  // Show loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Job Queue</h3>
            <p className="text-muted-foreground">Monitor and manage agent jobs</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <JobTableSkeleton />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Job Queue</h3>
          <p className="text-muted-foreground">Monitor and manage agent jobs</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsByStatus.active.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsByStatus.completed.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsByStatus.failed.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JobStatus | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={JobStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={JobStatus.RUNNING}>Running</SelectItem>
                <SelectItem value={JobStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={JobStatus.FAILED}>Failed</SelectItem>
                <SelectItem value={JobStatus.CANCELLED}>Cancelled</SelectItem>
                <SelectItem value={JobStatus.RETRYING}>Retrying</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as JobPriority | "all")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value={JobPriority.LOW}>Low</SelectItem>
                <SelectItem value={JobPriority.NORMAL}>Normal</SelectItem>
                <SelectItem value={JobPriority.HIGH}>High</SelectItem>
                <SelectItem value={JobPriority.URGENT}>Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job Tables */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({jobsByStatus.active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({jobsByStatus.completed.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({jobsByStatus.failed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsByStatus.active.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsByStatus.completed.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsByStatus.failed.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Detail Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Details - {selectedJob.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={statusConfig[selectedJob.status].bgColor}>
                      {statusConfig[selectedJob.status].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <Badge variant={priorityConfig[selectedJob.priority].variant}>
                      {priorityConfig[selectedJob.priority].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Agent ID</Label>
                  <p className="mt-1 font-mono text-sm">{selectedJob.agent_id}</p>
                </div>
                <div>
                  <Label>Agent Type</Label>
                  <p className="mt-1">{selectedJob.agent_type}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="mt-1 text-sm">{format(selectedJob.created_at, 'PPpp')}</p>
                </div>
                <div>
                  <Label>Duration</Label>
                  <p className="mt-1 text-sm">{calculateDuration(selectedJob)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Payload</Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  value={JSON.stringify(selectedJob.payload, null, 2)}
                  readOnly
                  rows={8}
                />
              </div>
              
              {selectedJob.result && (
                <div>
                  <Label>Result</Label>
                  <Textarea
                    className="mt-1 font-mono text-xs"
                    value={JSON.stringify(selectedJob.result, null, 2)}
                    readOnly
                    rows={8}
                  />
                </div>
              )}
              
              {selectedJob.error_message && (
                <div>
                  <Label>Error Message</Label>
                  <Textarea
                    className="mt-1 font-mono text-xs text-red-600"
                    value={selectedJob.error_message}
                    readOnly
                    rows={4}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Job Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type</Label>
                <Input placeholder="e.g., scrape_marketplace" />
              </div>
              <div>
                <Label>Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={JobPriority.LOW}>Low</SelectItem>
                    <SelectItem value={JobPriority.NORMAL}>Normal</SelectItem>
                    <SelectItem value={JobPriority.HIGH}>High</SelectItem>
                    <SelectItem value={JobPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Payload (JSON)</Label>
              <Textarea 
                placeholder='{"url": "https://example.com", "filters": {}}'
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // TODO: Implement job creation
                setShowCreateDialog(false)
                toast({
                  title: "Success",
                  description: "Job created successfully"
                })
              }}>
                Create Job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

JobQueue.displayName = "JobQueue"