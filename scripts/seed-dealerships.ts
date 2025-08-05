/**
 * Seed script to populate dealerships database with real Argentina data
 * Based on /data/concesionarias-usados1.md
 */

import { db } from '../lib/neon';
import { provinces, cities, dealerships } from '../lib/schema';
import { eq } from 'drizzle-orm';

// Argentina provinces and regions data
const PROVINCES_DATA = [
  // Región NOA (Noroeste)
  { name: 'Tucumán', code: 'ARG_TU', region: 'NOA' },
  { name: 'Salta', code: 'ARG_SA', region: 'NOA' },
  { name: 'Jujuy', code: 'ARG_JU', region: 'NOA' },
  
  // Región NEA (Noreste)
  { name: 'Misiones', code: 'ARG_MI', region: 'NEA' },
  { name: 'Corrientes', code: 'ARG_CO', region: 'NEA' },
  
  // Región Patagonia
  { name: 'Neuquén', code: 'ARG_NQ', region: 'Patagonia' },
  { name: 'Río Negro', code: 'ARG_RN', region: 'Patagonia' },
  { name: 'Chubut', code: 'ARG_CH', region: 'Patagonia' },
  { name: 'Santa Cruz', code: 'ARG_SC', region: 'Patagonia' },
  
  // Región Centro
  { name: 'Buenos Aires', code: 'ARG_BA', region: 'Centro' },
  { name: 'CABA', code: 'ARG_CF', region: 'Centro' },
  { name: 'Córdoba', code: 'ARG_CB', region: 'Centro' },
  { name: 'Santa Fe', code: 'ARG_SF', region: 'Centro' },
  { name: 'Entre Ríos', code: 'ARG_ER', region: 'Centro' },
  
  // Región Cuyo
  { name: 'Mendoza', code: 'ARG_MZ', region: 'Cuyo' }
];

// Cities data
const CITIES_DATA = [
  // Tucumán
  { name: 'San Miguel de Tucumán', provinceName: 'Tucumán' },
  
  // Salta
  { name: 'Salta Capital', provinceName: 'Salta' },
  
  // Jujuy
  { name: 'San Salvador de Jujuy', provinceName: 'Jujuy' },
  
  // Misiones
  { name: 'Posadas', provinceName: 'Misiones' },
  
  // Corrientes
  { name: 'Corrientes Capital', provinceName: 'Corrientes' },
  
  // Neuquén
  { name: 'Neuquén Capital', provinceName: 'Neuquén' },
  
  // Río Negro
  { name: 'Viedma', provinceName: 'Río Negro' },
  
  // Chubut
  { name: 'Comodoro Rivadavia', provinceName: 'Chubut' },
  { name: 'Trelew', provinceName: 'Chubut' },
  
  // Santa Cruz
  { name: 'Las Heras', provinceName: 'Santa Cruz' },
  
  // Buenos Aires
  { name: 'Buenos Aires', provinceName: 'Buenos Aires' },
  
  // CABA
  { name: 'Ciudad Autónoma de Buenos Aires', provinceName: 'CABA' },
  
  // Córdoba
  { name: 'Córdoba Capital', provinceName: 'Córdoba' },
  
  // Santa Fe
  { name: 'Santa Fe Capital', provinceName: 'Santa Fe' },
  
  // Entre Ríos
  { name: 'Paraná', provinceName: 'Entre Ríos' },
  { name: 'Resistencia', provinceName: 'Entre Ríos' }, // Note: Actually Chaco, but serving Entre Ríos too
  
  // Mendoza
  { name: 'Mendoza Capital', provinceName: 'Mendoza' }
];

// Real dealerships data from the markdown file
const DEALERSHIPS_DATA = [
  // Tucumán
  {
    name: 'Toyota Line Up Usados Tucumán',
    slug: 'toyota-lineup-tucuman',
    websiteUrl: 'https://lineup.com.ar/usados',
    usedVehiclesUrl: 'https://lineup.com.ar/usados',
    cityName: 'San Miguel de Tucumán',
    officialBrand: 'Toyota',
    dealershipType: 'official',
    rating: 4.2,
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 20,
      opportunityThreshold: 'medium',
      qualityThreshold: 80
    }
  },
  {
    name: 'LOX Autos',
    slug: 'lox-autos-noa',
    websiteUrl: 'https://loxautos.com.ar/',
    usedVehiclesUrl: 'https://loxautos.com.ar/',
    cityName: 'San Miguel de Tucumán',
    dealershipType: 'multimarca',
    rating: 4.3,
    explorationConfig: {
      explorationDepth: 'deep',
      maxUrlsToProcess: 30,
      opportunityThreshold: 'medium',
      qualityThreshold: 75
    }
  },
  {
    name: 'Fortunato Fortino (Citroën)',
    slug: 'fortunato-fortino-citroen',
    websiteUrl: 'https://www.fortunatofortino.com/',
    cityName: 'San Miguel de Tucumán',
    officialBrand: 'Citroën',
    dealershipType: 'official'
  },
  
  // Salta
  {
    name: 'Autosol Salta',
    slug: 'autosol-salta',
    websiteUrl: 'https://www.autosol.com.ar/usados',
    usedVehiclesUrl: 'https://www.autosol.com.ar/usados',
    phone: '543874490097',
    cityName: 'Salta Capital',
    dealershipType: 'multimarca'
  },
  {
    name: 'Usados Cenoa',
    slug: 'usados-cenoa',
    websiteUrl: 'https://usados.cenoa.com.ar/',
    usedVehiclesUrl: 'https://usados.cenoa.com.ar/',
    cityName: 'Salta Capital',
    dealershipType: 'multimarca'
  },
  {
    name: 'Ford Pussetto Salta',
    slug: 'ford-pussetto-salta',
    websiteUrl: 'https://www.fordpussetto.com.ar/vehiculos/usados',
    usedVehiclesUrl: 'https://www.fordpussetto.com.ar/vehiculos/usados',
    cityName: 'Salta Capital',
    officialBrand: 'Ford',
    dealershipType: 'official'
  },
  
  // Jujuy
  {
    name: 'Autosol Jujuy',
    slug: 'autosol-jujuy',
    websiteUrl: 'https://www.autosol.com.ar/usados',
    usedVehiclesUrl: 'https://www.autosol.com.ar/usados',
    phone: '5493884377776',
    cityName: 'San Salvador de Jujuy',
    dealershipType: 'multimarca'
  },
  {
    name: 'Horacio Pussetto S.A. (VW)',
    slug: 'horacio-pussetto-vw',
    websiteUrl: 'http://horaciopussetto.com.ar/',
    cityName: 'San Salvador de Jujuy',
    officialBrand: 'Volkswagen',
    dealershipType: 'official'
  },
  
  // Misiones
  {
    name: 'Carmak',
    slug: 'carmak-posadas',
    websiteUrl: 'https://carmak.com.ar/',
    usedVehiclesUrl: 'https://carmak.com.ar/',
    cityName: 'Posadas',
    dealershipType: 'multimarca'
  },
  {
    name: 'San Vicente Automotores',
    slug: 'san-vicente-automotores',
    websiteUrl: 'https://sanvicenteautomotores.com.ar/',
    address: 'Avenida Quaranta 3415, Posadas',
    cityName: 'Posadas',
    dealershipType: 'multimarca',
    businessHours: {
      weekdays: '8:00-12:30 y 16:00-20:00',
      saturday: '8:00-12:30',
      sunday: 'Cerrado'
    }
  },
  {
    name: 'Toyota Misiones S.A. (TMSA)',
    slug: 'toyota-misiones-tmsa',
    websiteUrl: 'https://tmsa.com.ar/',
    cityName: 'Posadas',
    officialBrand: 'Toyota',
    dealershipType: 'official'
  },
  
  // Buenos Aires & CABA
  {
    name: 'Car Cash Argentina',
    slug: 'car-cash-argentina',
    websiteUrl: 'https://www.carcash.com.ar/',
    cityName: 'Ciudad Autónoma de Buenos Aires',
    dealershipType: 'multimarca',
    rating: 4.3
  },
  {
    name: 'Kavak Argentina',
    slug: 'kavak-argentina',
    websiteUrl: 'https://www.kavak.com/ar/',
    cityName: 'Ciudad Autónoma de Buenos Aires',
    dealershipType: 'multimarca',
    rating: 4.1,
    explorationConfig: {
      explorationDepth: 'deep',
      maxUrlsToProcess: 50,
      opportunityThreshold: 'high',
      qualityThreshold: 85
    }
  },
  
  // Córdoba
  {
    name: 'Ferrero Automotores',
    slug: 'ferrero-automotores',
    websiteUrl: 'https://autosusadoscordoba.com.ar/',
    cityName: 'Córdoba Capital',
    dealershipType: 'multimarca',
    rating: 3.9
  },
  {
    name: 'Montironi',
    slug: 'montironi-cordoba',
    websiteUrl: 'https://montironi.com/',
    cityName: 'Córdoba Capital',
    dealershipType: 'multimarca',
    rating: 4.1
  },
  
  // Santa Fe
  {
    name: 'NEOSTAR',
    slug: 'neostar-santa-fe',
    websiteUrl: 'https://neostar.com.ar/',
    address: 'Pellegrini 3365',
    cityName: 'Santa Fe Capital',
    dealershipType: 'multimarca',
    rating: 4.3
  },
  
  // Mendoza
  {
    name: 'Torassa Automotores',
    slug: 'torassa-automotores',
    websiteUrl: 'https://torassaautomotores.com.ar/',
    cityName: 'Mendoza Capital',
    dealershipType: 'multimarca',
    rating: 3.9
  }
];

async function seedProvinces() {
  console.log('🏛️ Seeding provinces...');
  
  for (const provinceData of PROVINCES_DATA) {
    try {
      // Check if province exists
      const existing = await db
        .select()
        .from(provinces)
        .where(eq(provinces.code, provinceData.code))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(provinces).values({
          name: provinceData.name,
          code: provinceData.code,
          region: provinceData.region,
          country: 'Argentina'
        });
        console.log(`  ✅ Created province: ${provinceData.name}`);
      } else {
        console.log(`  ⏭️  Province exists: ${provinceData.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating province ${provinceData.name}:`, error);
    }
  }
}

async function seedCities() {
  console.log('🏙️ Seeding cities...');
  
  for (const cityData of CITIES_DATA) {
    try {
      // Get province ID
      const province = await db
        .select()
        .from(provinces)
        .where(eq(provinces.name, cityData.provinceName))
        .limit(1);

      if (province.length === 0) {
        console.error(`  ❌ Province not found: ${cityData.provinceName}`);
        continue;
      }

      // Check if city exists
      const existing = await db
        .select()
        .from(cities)
        .where(eq(cities.name, cityData.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(cities).values({
          name: cityData.name,
          provinceId: province[0].id
        });
        console.log(`  ✅ Created city: ${cityData.name}`);
      } else {
        console.log(`  ⏭️  City exists: ${cityData.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating city ${cityData.name}:`, error);
    }
  }
}

async function seedDealerships() {
  console.log('🚗 Seeding dealerships...');
  
  for (const dealershipData of DEALERSHIPS_DATA) {
    try {
      // Get city ID
      const city = await db
        .select({ id: cities.id, provinceId: cities.provinceId })
        .from(cities)
        .where(eq(cities.name, dealershipData.cityName))
        .limit(1);

      if (city.length === 0) {
        console.error(`  ❌ City not found: ${dealershipData.cityName}`);
        continue;
      }

      // Check if dealership exists
      const existing = await db
        .select()
        .from(dealerships)
        .where(eq(dealerships.slug, dealershipData.slug))
        .limit(1);

      if (existing.length === 0) {
        // Calculate scraper order based on index (distribute across 24 hours)
        const dealershipIndex = DEALERSHIPS_DATA.indexOf(dealershipData);
        const scraperOrder = (dealershipIndex % 24) + 1; // 1-24 hours

        await db.insert(dealerships).values({
          name: dealershipData.name,
          slug: dealershipData.slug,
          websiteUrl: dealershipData.websiteUrl,
          baseUrl: dealershipData.websiteUrl, // Use main URL as base for exploration
          usedVehiclesUrl: dealershipData.usedVehiclesUrl,
          phone: dealershipData.phone,
          address: dealershipData.address,
          cityId: city[0].id,
          provinceId: city[0].provinceId,
          officialBrand: dealershipData.officialBrand,
          dealershipType: dealershipData.dealershipType,
          rating: dealershipData.rating?.toString(),
          businessHours: dealershipData.businessHours,
          explorationEnabled: true,
          explorationConfig: dealershipData.explorationConfig || {
            explorationDepth: 'shallow',
            maxUrlsToProcess: 15,
            opportunityThreshold: 'medium',
            qualityThreshold: 75
          },
          explorationFrequency: 'daily',
          scraperOrder, // Assign distributed scraper order
          isActive: true,
          isVerified: true
        });
        console.log(`  ✅ Created dealership: ${dealershipData.name}`);
      } else {
        console.log(`  ⏭️  Dealership exists: ${dealershipData.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating dealership ${dealershipData.name}:`, error);
    }
  }
}

async function main() {
  try {
    console.log('🌱 Starting dealership database seeding...');
    console.log('');

    await seedProvinces();
    console.log('');
    
    await seedCities();
    console.log('');
    
    await seedDealerships();
    console.log('');

    console.log('🎉 Seeding completed successfully!');
    
    // Display summary
    const provinceCount = await db.select().from(provinces);
    const cityCount = await db.select().from(cities);
    const dealershipCount = await db.select().from(dealerships);
    
    console.log('');
    console.log('📊 Database Summary:');
    console.log(`   - Provinces: ${provinceCount.length}`);
    console.log(`   - Cities: ${cityCount.length}`);
    console.log(`   - Dealerships: ${dealershipCount.length}`);

  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as seedDealerships };