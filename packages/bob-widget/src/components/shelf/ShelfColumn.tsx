import React, { useRef, useEffect, useMemo, useState } from "react";
import { useViewportSize } from "../../hooks/useViewportSize";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import { glassScrollDot } from "../../styles/glass";
import { ShelfHeader } from "./ShelfHeader";
import { ShelfLoading, ShelfEmpty } from "./ShelfLoadingState";
import { VariantSelector } from "./VariantSelector";
import { ServicePackageCard } from "./ServicePackageCard";
import { PartslotSection } from "./PartslotSection";

// Re-export VariantCard type for consumers
export interface VariantCard {
  vehicle_id: number;
  optionNumber: number;
  displayTitle: string;
  displaySubtitle: string;
  characterization: string;
  kw?: number | null;
  cc?: number | null;
  ccDisplay?: string | null;
  fuelType?: string | null;
  engineCode?: string | null;
  make: string;
  model: string;
}

interface ShelfColumnProps {
  products: Product[];
  servicePackages: ServicePackage[];
  highlightedPartType?: string | null;
  highlightedProduct?: HighlightedProduct | null;
  scrollToCategory?: string | null;
  onScrollToCategoryComplete?: () => void;
  onProductClick?: (product: Product) => void;
  onPackageSelect?: (pkg: ServicePackage) => void;
  isResearching?: boolean;
  visible?: boolean;
  counterHeightPercent?: number;
  hasVehicle?: boolean;
  onAddToCart?: (product: Product | Product[]) => void;
  vehicleMakeModel?: string;
  pendingVariants?: VariantCard[];
  pendingVariantMake?: string;
  pendingVariantModel?: string;
  onVariantSelect?: (variant: VariantCard) => void;
}

const matchesPartType = (description: string, partType: string): boolean => {
  if (!description || !partType) return false;
  const desc = description.toLowerCase();
  const baseTerms = partType.toLowerCase().replace(/s\b/g, "").split(/\s+/).filter(Boolean);
  return baseTerms.every((term) => desc.includes(term));
};

export const ShelfColumn: React.FC<ShelfColumnProps> = ({
  products,
  servicePackages,
  highlightedPartType,
  highlightedProduct,
  scrollToCategory,
  onScrollToCategoryComplete,
  onProductClick,
  isResearching,
  visible = true,
  onAddToCart,
  vehicleMakeModel,
  pendingVariants,
  pendingVariantMake,
  pendingVariantModel,
  onVariantSelect,
}) => {
  const vehicleDisplayName = vehicleMakeModel || "Bob's Shelf";
  const viewportSize = useViewportSize();
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const [scrollProgress, setScrollProgress] = useState(0);

  // Group products by partslot
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const key = p.partslotDescription || "Other Parts";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.keys(groups).sort((a, b) => a.localeCompare(b)).map((name) => ({ name, products: groups[name] }));
  }, [products]);

  // Auto-scroll to highlighted partslot
  useEffect(() => {
    if (!highlightedPartType) return;
    const timer = setTimeout(() => {
      for (const [name, el] of Object.entries(groupRefs.current)) {
        if (el && matchesPartType(name, highlightedPartType)) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedPartType]);

  // Auto-scroll to category
  useEffect(() => {
    if (!scrollToCategory) return;
    const timer = setTimeout(() => {
      for (const [name, el] of Object.entries(groupRefs.current)) {
        if (el && matchesPartType(name, scrollToCategory)) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        }
      }
      onScrollToCategoryComplete?.();
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollToCategory]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    const h = t.scrollHeight - t.clientHeight;
    if (h > 0) setScrollProgress(Math.max(0, Math.min(1, t.scrollTop / h)));
  };

  const hasVariants = (pendingVariants?.length ?? 0) > 0;
  const hasContent = products.length > 0 || servicePackages.length > 0 || hasVariants;
  const showLoading = isResearching && !hasContent;
  const showContent = hasContent && !showLoading;
  const shouldBeVisible = visible || hasContent;

  const columnWidth = viewportSize === "mobile" ? 92 : viewportSize === "tablet" ? 65 : 70;
  const maxWidth = viewportSize === "desktop" ? "900px" : viewportSize === "tablet" ? "500px" : "100%";
  const topOffset = viewportSize === "mobile" ? "calc(8px + env(safe-area-inset-top, 4px))" : "6px";

  return (
    <>
      {/* Scroll progress dot */}
      {hasContent && visible && (
        <div
          style={{
            position: "fixed",
            right: "2px",
            top: `calc(${scrollProgress * 65 + 18}%)`,
            ...glassScrollDot,
            opacity: 0.8,
            transition: "top 0.1s ease-out",
            zIndex: 100,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`absolute overflow-y-auto flex flex-col gap-3 md:gap-4 transition-all duration-400 ease-out product-scroll ${
          shouldBeVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none"
        }`}
        style={{
          width: `${columnWidth}%`,
          maxWidth,
          right: "0",
          left: "auto",
          top: topOffset,
          bottom: viewportSize === "mobile" ? "calc(100px + env(safe-area-inset-bottom, 0px))" : "52px",
          paddingTop: "4px",
          paddingRight: "8px",
          paddingLeft: "8px",
          paddingBottom: "8px",
          zIndex: 55,
          pointerEvents: "auto",
          touchAction: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Header */}
        <ShelfHeader
          vehicleDisplayName={vehicleDisplayName}
          itemCount={products.length + servicePackages.length}
          isUpdating={!!(isResearching && hasContent)}
        />

        {/* Loading */}
        {showLoading && <ShelfLoading />}

        {/* Variant Selection */}
        {hasVariants && pendingVariants && onVariantSelect && (
          <VariantSelector variants={pendingVariants} make={pendingVariantMake} model={pendingVariantModel} onSelect={onVariantSelect} />
        )}

        {/* Empty */}
        {!showLoading && !hasContent && <ShelfEmpty productCount={products.length} packageCount={servicePackages.length} />}

        {/* Service Packages */}
        {showContent && servicePackages.length > 0 && (
          <div className="space-y-6">
            {servicePackages.map((pkg) => (
              <div key={pkg.id} ref={(el) => { groupRefs.current[pkg.title] = el; }}>
                <ServicePackageCard pkg={pkg} viewportSize={viewportSize} onAddToCart={onAddToCart} />
              </div>
            ))}
          </div>
        )}

        {/* Parts Sections */}
        {showContent &&
          groupedProducts.map(({ name, products: groupProducts }) => (
            <div key={name} ref={(el) => { groupRefs.current[name] = el; }}>
              <PartslotSection
                name={name}
                products={groupProducts}
                viewportSize={viewportSize}
                isHighlighted={!!(highlightedPartType && matchesPartType(name, highlightedPartType))}
                highlightedProduct={highlightedProduct}
                onProductClick={onProductClick}
                onAddToCart={onAddToCart as ((product: Product) => void) | undefined}
              />
            </div>
          ))}

        <div className="h-4" />
      </div>
    </>
  );
};
