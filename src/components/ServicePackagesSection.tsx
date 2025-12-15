import { ServicePackage } from "@/types/servicePackage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  Wrench, 
  Package, 
  DollarSign, 
  Star, 
  Award, 
  Zap,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface ServicePackagesSectionProps {
  packages: ServicePackage[];
  isLoading: boolean;
  onPackageSelect?: (pkg: ServicePackage) => void;
}

// Get icon based on package icon_name or fallback to Package
const getPackageIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'wrench': return Wrench;
    case 'star': return Star;
    case 'award': return Award;
    case 'zap': return Zap;
    case 'dollar': return DollarSign;
    default: return Package;
  }
};

// Get difficulty badge styling
const getDifficultyStyle = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return 'bg-success/10 text-success border-success/20';
    case 'intermediate':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'advanced':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

// Format price in NZD
const formatPrice = (value: number) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(value);
};

export const ServicePackagesSection = ({ 
  packages, 
  isLoading, 
  onPackageSelect 
}: ServicePackagesSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-primary">Service Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2 border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-br from-primary/8 via-blue-50 to-slate-50 px-4 py-4 border-t-4 border-primary">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-full" />
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
      <h2 className="text-xl font-extrabold text-primary">Service Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => {
          const IconComponent = getPackageIcon(pkg.icon_name);
          const hasCarfixValue = !!pkg.carfixValueTier;
          
          return (
            <Card 
              key={pkg.id} 
              className="border-2 border-slate-200 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer group"
              onClick={() => onPackageSelect?.(pkg)}
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-br from-primary/8 via-blue-50 to-slate-50 px-4 py-4 border-t-4 border-primary">
                <div className="flex items-center space-x-3">
                  {/* Package Icon */}
                  <div className="p-3 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg">
                    <IconComponent className="h-6 w-6 text-primary-foreground" />
                  </div>
                  
                  {/* Title & Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-primary truncate">
                        {pkg.title}
                      </h3>
                      {hasCarfixValue && (
                        <Badge className="border-primary/30 bg-primary/10 text-primary font-semibold text-[10px] px-1.5 py-0.5 flex-shrink-0">
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          CARFIX VALUE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {pkg.estimated_time}
                      </span>
                      <span className="flex items-center">
                        <Wrench className="h-3 w-3 mr-1" />
                        <span className="capitalize">{pkg.difficulty_level}</span>
                      </span>
                      <span className="flex items-center">
                        <Package className="h-3 w-3 mr-1" />
                        {pkg.category_count} categories
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4 space-y-3">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(pkg.from_price)}
                  </span>
                  <span className="text-xs text-muted-foreground">inc. GST</span>
                </div>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pkg.description}
                  </p>
                )}

                {/* Badges Row */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* Difficulty Badge */}
                  <Badge 
                    variant="outline" 
                    className={`text-xs capitalize ${getDifficultyStyle(pkg.difficulty_level)}`}
                  >
                    {pkg.difficulty_level}
                  </Badge>

                  {/* Discount Badge */}
                  {pkg.bundle_discount_percentage > 0 && (
                    <Badge className="bg-accent text-accent-foreground border-0 font-bold text-xs animate-pulse">
                      Save {pkg.bundle_discount_percentage}%
                    </Badge>
                  )}

                  {/* Price Range if available */}
                  {pkg.priceRange && (
                    <Badge variant="outline" className="text-xs border-border bg-muted/50">
                      {formatPrice(pkg.priceRange.min)} - {formatPrice(pkg.priceRange.max)}
                    </Badge>
                  )}
                </div>

                {/* View Details CTA */}
                <div className="flex items-center justify-end pt-2">
                  <span className="text-xs text-primary font-medium flex items-center group-hover:underline">
                    View Options
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
