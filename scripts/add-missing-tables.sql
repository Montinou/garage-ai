-- Add missing explored_urls table for URL tracking during scraping
-- This table tracks URLs discovered and processed by AI agents

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

-- Add indexes for explored URLs
CREATE INDEX idx_explored_urls_dealership ON explored_urls(dealership_id);
CREATE INDEX idx_explored_urls_status ON explored_urls(status);
CREATE INDEX idx_explored_urls_type ON explored_urls(url_type);
CREATE INDEX idx_explored_urls_active ON explored_urls(is_active);
CREATE INDEX idx_explored_urls_last_processed ON explored_urls(last_processed_at);
CREATE INDEX idx_explored_urls_has_vehicle_data ON explored_urls(has_vehicle_data);
CREATE INDEX idx_explored_urls_agent ON explored_urls(discovered_by_agent);
CREATE INDEX idx_explored_urls_created ON explored_urls(created_at);

-- Enable Row Level Security
ALTER TABLE explored_urls ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for explored_urls
CREATE POLICY "Service role can manage explored URLs" ON explored_urls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read explored URLs" ON explored_urls
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add update trigger
CREATE TRIGGER update_explored_urls_updated_at BEFORE UPDATE ON explored_urls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add utility functions for URL management

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