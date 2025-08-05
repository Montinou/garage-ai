"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AgentStatus, AgentType, SystemHealth } from "@/agents/types/AgentTypes"

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

interface UseRealTimeAgentsOptions {
  refreshInterval?: number
  enableWebSocket?: boolean
  enableSSE?: boolean
  adaptivePolling?: boolean // New option for adaptive polling
  maxInactiveTime?: number // Time before reducing polling frequency
}

interface UseRealTimeAgentsReturn {
  agents: AgentData[]
  systemHealth: SystemHealth | null
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  isConnected: boolean
}

export function useRealTimeAgents(options: UseRealTimeAgentsOptions = {}): UseRealTimeAgentsReturn {
  const {
    refreshInterval = 10000, // 10 seconds default
    enableWebSocket = false, // Disabled for now - would need WebSocket server
    enableSSE = false, // Disabled for now - would need SSE endpoint
    adaptivePolling = true, // Enable adaptive polling by default
    maxInactiveTime = 30000 // 30 seconds before reducing frequency
  } = options

  const [agents, setAgents] = useState<AgentData[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Adaptive polling state
  const lastActivityTime = useRef<number>(Date.now())
  const currentInterval = useRef<number>(refreshInterval)
  const intervalId = useRef<NodeJS.Timeout | null>(null)
  const isUserActive = useRef<boolean>(true)

  // Fetch agents data via REST API
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/status')
      const data = await response.json()
      
      if (data.success) {
        setAgents(data.data || [])
        setError(null)
        setIsConnected(true)
      } else {
        throw new Error(data.error || 'Failed to fetch agents')
      }
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsConnected(false)
    }
  }, [])

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/status?health=true')
      const data = await response.json()
      
      if (data.success) {
        setSystemHealth(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch system health')
      }
    } catch (err) {
      console.error('Error fetching system health:', err)
    }
  }, [])

  // Refresh all data
  // Track user activity for adaptive polling
  const updateUserActivity = useCallback(() => {
    lastActivityTime.current = Date.now()
    if (!isUserActive.current) {
      isUserActive.current = true
      // Reset to normal polling interval when user becomes active
      currentInterval.current = refreshInterval
    }
  }, [refreshInterval])

  // Check if user is inactive and adjust polling accordingly
  const checkUserActivity = useCallback(() => {
    if (!adaptivePolling) return
    
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTime.current
    
    if (timeSinceLastActivity > maxInactiveTime) {
      if (isUserActive.current) {
        isUserActive.current = false
        // Reduce polling frequency when user is inactive
        currentInterval.current = Math.min(refreshInterval * 3, 60000) // Max 1 minute
      }
    }
  }, [adaptivePolling, maxInactiveTime, refreshInterval])

  const refreshData = useCallback(async () => {
    setLoading(true)
    updateUserActivity() // Update activity when user manually refreshes
    try {
      await Promise.all([fetchAgents(), fetchSystemHealth()])
    } finally {
      setLoading(false)
    }
  }, [fetchAgents, fetchSystemHealth, updateUserActivity])

  // WebSocket connection (placeholder for future implementation)
  useEffect(() => {
    if (!enableWebSocket) return

    // TODO: Implement WebSocket connection when server supports it
    /*
    const ws = new WebSocket('ws://localhost:3000/api/agents/realtime')
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'agent_update':
            setAgents(prev => prev.map(agent => 
              agent.agentId === message.data.agentId 
                ? { ...agent, ...message.data }
                : agent
            ))
            break
          case 'system_health':
            setSystemHealth(message.data)
            break
          default:
            console.log('Unknown WebSocket message type:', message.type)
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('WebSocket connection error')
      setIsConnected(false)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    }
    
    return () => {
      ws.close()
    }
    */
  }, [enableWebSocket])

  // Server-Sent Events connection (placeholder for future implementation)
  useEffect(() => {
    if (!enableSSE) return

    // TODO: Implement SSE connection when server supports it
    /*
    const eventSource = new EventSource('/api/agents/events')
    
    eventSource.onopen = () => {
      console.log('SSE connected')
      setIsConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'agent_update':
            setAgents(prev => prev.map(agent => 
              agent.agentId === message.data.agentId 
                ? { ...agent, ...message.data }
                : agent
            ))
            break
          case 'system_health':
            setSystemHealth(message.data)
            break
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setError('SSE connection error')
      setIsConnected(false)
    }
    
    return () => {
      eventSource.close()
    }
    */
  }, [enableSSE])

  // User activity listeners for adaptive polling
  useEffect(() => {
    if (!adaptivePolling) return

    const handleUserActivity = () => {
      updateUserActivity()
    }

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [adaptivePolling, updateUserActivity])

  // Adaptive polling (currently the primary method)
  useEffect(() => {
    if (enableWebSocket || enableSSE) return // Skip polling if real-time connections are enabled

    // Initial fetch
    refreshData()

    // Set up adaptive polling interval
    const scheduleNextPoll = () => {
      checkUserActivity()
      
      if (intervalId.current) {
        clearTimeout(intervalId.current)
      }
      
      intervalId.current = setTimeout(() => {
        refreshData().then(() => {
          scheduleNextPoll() // Schedule next poll after current one completes
        })
      }, currentInterval.current)
    }

    scheduleNextPoll()

    return () => {
      if (intervalId.current) {
        clearTimeout(intervalId.current)
      }
    }
  }, [refreshData, checkUserActivity, enableWebSocket, enableSSE])

  // Connection status monitoring
  useEffect(() => {
    if (!enableWebSocket && !enableSSE) {
      // For polling mode, we consider connected if last fetch was successful
      setIsConnected(!error)
    }
  }, [error, enableWebSocket, enableSSE])

  return {
    agents,
    systemHealth,
    loading,
    error,
    refreshData,
    isConnected
  }
}

// Hook for real-time job updates
export function useRealTimeJobs(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 5000 } = options
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      // TODO: Implement actual jobs API endpoint
      // For now, return mock data
      const mockJobs = [
        {
          id: "job_001",
          agent_id: "scraper_001",
          agent_type: "scraper",
          job_type: "scrape_marketplace",
          status: "running",
          priority: "high",
          created_at: new Date(Date.now() - 300000),
          started_at: new Date(Date.now() - 180000)
        }
      ]
      setJobs(mockJobs)
      setError(null)
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchJobs, refreshInterval])

  return { jobs, loading, error, refreshJobs: fetchJobs }
}

// Hook for real-time memory data
export function useRealTimeMemory(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 30000 } = options
  const [memoryEntries, setMemoryEntries] = useState<any[]>([])
  const [memoryStats, setMemoryStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMemory = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/memory')
      const data = await response.json()
      
      if (data.success) {
        setMemoryEntries(data.entries || [])
        setMemoryStats(data.stats || null)
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to fetch memory data')
      }
    } catch (err) {
      console.error('Error fetching memory:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMemory()
    const interval = setInterval(fetchMemory, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchMemory, refreshInterval])

  return { 
    memoryEntries, 
    memoryStats, 
    loading, 
    error, 
    refreshMemory: fetchMemory 
  }
}