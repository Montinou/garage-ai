"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Tree-shaking friendly imports for better bundle optimization
import { 
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from "recharts"
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from "lucide-react"
import { AgentType, JobStatus } from "@/agents/types/AgentTypes"
import { format, subHours, subDays, subWeeks } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface MetricsChartProps {
  className?: string
}

interface MetricDataPoint {
  timestamp: string
  value: number
  label?: string
}

interface AgentPerformanceData {
  agentId: string
  agentType: AgentType
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  averageExecutionTime: number
  errorRate: number
  uptime: number
}

interface SystemMetricsData {
  timestamp: string
  activeAgents: number
  totalJobs: number
  completedJobs: number
  failedJobs: number
  averageJobTime: number
  memoryUsage: number
  cpuUsage: number
}

const CHART_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#FF7C7C", "#8DD1E1", "#D084D0"
]

// Memoized chart components to prevent unnecessary re-renders
const MemoizedLineChart = memo(({ data, children, ...props }: any) => (
  <LineChart data={data} {...props}>
    {children}
  </LineChart>
))

const MemoizedAreaChart = memo(({ data, children, ...props }: any) => (
  <AreaChart data={data} {...props}>
    {children}
  </AreaChart>
))

const MemoizedBarChart = memo(({ data, children, ...props }: any) => (
  <BarChart data={data} {...props}>
    {children}
  </BarChart>
))

const MemoizedPieChart = memo(({ children, ...props }: any) => (
  <PieChart {...props}>
    {children}
  </PieChart>
))

const MemoizedScatterChart = memo(({ data, children, ...props }: any) => (
  <ScatterChart data={data} {...props}>
    {children}
  </ScatterChart>
))

MemoizedLineChart.displayName = "MemoizedLineChart"
MemoizedAreaChart.displayName = "MemoizedAreaChart"
MemoizedBarChart.displayName = "MemoizedBarChart"
MemoizedPieChart.displayName = "MemoizedPieChart"
MemoizedScatterChart.displayName = "MemoizedScatterChart"

export const MetricsChart = memo(function MetricsChart({ className }: MetricsChartProps) {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h")
  const [refreshInterval, setRefreshInterval] = useState<"5s" | "30s" | "1m" | "5m">("30s")
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsData[]>([])
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceData[]>([])
  const [jobStatusData, setJobStatusData] = useState<Array<{name: string, value: number, status: JobStatus}>>([])
  const [errorTrends, setErrorTrends] = useState<MetricDataPoint[]>([])
  const [performanceTrends, setPerformanceTrends] = useState<MetricDataPoint[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const { toast } = useToast()

  // Throttled data generation to prevent excessive updates
  const generateMockData = useCallback(() => {
    const now = Date.now()
    // Throttle updates to prevent excessive re-renders (minimum 1 second between updates)
    if (now - lastUpdateTime < 1000) {
      return
    }
    setLastUpdateTime(now)
    const dateNow = new Date()
    const getTimePoints = () => {
      switch (timeRange) {
        case "1h": return Array.from({length: 12}, (_, i) => subHours(dateNow, 11 - i))
        case "24h": return Array.from({length: 24}, (_, i) => subHours(dateNow, 23 - i))
        case "7d": return Array.from({length: 7}, (_, i) => subDays(dateNow, 6 - i))
        case "30d": return Array.from({length: 30}, (_, i) => subDays(dateNow, 29 - i))
        default: return []
      }
    }

    const timePoints = getTimePoints()
    
    // System metrics over time
    const mockSystemMetrics: SystemMetricsData[] = timePoints.map(time => ({
      timestamp: format(time, timeRange === "1h" || timeRange === "24h" ? "HH:mm" : "MM/dd"),
      activeAgents: Math.floor(Math.random() * 10) + 15,
      totalJobs: Math.floor(Math.random() * 1000) + 2000,
      completedJobs: Math.floor(Math.random() * 800) + 1800,
      failedJobs: Math.floor(Math.random() * 50) + 20,
      averageJobTime: Math.floor(Math.random() * 30) + 15,
      memoryUsage: Math.floor(Math.random() * 2000) + 3000,
      cpuUsage: Math.floor(Math.random() * 40) + 30
    }))

    // Agent performance data
    const mockAgentPerformance: AgentPerformanceData[] = [
      {
        agentId: "scraper_001",
        agentType: AgentType.SCRAPER,
        totalJobs: 450,
        successfulJobs: 425,
        failedJobs: 25,
        averageExecutionTime: 12.5,
        errorRate: 0.056,
        uptime: 86400
      },
      {
        agentId: "analyzer_001", 
        agentType: AgentType.ANALYZER,
        totalJobs: 320,
        successfulJobs: 310,
        failedJobs: 10,
        averageExecutionTime: 8.2,
        errorRate: 0.031,
        uptime: 79200
      },
      {
        agentId: "validator_001",
        agentType: AgentType.VALIDATOR,
        totalJobs: 280,
        successfulJobs: 270,
        failedJobs: 10,
        averageExecutionTime: 6.8,
        errorRate: 0.036,
        uptime: 82800
      }
    ]

    // Job status distribution
    const mockJobStatus = [
      { name: "Completed", value: 2450, status: JobStatus.COMPLETED },
      { name: "Running", value: 12, status: JobStatus.RUNNING },
      { name: "Pending", value: 45, status: JobStatus.PENDING },
      { name: "Failed", value: 78, status: JobStatus.FAILED },
      { name: "Cancelled", value: 8, status: JobStatus.CANCELLED }
    ]

    // Error trends
    const mockErrorTrends: MetricDataPoint[] = timePoints.map(time => ({
      timestamp: format(time, timeRange === "1h" || timeRange === "24h" ? "HH:mm" : "MM/dd"),
      value: Math.random() * 0.1,
      label: "Error Rate"
    }))

    // Performance trends
    const mockPerformanceTrends: MetricDataPoint[] = timePoints.map(time => ({
      timestamp: format(time, timeRange === "1h" || timeRange === "24h" ? "HH:mm" : "MM/dd"),
      value: Math.random() * 20 + 10,
      label: "Avg Execution Time (s)"
    }))

    setSystemMetrics(mockSystemMetrics)
    setAgentPerformance(mockAgentPerformance)
    setJobStatusData(mockJobStatus)
    setErrorTrends(mockErrorTrends)
    setPerformanceTrends(mockPerformanceTrends)
  }, [timeRange, lastUpdateTime])

  // Memoized fetch metrics data function
  const fetchMetricsData = useCallback(async () => {
    try {
      setLoading(true)
      // Using mock data for demo purposes - metrics API integration ready
      generateMockData()
    } catch (error) {
      // Error handling for metrics data fetch failure
      toast({
        title: "Error",
        description: "Failed to fetch metrics data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [generateMockData, toast])

  useEffect(() => {
    fetchMetricsData()
  }, [fetchMetricsData, timeRange])

  useEffect(() => {
    const intervals = {
      "5s": 5000,
      "30s": 30000, 
      "1m": 60000,
      "5m": 300000
    }

    const interval = setInterval(fetchMetricsData, intervals[refreshInterval])
    return () => clearInterval(interval)
  }, [fetchMetricsData, refreshInterval])

  // Memoized trend calculation to prevent unnecessary computations
  const calculateTrend = useCallback((data: MetricDataPoint[]) => {
    if (data.length < 2) return { trend: 0, isPositive: true }
    const latest = data[data.length - 1].value
    const previous = data[data.length - 2].value
    const trend = ((latest - previous) / previous) * 100
    return { trend: Math.abs(trend), isPositive: trend >= 0 }
  }, [])

  // Memoized trend calculations
  const errorTrend = useMemo(() => calculateTrend(errorTrends), [errorTrends, calculateTrend])
  const performanceTrend = useMemo(() => calculateTrend(performanceTrends), [performanceTrends, calculateTrend])
  
  // Memoized formatted values to prevent unnecessary recalculations
  const memoizedErrorRate = useMemo(() => 
    errorTrends.length > 0 ? `${(errorTrends[errorTrends.length - 1].value * 100).toFixed(2)}%` : '0%', 
    [errorTrends]
  )
  
  const memoizedResponseTime = useMemo(() => 
    performanceTrends.length > 0 ? `${performanceTrends[performanceTrends.length - 1].value.toFixed(1)}s` : '0s', 
    [performanceTrends]
  )
  
  const memoizedSuccessRate = useMemo(() => 
    agentPerformance.length > 0 
      ? `${(agentPerformance.reduce((acc, agent) => acc + (agent.successfulJobs / agent.totalJobs), 0) / agentPerformance.length * 100).toFixed(1)}%`
      : '0%',
    [agentPerformance]
  )
  
  const memoizedActiveAgents = useMemo(() => 
    systemMetrics.length > 0 ? systemMetrics[systemMetrics.length - 1].activeAgents : 0,
    [systemMetrics]
  )

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.COMPLETED: return "#00C49F"
      case JobStatus.RUNNING: return "#0088FE"
      case JobStatus.PENDING: return "#FFBB28"
      case JobStatus.FAILED: return "#FF8042"
      case JobStatus.CANCELLED: return "#8884D8"
      default: return "#82CA9D"
    }
  }


  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Performance Metrics</h3>
          <p className="text-muted-foreground">Visualize system and agent performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={refreshInterval} onValueChange={(value) => setRefreshInterval(value as any)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5s">5s</SelectItem>
              <SelectItem value="30s">30s</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchMetricsData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoizedErrorRate}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {errorTrend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-red-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-green-500" />
              )}
              <span className={errorTrend.isPositive ? "text-red-500" : "text-green-500"}>
                {errorTrend.trend.toFixed(1)}%
              </span>
              <span>from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoizedResponseTime}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {performanceTrend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-red-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-green-500" />
              )}
              <span className={performanceTrend.isPositive ? "text-red-500" : "text-green-500"}>
                {performanceTrend.trend.toFixed(1)}%
              </span>
              <span>from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoizedSuccessRate}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoizedActiveAgents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="agents">Agent Comparison</TabsTrigger>
          <TabsTrigger value="jobs">Job Status</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChartIcon className="w-4 h-4" />
                  <span>Active Agents Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedLineChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="activeAgents" 
                      stroke="#0088FE" 
                      strokeWidth={2}
                      name="Active Agents"
                    />
                  </MemoizedLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Job Completion Rate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedAreaChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="completedJobs" 
                      stackId="1"
                      stroke="#00C49F" 
                      fill="#00C49F"
                      name="Completed"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="failedJobs" 
                      stackId="1"
                      stroke="#FF8042" 
                      fill="#FF8042"
                      name="Failed"
                    />
                  </MemoizedAreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedLineChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatBytes(Number(value) * 1024 * 1024), 'Memory Usage']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stroke="#FFBB28" 
                      strokeWidth={2}
                      name="Memory (MB)"
                    />
                  </MemoizedLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedAreaChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'CPU Usage']} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cpuUsage" 
                      stroke="#8884D8" 
                      fill="#8884D8"
                      name="CPU %"
                    />
                  </MemoizedAreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={errorTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 'dataMax']} />
                    <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, 'Error Rate']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FF8042" 
                      strokeWidth={2}
                      name="Error Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Execution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}s`, 'Avg Execution Time']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#00C49F" 
                      strokeWidth={2}
                      name="Execution Time (s)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedBarChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agentType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="successfulJobs" fill="#00C49F" name="Successful" />
                    <Bar dataKey="failedJobs" fill="#FF8042" name="Failed" />
                  </MemoizedBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Time vs Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedScatterChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="averageExecutionTime" name="Avg Execution Time (s)" />
                    <YAxis dataKey="errorRate" name="Error Rate" domain={[0, 'dataMax']} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'errorRate' ? `${(Number(value) * 100).toFixed(2)}%` : `${Number(value).toFixed(1)}s`,
                        name === 'errorRate' ? 'Error Rate' : 'Avg Execution Time'
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.agentType || ''}
                    />
                    <Scatter dataKey="errorRate" fill="#8884D8" />
                  </MemoizedScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Agent Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <MemoizedBarChart data={agentPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="agentType" />
                    <Tooltip formatter={(value) => [formatUptime(Number(value)), 'Uptime']} />
                    <Bar dataKey="uptime" fill="#0088FE" />
                  </MemoizedBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="w-4 h-4" />
                  <span>Job Status Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <MemoizedPieChart>
                    <Pie
                      data={jobStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {jobStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </MemoizedPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Status Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobStatusData.map((item, index) => {
                  const total = jobStatusData.reduce((sum, item) => sum + item.value, 0)
                  const percentage = (item.value / total) * 100
                  
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getStatusColor(item.status) }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {item.value} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
})

MetricsChart.displayName = "MetricsChart"