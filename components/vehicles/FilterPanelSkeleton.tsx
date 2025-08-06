import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function FilterPanelSkeleton() {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Section */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>

        <Separator />

        {/* Price Filter */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="px-2">
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Location Filter */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <Separator />

        {/* Brand Filter */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <Separator />

        {/* Year Filter */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <div className="px-2">
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Clear button */}
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}