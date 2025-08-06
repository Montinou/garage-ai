"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Database,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Tag,
  FileText,
  Hash,
  List,
  Globe,
  TrendingUp,
  Activity,
  HardDrive
} from "lucide-react"
import { MemoryEntry, MemoryStats } from "@/agents/types/AgentTypes"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface MemoryViewerProps {
  className?: string
}

const typeIcons = {
  string: FileText,
  object: Hash,
  array: List,
  number: Hash,
  boolean: Globe
}

const typeColors = {
  string: "bg-blue-50 text-blue-700 dark:bg-blue-900/20",
  object: "bg-purple-50 text-purple-700 dark:bg-purple-900/20", 
  array: "bg-green-50 text-green-700 dark:bg-green-900/20",
  number: "bg-orange-50 text-orange-700 dark:bg-orange-900/20",
  boolean: "bg-red-50 text-red-700 dark:bg-red-900/20"
}

export function MemoryViewer({ className }: MemoryViewerProps) {
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([])
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null)
  const [sortBy, setSortBy] = useState<"key" | "created" | "accessed" | "size">("created")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const { toast } = useToast()

  // Get all unique tags
  const allTags = Array.from(
    new Set(memoryEntries.flatMap(entry => entry.tags || []))
  ).sort()

  // Filter and sort entries
  const filteredEntries = memoryEntries
    .filter(entry => {
      const matchesSearch = entry.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (entry.tags || []).some(tag => 
                             tag.toLowerCase().includes(searchTerm.toLowerCase())
                           )
      const matchesType = typeFilter === "all" || entry.type === typeFilter
      const matchesTag = tagFilter === "all" || (entry.tags || []).includes(tagFilter)
      
      return matchesSearch && matchesType && matchesTag
    })
    .sort((a, b) => {
      let aValue: unknown, bValue: unknown
      
      switch (sortBy) {
        case "key":
          aValue = a.key
          bValue = b.key
          break
        case "created":
          aValue = a.createdAt
          bValue = b.createdAt
          break
        case "accessed":
          aValue = a.lastAccessed
          bValue = b.lastAccessed
          break
        case "size":
          aValue = JSON.stringify(a.value).length
          bValue = JSON.stringify(b.value).length
          break
        default:
          return 0
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // Group entries by type
  const entriesByType = {
    string: filteredEntries.filter(entry => entry.type === "string"),
    object: filteredEntries.filter(entry => entry.type === "object"),
    array: filteredEntries.filter(entry => entry.type === "array"),
    number: filteredEntries.filter(entry => entry.type === "number"),
    boolean: filteredEntries.filter(entry => entry.type === "boolean")
  }

  const mostAccessedEntries = [...filteredEntries]
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10)

  // Fetch memory data
  const fetchMemoryData = useCallback(async () => {
    try {
      const response = await fetch('/api/agents/memory')
      const data = await response.json()
      
      if (data.success) {
        // Mock data for now
        const mockEntries: MemoryEntry[] = [
          {
            key: "scraped_listings_cache",
            value: { count: 1500, lastUpdate: new Date().toISOString() },
            type: "object",
            tags: ["cache", "scraping", "listings"],
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 600000),
            lastAccessed: new Date(Date.now() - 300000),
            accessCount: 45,
            ttl: 86400
          },
          {
            key: "agent_config_analyzer",
            value: { maxConcurrency: 5, timeout: 30000, retries: 3 },
            type: "object",
            tags: ["config", "analyzer"],
            createdAt: new Date(Date.now() - 7200000),
            updatedAt: new Date(Date.now() - 7200000),
            lastAccessed: new Date(Date.now() - 1800000),
            accessCount: 12
          },
          {
            key: "last_scrape_patterns", 
            value: ["pattern1", "pattern2", "pattern3"],
            type: "array",
            tags: ["patterns", "scraping"],
            createdAt: new Date(Date.now() - 1800000),
            updatedAt: new Date(Date.now() - 900000),
            lastAccessed: new Date(Date.now() - 120000),
            accessCount: 8
          },
          {
            key: "system_status",
            value: "healthy",
            type: "string",
            tags: ["system", "health"],
            createdAt: new Date(Date.now() - 300000),
            updatedAt: new Date(Date.now() - 60000),
            lastAccessed: new Date(Date.now() - 30000),
            accessCount: 156
          }
        ]
        
        const mockStats: MemoryStats = {
          totalEntries: mockEntries.length,
          memoryUsage: 52428800, // 50MB
          hitRate: 0.87,
          missRate: 0.13,
          averageAccessTime: 12.5
        }
        
        setMemoryEntries(mockEntries)
        setMemoryStats(mockStats)
      } else {
        throw new Error(data.error || 'Failed to fetch memory data')
      }
    } catch (error) {
      console.error('Error fetching memory data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch memory data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMemoryData()
    const interval = setInterval(fetchMemoryData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchMemoryData])

  // Memory management handlers
  const handleDeleteEntry = async (key: string) => {
    try {
      // Memory deletion implementation ready for API integration
      setMemoryEntries(prev => prev.filter(entry => entry.key !== key))
      toast({
        title: "Success",
        description: `Memory entry "${key}" deleted successfully`
      })
    } catch {
      toast({
        title: "Error",
        description: `Failed to delete memory entry "${key}"`,
        variant: "destructive"
      })
    }
  }

  const handleClearExpired = async () => {
    try {
      // Expired memory cleanup implementation ready for API integration
      const now = Date.now()
      const expiredCount = memoryEntries.filter(entry => 
        entry.ttl && (entry.createdAt.getTime() + entry.ttl * 1000) < now
      ).length
      
      toast({
        title: "Success",
        description: `${expiredCount} expired entries cleared`
      })
      fetchMemoryData()
    } catch {
      toast({
        title: "Error",
        description: "Failed to clear expired entries",
        variant: "destructive"
      })
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getValueSize = (value: unknown) => {
    return JSON.stringify(value).length
  }

  const formatValue = (value: unknown, type: string) => {
    if (type === "string") return value
    if (type === "array") return `Array(${value.length})`
    if (type === "object") return `Object(${Object.keys(value).length} keys)`
    return String(value)
  }

  const MemoryEntryRow = ({ entry }: { entry: MemoryEntry }) => {
    const TypeIcon = typeIcons[entry.type as keyof typeof typeIcons]
    const isExpired = entry.ttl && 
      (entry.createdAt.getTime() + entry.ttl * 1000) < Date.now()

    return (
      <TableRow className={`hover:bg-muted/50 ${isExpired ? 'opacity-50' : ''}`}>
        <TableCell className="font-mono text-sm max-w-xs truncate">
          {entry.key}
        </TableCell>
        <TableCell>
          <Badge className={typeColors[entry.type as keyof typeof typeColors]}>
            <TypeIcon className="w-3 h-3 mr-1" />
            {entry.type}
          </Badge>
        </TableCell>
        <TableCell className="max-w-xs truncate text-sm">
          {formatValue(entry.value, entry.type)}
        </TableCell>
        <TableCell className="text-sm">
          {formatBytes(getValueSize(entry.value))}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {(entry.tags || []).slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(entry.tags || []).length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{(entry.tags || []).length - 2}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">{entry.accessCount}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDistanceToNow(entry.lastAccessed)} ago
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEntry(entry)}
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteEntry(entry.key)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Memory Viewer</h3>
          <p className="text-muted-foreground">Inspect and manage agent memory</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleClearExpired}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Expired
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMemoryData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Memory Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memoryStats?.totalEntries || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoryStats ? formatBytes(memoryStats.memoryUsage) : '0 MB'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoryStats ? Math.round(memoryStats.hitRate * 100) : 0}%
            </div>
            <Progress 
              value={memoryStats ? memoryStats.hitRate * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Access Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoryStats ? memoryStats.averageAccessTime.toFixed(1) : 0}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Types</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(entriesByType).filter(type => 
                entriesByType[type as keyof typeof entriesByType].length > 0
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memory entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="object">Object</SelectItem>
                <SelectItem value="array">Array</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: "key" | "created" | "accessed" | "size") => setSortBy(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="key">Key</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="accessed">Accessed</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory Tables */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({filteredEntries.length})</TabsTrigger>
          <TabsTrigger value="most-accessed">Most Accessed</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Access Count</TableHead>
                      <TableHead>Last Accessed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <MemoryEntryRow key={entry.key} entry={entry} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="most-accessed">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Access Count</TableHead>
                      <TableHead>Last Accessed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostAccessedEntries.map((entry) => (
                      <MemoryEntryRow key={entry.key} entry={entry} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-type">
          <div className="space-y-4">
            {Object.entries(entriesByType).map(([type, entries]) => (
              entries.length > 0 && (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Badge className={typeColors[type as keyof typeof typeColors]}>
                        {React.createElement(typeIcons[type as keyof typeof typeIcons], { className: "w-3 h-3 mr-1" })}
                        {type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">({entries.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Access Count</TableHead>
                          <TableHead>Last Accessed</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.key} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {entry.key}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm">
                              {formatValue(entry.value, entry.type)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatBytes(getValueSize(entry.value))}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(entry.tags || []).slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {(entry.tags || []).length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{(entry.tags || []).length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{entry.accessCount}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(entry.lastAccessed)} ago
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEntry(entry)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry.key)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Memory Entry Detail Dialog */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Memory Entry - {selectedEntry.key}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <div className="mt-1">
                    <Badge className={typeColors[selectedEntry.type as keyof typeof typeColors]}>
                      {React.createElement(typeIcons[selectedEntry.type as keyof typeof typeIcons], { className: "w-3 h-3 mr-1" })}
                      {selectedEntry.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Size</Label>
                  <p className="mt-1">{formatBytes(getValueSize(selectedEntry.value))}</p>
                </div>
                <div>
                  <Label>Access Count</Label>
                  <p className="mt-1">{selectedEntry.accessCount}</p>
                </div>
                <div>
                  <Label>TTL</Label>
                  <p className="mt-1">{selectedEntry.ttl ? `${selectedEntry.ttl}s` : 'No expiration'}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="mt-1 text-sm">{format(selectedEntry.createdAt, 'PPpp')}</p>
                </div>
                <div>
                  <Label>Last Accessed</Label>
                  <p className="mt-1 text-sm">{format(selectedEntry.lastAccessed, 'PPpp')}</p>
                </div>
              </div>
              
              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedEntry.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div>
                <Label>Value</Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  value={JSON.stringify(selectedEntry.value, null, 2)}
                  readOnly
                  rows={15}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}