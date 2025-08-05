/**
 * Opportunity Detection System
 * Analyzes vehicle data to identify commercial opportunities
 */

export interface OpportunityFilter {
  maxPrice?: number;
  minPrice?: number;
  maxMileage?: number;
  minYear?: number;
  brands?: string[];
  models?: string[];
  conditions?: string[];
  locations?: string[];
  keywords?: string[];
  priceDropThreshold?: number; // % below market average
}

export interface Opportunity {
  id: string;
  type: 'price_drop' | 'below_market' | 'low_mileage' | 'premium_features' | 'location_advantage' | 'condition_mismatch';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings: number;
  confidence: number;
  vehicleData: any;
  recommendations: string[];
}

export class OpportunityDetector {
  private marketAverages: Map<string, number> = new Map();

  constructor() {
    // Initialize with some market averages (in production, this would come from a database)
    this.marketAverages.set('toyota-corolla-2020', 280000);
    this.marketAverages.set('honda-civic-2019', 320000);
    this.marketAverages.set('nissan-sentra-2021', 290000);
    this.marketAverages.set('volkswagen-jetta-2018', 250000);
  }

  /**
   * Analyze extracted vehicle data for opportunities
   */
  analyzeOpportunities(vehicleData: any, validationData?: any): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // 1. Price-based opportunities
    opportunities.push(...this.detectPriceOpportunities(vehicleData, validationData));
    
    // 2. Mileage-based opportunities
    opportunities.push(...this.detectMileageOpportunities(vehicleData));
    
    // 3. Feature-based opportunities
    opportunities.push(...this.detectFeatureOpportunities(vehicleData));
    
    // 4. Condition-based opportunities
    opportunities.push(...this.detectConditionOpportunities(vehicleData));

    // Sort by severity and confidence
    return opportunities.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Detect price-based opportunities
   */
  private detectPriceOpportunities(vehicleData: any, validationData?: any): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    if (!vehicleData.precio || !vehicleData.marca || !vehicleData.modelo || !vehicleData.año) {
      return opportunities;
    }

    const marketKey = `${vehicleData.marca.toLowerCase()}-${vehicleData.modelo.toLowerCase()}-${vehicleData.año}`;
    const marketAverage = this.marketAverages.get(marketKey);
    
    if (marketAverage) {
      const priceDifference = marketAverage - vehicleData.precio;
      const percentageBelow = (priceDifference / marketAverage) * 100;
      
      if (percentageBelow >= 15) {
        opportunities.push({
          id: `price-below-market-${Date.now()}`,
          type: 'below_market',
          severity: percentageBelow >= 25 ? 'high' : 'medium',
          title: `Precio ${percentageBelow.toFixed(1)}% por debajo del mercado`,
          description: `Este ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año} está $${priceDifference.toLocaleString()} por debajo del precio promedio de mercado ($${marketAverage.toLocaleString()})`,
          estimatedSavings: priceDifference,
          confidence: 0.85,
          vehicleData,
          recommendations: [
            'Verificar historial del vehículo para confirmar condición',
            'Inspeccionar físicamente antes de la compra',
            'Negociar precio final basado en condición actual'
          ]
        });
      }
    }

    // Detect promotional pricing keywords
    const description = vehicleData.descripcion?.toLowerCase() || '';
    const promotionalWords = ['oferta', 'descuento', 'liquidación', 'remate', 'promoción', 'precio especial'];
    
    if (promotionalWords.some(word => description.includes(word))) {
      opportunities.push({
        id: `promotional-price-${Date.now()}`,
        type: 'price_drop',
        severity: 'medium',
        title: 'Vehículo en promoción especial',
        description: 'El anuncio indica que este vehículo tiene pricing promocional o descuentos especiales',
        estimatedSavings: vehicleData.precio * 0.1, // Estimate 10% savings
        confidence: 0.65,
        vehicleData,
        recommendations: [
          'Contactar al vendedor para confirmar oferta',
          'Preguntar sobre fecha límite de la promoción',
          'Verificar términos y condiciones'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Detect mileage-based opportunities
   */
  private detectMileageOpportunities(vehicleData: any): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    if (!vehicleData.kilometraje || !vehicleData.año) {
      return opportunities;
    }

    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - vehicleData.año;
    const expectedMileage = vehicleAge * 15000; // 15k km per year average
    const actualMileage = vehicleData.kilometraje;
    
    if (actualMileage < expectedMileage * 0.7) { // 30% below expected
      const mileageSavings = (expectedMileage - actualMileage) * 2; // Estimate $2 per km saved
      
      opportunities.push({
        id: `low-mileage-${Date.now()}`,
        type: 'low_mileage',
        severity: actualMileage < expectedMileage * 0.5 ? 'high' : 'medium',
        title: 'Kilometraje excepcionalmente bajo',
        description: `Con ${actualMileage.toLocaleString()} km, este vehículo tiene ${(expectedMileage - actualMileage).toLocaleString()} km menos que el promedio esperado para su año`,
        estimatedSavings: mileageSavings,
        confidence: 0.80,
        vehicleData,
        recommendations: [
          'Verificar autenticidad del odómetro',
          'Revisar historial de mantenimiento',
          'Considerar como inversión a largo plazo'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Detect feature-based opportunities
   */
  private detectFeatureOpportunities(vehicleData: any): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    if (!vehicleData.caracteristicas || !Array.isArray(vehicleData.caracteristicas)) {
      return opportunities;
    }

    const premiumFeatures = [
      'cuero', 'leather', 'navegación', 'gps', 'cámara', 'quemacocos', 'sunroof',
      'sensores', 'automático', 'turbo', 'premium', 'bose', 'harman', 'xenón',
      'led', 'adaptativo', 'asistente', 'parking'
    ];

    const featuresText = vehicleData.caracteristicas.join(' ').toLowerCase();
    const foundPremiumFeatures = premiumFeatures.filter(feature => 
      featuresText.includes(feature)
    );

    if (foundPremiumFeatures.length >= 3) {
      opportunities.push({
        id: `premium-features-${Date.now()}`,
        type: 'premium_features',
        severity: foundPremiumFeatures.length >= 5 ? 'high' : 'medium',
        title: `Vehículo con ${foundPremiumFeatures.length} características premium`,
        description: `Este vehículo incluye características premium como: ${foundPremiumFeatures.slice(0, 3).join(', ')}${foundPremiumFeatures.length > 3 ? ' y más' : ''}`,
        estimatedSavings: foundPremiumFeatures.length * 15000, // Estimate $15k per premium feature
        confidence: 0.70,
        vehicleData,
        recommendations: [
          'Verificar funcionamiento de todas las características',
          'Considerar costos de mantenimiento adicionales',
          'Evaluar valor de reventa futuro'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Detect condition-based opportunities
   */
  private detectConditionOpportunities(vehicleData: any): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    if (!vehicleData.descripcion) {
      return opportunities;
    }

    const description = vehicleData.descripcion.toLowerCase();
    const excellentConditionWords = [
      'excelente', 'impecable', 'como nuevo', 'perfecto', 'inmaculado',
      'un dueño', 'poco uso', 'garage', 'mantenimiento al día'
    ];

    const foundPositiveWords = excellentConditionWords.filter(word => 
      description.includes(word)
    );

    if (foundPositiveWords.length >= 2) {
      opportunities.push({
        id: `excellent-condition-${Date.now()}`,
        type: 'condition_mismatch',
        severity: 'medium',
        title: 'Vehículo en condición excepcional',
        description: `La descripción indica condición excelente con términos como: ${foundPositiveWords.slice(0, 2).join(', ')}`,
        estimatedSavings: vehicleData.precio * 0.05, // Estimate 5% value add
        confidence: 0.60,
        vehicleData,
        recommendations: [
          'Verificar condición real mediante inspección',
          'Solicitar fotos adicionales',
          'Revisar historial de accidentes'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Filter opportunities based on criteria
   */
  filterOpportunities(opportunities: Opportunity[], filter: OpportunityFilter): Opportunity[] {
    return opportunities.filter(opp => {
      const vehicle = opp.vehicleData;
      
      // Price filters
      if (filter.maxPrice && vehicle.precio > filter.maxPrice) return false;
      if (filter.minPrice && vehicle.precio < filter.minPrice) return false;
      
      // Mileage filter
      if (filter.maxMileage && vehicle.kilometraje > filter.maxMileage) return false;
      
      // Year filter
      if (filter.minYear && vehicle.año < filter.minYear) return false;
      
      // Brand filter
      if (filter.brands && !filter.brands.includes(vehicle.marca?.toLowerCase())) return false;
      
      // Model filter
      if (filter.models && !filter.models.includes(vehicle.modelo?.toLowerCase())) return false;
      
      // Condition filter
      if (filter.conditions && !filter.conditions.includes(vehicle.condicion?.toLowerCase())) return false;
      
      // Location filter
      if (filter.locations) {
        const vehicleLocation = vehicle.ubicacion?.toLowerCase() || '';
        if (!filter.locations.some(loc => vehicleLocation.includes(loc.toLowerCase()))) {
          return false;
        }
      }
      
      // Keywords filter
      if (filter.keywords) {
        const searchText = `${vehicle.descripcion} ${vehicle.caracteristicas?.join(' ')}`.toLowerCase();
        if (!filter.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Update market averages (in production, this would sync with database)
   */
  updateMarketAverages(averages: Record<string, number>): void {
    for (const [key, value] of Object.entries(averages)) {
      this.marketAverages.set(key, value);
    }
  }

  /**
   * Get market average for a vehicle
   */
  getMarketAverage(brand: string, model: string, year: number): number | null {
    const key = `${brand.toLowerCase()}-${model.toLowerCase()}-${year}`;
    return this.marketAverages.get(key) || null;
  }
}

export const opportunityDetector = new OpportunityDetector();
export default opportunityDetector;