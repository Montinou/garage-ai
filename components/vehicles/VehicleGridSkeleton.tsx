import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface VehicleGridSkeletonProps {
  count?: number;
}

export default function VehicleGridSkeleton({ count = 12 }: VehicleGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="overflow-hidden">
          {/* Image skeleton */}
          <div className="aspect-video">
            <Skeleton className="w-full h-full" />
          </div>
          
          <CardContent className="p-4 space-y-3">
            {/* Title skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Price skeleton */}
            <Skeleton className="h-7 w-1/2" />
            
            {/* Details grid skeleton */}
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            
            {/* Location skeleton */}
            <Skeleton className="h-4 w-2/3" />
            
            {/* Dealership skeleton */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
          
          <CardFooter className="pt-0 px-4 pb-4">
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}