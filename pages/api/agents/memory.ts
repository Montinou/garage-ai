/**
 * Memory operations API endpoint for agent memory management
 * Provides CRUD operations for agent memory and caching functionality
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { config } from '../../../lib/config';
import { 
  MemoryEntry,
  MemoryQuery,
  MemoryStats,
  ApiResponse,
  PaginatedApiResponse
} from '../../../agents/types/AgentTypes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any> | PaginatedApiResponse<any>>
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Initialize configuration
    await config.initialize();
    
    console.log(`Memory API ${req.method} request`, {
      requestId,
      query: req.query,
      hasBody: !!req.body,
      timestamp: new Date().toISOString()
    });
    
    if (req.method === 'GET') {
      const { agentId, key, stats } = req.query;
      
      if (stats === 'true') {
        await handleGetMemoryStats(req, res, requestId);
      } else if (agentId && typeof agentId === 'string') {
        if (key && typeof key === 'string') {
          await handleGetMemoryEntry(req, res, requestId, agentId, key);
        } else {
          await handleQueryMemory(req, res, requestId, agentId);
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: agentId',
          timestamp: new Date(),
          requestId
        });
      }
    } else if (req.method === 'POST') {
      await handleSetMemoryEntry(req, res, requestId);
    } else if (req.method === 'PUT') {
      await handleUpdateMemoryEntry(req, res, requestId);
    } else if (req.method === 'DELETE') {
      await handleDeleteMemoryEntry(req, res, requestId);
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp: new Date(),
        requestId
      });
    }
  } catch (error) {
    console.error('Memory API error:', {
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      method: req.method,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date(),
      requestId
    });
  }
}

/**
 * Handle get memory entry
 */
async function handleGetMemoryEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MemoryEntry>>,
  requestId: string,
  agentId: string,
  key: string
): Promise<void> {
  try {
    const { data: memoryEntry, error } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agentId)
      .eq('memory_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !memoryEntry) {
      res.status(404).json({
        success: false,
        error: 'Memory entry not found or expired',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Update access count and last accessed time
    await supabase
      .from('agent_memory')
      .update({
        access_count: memoryEntry.access_count + 1,
        last_accessed: new Date(),
        updated_at: new Date()
      })
      .eq('id', memoryEntry.id);

    const transformedEntry: MemoryEntry = {
      key: memoryEntry.memory_key,
      value: memoryEntry.memory_value,
      type: memoryEntry.memory_type,
      ttl: memoryEntry.ttl,
      tags: memoryEntry.tags || [],
      createdAt: new Date(memoryEntry.created_at),
      updatedAt: new Date(memoryEntry.updated_at),
      accessCount: memoryEntry.access_count + 1,
      lastAccessed: new Date()
    };

    res.status(200).json({
      success: true,
      data: transformedEntry,
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Get memory entry error:', error);
    throw error;
  }
}

/**
 * Handle query memory entries
 */
async function handleQueryMemory(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedApiResponse<MemoryEntry>>,
  requestId: string,
  agentId: string
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    // Parse query parameters
    const tags = req.query.tags ? String(req.query.tags).split(',') : undefined;
    const type = req.query.type as string;
    const createdAfter = req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined;
    const createdBefore = req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined;
    const includeExpired = req.query.includeExpired === 'true';

    let query = supabase
      .from('agent_memory')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId);

    // Apply filters
    if (!includeExpired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (type) {
      query = query.eq('memory_type', type);
    }

    if (createdAfter) {
      query = query.gte('created_at', createdAfter.toISOString());
    }

    if (createdBefore) {
      query = query.lte('created_at', createdBefore.toISOString());
    }

    const { data: memoryEntries, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to query memory entries: ${error.message}`);
    }

    const transformedEntries: MemoryEntry[] = (memoryEntries || []).map(entry => ({
      key: entry.memory_key,
      value: entry.memory_value,
      type: entry.memory_type,
      ttl: entry.ttl,
      tags: entry.tags || [],
      createdAt: new Date(entry.created_at),
      updatedAt: new Date(entry.updated_at),
      accessCount: entry.access_count,
      lastAccessed: new Date(entry.last_accessed)
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    res.status(200).json({
      success: true,
      data: transformedEntries,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Query memory error:', error);
    throw error;
  }
}

/**
 * Handle set memory entry
 */
async function handleSetMemoryEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MemoryEntry>>,
  requestId: string
): Promise<void> {
  try {
    const { agentId, key, value, ttl, tags } = req.body;

    // Validate required fields
    if (!agentId || !key || value === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, key, value',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl) : null;
    const valueType = getValueType(value);

    // Check if entry already exists
    const { data: existingEntry } = await supabase
      .from('agent_memory')
      .select('id, access_count')
      .eq('agent_id', agentId)
      .eq('memory_key', key)
      .single();

    const memoryData = {
      agent_id: agentId,
      memory_key: key,
      memory_value: value,
      memory_type: valueType,
      ttl: ttl || null,
      tags: tags || [],
      expires_at: expiresAt,
      access_count: existingEntry?.access_count || 0,
      last_accessed: now,
      updated_at: now
    };

    let result;
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('agent_memory')
        .update(memoryData)
        .eq('id', existingEntry.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update memory entry: ${error.message}`);
      }
      result = data;
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('agent_memory')
        .insert({
          ...memoryData,
          created_at: now
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create memory entry: ${error.message}`);
      }
      result = data;
    }

    const transformedEntry: MemoryEntry = {
      key: result.memory_key,
      value: result.memory_value,
      type: result.memory_type,
      ttl: result.ttl,
      tags: result.tags || [],
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
      accessCount: result.access_count,
      lastAccessed: new Date(result.last_accessed)
    };

    res.status(200).json({
      success: true,
      data: transformedEntry,
      message: existingEntry ? 'Memory entry updated' : 'Memory entry created',
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Set memory entry error:', error);
    throw error;
  }
}

/**
 * Handle update memory entry
 */
async function handleUpdateMemoryEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MemoryEntry>>,
  requestId: string
): Promise<void> {
  try {
    const { agentId, key, value, ttl, tags } = req.body;

    if (!agentId || !key) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, key',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Get existing entry
    const { data: existingEntry, error: fetchError } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agentId)
      .eq('memory_key', key)
      .single();

    if (fetchError || !existingEntry) {
      res.status(404).json({
        success: false,
        error: 'Memory entry not found',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    const now = new Date();
    const updateData: any = {
      updated_at: now,
      last_accessed: now
    };

    if (value !== undefined) {
      updateData.memory_value = value;
      updateData.memory_type = getValueType(value);
    }

    if (ttl !== undefined) {
      updateData.ttl = ttl;
      updateData.expires_at = ttl ? new Date(now.getTime() + ttl) : null;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    const { data: updatedEntry, error: updateError } = await supabase
      .from('agent_memory')
      .update(updateData)
      .eq('id', existingEntry.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update memory entry: ${updateError.message}`);
    }

    const transformedEntry: MemoryEntry = {
      key: updatedEntry.memory_key,
      value: updatedEntry.memory_value,
      type: updatedEntry.memory_type,
      ttl: updatedEntry.ttl,
      tags: updatedEntry.tags || [],
      createdAt: new Date(updatedEntry.created_at),
      updatedAt: new Date(updatedEntry.updated_at),
      accessCount: updatedEntry.access_count,
      lastAccessed: new Date(updatedEntry.last_accessed)
    };

    res.status(200).json({
      success: true,
      data: transformedEntry,
      message: 'Memory entry updated successfully',
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Update memory entry error:', error);
    throw error;
  }
}

/**
 * Handle delete memory entry
 */
async function handleDeleteMemoryEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>,
  requestId: string
): Promise<void> {
  try {
    const { agentId, key } = req.query;

    if (!agentId || !key || typeof agentId !== 'string' || typeof key !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid required parameters: agentId, key',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    const { data: deletedEntry, error } = await supabase
      .from('agent_memory')
      .delete()
      .eq('agent_id', agentId)
      .eq('memory_key', key)
      .select()
      .single();

    if (error || !deletedEntry) {
      res.status(404).json({
        success: false,
        error: 'Memory entry not found',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Memory entry deleted successfully',
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Delete memory entry error:', error);
    throw error;
  }
}

/**
 * Handle get memory statistics
 */
async function handleGetMemoryStats(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MemoryStats>>,
  requestId: string
): Promise<void> {
  try {
    const { agentId } = req.query;

    let query = supabase
      .from('agent_memory')
      .select('memory_value, access_count, created_at');

    if (agentId && typeof agentId === 'string') {
      query = query.eq('agent_id', agentId);
    }

    const { data: entries, error } = await query
      .gt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to get memory stats: ${error.message}`);
    }

    // Calculate statistics
    const totalEntries = entries?.length || 0;
    let memoryUsage = 0;
    let totalAccesses = 0;

    for (const entry of entries || []) {
      memoryUsage += JSON.stringify(entry.memory_value).length;
      totalAccesses += entry.access_count;
    }

    // Calculate hit/miss rates (simplified calculation)
    const hitRate = totalEntries > 0 ? 0.85 : 0; // Mock hit rate
    const missRate = 1 - hitRate;

    const stats: MemoryStats = {
      totalEntries,
      memoryUsage,
      hitRate,
      missRate,
      averageAccessTime: 0 // TODO: Implement actual timing measurements
    };

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Get memory stats error:', error);
    throw error;
  }
}

/**
 * Get value type helper function
 */
function getValueType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Cleanup expired memory entries (can be called via cron job)
 */
export async function cleanupExpiredMemoryEntries(): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_memory')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to cleanup expired memory entries:', error);
    } else {
      console.log('Expired memory entries cleaned up successfully');
    }
  } catch (error) {
    console.error('Memory cleanup error:', error);
  }
}