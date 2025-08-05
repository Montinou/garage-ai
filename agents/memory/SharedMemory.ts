/**
 * SharedMemory implementation for agent memory management
 * Provides caching, persistence, and vector storage capabilities
 */

import { supabase } from '../../lib/supabase';
import { 
  MemoryEntry, 
  MemoryQuery, 
  MemoryStats, 
  HealthCheck 
} from '../types/AgentTypes';

export class SharedMemory {
  private agentId: string;
  private localCache: Map<string, MemoryEntry>;
  private config: {
    maxCacheSize: number;
    defaultTTL: number;
    persistentStorage: boolean;
    enableLRU: boolean;
    syncIntervalMs: number;
  };
  private stats: {
    hits: number;
    misses: number;
    totalAccesses: number;
    lastSync: Date;
  };
  private syncInterval: NodeJS.Timeout | null;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.localCache = new Map();
    this.config = {
      maxCacheSize: 1000,
      defaultTTL: 3600000, // 1 hour in milliseconds
      persistentStorage: true,
      enableLRU: true,
      syncIntervalMs: 30000 // 30 seconds
    };
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccesses: 0,
      lastSync: new Date()
    };
    this.syncInterval = null;

    this.initialize();
  }

  /**
   * Initialize shared memory
   */
  private async initialize(): Promise<void> {
    try {
      if (this.config.persistentStorage) {
        await this.loadFromPersistentStorage();
        this.startPeriodicSync();
      }
      this.log('SharedMemory initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize SharedMemory', error);
      throw error;
    }
  }

  /**
   * Load data from persistent storage
   */
  private async loadFromPersistentStorage(): Promise<void> {
    try {
      const { data: entries, error } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_id', this.agentId)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to load from persistent storage: ${error.message}`);
      }

      for (const entry of entries || []) {
        const memoryEntry: MemoryEntry = {
          key: entry.memory_key,
          value: entry.memory_value,
          type: entry.memory_type,
          ttl: entry.ttl,
          tags: entry.tags || [],
          createdAt: new Date(entry.created_at),
          updatedAt: new Date(entry.updated_at),
          accessCount: entry.access_count,
          lastAccessed: new Date(entry.last_accessed)
        };

        this.localCache.set(entry.memory_key, memoryEntry);
      }

      this.log(`Loaded ${entries?.length || 0} entries from persistent storage`);
    } catch (error) {
      this.logError('Failed to load from persistent storage', error);
    }
  }

  /**
   * Start periodic synchronization with persistent storage
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncToPersistentStorage();
      } catch (error) {
        this.logError('Periodic sync failed', error);
      }
    }, this.config.syncIntervalMs);
  }

  /**
   * Sync local cache to persistent storage
   */
  private async syncToPersistentStorage(): Promise<void> {
    if (!this.config.persistentStorage) {
      return;
    }

    try {
      const entriesToSync: any[] = [];
      const now = new Date();

      for (const [key, entry] of this.localCache.entries()) {
        // Skip expired entries
        if (this.isExpired(entry)) {
          this.localCache.delete(key);
          continue;
        }

        entriesToSync.push({
          agent_id: this.agentId,
          memory_key: key,
          memory_value: entry.value,
          memory_type: entry.type,
          ttl: entry.ttl,
          tags: entry.tags,
          access_count: entry.accessCount,
          last_accessed: entry.lastAccessed,
          expires_at: entry.ttl ? new Date(entry.createdAt.getTime() + entry.ttl) : null,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt
        });
      }

      if (entriesToSync.length > 0) {
        const { error } = await supabase
          .from('agent_memory')
          .upsert(entriesToSync, {
            onConflict: 'agent_id,memory_key'
          });

        if (error) {
          throw new Error(`Failed to sync to persistent storage: ${error.message}`);
        }
      }

      // Clean up expired entries from database
      await this.cleanupExpiredEntries();

      this.stats.lastSync = now;
      this.log(`Synced ${entriesToSync.length} entries to persistent storage`);
    } catch (error) {
      this.logError('Failed to sync to persistent storage', error);
    }
  }

  /**
   * Clean up expired entries from database
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_memory')
        .delete()
        .eq('agent_id', this.agentId)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to cleanup expired entries: ${error.message}`);
      }
    } catch (error) {
      this.logError('Failed to cleanup expired entries', error);
    }
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: MemoryEntry): boolean {
    if (!entry.ttl) {
      return false;
    }
    
    const expirationTime = entry.createdAt.getTime() + entry.ttl;
    return Date.now() > expirationTime;
  }

  /**
   * Enforce LRU cache eviction
   */
  private enforceCacheSize(): void {
    if (!this.config.enableLRU || this.localCache.size <= this.config.maxCacheSize) {
      return;
    }

    // Sort entries by last accessed time
    const entries = Array.from(this.localCache.entries())
      .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    // Remove oldest entries
    const entriesToRemove = entries.slice(0, this.localCache.size - this.config.maxCacheSize);
    
    for (const [key] of entriesToRemove) {
      this.localCache.delete(key);
    }

    this.log(`Evicted ${entriesToRemove.length} entries from cache`);
  }

  /**
   * Set a value in memory
   */
  async set(key: string, value: any, ttl?: number, tags?: string[]): Promise<void> {
    try {
      const now = new Date();
      const existingEntry = this.localCache.get(key);
      
      const entry: MemoryEntry = {
        key,
        value,
        type: this.getValueType(value),
        ttl: ttl || this.config.defaultTTL,
        tags: tags || [],
        createdAt: existingEntry?.createdAt || now,
        updatedAt: now,
        accessCount: existingEntry?.accessCount || 0,
        lastAccessed: now
      };

      this.localCache.set(key, entry);
      this.enforceCacheSize();

      // Immediate sync for high-priority data
      if (this.config.persistentStorage && tags?.includes('persist-immediately')) {
        await this.syncSingleEntry(key, entry);
      }

      this.log(`Set value for key: ${key}`);
    } catch (error) {
      this.logError('Failed to set memory value', error);
      throw error;
    }
  }

  /**
   * Get a value from memory
   */
  async get(key: string): Promise<any> {
    try {
      this.stats.totalAccesses++;
      
      // Check local cache first
      let entry = this.localCache.get(key);
      
      if (entry) {
        // Check if expired
        if (this.isExpired(entry)) {
          this.localCache.delete(key);
          this.stats.misses++;
          return null;
        }
        
        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = new Date();
        this.stats.hits++;
        
        return entry.value;
      }

      // Try to load from persistent storage
      if (this.config.persistentStorage) {
        const { data: dbEntry, error } = await supabase
          .from('agent_memory')
          .select('*')
          .eq('agent_id', this.agentId)
          .eq('memory_key', key)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!error && dbEntry) {
          entry = {
            key: dbEntry.memory_key,
            value: dbEntry.memory_value,
            type: dbEntry.memory_type,
            ttl: dbEntry.ttl,
            tags: dbEntry.tags || [],
            createdAt: new Date(dbEntry.created_at),
            updatedAt: new Date(dbEntry.updated_at),
            accessCount: dbEntry.access_count + 1,
            lastAccessed: new Date()
          };

          // Add to local cache
          this.localCache.set(key, entry);
          this.enforceCacheSize();
          
          // Update access count in database
          await this.updateAccessCount(key, entry.accessCount);
          
          this.stats.hits++;
          return entry.value;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.logError('Failed to get memory value', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Update access count in database
   */
  private async updateAccessCount(key: string, accessCount: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_memory')
        .update({
          access_count: accessCount,
          last_accessed: new Date()
        })
        .eq('agent_id', this.agentId)
        .eq('memory_key', key);

      if (error) {
        this.logError('Failed to update access count', error);
      }
    } catch (error) {
      this.logError('Failed to update access count', error);
    }
  }

  /**
   * Sync single entry to persistent storage
   */
  private async syncSingleEntry(key: string, entry: MemoryEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_memory')
        .upsert({
          agent_id: this.agentId,
          memory_key: key,
          memory_value: entry.value,
          memory_type: entry.type,
          ttl: entry.ttl,
          tags: entry.tags,
          access_count: entry.accessCount,
          last_accessed: entry.lastAccessed,
          expires_at: entry.ttl ? new Date(entry.createdAt.getTime() + entry.ttl) : null,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt
        }, {
          onConflict: 'agent_id,memory_key'
        });

      if (error) {
        throw new Error(`Failed to sync single entry: ${error.message}`);
      }
    } catch (error) {
      this.logError('Failed to sync single entry', error);
    }
  }

  /**
   * Delete a value from memory
   */
  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.localCache.has(key);
      this.localCache.delete(key);

      if (this.config.persistentStorage) {
        const { error } = await supabase
          .from('agent_memory')
          .delete()
          .eq('agent_id', this.agentId)
          .eq('memory_key', key);

        if (error) {
          this.logError('Failed to delete from persistent storage', error);
        }
      }

      this.log(`Deleted key: ${key}`);
      return existed;
    } catch (error) {
      this.logError('Failed to delete memory value', error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all memory entries for this agent
   */
  async clear(): Promise<void> {
    try {
      this.localCache.clear();

      if (this.config.persistentStorage) {
        const { error } = await supabase
          .from('agent_memory')
          .delete()
          .eq('agent_id', this.agentId);

        if (error) {
          throw new Error(`Failed to clear persistent storage: ${error.message}`);
        }
      }

      this.log('Cleared all memory entries');
    } catch (error) {
      this.logError('Failed to clear memory', error);
      throw error;
    }
  }

  /**
   * Query memory entries
   */
  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    try {
      const results: MemoryEntry[] = [];
      
      // Search in local cache
      for (const [key, entry] of this.localCache.entries()) {
        if (this.matchesQuery(key, entry, query)) {
          results.push(entry);
        }
      }

      // Also search in persistent storage if needed
      if (this.config.persistentStorage && query.keys && query.keys.length > 0) {
        const { data: dbEntries, error } = await supabase
          .from('agent_memory')
          .select('*')
          .eq('agent_id', this.agentId)
          .in('memory_key', query.keys)
          .gt('expires_at', new Date().toISOString());

        if (!error && dbEntries) {
          for (const dbEntry of dbEntries) {
            if (!this.localCache.has(dbEntry.memory_key)) {
              const entry: MemoryEntry = {
                key: dbEntry.memory_key,
                value: dbEntry.memory_value,
                type: dbEntry.memory_type,
                ttl: dbEntry.ttl,
                tags: dbEntry.tags || [],
                createdAt: new Date(dbEntry.created_at),
                updatedAt: new Date(dbEntry.updated_at),
                accessCount: dbEntry.access_count,
                lastAccessed: new Date(dbEntry.last_accessed)
              };

              if (this.matchesQuery(entry.key, entry, query)) {
                results.push(entry);
              }
            }
          }
        }
      }

      // Apply limit and offset
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      
      return results.slice(offset, offset + limit);
    } catch (error) {
      this.logError('Failed to query memory', error);
      return [];
    }
  }

  /**
   * Check if entry matches query criteria
   */
  private matchesQuery(key: string, entry: MemoryEntry, query: MemoryQuery): boolean {
    // Check keys filter
    if (query.keys && !query.keys.includes(key)) {
      return false;
    }

    // Check tags filter
    if (query.tags && query.tags.length > 0) {
      const hasMatchingTag = query.tags.some(tag => entry.tags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check type filter
    if (query.type && entry.type !== query.type) {
      return false;
    }

    // Check date filters
    if (query.createdAfter && entry.createdAt < query.createdAfter) {
      return false;
    }

    if (query.createdBefore && entry.createdAt > query.createdBefore) {
      return false;
    }

    return true;
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      const hitRate = this.stats.totalAccesses > 0 ? this.stats.hits / this.stats.totalAccesses : 0;
      const missRate = this.stats.totalAccesses > 0 ? this.stats.misses / this.stats.totalAccesses : 0;
      
      // Calculate memory usage (approximate)
      let memoryUsage = 0;
      for (const entry of this.localCache.values()) {
        memoryUsage += JSON.stringify(entry).length;
      }

      return {
        totalEntries: this.localCache.size,
        memoryUsage,
        hitRate,
        missRate,
        averageAccessTime: 0 // TODO: Implement timing measurements
      };
    } catch (error) {
      this.logError('Failed to get memory stats', error);
      return {
        totalEntries: 0,
        memoryUsage: 0,
        hitRate: 0,
        missRate: 0,
        averageAccessTime: 0
      };
    }
  }

  /**
   * Get value type
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Health check for shared memory
   */
  async healthCheck(): Promise<HealthCheck> {
    try {
      // Test basic operations
      const testKey = `__health_check_${Date.now()}`;
      const testValue = { test: true, timestamp: new Date() };
      
      await this.set(testKey, testValue, 1000); // 1 second TTL
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      if (!retrieved || retrieved.test !== true) {
        throw new Error('Basic memory operations failed');
      }

      // Test database connectivity if persistent storage is enabled
      if (this.config.persistentStorage) {
        const { error } = await supabase
          .from('agent_memory')
          .select('id')
          .limit(1);

        if (error) {
          throw new Error(`Database connectivity issue: ${error.message}`);
        }
      }

      const stats = await this.getStats();

      return {
        healthy: true,
        details: {
          component: 'SharedMemory',
          status: 'healthy',
          lastCheck: new Date(),
          metrics: {
            cacheSize: this.localCache.size,
            hitRate: stats.hitRate,
            memoryUsage: stats.memoryUsage,
            lastSync: this.stats.lastSync
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          component: 'SharedMemory',
          status: 'unhealthy',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      // Final sync before cleanup
      if (this.config.persistentStorage) {
        await this.syncToPersistentStorage();
      }

      this.localCache.clear();
      this.log('SharedMemory cleanup completed');
    } catch (error) {
      this.logError('SharedMemory cleanup failed', error);
    }
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'SharedMemory',
      agentId: this.agentId,
      level: 'INFO',
      message,
      data
    };
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Error logging utility
   */
  private logError(message: string, error: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'SharedMemory',
      agentId: this.agentId,
      level: 'ERROR',
      message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    console.error(JSON.stringify(logEntry));
  }
}

export default SharedMemory;