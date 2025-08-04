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
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    color VARCHAR(100),
    condition VARCHAR(50), -- New, Used, Certified Pre-owned, etc.
    location_city VARCHAR(255),
    location_state VARCHAR(255),
    location_country VARCHAR(255),
    vin VARCHAR(17), -- Vehicle Identification Number
    license_plate VARCHAR(20),
    seller_name VARCHAR(255),
    seller_phone VARCHAR(20),
    seller_email VARCHAR(255),
    listing_date TIMESTAMPTZ DEFAULT NOW(),
    is_sold BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    ai_analysis_summary TEXT,
    is_opportunity_ai BOOLEAN DEFAULT FALSE,
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
CREATE INDEX idx_vehicles_price ON vehicles(price);
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_mileage ON vehicles(mileage);
CREATE INDEX idx_vehicles_condition ON vehicles(condition);
CREATE INDEX idx_vehicles_location_city ON vehicles(location_city);
CREATE INDEX idx_vehicles_listing_date ON vehicles(listing_date);
CREATE INDEX idx_vehicles_is_sold ON vehicles(is_sold);
CREATE INDEX idx_vehicles_is_featured ON vehicles(is_featured);
CREATE INDEX idx_vehicles_is_opportunity_ai ON vehicles(is_opportunity_ai);
CREATE INDEX idx_images_vehicle ON images(vehicle_id);
CREATE INDEX idx_images_order ON images(image_order);
CREATE INDEX idx_models_brand ON models(brand_id);
CREATE INDEX idx_brands_name ON brands(name);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

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

-- Insert sample data

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