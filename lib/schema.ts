import { 
  pgTable, 
  text, 
  timestamp, 
  integer, 
  jsonb, 
  boolean, 
  uuid, 
  varchar, 
  decimal,
  pgEnum,
  index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums for agent system
export const agentTypeEnum = pgEnum('agent_type', [
  'orchestrator',
  'explorer', 
  'analyzer',
  'extractor',
  'validator'
]);

export const agentStatusEnum = pgEnum('agent_status', [
  'idle',
  'starting',
  'running',
  'stopping',
  'stopped',
  'error',
  'paused'
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'retrying'
]);

export const jobPriorityEnum = pgEnum('job_priority', [
  'low',
  'normal', 
  'high',
  'critical'
]);

// Core Vehicle Tables (existing)
export const brands = pgTable('brands', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const models = pgTable('models', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  brandId: integer('brand_id').references(() => brands.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('USD'),
  year: integer('year'),
  mileage: integer('mileage'),
  engineSize: decimal('engine_size', { precision: 4, scale: 2 }),
  horsepower: integer('horsepower'),
  brandId: integer('brand_id').references(() => brands.id),
  modelId: integer('model_id').references(() => models.id),
  color: varchar('color', { length: 50 }),
  condition: varchar('condition', { length: 50 }),
  locationCity: varchar('location_city', { length: 100 }),
  locationState: varchar('location_state', { length: 100 }),
  locationCountry: varchar('location_country', { length: 100 }),
  vin: varchar('vin', { length: 50 }),
  licensePlate: varchar('license_plate', { length: 20 }),
  sellerName: varchar('seller_name', { length: 200 }),
  sellerPhone: varchar('seller_phone', { length: 50 }),
  sellerEmail: varchar('seller_email', { length: 200 }),
  sourceUrl: text('source_url').notNull(),
  sourcePortal: varchar('source_portal', { length: 100 }).notNull(),
  aiAnalysisSummary: text('ai_analysis_summary'),
  isOpportunityAi: boolean('is_opportunity_ai').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  priceIdx: index('vehicles_price_idx').on(table.price),
  yearIdx: index('vehicles_year_idx').on(table.year),
  brandIdx: index('vehicles_brand_idx').on(table.brandId),
  sourceIdx: index('vehicles_source_idx').on(table.sourcePortal),
  createdAtIdx: index('vehicles_created_at_idx').on(table.createdAt)
}));

export const images = pgTable('images', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url').notNull(),
  imageOrder: integer('image_order').default(0),
  imageType: varchar('image_type', { length: 50 }).default('exterior'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  vehicleIdx: index('images_vehicle_idx').on(table.vehicleId),
  primaryIdx: index('images_primary_idx').on(table.isPrimary)
}));

// Agent System Tables
export const agentJobs = pgTable('agent_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  agentType: agentTypeEnum('agent_type').notNull(),
  jobType: varchar('job_type', { length: 100 }).notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  priority: jobPriorityEnum('priority').default('normal').notNull(),
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  agentIdx: index('agent_jobs_agent_idx').on(table.agentId),
  statusIdx: index('agent_jobs_status_idx').on(table.status),
  priorityIdx: index('agent_jobs_priority_idx').on(table.priority),
  scheduledIdx: index('agent_jobs_scheduled_idx').on(table.scheduledAt),
  createdAtIdx: index('agent_jobs_created_at_idx').on(table.createdAt)
}));

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  agentType: agentTypeEnum('agent_type').notNull(),
  key: varchar('key', { length: 200 }).notNull(),
  value: jsonb('value').notNull(),
  tags: jsonb('tags'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  agentKeyIdx: index('agent_memory_agent_key_idx').on(table.agentId, table.key),
  expiresIdx: index('agent_memory_expires_idx').on(table.expiresAt),
  tagsIdx: index('agent_memory_tags_idx').on(table.tags)
}));

export const agentMetrics = pgTable('agent_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  agentType: agentTypeEnum('agent_type').notNull(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  metricValue: decimal('metric_value', { precision: 10, scale: 4 }).notNull(),
  metricUnit: varchar('metric_unit', { length: 50 }),
  metadata: jsonb('metadata'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  agentMetricIdx: index('agent_metrics_agent_metric_idx').on(table.agentId, table.metricName),
  recordedIdx: index('agent_metrics_recorded_idx').on(table.recordedAt)
}));

export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  fromAgentId: varchar('from_agent_id', { length: 100 }).notNull(),
  toAgentId: varchar('to_agent_id', { length: 100 }),
  messageType: varchar('message_type', { length: 100 }).notNull(),
  topic: varchar('topic', { length: 200 }),
  payload: jsonb('payload').notNull(),
  priority: jobPriorityEnum('priority').default('normal').notNull(),
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  toAgentIdx: index('agent_messages_to_agent_idx').on(table.toAgentId),
  topicIdx: index('agent_messages_topic_idx').on(table.topic),
  processedIdx: index('agent_messages_processed_idx').on(table.processed),
  createdAtIdx: index('agent_messages_created_at_idx').on(table.createdAt)
}));

export const agentOrchestrations = pgTable('agent_orchestrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orchestratorId: varchar('orchestrator_id', { length: 100 }).notNull(),
  workflowName: varchar('workflow_name', { length: 100 }).notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  config: jsonb('config').notNull(),
  progress: jsonb('progress'),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  orchestratorIdx: index('agent_orchestrations_orchestrator_idx').on(table.orchestratorId),
  workflowIdx: index('agent_orchestrations_workflow_idx').on(table.workflowName),
  statusIdx: index('agent_orchestrations_status_idx').on(table.status),
  createdAtIdx: index('agent_orchestrations_created_at_idx').on(table.createdAt)
}));

// Export all tables for use in queries
export const schema = {
  brands,
  models,
  vehicles,
  images,
  agentJobs,
  agentMemory,
  agentMetrics,
  agentMessages,
  agentOrchestrations
};

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type AgentJob = typeof agentJobs.$inferSelect;
export type NewAgentJob = typeof agentJobs.$inferInsert;
export type AgentMemory = typeof agentMemory.$inferSelect;
export type NewAgentMemory = typeof agentMemory.$inferInsert;
export type AgentMetric = typeof agentMetrics.$inferSelect;
export type NewAgentMetric = typeof agentMetrics.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
export type AgentOrchestration = typeof agentOrchestrations.$inferSelect;
export type NewAgentOrchestration = typeof agentOrchestrations.$inferInsert;