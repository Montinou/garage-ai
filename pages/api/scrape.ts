/**
 * Garage AI Orchestrator API
 * This API orchestrates the scraping process for vehicle data
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { get } from '@vercel/edge-config';
import { put } from '@vercel/blob';
import { MercadoLibreScraper } from '../../scrapers/mercadolibre';
import { AutoCosmosScraper } from '../../scrapers/autocosmos';
import { VehicleData } from '../../scrapers/base-scraper';
import { supabase } from '../../lib/supabase';

interface ScrapingResult {
  success: boolean;
  totalScraped: number;
  errors: string[];
  timeElapsed: number;
  portalResults: {
    [portalName: string]: {
      scraped: number;
      errors: string[];
      aiProcessed: number;
      savedToDb: number;
    };
  };
}

interface AIServiceResponse {
  analysis: string;
  isOpportunity: boolean;
  score: number;
  features: string[];
}

interface PortalConfig {
  name: string;
  enabled: boolean;
  searchParams?: Record<string, any>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const result: ScrapingResult = {
    success: false,
    totalScraped: 0,
    errors: [],
    timeElapsed: 0,
    portalResults: {}
  };

  try {
    console.log('Starting garage-ai scraping orchestrator...');

    // STEP 1: Read target portals from Vercel Edge Config
    const portalsConfig = await get<PortalConfig[]>('vehicle-portals');
    
    if (!portalsConfig || !Array.isArray(portalsConfig)) {
      throw new Error('No vehicle portals configuration found in Edge Config');
    }

    const enabledPortals = portalsConfig.filter(portal => portal.enabled);
    console.log(`Found ${enabledPortals.length} enabled portals:`, enabledPortals.map(p => p.name));

    // Initialize scrapers
    const scrapers = {
      'mercadolibre': new MercadoLibreScraper({ maxPages: 3, delay: 2000 }),
      'autocosmos': new AutoCosmosScraper({ maxPages: 3, delay: 2000 })
    };

    // Process each enabled portal
    for (const portalConfig of enabledPortals) {
      const portalName = portalConfig.name.toLowerCase();
      const scraper = scrapers[portalName as keyof typeof scrapers];

      if (!scraper) {
        const error = `No scraper found for portal: ${portalName}`;
        console.error(error);
        result.errors.push(error);
        continue;
      }

      result.portalResults[portalName] = {
        scraped: 0,
        errors: [],
        aiProcessed: 0,
        savedToDb: 0
      };

      try {
        console.log(`Scraping ${portalName}...`);
        
        // STEP 2: Scrape vehicle data
        const scraperResult = await scraper.scrape(portalConfig.searchParams);
        
        result.portalResults[portalName].scraped = scraperResult.totalScraped;
        result.portalResults[portalName].errors = scraperResult.errors;
        result.totalScraped += scraperResult.totalScraped;

        // STEP 3: Process each scraped vehicle
        for (const vehicleData of scraperResult.data) {
          try {
            // STEP 4: Upload image to Vercel Blob and get permanent URL
            let blobImageUrl: string | undefined;
            if (vehicleData.imageUrls.length > 0) {
              blobImageUrl = await uploadImageToBlob(vehicleData.imageUrls[0], vehicleData.title);
            }

            // STEP 5: Send to AI service for analysis
            const aiAnalysis = await processWithAI(vehicleData, blobImageUrl);
            
            if (aiAnalysis) {
              result.portalResults[portalName].aiProcessed++;
            }

            // STEP 6: Save to database with AI results and Blob URL
            await saveVehicleToDatabase(vehicleData, aiAnalysis, blobImageUrl);
            result.portalResults[portalName].savedToDb++;

          } catch (error) {
            const errorMsg = `Error processing vehicle "${vehicleData.title}": ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMsg);
            result.portalResults[portalName].errors.push(errorMsg);
          }
        }

      } catch (error) {
        const errorMsg = `Error scraping ${portalName}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.portalResults[portalName].errors.push(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = result.totalScraped > 0;
    result.timeElapsed = Date.now() - startTime;

    console.log(`Scraping orchestrator completed in ${result.timeElapsed}ms. Total scraped: ${result.totalScraped}`);

    return res.status(200).json(result);

  } catch (error) {
    const errorMsg = `Orchestrator failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    result.timeElapsed = Date.now() - startTime;

    return res.status(500).json(result);
  }
}

/**
 * Upload image to Vercel Blob storage
 */
async function uploadImageToBlob(imageUrl: string, vehicleTitle: string): Promise<string> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Generate a unique filename
    const timestamp = Date.now();
    const cleanTitle = vehicleTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const filename = `vehicles/${timestamp}-${cleanTitle}.jpg`;

    // Upload to Vercel Blob
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType
    });

    console.log(`Image uploaded to Blob: ${blob.url}`);
    return blob.url;

  } catch (error) {
    console.error(`Error uploading image to blob: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Process vehicle data with AI service
 */
async function processWithAI(vehicleData: VehicleData, imageUrl?: string): Promise<AIServiceResponse | null> {
  try {
    const aiServiceUrl = process.env.NEXT_PUBLIC_GARAGE_API_URL;
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!aiServiceUrl || !apiKey) {
      console.warn('AI service URL or API key not configured');
      return null;
    }

    const payload = {
      vehicle: {
        title: vehicleData.title,
        description: vehicleData.description,
        price: vehicleData.price,
        currency: vehicleData.currency,
        year: vehicleData.year,
        mileage: vehicleData.mileage,
        brand: vehicleData.brand,
        model: vehicleData.model,
        condition: vehicleData.condition,
        imageUrl: imageUrl || vehicleData.imageUrls[0]
      }
    };

    const response = await fetch(`${aiServiceUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI service responded with ${response.status}: ${response.statusText}`);
    }

    const aiResponse: AIServiceResponse = await response.json();
    console.log(`AI analysis completed for vehicle: ${vehicleData.title}`);
    
    return aiResponse;

  } catch (error) {
    console.error(`Error processing with AI: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Save vehicle data to database
 */
async function saveVehicleToDatabase(
  vehicleData: VehicleData, 
  aiAnalysis: AIServiceResponse | null,
  blobImageUrl?: string
): Promise<void> {
  try {
    // Find or create brand
    let brandId: number | undefined;
    if (vehicleData.brand) {
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('name', vehicleData.brand)
        .single();

      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const { data: newBrand } = await supabase
          .from('brands')
          .insert({ name: vehicleData.brand })
          .select('id')
          .single();
        
        brandId = newBrand?.id;
      }
    }

    // Find or create model
    let modelId: number | undefined;
    if (vehicleData.model && brandId) {
      const { data: existingModel } = await supabase
        .from('models')
        .select('id')
        .eq('name', vehicleData.model)
        .eq('brand_id', brandId)
        .single();

      if (existingModel) {
        modelId = existingModel.id;
      } else {
        const { data: newModel } = await supabase
          .from('models')
          .insert({ 
            name: vehicleData.model, 
            brand_id: brandId 
          })
          .select('id')
          .single();
        
        modelId = newModel?.id;
      }
    }

    // Insert vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        title: vehicleData.title,
        description: vehicleData.description,
        price: vehicleData.price,
        currency: vehicleData.currency,
        year: vehicleData.year,
        mileage: vehicleData.mileage,
        engine_size: vehicleData.engineSize,
        horsepower: vehicleData.horsepower,
        brand_id: brandId,
        model_id: modelId,
        color: vehicleData.color,
        condition: vehicleData.condition,
        location_city: vehicleData.locationCity,
        location_state: vehicleData.locationState,
        location_country: vehicleData.locationCountry,
        vin: vehicleData.vin,
        license_plate: vehicleData.licensePlate,
        seller_name: vehicleData.sellerName,
        seller_phone: vehicleData.sellerPhone,
        seller_email: vehicleData.sellerEmail,
        ai_analysis_summary: aiAnalysis?.analysis,
        is_opportunity_ai: aiAnalysis?.isOpportunity || false
      })
      .select('id')
      .single();

    if (vehicleError) {
      throw new Error(`Database error inserting vehicle: ${vehicleError.message}`);
    }

    if (!vehicle?.id) {
      throw new Error('Vehicle was not created successfully');
    }

    // Insert primary image with Blob URL
    if (blobImageUrl) {
      const { error: imageError } = await supabase
        .from('images')
        .insert({
          vehicle_id: vehicle.id,
          image_url: blobImageUrl,
          image_order: 0,
          image_type: 'exterior',
          is_primary: true
        });

      if (imageError) {
        console.error(`Error inserting image: ${imageError.message}`);
      }
    }

    console.log(`Vehicle saved to database: ${vehicleData.title} (ID: ${vehicle.id})`);

  } catch (error) {
    console.error(`Error saving vehicle to database: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}