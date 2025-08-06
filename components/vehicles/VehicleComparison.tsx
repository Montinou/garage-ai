'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Plus, 
  Check, 
  Minus,
  Car,
  Calendar,
  Gauge,
  Fuel,
  Cog,
  DollarSign,
  MapPin
} from 'lucide-react';
import { formatPrice } from '@/lib/format-utils';
import Image from 'next/image';
import Link from 'next/link';

interface VehicleComparisonData {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  price: string | null;
  currency: string;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  engineSize: string | null;
  color: string | null;
  condition: string | null;
  location: string;
  primaryImage: string | null;
  isOpportunity: boolean | null;
  opportunityScore: number | null;
}

export default function VehicleComparison() {
  const [compareList, setCompareList] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleComparisonData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const maxCompareItems = 3;

  useEffect(() => {
    // Load comparison list from localStorage
    const saved = localStorage.getItem('vehicleCompareList');
    if (saved) {
      setCompareList(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save to localStorage whenever compareList changes
    localStorage.setItem('vehicleCompareList', JSON.stringify(compareList));
    
    // Fetch vehicle data for comparison
    if (compareList.length > 0) {
      fetchVehicleData();
    } else {
      setVehicles([]);
    }
  }, [compareList]);

  const fetchVehicleData = async () => {
    try {
      const vehiclePromises = compareList.map(id =>
        fetch(`/api/cars/${id}`).then(res => res.json())
      );
      const results = await Promise.all(vehiclePromises);
      setVehicles(results.map(r => r.vehicle).filter(Boolean));
    } catch (error) {
      console.error('Error fetching vehicles for comparison:', error);
    }
  };

  const addToCompare = (vehicleId: string) => {
    if (compareList.length < maxCompareItems && !compareList.includes(vehicleId)) {
      setCompareList([...compareList, vehicleId]);
    }
  };

  const removeFromCompare = (vehicleId: string) => {
    setCompareList(compareList.filter(id => id !== vehicleId));
  };

  const clearComparison = () => {
    setCompareList([]);
    setIsOpen(false);
  };

  if (compareList.length === 0) {
    return null;
  }

  const specs = [
    { key: 'price', label: 'Precio', icon: DollarSign, format: (v: any) => formatPrice(v.price, v.currency) },
    { key: 'year', label: 'Año', icon: Calendar, format: (v: any) => v.year || '-' },
    { key: 'mileage', label: 'Kilometraje', icon: Gauge, format: (v: any) => v.mileage ? `${v.mileage.toLocaleString()} km` : '-' },
    { key: 'fuel', label: 'Combustible', icon: Fuel, format: (v: any) => v.fuel || '-' },
    { key: 'transmission', label: 'Transmisión', icon: Cog, format: (v: any) => v.transmission || '-' },
    { key: 'engineSize', label: 'Motor', icon: Car, format: (v: any) => v.engineSize || '-' },
    { key: 'condition', label: 'Condición', icon: Check, format: (v: any) => v.condition || '-' },
    { key: 'location', label: 'Ubicación', icon: MapPin, format: (v: any) => v.location || '-' },
  ];

  return (
    <>
      {/* Floating Compare Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="relative shadow-lg"
          size="lg"
        >
          <Car className="w-5 h-5 mr-2" />
          Comparar ({compareList.length})
          {compareList.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              {compareList.length}
            </span>
          )}
        </Button>
      </div>

      {/* Comparison Modal/Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-screen p-4 md:p-6">
            <Card className="max-w-7xl mx-auto bg-background">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Comparar Vehículos</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearComparison}
                    >
                      Limpiar todo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-4 min-w-[150px]">Especificación</th>
                        {vehicles.map(vehicle => (
                          <th key={vehicle.id} className="p-4 min-w-[250px]">
                            <div className="space-y-3">
                              {/* Vehicle Image */}
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                                {vehicle.primaryImage ? (
                                  <Image
                                    src={vehicle.primaryImage}
                                    alt={vehicle.title}
                                    fill
                                    className="object-cover"
                                    sizes="250px"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Car className="w-12 h-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Vehicle Title */}
                              <div>
                                <h3 className="font-semibold text-sm line-clamp-2">
                                  {vehicle.title}
                                </h3>
                                {vehicle.isOpportunity && (
                                  <Badge className="mt-1" variant="secondary">
                                    Oportunidad AI
                                  </Badge>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <Link
                                  href={`/vehiculos/${vehicle.id}`}
                                  className="flex-1"
                                >
                                  <Button variant="outline" size="sm" className="w-full">
                                    Ver detalles
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCompare(vehicle.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </th>
                        ))}
                        
                        {/* Add more vehicles placeholder */}
                        {compareList.length < maxCompareItems && (
                          <th className="p-4 min-w-[250px]">
                            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
                              <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Agregar vehículo
                              </p>
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {specs.map((spec, index) => (
                        <tr key={spec.key} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-2">
                              <spec.icon className="w-4 h-4 text-muted-foreground" />
                              {spec.label}
                            </div>
                          </td>
                          {vehicles.map(vehicle => (
                            <td key={vehicle.id} className="p-4 text-center">
                              {spec.format(vehicle)}
                            </td>
                          ))}
                          {compareList.length < maxCompareItems && (
                            <td className="p-4"></td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden space-y-4 mt-6">
                  {vehicles.map((vehicle, index) => (
                    <Card key={vehicle.id} className="p-4">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {vehicle.primaryImage ? (
                            <Image
                              src={vehicle.primaryImage}
                              alt={vehicle.title}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Car className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                            {vehicle.title}
                          </h3>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(vehicle.price, vehicle.currency)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCompare(vehicle.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {specs.slice(1).map(spec => (
                          <div key={spec.key} className="flex justify-between">
                            <span className="text-muted-foreground">{spec.label}:</span>
                            <span className="font-medium">{spec.format(vehicle)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Link href={`/vehiculos/${vehicle.id}`}>
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          Ver detalles
                        </Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

// Export helper hook for adding vehicles to comparison
export function useVehicleComparison() {
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('vehicleCompareList');
    if (saved) {
      setCompareList(JSON.parse(saved));
    }

    const handleStorageChange = () => {
      const saved = localStorage.getItem('vehicleCompareList');
      if (saved) {
        setCompareList(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addToCompare = (vehicleId: string) => {
    const saved = localStorage.getItem('vehicleCompareList');
    const list = saved ? JSON.parse(saved) : [];
    
    if (list.length < 3 && !list.includes(vehicleId)) {
      const newList = [...list, vehicleId];
      localStorage.setItem('vehicleCompareList', JSON.stringify(newList));
      setCompareList(newList);
      window.dispatchEvent(new Event('storage'));
      return true;
    }
    return false;
  };

  const removeFromCompare = (vehicleId: string) => {
    const saved = localStorage.getItem('vehicleCompareList');
    const list = saved ? JSON.parse(saved) : [];
    const newList = list.filter((id: string) => id !== vehicleId);
    localStorage.setItem('vehicleCompareList', JSON.stringify(newList));
    setCompareList(newList);
    window.dispatchEvent(new Event('storage'));
  };

  const isInCompare = (vehicleId: string) => {
    return compareList.includes(vehicleId);
  };

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    isInCompare,
    compareCount: compareList.length
  };
}