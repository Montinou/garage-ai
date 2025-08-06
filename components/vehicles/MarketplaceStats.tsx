import { Car, Building, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMarketplaceStats } from '@/lib/car-queries';
import { formatNumber, formatPriceCompact } from '@/lib/format-utils';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
  color?: 'default' | 'green' | 'blue' | 'yellow';
}

function StatCard({ icon: Icon, value, label, trend, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center">
            <TrendingUp className={`h-3 w-3 mr-1 ${
              trend === 'up' ? 'text-green-600' : 'text-red-600 rotate-180'
            }`} />
            <Badge variant="outline" className="text-xs">
              Tendencia {trend === 'up' ? '↗' : '↘'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MarketplaceStats() {
  try {
    const stats = await getMarketplaceStats();
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Car}
          value={formatNumber(stats.totalVehicles)}
          label="Vehículos disponibles"
          color="blue"
          trend="up"
        />
        
        <StatCard
          icon={Building}
          value={formatNumber(stats.totalDealerships)}
          label="Concesionarias activas"
          color="green"
        />
        
        <StatCard
          icon={Star}
          value={formatNumber(stats.opportunities)}
          label="Oportunidades AI"
          color="yellow"
          trend="up"
        />
        
        <StatCard
          icon={TrendingUp}
          value={formatPriceCompact(stats.averagePrice)}
          label="Precio promedio"
          color="default"
        />
      </div>
    );
  } catch (error) {
    // Silently handle stats loading errors - component will show fallback data
    
    // Return skeleton/fallback on error
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Car}
          value="---"
          label="Vehículos disponibles"
          color="blue"
        />
        
        <StatCard
          icon={Building}
          value="---"
          label="Concesionarias activas"
          color="green"
        />
        
        <StatCard
          icon={Star}
          value="---"
          label="Oportunidades AI"
          color="yellow"
        />
        
        <StatCard
          icon={TrendingUp}
          value="---"
          label="Precio promedio"
          color="default"
        />
      </div>
    );
  }
}