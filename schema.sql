-- Garage AI Database Schema
-- This script creates the normalized database schema for the automotive platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brands table
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100),
    founded_year INTEGER,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create models table
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    body_type VARCHAR(100), -- SUV, Sedan, Hatchback, Coupe, etc.
    fuel_type VARCHAR(50), -- Gasoline, Diesel, Electric, Hybrid, etc.
    transmission VARCHAR(50), -- Manual, Automatic, CVT, etc.
    year_start INTEGER,
    year_end INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, brand_id)
);

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    description TEXT,
    price NUMERIC(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    year INTEGER,
    mileage INTEGER, -- in kilometers
    engine_size DECIMAL(3,1), -- in liters (e.g., 2.0, 3.5)
    horsepower INTEGER,
    -- Relationships
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL, -- NEW: Dealership relationship
    
    -- Vehicle details
    color VARCHAR(100),
    condition VARCHAR(50), -- New, Used, Certified Pre-owned, etc.
    vin VARCHAR(17), -- Vehicle Identification Number
    license_plate VARCHAR(20),
    
    -- Location (now with references)
    city_id INTEGER REFERENCES cities(id),
    province_id INTEGER REFERENCES provinces(id),
    location_city VARCHAR(255), -- Keep for backwards compatibility
    location_state VARCHAR(255),
    location_country VARCHAR(255) DEFAULT 'Argentina',
    
    -- Seller information  
    seller_name VARCHAR(255),
    seller_phone VARCHAR(20),
    seller_email VARCHAR(255),
    seller_type VARCHAR(50) DEFAULT 'dealership', -- dealership, particular, auction
    
    -- Source and AI information
    source_url TEXT NOT NULL, -- URL where this vehicle was found
    source_portal VARCHAR(100) NOT NULL, -- Which website/portal
    ai_analysis_summary TEXT,
    
    -- Opportunity and quality scoring
    is_opportunity_ai BOOLEAN DEFAULT FALSE,
    opportunity_score INTEGER, -- 0-100 opportunity score
    quality_score INTEGER, -- AI validation quality score
    
    -- Pricing analysis
    market_price NUMERIC(12, 2), -- Estimated market value
    price_variation NUMERIC(5, 2), -- % above/below market
    
    -- Status and availability
    status VARCHAR(20) DEFAULT 'available', -- available, sold, reserved, inactive
    is_featured BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ, -- Last verification date
    listing_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create images table
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    image_type VARCHAR(50) DEFAULT 'exterior', -- exterior, interior, engine, documents, etc.
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_vehicles_brand ON vehicles(brand_id);
CREATE INDEX idx_vehicles_model ON vehicles(model_id);
CREATE INDEX idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX idx_vehicles_price ON vehicles(price);
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_mileage ON vehicles(mileage);
CREATE INDEX idx_vehicles_condition ON vehicles(condition);
CREATE INDEX idx_vehicles_city ON vehicles(city_id);
CREATE INDEX idx_vehicles_province ON vehicles(province_id);
CREATE INDEX idx_vehicles_location_city ON vehicles(location_city);
CREATE INDEX idx_vehicles_listing_date ON vehicles(listing_date);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_is_featured ON vehicles(is_featured);
CREATE INDEX idx_vehicles_is_opportunity_ai ON vehicles(is_opportunity_ai, opportunity_score);
CREATE INDEX idx_vehicles_source_portal ON vehicles(source_portal);
CREATE INDEX idx_vehicles_source_url ON vehicles(source_url); -- For deduplication
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at);

-- Dealership indexes
CREATE INDEX idx_dealerships_name ON dealerships(name);
CREATE INDEX idx_dealerships_city ON dealerships(city_id);
CREATE INDEX idx_dealerships_province ON dealerships(province_id);
CREATE INDEX idx_dealerships_brand ON dealerships(official_brand);
CREATE INDEX idx_dealerships_active ON dealerships(is_active);
CREATE INDEX idx_dealerships_exploration ON dealerships(exploration_enabled, exploration_frequency);
CREATE INDEX idx_dealerships_scraper_order ON dealerships(scraper_order);
CREATE INDEX idx_dealerships_last_explored ON dealerships(last_explored_at);

-- Location indexes
CREATE INDEX idx_cities_province ON cities(province_id, name);
CREATE INDEX idx_provinces_region ON provinces(region);

-- Explored URLs indexes
CREATE INDEX idx_explored_urls_dealership ON explored_urls(dealership_id);
CREATE INDEX idx_explored_urls_status ON explored_urls(status);
CREATE INDEX idx_explored_urls_type ON explored_urls(url_type);
CREATE INDEX idx_explored_urls_active ON explored_urls(is_active);
CREATE INDEX idx_explored_urls_last_processed ON explored_urls(last_processed_at);
CREATE INDEX idx_explored_urls_has_vehicle_data ON explored_urls(has_vehicle_data);
CREATE INDEX idx_explored_urls_agent ON explored_urls(discovered_by_agent);
CREATE INDEX idx_explored_urls_created ON explored_urls(created_at);

-- Vehicle images indexes
CREATE INDEX idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_primary ON vehicle_images(is_primary);
CREATE INDEX idx_vehicle_images_type ON vehicle_images(image_type);
CREATE INDEX idx_vehicle_images_status ON vehicle_images(upload_status);
CREATE INDEX idx_vehicle_images_gcs_path ON vehicle_images(gcs_path);

-- Original indexes
CREATE INDEX idx_images_vehicle ON images(vehicle_id);
CREATE INDEX idx_images_order ON images(image_order);
CREATE INDEX idx_models_brand ON models(brand_id);
CREATE INDEX idx_brands_name ON brands(name);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE explored_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- brands policies
CREATE POLICY "Public read access for brands" ON brands
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert brands" ON brands
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update brands" ON brands
    FOR UPDATE USING (auth.role() = 'authenticated');

-- models policies
CREATE POLICY "Public read access for models" ON models
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert models" ON models
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update models" ON models
    FOR UPDATE USING (auth.role() = 'authenticated');

-- vehicles policies
CREATE POLICY "Public read access for vehicles" ON vehicles
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert vehicles" ON vehicles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update vehicles" ON vehicles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- images policies
CREATE POLICY "Public read access for images" ON images
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert images" ON images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update images" ON images
    FOR UPDATE USING (auth.role() = 'authenticated');

-- provinces policies  
CREATE POLICY "Public read access for provinces" ON provinces
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage provinces" ON provinces
    FOR ALL USING (auth.role() = 'service_role');

-- cities policies
CREATE POLICY "Public read access for cities" ON cities
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage cities" ON cities
    FOR ALL USING (auth.role() = 'service_role');

-- dealerships policies
CREATE POLICY "Public read access for dealerships" ON dealerships
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage dealerships" ON dealerships
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update dealerships" ON dealerships
    FOR UPDATE USING (auth.role() = 'authenticated');

-- explored_urls policies
CREATE POLICY "Service role can manage explored URLs" ON explored_urls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read explored URLs" ON explored_urls
    FOR SELECT USING (auth.role() = 'authenticated');

-- vehicle_images policies
CREATE POLICY "Public read access for vehicle images" ON vehicle_images
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage vehicle images" ON vehicle_images
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert vehicle images" ON vehicle_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Dealership/Location Tables for Argentina
-- Argentina provinces table
CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL, -- ARG_BA, ARG_COR, etc.
    country VARCHAR(100) NOT NULL DEFAULT 'Argentina',
    region VARCHAR(100), -- NOA, NEA, Centro, Patagonia, Cuyo  
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Argentina cities table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province_id INTEGER NOT NULL REFERENCES provinces(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealerships table with exploration configuration
CREATE TABLE dealerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL, -- URL-friendly identifier
    
    -- URLs and contact info
    website_url TEXT,
    base_url TEXT, -- Base URL for exploration
    used_vehicles_url TEXT, -- Specific used cars URL
    phone VARCHAR(50),
    email VARCHAR(200),
    whatsapp VARCHAR(50),
    
    -- Location
    city_id INTEGER REFERENCES cities(id),
    province_id INTEGER REFERENCES provinces(id),
    address TEXT,
    coordinates JSONB, -- {lat: -34.6037, lng: -58.3816}
    
    -- Business info
    official_brand VARCHAR(100), -- Toyota, Ford, etc.
    dealership_type VARCHAR(50) DEFAULT 'multimarca', -- official, multimarca
    business_hours JSONB, -- Schedule information
    
    -- Exploration configuration
    exploration_enabled BOOLEAN DEFAULT TRUE,
    exploration_config JSONB, -- AI exploration settings
    exploration_frequency VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly
    scraper_order INTEGER, -- Order for batch processing (1-24 for hourly batches)
    
    -- Social media and ratings
    social_media JSONB, -- Facebook, Instagram, etc.
    rating NUMERIC(3,2), -- 4.5
    review_count INTEGER DEFAULT 0,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_explored_at TIMESTAMPTZ,
    metadata JSONB, -- Additional flexible data
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explored URLs tracking table - tracks URLs discovered and processed by agents
CREATE TABLE explored_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
    url_type VARCHAR(50) NOT NULL, -- 'vehicle_listing', 'pagination', 'category', etc.
    
    -- Discovery info
    discovered_by_agent VARCHAR(100), -- Which agent found this URL
    parent_url TEXT, -- URL that led to this discovery
    discovery_method VARCHAR(50), -- 'html_parsing', 'sitemap', 'api', etc.
    
    -- Processing status  
    status VARCHAR(50) NOT NULL DEFAULT 'discovered', -- discovered, processing, processed, failed, deprecated
    last_processed_at TIMESTAMPTZ,
    processing_attempts INTEGER DEFAULT 0,
    
    -- Content analysis
    content_type VARCHAR(100), -- detected content type
    has_vehicle_data BOOLEAN DEFAULT FALSE,
    vehicle_count INTEGER DEFAULT 0, -- how many vehicles found on this URL
    
    -- Success tracking
    vehicles_extracted INTEGER DEFAULT 0, -- successful extractions
    last_successful_extraction TIMESTAMPTZ,
    
    -- Error tracking
    last_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Lifecycle management
    is_active BOOLEAN DEFAULT TRUE,
    deprecated_at TIMESTAMPTZ, -- when URL became invalid/outdated
    expires_at TIMESTAMPTZ, -- when to stop trying this URL
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle images with Google Cloud Storage support
CREATE TABLE vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- Original image info
    original_url TEXT, -- Original URL from source
    source_filename VARCHAR(300),
    
    -- Google Cloud Storage info
    gcs_url TEXT NOT NULL, -- Full GCS URL
    gcs_bucket VARCHAR(100) NOT NULL DEFAULT 'garage-ai-images',
    gcs_path TEXT NOT NULL, -- Full path in bucket
    gcs_filename VARCHAR(300) NOT NULL,
    
    -- Image metadata
    image_order INTEGER DEFAULT 0,
    image_type VARCHAR(50) DEFAULT 'exterior', -- exterior, interior, engine, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- File properties
    file_size INTEGER, -- bytes
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    
    -- Processing status
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, uploaded, failed
    processed_at TIMESTAMPTZ,
    
    -- Search and categorization
    tags JSONB, -- ["front-view", "interior", "dashboard"]
    ai_analysis JSONB, -- AI-generated image analysis
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample data

-- Sample Argentine provinces
INSERT INTO provinces (name, code, region) VALUES
    ('Buenos Aires', 'ARG_BA', 'Centro'),
    ('Córdoba', 'ARG_COR', 'Centro'),
    ('Santa Fe', 'ARG_SF', 'Centro'),
    ('Mendoza', 'ARG_MZ', 'Cuyo'),
    ('Tucumán', 'ARG_TUC', 'NOA'),
    ('Entre Ríos', 'ARG_ER', 'Centro'),
    ('Salta', 'ARG_SAL', 'NOA'),
    ('Misiones', 'ARG_MIS', 'NEA'),
    ('Chaco', 'ARG_CHA', 'NEA'),
    ('San Juan', 'ARG_SJ', 'Cuyo'),
    ('Jujuy', 'ARG_JUJ', 'NOA'),
    ('Río Negro', 'ARG_RN', 'Patagonia'),
    ('Neuquén', 'ARG_NEU', 'Patagonia'),
    ('Formosa', 'ARG_FOR', 'NEA'),
    ('Chubut', 'ARG_CHU', 'Patagonia'),
    ('San Luis', 'ARG_SL', 'Cuyo'),
    ('Santiago del Estero', 'ARG_SE', 'NOA'),
    ('Corrientes', 'ARG_COR_CORR', 'NEA'),
    ('Santa Cruz', 'ARG_SC', 'Patagonia'),
    ('La Rioja', 'ARG_LR', 'NOA'),
    ('Catamarca', 'ARG_CAT', 'NOA'),
    ('La Pampa', 'ARG_LP', 'Patagonia'),
    ('Tierra del Fuego', 'ARG_TDF', 'Patagonia'),
    ('Ciudad Autónoma de Buenos Aires', 'ARG_CABA', 'Centro');

-- Sample cities for major provinces
INSERT INTO cities (name, province_id) VALUES
    -- Buenos Aires
    ('Buenos Aires', 1), ('La Plata', 1), ('Mar del Plata', 1), ('Bahía Blanca', 1),
    ('Tandil', 1), ('Olavarría', 1), ('Pergamino', 1), ('San Nicolás', 1),
    -- Córdoba  
    ('Córdoba', 2), ('Villa Carlos Paz', 2), ('Río Cuarto', 2), ('San Francisco', 2),
    -- Santa Fe
    ('Santa Fe', 3), ('Rosario', 3), ('Rafaela', 3), ('Venado Tuerto', 3),
    -- Mendoza
    ('Mendoza', 4), ('San Rafael', 4), ('Godoy Cruz', 4), ('Maipú', 4),
    -- CABA
    ('Ciudad Autónoma de Buenos Aires', 24);

-- Sample brands
INSERT INTO brands (name, country, founded_year) VALUES
    ('Toyota', 'Japan', 1937),
    ('Honda', 'Japan', 1948),
    ('Ford', 'United States', 1903),
    ('Chevrolet', 'United States', 1911),
    ('Nissan', 'Japan', 1933),
    ('Hyundai', 'South Korea', 1967),
    ('Kia', 'South Korea', 1944),
    ('Volkswagen', 'Germany', 1937),
    ('BMW', 'Germany', 1916),
    ('Mercedes-Benz', 'Germany', 1926),
    ('Audi', 'Germany', 1909),
    ('Mazda', 'Japan', 1920),
    ('Subaru', 'Japan', 1953),
    ('Mitsubishi', 'Japan', 1970),
    ('Lexus', 'Japan', 1989),
    ('Acura', 'Japan', 1986),
    ('Infiniti', 'Japan', 1989),
    ('Genesis', 'South Korea', 2015),
    ('Tesla', 'United States', 2003),
    ('Porsche', 'Germany', 1931);

-- Sample models
INSERT INTO models (name, brand_id, body_type, fuel_type, transmission, year_start) VALUES
    -- Toyota models
    ('Camry', 1, 'Sedan', 'Gasoline', 'Automatic', 1982),
    ('Corolla', 1, 'Sedan', 'Gasoline', 'Manual', 1966),
    ('RAV4', 1, 'SUV', 'Gasoline', 'Automatic', 1994),
    ('Highlander', 1, 'SUV', 'Gasoline', 'Automatic', 2000),
    ('Prius', 1, 'Hatchback', 'Hybrid', 'CVT', 1997),
    ('4Runner', 1, 'SUV', 'Gasoline', 'Automatic', 1984),
    
    -- Honda models
    ('Civic', 2, 'Sedan', 'Gasoline', 'Manual', 1972),
    ('Accord', 2, 'Sedan', 'Gasoline', 'Automatic', 1976),
    ('CR-V', 2, 'SUV', 'Gasoline', 'Automatic', 1995),
    ('Pilot', 2, 'SUV', 'Gasoline', 'Automatic', 2002),
    ('Fit', 2, 'Hatchback', 'Gasoline', 'Manual', 2001),
    
    -- Ford models
    ('F-150', 3, 'Pickup', 'Gasoline', 'Automatic', 1975),
    ('Mustang', 3, 'Coupe', 'Gasoline', 'Manual', 1964),
    ('Explorer', 3, 'SUV', 'Gasoline', 'Automatic', 1990),
    ('Focus', 3, 'Hatchback', 'Gasoline', 'Manual', 1998),
    ('Escape', 3, 'SUV', 'Gasoline', 'Automatic', 2000),
    
    -- Chevrolet models
    ('Silverado', 4, 'Pickup', 'Gasoline', 'Automatic', 1999),
    ('Malibu', 4, 'Sedan', 'Gasoline', 'Automatic', 1964),
    ('Equinox', 4, 'SUV', 'Gasoline', 'Automatic', 2004),
    ('Tahoe', 4, 'SUV', 'Gasoline', 'Automatic', 1995),
    ('Cruze', 4, 'Sedan', 'Gasoline', 'Automatic', 2008),
    
    -- BMW models
    ('3 Series', 9, 'Sedan', 'Gasoline', 'Automatic', 1975),
    ('5 Series', 9, 'Sedan', 'Gasoline', 'Automatic', 1972),
    ('X3', 9, 'SUV', 'Gasoline', 'Automatic', 2003),
    ('X5', 9, 'SUV', 'Gasoline', 'Automatic', 1999),
    
    -- Mercedes-Benz models
    ('C-Class', 10, 'Sedan', 'Gasoline', 'Automatic', 1993),
    ('E-Class', 10, 'Sedan', 'Gasoline', 'Automatic', 1953),
    ('GLE', 10, 'SUV', 'Gasoline', 'Automatic', 1997),
    ('GLC', 10, 'SUV', 'Gasoline', 'Automatic', 2015),
    
    -- Tesla models
    ('Model S', 19, 'Sedan', 'Electric', 'Automatic', 2012),
    ('Model 3', 19, 'Sedan', 'Electric', 'Automatic', 2017),
    ('Model X', 19, 'SUV', 'Electric', 'Automatic', 2015),
    ('Model Y', 19, 'SUV', 'Electric', 'Automatic', 2020);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional constraints and checks
ALTER TABLE vehicles ADD CONSTRAINT check_year_range CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1);
ALTER TABLE vehicles ADD CONSTRAINT check_mileage_positive CHECK (mileage >= 0);
ALTER TABLE vehicles ADD CONSTRAINT check_price_positive CHECK (price >= 0);
ALTER TABLE vehicles ADD CONSTRAINT check_engine_size_positive CHECK (engine_size > 0);
ALTER TABLE vehicles ADD CONSTRAINT check_horsepower_positive CHECK (horsepower > 0);
ALTER TABLE models ADD CONSTRAINT check_year_start_valid CHECK (year_start >= 1900);
ALTER TABLE models ADD CONSTRAINT check_year_end_after_start CHECK (year_end IS NULL OR year_end >= year_start);
ALTER TABLE brands ADD CONSTRAINT check_founded_year_valid CHECK (founded_year >= 1800 AND founded_year <= EXTRACT(YEAR FROM NOW()));

-- Create a view for vehicle listings with brand and model information
CREATE VIEW vehicle_listings AS
SELECT 
    v.id,
    v.title,
    v.description,
    v.price,
    v.currency,
    v.year,
    v.mileage,
    v.engine_size,
    v.horsepower,
    b.name as brand_name,
    m.name as model_name,
    m.body_type,
    m.fuel_type,
    m.transmission,
    v.color,
    v.condition,
    v.location_city,
    v.location_state,
    v.location_country,
    v.seller_name,
    v.seller_phone,
    v.seller_email,
    v.listing_date,
    v.is_sold,
    v.is_featured,
    v.ai_analysis_summary,
    v.is_opportunity_ai,
    v.created_at,
    v.updated_at
FROM vehicles v
LEFT JOIN brands b ON v.brand_id = b.id
LEFT JOIN models m ON v.model_id = m.id;

-- Create a function to get vehicle images
CREATE OR REPLACE FUNCTION get_vehicle_images(vehicle_uuid UUID)
RETURNS TABLE (
    id UUID,
    image_url TEXT,
    image_order INTEGER,
    image_type VARCHAR(50),
    alt_text TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.image_url,
        i.image_order,
        i.image_type,
        i.alt_text,
        i.is_primary
    FROM images i
    WHERE i.vehicle_id = vehicle_uuid
    ORDER BY i.image_order ASC, i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- AI Agents System Tables
-- These tables support the agent infrastructure for automated vehicle data processing

-- Agent jobs table - tracks all agent job executions
CREATE TABLE agent_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    payload JSONB,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    config JSONB,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent memory table - stores persistent memory for agents
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    memory_key VARCHAR(500) NOT NULL,
    memory_value JSONB NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    ttl INTEGER, -- Time to live in milliseconds
    tags TEXT[],
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, memory_key)
);

-- Agent metrics table - tracks performance metrics for each agent
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) UNIQUE NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    total_jobs INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    average_execution_time NUMERIC(10,2) DEFAULT 0,
    last_job_time TIMESTAMPTZ,
    memory_usage BIGINT DEFAULT 0,
    error_rate NUMERIC(5,4) DEFAULT 0,
    uptime BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent messages table - inter-agent communication
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL DEFAULT 'broadcast',
    from_agent VARCHAR(255) NOT NULL,
    to_agent VARCHAR(255),
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent orchestrations table - workflow execution tracking
CREATE TABLE agent_orchestrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id VARCHAR(255) UNIQUE NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    parameters JSONB,
    constraints JSONB,
    callbacks JSONB,
    metadata JSONB,
    steps JSONB,
    result JSONB,
    error_message TEXT,
    total_execution_time BIGINT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for agent tables
CREATE INDEX idx_agent_jobs_agent_id ON agent_jobs(agent_id);
CREATE INDEX idx_agent_jobs_agent_type ON agent_jobs(agent_type);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_priority ON agent_jobs(priority);
CREATE INDEX idx_agent_jobs_created_at ON agent_jobs(created_at);
CREATE INDEX idx_agent_jobs_scheduled_at ON agent_jobs(scheduled_at);

CREATE INDEX idx_agent_memory_agent_id ON agent_memory(agent_id);
CREATE INDEX idx_agent_memory_key ON agent_memory(memory_key);
CREATE INDEX idx_agent_memory_expires_at ON agent_memory(expires_at);
CREATE INDEX idx_agent_memory_tags ON agent_memory USING GIN(tags);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);

CREATE INDEX idx_agent_metrics_agent_id ON agent_metrics(agent_id);
CREATE INDEX idx_agent_metrics_agent_type ON agent_metrics(agent_type);
CREATE INDEX idx_agent_metrics_updated_at ON agent_metrics(updated_at);

CREATE INDEX idx_agent_messages_from_agent ON agent_messages(from_agent);
CREATE INDEX idx_agent_messages_to_agent ON agent_messages(to_agent);
CREATE INDEX idx_agent_messages_topic ON agent_messages(topic);
CREATE INDEX idx_agent_messages_processed ON agent_messages(processed);
CREATE INDEX idx_agent_messages_created_at ON agent_messages(created_at);
CREATE INDEX idx_agent_messages_expires_at ON agent_messages(expires_at);

CREATE INDEX idx_agent_orchestrations_workflow_id ON agent_orchestrations(workflow_id);
CREATE INDEX idx_agent_orchestrations_status ON agent_orchestrations(status);
CREATE INDEX idx_agent_orchestrations_created_at ON agent_orchestrations(created_at);

-- Enable Row Level Security on agent tables
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_orchestrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent tables

-- agent_jobs policies
CREATE POLICY "Service role can manage agent jobs" ON agent_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read agent jobs" ON agent_jobs
    FOR SELECT USING (auth.role() = 'authenticated');

-- agent_memory policies
CREATE POLICY "Service role can manage agent memory" ON agent_memory
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read agent memory" ON agent_memory
    FOR SELECT USING (auth.role() = 'authenticated');

-- agent_metrics policies
CREATE POLICY "Service role can manage agent metrics" ON agent_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access for agent metrics" ON agent_metrics
    FOR SELECT USING (true);

-- agent_messages policies
CREATE POLICY "Service role can manage agent messages" ON agent_messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read agent messages" ON agent_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- agent_orchestrations policies
CREATE POLICY "Service role can manage orchestrations" ON agent_orchestrations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read orchestrations" ON agent_orchestrations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create triggers for updated_at columns
CREATE TRIGGER update_agent_jobs_updated_at BEFORE UPDATE ON agent_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON agent_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_metrics_updated_at BEFORE UPDATE ON agent_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_messages_updated_at BEFORE UPDATE ON agent_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_orchestrations_updated_at BEFORE UPDATE ON agent_orchestrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints and checks for agent tables
ALTER TABLE agent_jobs ADD CONSTRAINT check_status_valid CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying')
);

ALTER TABLE agent_jobs ADD CONSTRAINT check_priority_valid CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
);

ALTER TABLE agent_jobs ADD CONSTRAINT check_retry_count_positive CHECK (retry_count >= 0);
ALTER TABLE agent_jobs ADD CONSTRAINT check_max_retries_positive CHECK (max_retries >= 0);

ALTER TABLE agent_memory ADD CONSTRAINT check_ttl_positive CHECK (ttl IS NULL OR ttl > 0);
ALTER TABLE agent_memory ADD CONSTRAINT check_access_count_positive CHECK (access_count >= 0);

ALTER TABLE agent_metrics ADD CONSTRAINT check_job_counts_positive CHECK (
    total_jobs >= 0 AND successful_jobs >= 0 AND failed_jobs >= 0
);
ALTER TABLE agent_metrics ADD CONSTRAINT check_execution_time_positive CHECK (average_execution_time >= 0);
ALTER TABLE agent_metrics ADD CONSTRAINT check_error_rate_valid CHECK (error_rate >= 0 AND error_rate <= 1);
ALTER TABLE agent_metrics ADD CONSTRAINT check_uptime_positive CHECK (uptime >= 0);

ALTER TABLE agent_messages ADD CONSTRAINT check_message_type_valid CHECK (
    type IN ('task', 'status', 'error', 'broadcast', 'direct')
);

ALTER TABLE agent_messages ADD CONSTRAINT check_message_priority_valid CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
);

ALTER TABLE agent_orchestrations ADD CONSTRAINT check_orchestration_status_valid CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
);

-- Create utility functions for agent system

-- Function to cleanup expired memory entries
CREATE OR REPLACE FUNCTION cleanup_expired_agent_memory()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_memory 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_agent_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_messages 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent statistics
CREATE OR REPLACE FUNCTION get_agent_system_stats()
RETURNS TABLE (
    total_agents BIGINT,
    active_agents BIGINT,
    total_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    pending_jobs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT agent_id) as total_agents,
        COUNT(DISTINCT CASE WHEN status IN ('idle', 'busy') THEN agent_id END) as active_agents,
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs
    FROM agent_jobs;
END;
$$ LANGUAGE plpgsql;

-- Function to get dealership exploration stats
CREATE OR REPLACE FUNCTION get_dealership_exploration_stats(dealership_uuid UUID)
RETURNS TABLE (
    total_urls_discovered BIGINT,
    active_urls BIGINT,
    processed_urls BIGINT,
    vehicles_found BIGINT,
    last_exploration TIMESTAMPTZ,
    exploration_success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_urls_discovered,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_urls,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_urls,
        COALESCE(SUM(vehicles_extracted), 0) as vehicles_found,
        MAX(last_processed_at) as last_exploration,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(COUNT(CASE WHEN status = 'processed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC, 4)
        END as exploration_success_rate
    FROM explored_urls
    WHERE dealership_id = dealership_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup deprecated URLs
CREATE OR REPLACE FUNCTION cleanup_deprecated_urls()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Mark URLs as deprecated if they have too many consecutive failures
    UPDATE explored_urls 
    SET is_active = FALSE, deprecated_at = NOW()
    WHERE consecutive_failures >= 5 
    AND is_active = TRUE
    AND deprecated_at IS NULL;

    -- Remove very old deprecated URLs
    DELETE FROM explored_urls 
    WHERE deprecated_at IS NOT NULL 
    AND deprecated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicle opportunities by dealership
CREATE OR REPLACE FUNCTION get_dealership_opportunities(dealership_uuid UUID)
RETURNS TABLE (
    vehicle_id UUID,
    title TEXT,
    price NUMERIC,
    market_price NUMERIC,
    opportunity_score INTEGER,
    price_variation NUMERIC,
    source_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.title,
        v.price,
        v.market_price,
        v.opportunity_score,
        v.price_variation,
        v.source_url,
        v.created_at
    FROM vehicles v
    WHERE v.dealership_id = dealership_uuid
    AND v.is_opportunity_ai = TRUE
    AND v.status = 'available'
    ORDER BY v.opportunity_score DESC, v.created_at DESC;
END;
$$ LANGUAGE plpgsql;