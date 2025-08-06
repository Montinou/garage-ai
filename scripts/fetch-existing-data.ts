#!/usr/bin/env tsx
/**
 * Fetch Existing Data from Neon Database
 * Utility script to examine what data is already populated
 */

import { db } from '../lib/neon';
import { 
  vehicles, 
  brands, 
  models, 
  images, 
  agentJobs, 
  agentMetrics,
  dealerships,
  provinces,
  cities
} from '../lib/schema';
import { sql, count, desc } from 'drizzle-orm';

async function fetchExistingData() {
  console.log('🔍 Fetching existing data from Neon database...\n');

  try {
    // Check database health first
    console.log('🏥 Database Health Check:');
    const healthCheck = await db.execute(sql`
      SELECT 
        current_database() as database,
        current_user as user,
        now() as server_time,
        version() as postgres_version
    `);
    console.log(healthCheck.rows[0]);
    console.log('');

    // Check if our tables exist
    console.log('📋 Table Structure Check:');
    const tableCheck = await db.execute(sql`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    console.log('');

    // Check Brands
    console.log('🏷️  Brands Data:');
    try {
      const brandsData = await db.select().from(brands).orderBy(brands.name).limit(10);
      console.log(`Found ${brandsData.length} brands:`);
      brandsData.forEach(brand => {
        console.log(`  - ${brand.name} (ID: ${brand.id})`);
      });
      
      const [brandCount] = await db.select({ count: count() }).from(brands);
      console.log(`Total brands: ${brandCount.count}\n`);
    } catch (error) {
      console.log('❌ Brands table not found or error:', error.message);
      console.log('');
    }

    // Check Models  
    console.log('🚗 Models Data:');
    try {
      const modelsData = await db
        .select({
          model: models,
          brand: brands
        })
        .from(models)
        .leftJoin(brands, sql`${models.brandId} = ${brands.id}`)
        .orderBy(brands.name, models.name)
        .limit(10);
        
      console.log(`Found ${modelsData.length} models (showing first 10):`);
      modelsData.forEach(item => {
        console.log(`  - ${item.brand?.name || 'Unknown'} ${item.model.name} (ID: ${item.model.id})`);
      });
      
      const [modelCount] = await db.select({ count: count() }).from(models);
      console.log(`Total models: ${modelCount.count}\n`);
    } catch (error) {
      console.log('❌ Models table not found or error:', error.message);
      console.log('');
    }

    // Check Vehicles
    console.log('🚙 Vehicles Data:');
    try {
      const vehiclesData = await db
        .select({
          vehicle: vehicles,
          brand: brands,
          model: models
        })
        .from(vehicles)
        .leftJoin(brands, sql`${vehicles.brandId} = ${brands.id}`)
        .leftJoin(models, sql`${vehicles.modelId} = ${models.id}`)
        .orderBy(desc(vehicles.createdAt))
        .limit(5);
        
      console.log(`Found ${vehiclesData.length} vehicles (showing first 5):`);
      vehiclesData.forEach(item => {
        const vehicle = item.vehicle;
        const brandName = item.brand?.name || 'Unknown';
        const modelName = item.model?.name || 'Unknown';
        console.log(`  - ${vehicle.title || `${brandName} ${modelName}`}`);
        console.log(`    Price: ${vehicle.currency || 'USD'} ${vehicle.price || 'N/A'}`);
        console.log(`    Year: ${vehicle.year || 'N/A'}`);
        console.log(`    Location: ${vehicle.locationCity || 'N/A'}, ${vehicle.locationState || 'N/A'}`);
        console.log(`    Created: ${vehicle.createdAt?.toISOString() || 'N/A'}`);
        console.log('');
      });
      
      const [vehicleCount] = await db.select({ count: count() }).from(vehicles);
      console.log(`Total vehicles: ${vehicleCount.count}\n`);
    } catch (error) {
      console.log('❌ Vehicles table not found or error:', error.message);
      console.log('');
    }

    // Check Dealerships (if exists)
    console.log('🏢 Dealerships Data:');
    try {
      const dealershipsData = await db.select().from(dealerships).limit(5);
      console.log(`Found ${dealershipsData.length} dealerships:`);
      dealershipsData.forEach(dealership => {
        console.log(`  - ${dealership.name} (${dealership.dealershipType})`);
        console.log(`    URLs: base=${dealership.baseUrl || 'N/A'}, used=${dealership.usedVehiclesUrl || 'N/A'}`);
        console.log(`    Scraper Order: ${dealership.scraperOrder || 'Not assigned'}`);
        console.log('');
      });
      
      const [dealershipCount] = await db.select({ count: count() }).from(dealerships);
      console.log(`Total dealerships: ${dealershipCount.count}\n`);
    } catch (error) {
      console.log('❌ Dealerships table not found or error:', error.message);
      console.log('');
    }

    // Check Provinces (if exists)
    console.log('🗺️  Provinces Data:');
    try {
      const provincesData = await db.select().from(provinces).orderBy(provinces.name).limit(10);
      console.log(`Found ${provincesData.length} provinces:`);
      provincesData.forEach(province => {
        console.log(`  - ${province.name} (${province.code}) - ${province.region || 'No region'}`);
      });
      
      const [provinceCount] = await db.select({ count: count() }).from(provinces);
      console.log(`Total provinces: ${provinceCount.count}\n`);
    } catch (error) {
      console.log('❌ Provinces table not found or error:', error.message);
      console.log('');
    }

    // Check Agent Jobs
    console.log('🤖 Agent Jobs Data:');
    try {
      const agentJobsData = await db
        .select()
        .from(agentJobs)
        .orderBy(desc(agentJobs.createdAt))
        .limit(5);
        
      console.log(`Found ${agentJobsData.length} agent jobs (showing latest 5):`);
      agentJobsData.forEach(job => {
        console.log(`  - ${job.agentId} (${job.agentType})`);
        console.log(`    Job: ${job.jobType} - Status: ${job.status}`);
        console.log(`    Created: ${job.createdAt?.toISOString() || 'N/A'}`);
        console.log('');
      });
      
      const [jobCount] = await db.select({ count: count() }).from(agentJobs);
      console.log(`Total agent jobs: ${jobCount.count}\n`);
    } catch (error) {
      console.log('❌ Agent jobs table not found or error:', error.message);
      console.log('');
    }

    // Check Images
    console.log('🖼️  Images Data:');
    try {
      const imagesData = await db.select().from(images).limit(5);
      console.log(`Found ${imagesData.length} images (showing first 5):`);
      imagesData.forEach(image => {
        console.log(`  - Vehicle ID: ${image.vehicleId}`);
        console.log(`    URL: ${image.imageUrl}`);
        console.log(`    Type: ${image.imageType}, Primary: ${image.isPrimary}`);
        console.log('');
      });
      
      const [imageCount] = await db.select({ count: count() }).from(images);
      console.log(`Total images: ${imageCount.count}\n`);
    } catch (error) {
      console.log('❌ Images table not found or error:', error.message);
      console.log('');
    }

    // Summary
    console.log('📊 Data Summary:');
    try {
      const summary = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM brands) as brands,
          (SELECT COUNT(*) FROM models) as models,  
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM images) as images,
          (SELECT COUNT(*) FROM agent_jobs) as agent_jobs
      `);
      
      console.log('Current data counts:');
      const counts = summary.rows[0];
      Object.entries(counts).forEach(([table, count]) => {
        console.log(`  ${table}: ${count}`);
      });
    } catch (error) {
      console.log('❌ Could not get complete summary:', error.message);
    }

  } catch (error) {
    console.error('❌ Error fetching data:', error);
  }
}

// Run the script
if (require.main === module) {
  fetchExistingData()
    .then(() => {
      console.log('\n✅ Data fetch complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fetchExistingData };