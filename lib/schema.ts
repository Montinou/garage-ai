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

// Dealership/Concesionaria Tables
export const provinces = pgTable('provinces', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(), // ARG_BA, ARG_COR, etc.
  country: varchar('country', { length: 100 }).default('Argentina').notNull(),
  region: varchar('region', { length: 100 }), // NOA, NEA, Centro, Patagonia, Cuyo
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const cities = pgTable('cities', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  provinceId: integer('province_id').references(() => provinces.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  provinceCityIdx: index('cities_province_city_idx').on(table.provinceId, table.name)
}));

export const dealerships = pgTable('dealerships', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 250 }).notNull().unique(), // URL-friendly identifier
  
  // URLs and contact info
  websiteUrl: text('website_url'),
  baseUrl: text('base_url'), // Base URL for exploration
  usedVehiclesUrl: text('used_vehicles_url'), // Specific used cars URL
  
  // Contact information
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 200 }),
  whatsapp: varchar('whatsapp', { length: 50 }),
  
  // Location
  cityId: integer('city_id').references(() => cities.id),
  provinceId: integer('province_id').references(() => provinces.id),
  address: text('address'),
  coordinates: jsonb('coordinates'), // {lat: -34.6037, lng: -58.3816}
  
  // Business info
  officialBrand: varchar('official_brand', { length: 100 }), // Toyota, Ford, etc.
  dealershipType: varchar('dealership_type', { length: 50 }).default('multimarca'), // official, multimarca
  businessHours: jsonb('business_hours'), // Schedule information
  
  // Exploration configuration
  explorationEnabled: boolean('exploration_enabled').default(true),
  explorationConfig: jsonb('exploration_config'), // AI exploration settings
  explorationFrequency: varchar('exploration_frequency', { length: 20 }).default('daily'), // hourly, daily, weekly
  scraperOrder: integer('scraper_order'), // Order for batch processing (1-24 for hourly batches)
  
  // Social media and ratings
  socialMedia: jsonb('social_media'), // Facebook, Instagram, etc.
  rating: decimal('rating', { precision: 3, scale: 2 }), // 4.5
  reviewCount: integer('review_count').default(0),
  
  // Status and metadata
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  lastExploredAt: timestamp('last_explored_at'),
  metadata: jsonb('metadata'), // Additional flexible data
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('dealerships_name_idx').on(table.name),
  cityIdx: index('dealerships_city_idx').on(table.cityId),
  provinceIdx: index('dealerships_province_idx').on(table.provinceId),
  brandIdx: index('dealerships_brand_idx').on(table.officialBrand),
  activeIdx: index('dealerships_active_idx').on(table.isActive),
  explorationIdx: index('dealerships_exploration_idx').on(table.explorationEnabled, table.explorationFrequency),
  scraperOrderIdx: index('dealerships_scraper_order_idx').on(table.scraperOrder)
}));

// Cloud Storage Images Table (Updated)
export const vehicleImages = pgTable('vehicle_images', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  
  // Original image info
  originalUrl: text('original_url'), // Original URL from source
  sourceFilename: varchar('source_filename', { length: 300 }),
  
  // Google Cloud Storage info
  gcsUrl: text('gcs_url').notNull(), // Full GCS URL
  gcsBucket: varchar('gcs_bucket', { length: 100 }).notNull().default('garage-ai-images'),
  gcsPath: text('gcs_path').notNull(), // Full path in bucket
  gcsFilename: varchar('gcs_filename', { length: 300 }).notNull(),
  
  // Image metadata
  imageOrder: integer('image_order').default(0),
  imageType: varchar('image_type', { length: 50 }).default('exterior'), // exterior, interior, engine, etc.
  isPrimary: boolean('is_primary').default(false),
  
  // File properties
  fileSize: integer('file_size'), // bytes
  mimeType: varchar('mime_type', { length: 100 }),
  width: integer('width'),
  height: integer('height'),
  
  // Processing status
  uploadStatus: varchar('upload_status', { length: 20 }).default('pending'), // pending, uploaded, failed
  processedAt: timestamp('processed_at'),
  
  // Search and categorization
  tags: jsonb('tags'), // ["front-view", "interior", "dashboard"]
  aiAnalysis: jsonb('ai_analysis'), // AI-generated image analysis
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  vehicleIdx: index('vehicle_images_vehicle_idx').on(table.vehicleId),
  primaryIdx: index('vehicle_images_primary_idx').on(table.isPrimary),
  typeIdx: index('vehicle_images_type_idx').on(table.imageType),
  statusIdx: index('vehicle_images_status_idx').on(table.uploadStatus),
  gcsPathIdx: index('vehicle_images_gcs_path_idx').on(table.gcsPath)
}));
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
  currency: varchar('currency', { length: 10 }).default('ARS'), // Changed to ARS for Argentina
  year: integer('year'),
  mileage: integer('mileage'),
  engineSize: decimal('engine_size', { precision: 4, scale: 2 }),
  horsepower: integer('horsepower'),
  
  // Relationships
  brandId: integer('brand_id').references(() => brands.id),
  modelId: integer('model_id').references(() => models.id),
  dealershipId: uuid('dealership_id').references(() => dealerships.id), // NEW: Dealership relationship
  
  // Vehicle details
  color: varchar('color', { length: 50 }),
  condition: varchar('condition', { length: 50 }),
  vin: varchar('vin', { length: 50 }),
  licensePlate: varchar('license_plate', { length: 20 }),
  
  // Location (now with references)
  cityId: integer('city_id').references(() => cities.id),
  provinceId: integer('province_id').references(() => provinces.id),
  locationCity: varchar('location_city', { length: 100 }), // Keep for backwards compatibility
  locationState: varchar('location_state', { length: 100 }),
  locationCountry: varchar('location_country', { length: 100 }).default('Argentina'),
  
  // Seller information
  sellerName: varchar('seller_name', { length: 200 }),
  sellerPhone: varchar('seller_phone', { length: 50 }),
  sellerEmail: varchar('seller_email', { length: 200 }),
  sellerType: varchar('seller_type', { length: 50 }).default('dealership'), // dealership, particular, auction
  
  // Source and AI information
  sourceUrl: text('source_url').notNull(),
  sourcePortal: varchar('source_portal', { length: 100 }).notNull(),
  aiAnalysisSummary: text('ai_analysis_summary'),
  
  // Opportunity and quality scoring
  isOpportunityAi: boolean('is_opportunity_ai').default(false),
  opportunityScore: integer('opportunity_score'), // 0-100 opportunity score
  qualityScore: integer('quality_score'), // AI validation quality score
  
  // Pricing analysis
  marketPrice: decimal('market_price', { precision: 12, scale: 2 }), // Estimated market value
  priceVariation: decimal('price_variation', { precision: 5, scale: 2 }), // % above/below market
  
  // Status and availability
  status: varchar('status', { length: 20 }).default('available'), // available, sold, reserved, inactive
  featured: boolean('featured').default(false),
  verifiedAt: timestamp('verified_at'), // Last verification date
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  priceIdx: index('vehicles_price_idx').on(table.price),
  yearIdx: index('vehicles_year_idx').on(table.year),
  brandIdx: index('vehicles_brand_idx').on(table.brandId),
  dealershipIdx: index('vehicles_dealership_idx').on(table.dealershipId),
  cityIdx: index('vehicles_city_idx').on(table.cityId),
  provinceIdx: index('vehicles_province_idx').on(table.provinceId),
  sourceIdx: index('vehicles_source_idx').on(table.sourcePortal),
  opportunityIdx: index('vehicles_opportunity_idx').on(table.isOpportunityAi, table.opportunityScore),
  statusIdx: index('vehicles_status_idx').on(table.status),
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

// URL Exploration Tracking Table
export const exploredUrls = pgTable('explored_urls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  url: text('url').notNull().unique(),
  dealershipId: uuid('dealership_id').references(() => dealerships.id, { onDelete: 'cascade' }),
  urlType: varchar('url_type', { length: 50 }).notNull(), // 'vehicle_listing', 'pagination', 'category', etc.
  
  // Discovery info
  discoveredByAgent: varchar('discovered_by_agent', { length: 100 }), // Which agent found this URL
  parentUrl: text('parent_url'), // URL that led to this discovery
  discoveryMethod: varchar('discovery_method', { length: 50 }), // 'html_parsing', 'sitemap', 'api', etc.
  
  // Processing status  
  status: varchar('status', { length: 50 }).notNull().default('discovered'), // discovered, processing, processed, failed, deprecated
  lastProcessedAt: timestamp('last_processed_at'),
  processingAttempts: integer('processing_attempts').default(0),
  
  // Content analysis
  contentType: varchar('content_type', { length: 100 }), // detected content type
  hasVehicleData: boolean('has_vehicle_data').default(false),
  vehicleCount: integer('vehicle_count').default(0), // how many vehicles found on this URL
  
  // Success tracking
  vehiclesExtracted: integer('vehicles_extracted').default(0), // successful extractions
  lastSuccessfulExtraction: timestamp('last_successful_extraction'),
  
  // Error tracking
  lastError: text('last_error'),
  consecutiveFailures: integer('consecutive_failures').default(0),
  
  // Lifecycle management
  isActive: boolean('is_active').default(true),
  deprecatedAt: timestamp('deprecated_at'), // when URL became invalid/outdated
  expiresAt: timestamp('expires_at'), // when to stop trying this URL
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  dealershipIdx: index('explored_urls_dealership_idx').on(table.dealershipId),
  statusIdx: index('explored_urls_status_idx').on(table.status),
  typeIdx: index('explored_urls_type_idx').on(table.urlType),
  activeIdx: index('explored_urls_active_idx').on(table.isActive),
  lastProcessedIdx: index('explored_urls_last_processed_idx').on(table.lastProcessedAt),
  hasVehicleDataIdx: index('explored_urls_has_vehicle_data_idx').on(table.hasVehicleData),
  agentIdx: index('explored_urls_agent_idx').on(table.discoveredByAgent),
  createdAtIdx: index('explored_urls_created_at_idx').on(table.createdAt)
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
  // Location tables
  provinces,
  cities,
  dealerships,
  
  // Vehicle tables
  brands,
  models,
  vehicles,
  images,
  vehicleImages,
  
  // URL tracking tables
  exploredUrls,
  
  // Agent system tables
  agentJobs,
  agentMemory,
  agentMetrics,
  agentMessages,
  agentOrchestrations
};

// Type exports for new tables
export type Province = typeof provinces.$inferSelect;
export type NewProvince = typeof provinces.$inferInsert;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type Dealership = typeof dealerships.$inferSelect;
export type NewDealership = typeof dealerships.$inferInsert;
export type VehicleImage = typeof vehicleImages.$inferSelect;
export type NewVehicleImage = typeof vehicleImages.$inferInsert;
export type ExploredUrl = typeof exploredUrls.$inferSelect;
export type NewExploredUrl = typeof exploredUrls.$inferInsert;

// Existing type exports
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