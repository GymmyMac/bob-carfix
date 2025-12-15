import { ServicePackage } from "@/types/servicePackage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Wrench, Package } from "lucide-react";

interface ServicePackagesSectionProps {
  packages: ServicePackage[];
  isLoading: boolean;
  onPackageSelect?: (pkg: ServicePackage) => void;
}

export const ServicePackagesSection = ({ 
  packages, 
  isLoading, 
  onPackageSelect 
}: ServicePackagesSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Service Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Service Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className="bg-card hover:bg-accent/50 transition-colors cursor-pointer border-border"
            onClick={() => onPackageSelect?.(pkg)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-medium text-card-foreground">
                  {pkg.title}
                </CardTitle>
                {pkg.carfixValueTier && (
                  <Badge variant="secondary" className="text-xs">
                    Best Value
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xl font-bold text-primary">
                From ${pkg.from_price.toFixed(2)}
              </p>
              
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{pkg.category_count} categories</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{pkg.estimated_time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  <span className="capitalize">{pkg.difficulty_level}</span>
                </div>
              </div>

              {pkg.bundle_discount_percentage > 0 && (
                <Badge variant="outline" className="text-xs">
                  Save {pkg.bundle_discount_percentage}%
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
