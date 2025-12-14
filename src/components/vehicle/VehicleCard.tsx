import React, { useState } from "react";
import { 
  Edit, 
  Trash2, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  Car, 
  Info, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "@/components/ui/accordion";
import { ModernCard, ModernCardHeader, ModernCardContent } from "@/components/ui/modern-card";
import { ModernBadge } from "@/components/ui/modern-badge";
import { Vehicle, PastPurchase } from "@/types/vehicle";

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicleId: string) => void;
  onShopParts?: (vehicle: Vehicle) => void;
  onChangeVehicle?: () => void;
  pastPurchases?: PastPurchase[];
  initialExpanded?: boolean;
  viewMode?: "grid" | "row";
}

// Fuel type code to label mapping
const getFuelTypeLabel = (code: string | undefined): string => {
  if (!code) return '';
  const fuelTypes: Record<string, string> = {
    '01': 'Petrol',
    '02': 'Diesel',
    '03': 'Electric',
    '04': 'Hybrid',
    '05': 'LPG',
    '06': 'CNG',
    'petrol': 'Petrol',
    'diesel': 'Diesel',
    'electric': 'Electric',
    'hybrid': 'Hybrid',
  };
  return fuelTypes[code.toLowerCase()] || fuelTypes[code] || code;
};

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onEdit,
  onDelete,
  onShopParts,
  onChangeVehicle,
  pastPurchases = [],
  initialExpanded = false,
  viewMode = "grid",
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const vehicleDisplayName = vehicle.vehicle_name_nz || 
    `${vehicle.make || ""} ${vehicle.model || ""} ${vehicle.year || ""}`.trim() || 
    "Unknown Vehicle";
  
  const fuelTypeLabel = getFuelTypeLabel(vehicle.fuel_type);

  return (
    <ModernCard 
      variant="premium" 
      size="lg"
      className="bg-gradient-to-br from-card to-card/80 hover:from-card hover:to-muted/20"
    >
      <ModernCardHeader variant="gradient" className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Car Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            
            {/* Rego and Name */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-wider text-foreground">
                  {vehicle.rego}
                </span>
                <ModernBadge variant="compatible" size="sm">
                  Parts Available
                </ModernBadge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {vehicleDisplayName}
              </p>
            </div>
          </div>

          {/* Expand/Collapse Button (hidden in row mode) */}
          {viewMode !== "row" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </ModernCardHeader>

      <ModernCardContent>
        {/* Shop Parts CTA */}
        <Button
          onClick={() => onShopParts?.(vehicle)}
          className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200"
          size="lg"
        >
          <Package className="mr-2 h-4 w-4" />
          SHOP PARTS
        </Button>

        {/* Expandable Details Section */}
        {(isExpanded || viewMode === "row") && (
          <div className="mt-6 space-y-4 animate-accordion-down">
            {/* Vehicle Details */}
            <Accordion type="single" collapsible defaultValue="details">
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Vehicle Details
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 rounded-lg bg-card/50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {vehicle.vehicle_name_nz && (
                        <div>
                          <p className="text-xs text-muted-foreground">Full Name</p>
                          <p className="text-sm font-medium">{vehicle.vehicle_name_nz}</p>
                        </div>
                      )}
                      {vehicle.variant && (
                        <div>
                          <p className="text-xs text-muted-foreground">Variant</p>
                          <p className="text-sm font-medium">{vehicle.variant}</p>
                        </div>
                      )}
                      {vehicle.engine_size && (
                        <div>
                          <p className="text-xs text-muted-foreground">Engine Size</p>
                          <p className="text-sm font-medium">{vehicle.engine_size}</p>
                        </div>
                      )}
                      {fuelTypeLabel && (
                        <div>
                          <p className="text-xs text-muted-foreground">Fuel Type</p>
                          <p className="text-sm font-medium">{fuelTypeLabel}</p>
                        </div>
                      )}
                      {vehicle.power && (
                        <div>
                          <p className="text-xs text-muted-foreground">Power</p>
                          <p className="text-sm font-medium">{vehicle.power}kW</p>
                        </div>
                      )}
                      {vehicle.cc_rating && (
                        <div>
                          <p className="text-xs text-muted-foreground">CC Rating</p>
                          <p className="text-sm font-medium">{vehicle.cc_rating}cc</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Identification */}
              <AccordionItem value="identification" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Identification
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 rounded-lg bg-card/50 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">VIN Number</p>
                      <p className="font-mono text-sm font-medium">
                        {vehicle.vin || "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Engine Number</p>
                      <p className="font-mono text-sm font-medium">
                        {vehicle.engine_no || "Not available"}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Purchase History (if any) */}
              {pastPurchases.length > 0 && (
                <AccordionItem value="history" className="border-none">
                  <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Purchase History
                      <ModernBadge variant="spec" size="sm">
                        {pastPurchases.length}
                      </ModernBadge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-card/50 p-4">
                      {pastPurchases.map((purchase) => (
                        <div 
                          key={purchase.id}
                          className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{purchase.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {purchase.quantity} • {new Date(purchase.purchased_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">${purchase.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center gap-2 border-t border-border/20 pt-4">
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(vehicle)}
              className="hover:bg-primary/10"
            >
              <Edit className="mr-1.5 h-3 w-3" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete(vehicle.vehicle_id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 h-3 w-3" />
              Delete
            </Button>
          )}
          {onChangeVehicle && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onChangeVehicle}
              className="ml-auto hover:bg-secondary"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Change Vehicle
            </Button>
          )}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

export default VehicleCard;
