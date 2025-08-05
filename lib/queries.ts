import { db } from './neon';
import { 
  agentJobs, 
  agentMemory, 
  agentMetrics, 
  agentMessages, 
  agentOrchestrations,
  vehicles,
  brands,
  models,
  images,
  type AgentJob,
  type NewAgentJob,
  type AgentMemory as AgentMemoryType,
  type NewAgentMemory,
  type Vehicle,
  type NewVehicle
} from './schema';
import { eq, desc, and, lt, sql, count, avg, max, min } from 'drizzle-orm';

// Agent Job Operations
export const createAgentJob = async (job: NewAgentJob): Promise<AgentJob> => {
  const [createdJob] = await db.insert(agentJobs).values(job).returning();
  return createdJob;
};

export const getAgentJobs = async (agentId?: string, status?: string, limit = 50) => {
  let query = db.select().from(agentJobs);
  
  if (agentId && status) {
    query = query.where(and(eq(agentJobs.agentId, agentId), eq(agentJobs.status, status as any)));
  } else if (agentId) {
    query = query.where(eq(agentJobs.agentId, agentId));
  } else if (status) {
    query = query.where(eq(agentJobs.status, status as any));
  }
  
  return await query.orderBy(desc(agentJobs.createdAt)).limit(limit);
};

export const updateAgentJob = async (id: string, updates: Partial<AgentJob>) => {
  const [updatedJob] = await db
    .update(agentJobs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(agentJobs.id, id))
    .returning();
  return updatedJob;
};

export const getPendingJobs = async (agentType?: string, limit = 10) => {
  let query = db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.status, 'pending'));
    
  if (agentType) {
    query = query.where(and(
      eq(agentJobs.status, 'pending'),
      eq(agentJobs.agentType, agentType as any)
    ));
  }
  
  return await query
    .orderBy(agentJobs.priority, agentJobs.scheduledAt)
    .limit(limit);
};

// Agent Memory Operations
export const setAgentMemory = async (memory: NewAgentMemory): Promise<AgentMemoryType> => {
  // Upsert: update if exists, insert if not
  const [existingMemory] = await db
    .select()
    .from(agentMemory)
    .where(and(
      eq(agentMemory.agentId, memory.agentId),
      eq(agentMemory.key, memory.key)
    ))
    .limit(1);

  if (existingMemory) {
    const [updatedMemory] = await db
      .update(agentMemory)
      .set({ ...memory, updatedAt: new Date() })
      .where(eq(agentMemory.id, existingMemory.id))
      .returning();
    return updatedMemory;
  } else {
    const [createdMemory] = await db.insert(agentMemory).values(memory).returning();
    return createdMemory;
  }
};

export const getAgentMemory = async (agentId: string, key?: string) => {
  if (key) {
    const [memory] = await db
      .select()
      .from(agentMemory)
      .where(and(
        eq(agentMemory.agentId, agentId),
        eq(agentMemory.key, key)
      ))
      .limit(1);
    return memory;
  }
  
  return await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.updatedAt));
};

export const cleanupExpiredMemory = async () => {
  const result = await db
    .delete(agentMemory)
    .where(and(
      lt(agentMemory.expiresAt, new Date()),
      sql`${agentMemory.expiresAt} IS NOT NULL`
    ));
  return result;
};

// Agent Metrics Operations
export const recordAgentMetric = async (
  agentId: string,
  agentType: string,
  metricName: string,
  value: number,
  unit?: string,
  metadata?: any
) => {
  const [metric] = await db.insert(agentMetrics).values({
    agentId,
    agentType: agentType as any,
    metricName,
    metricValue: value.toString(),
    metricUnit: unit,
    metadata
  }).returning();
  return metric;
};

export const getAgentMetrics = async (
  agentId?: string,
  metricName?: string,
  hours = 24
) => {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  let query = db
    .select()
    .from(agentMetrics)
    .where(sql`${agentMetrics.recordedAt} >= ${hoursAgo}`);
    
  if (agentId && metricName) {
    query = query.where(and(
      eq(agentMetrics.agentId, agentId),
      eq(agentMetrics.metricName, metricName),
      sql`${agentMetrics.recordedAt} >= ${hoursAgo}`
    ));
  } else if (agentId) {
    query = query.where(and(
      eq(agentMetrics.agentId, agentId),
      sql`${agentMetrics.recordedAt} >= ${hoursAgo}`
    ));
  } else if (metricName) {
    query = query.where(and(
      eq(agentMetrics.metricName, metricName),
      sql`${agentMetrics.recordedAt} >= ${hoursAgo}`
    ));
  }
  
  return await query.orderBy(desc(agentMetrics.recordedAt));
};

export const getAgentMetricsSummary = async (agentId: string, hours = 24) => {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const summary = await db
    .select({
      metricName: agentMetrics.metricName,
      count: count(),
      avg: avg(agentMetrics.metricValue),
      min: min(agentMetrics.metricValue),
      max: max(agentMetrics.metricValue),
      unit: agentMetrics.metricUnit
    })
    .from(agentMetrics)
    .where(and(
      eq(agentMetrics.agentId, agentId),
      sql`${agentMetrics.recordedAt} >= ${hoursAgo}`
    ))
    .groupBy(agentMetrics.metricName, agentMetrics.metricUnit);
    
  return summary;
};

// Agent Messages Operations
export const sendAgentMessage = async (
  fromAgentId: string,
  toAgentId: string | null,
  messageType: string,
  payload: any,
  topic?: string,
  priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
  expiresAt?: Date
) => {
  const [message] = await db.insert(agentMessages).values({
    fromAgentId,
    toAgentId,
    messageType,
    topic,
    payload,
    priority,
    expiresAt
  }).returning();
  return message;
};

export const getAgentMessages = async (
  agentId?: string,
  topic?: string,
  unprocessedOnly = false,
  limit = 50
) => {
  let query = db.select().from(agentMessages);
  
  const conditions = [];
  
  if (agentId) {
    conditions.push(eq(agentMessages.toAgentId, agentId));
  }
  
  if (topic) {
    conditions.push(eq(agentMessages.topic, topic));
  }
  
  if (unprocessedOnly) {
    conditions.push(eq(agentMessages.processed, false));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  return await query
    .orderBy(agentMessages.priority, desc(agentMessages.createdAt))
    .limit(limit);
};

export const markMessageProcessed = async (messageId: string) => {
  const [updatedMessage] = await db
    .update(agentMessages)
    .set({ processed: true, processedAt: new Date() })
    .where(eq(agentMessages.id, messageId))
    .returning();
  return updatedMessage;
};

// Vehicle Operations (integrated with existing schema)
export const createVehicle = async (vehicle: NewVehicle): Promise<Vehicle> => {
  const [createdVehicle] = await db.insert(vehicles).values(vehicle).returning();
  return createdVehicle;
};

export const getVehicles = async (limit = 50, offset = 0) => {
  return await db
    .select({
      vehicle: vehicles,
      brand: brands,
      model: models
    })
    .from(vehicles)
    .leftJoin(brands, eq(vehicles.brandId, brands.id))
    .leftJoin(models, eq(vehicles.modelId, models.id))
    .orderBy(desc(vehicles.createdAt))
    .limit(limit)
    .offset(offset);
};

export const getVehicleById = async (id: string) => {
  const [vehicle] = await db
    .select({
      vehicle: vehicles,
      brand: brands,
      model: models,
      images: sql<any[]>`COALESCE(json_agg(${images}) FILTER (WHERE ${images.id} IS NOT NULL), '[]')`
    })
    .from(vehicles)
    .leftJoin(brands, eq(vehicles.brandId, brands.id))
    .leftJoin(models, eq(vehicles.modelId, models.id))
    .leftJoin(images, eq(vehicles.id, images.vehicleId))
    .where(eq(vehicles.id, id))
    .groupBy(vehicles.id, brands.id, models.id)
    .limit(1);
    
  return vehicle;
};

// System Health and Statistics
export const getSystemHealth = async () => {
  const [jobStats] = await db
    .select({
      total: count(),
      pending: count(sql`CASE WHEN ${agentJobs.status} = 'pending' THEN 1 END`),
      running: count(sql`CASE WHEN ${agentJobs.status} = 'running' THEN 1 END`),
      completed: count(sql`CASE WHEN ${agentJobs.status} = 'completed' THEN 1 END`),
      failed: count(sql`CASE WHEN ${agentJobs.status} = 'failed' THEN 1 END`)
    })
    .from(agentJobs)
    .where(sql`${agentJobs.createdAt} >= NOW() - INTERVAL '24 hours'`);

  const [messageStats] = await db
    .select({
      total: count(),
      unprocessed: count(sql`CASE WHEN ${agentMessages.processed} = false THEN 1 END`)
    })
    .from(agentMessages)
    .where(sql`${agentMessages.createdAt} >= NOW() - INTERVAL '1 hour'`);

  const [vehicleStats] = await db
    .select({
      total: count(),
      today: count(sql`CASE WHEN ${vehicles.createdAt} >= CURRENT_DATE THEN 1 END`)
    })
    .from(vehicles);

  return {
    jobs: jobStats,
    messages: messageStats,
    vehicles: vehicleStats,
    timestamp: new Date().toISOString()
  };
};

// Cleanup operations
export const cleanupOldJobs = async (daysOld = 30) => {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await db
    .delete(agentJobs)
    .where(and(
      lt(agentJobs.createdAt, cutoffDate),
      eq(agentJobs.status, 'completed')
    ));
    
  return result;
};

export const cleanupOldMessages = async (hoursOld = 48) => {
  const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  
  const result = await db
    .delete(agentMessages)
    .where(and(
      lt(agentMessages.createdAt, cutoffDate),
      eq(agentMessages.processed, true)
    ));
    
  return result;
};