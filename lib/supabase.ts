import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create Supabase client for client-side operations (with anon key)
export const createClientSideSupabase = () => {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  return createClient(supabaseUrl, supabaseAnonKey)
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