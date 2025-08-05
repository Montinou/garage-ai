import { createClient } from '@supabase/supabase-js'
import { config } from './config'

// Initialize configuration
let supabaseConfig: {
  url: string;
  serviceRoleKey: string;
  anonKey: string;
} | null = null;

try {
  // Try to get configuration synchronously if already initialized
  supabaseConfig = config.getSupabaseConfig();
} catch {
  // Configuration not initialized yet, use environment variables as fallback
  supabaseConfig = {
    url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  };
}

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create Supabase client for client-side operations (with anon key)
export const createClientSideSupabase = () => {
  return createClient(supabaseConfig!.url, supabaseConfig!.anonKey)
}

// Function to reinitialize Supabase clients with proper configuration
export const initializeSupabaseWithConfig = async () => {
  try {
    await config.initialize();
    const newConfig = config.getSupabaseConfig();
    
    // Note: We can't reassign the exported constants, but we can log the proper configuration
    console.log('Supabase configuration validated:', {
      url: newConfig.url,
      hasServiceKey: !!newConfig.serviceRoleKey,
      hasAnonKey: !!newConfig.anonKey
    });
    
    return {
      url: newConfig.url,
      serviceRoleKey: newConfig.serviceRoleKey,
      anonKey: newConfig.anonKey
    };
  } catch (error) {
    console.error('Failed to initialize Supabase configuration:', error);
    throw error;
  }
}

// Types for our database schema
export interface Brand {
  id: number
  name: string
  country?: string
  founded_year?: number
  logo_url?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Model {
  id: number
  name: string
  brand_id: number
  body_type?: string
  fuel_type?: string
  transmission?: string
  year_start?: number
  year_end?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Vehicle {
  id: string
  title?: string
  description?: string
  price?: number
  currency?: string
  year?: number
  mileage?: number
  engine_size?: number
  horsepower?: number
  brand_id?: number
  model_id?: number
  color?: string
  condition?: string
  location_city?: string
  location_state?: string
  location_country?: string
  vin?: string
  license_plate?: string
  seller_name?: string
  seller_phone?: string
  seller_email?: string
  listing_date?: string
  is_sold?: boolean
  is_featured?: boolean
  ai_analysis_summary?: string
  is_opportunity_ai?: boolean
  created_at?: string
  updated_at?: string
  brand?: Brand
  model?: Model
  images?: VehicleImage[]
}

export interface VehicleImage {
  id: string
  vehicle_id: string
  image_url: string
  image_order?: number
  image_type?: string
  alt_text?: string
  is_primary?: boolean
  created_at?: string
  updated_at?: string
}

export interface VehicleSearchFilters {
  brand?: string
  model?: string
  year_min?: number
  year_max?: number
  price_min?: number
  price_max?: number
  mileage_max?: number
  condition?: string
  location_city?: string
  location_state?: string
  is_opportunity_ai?: boolean
}