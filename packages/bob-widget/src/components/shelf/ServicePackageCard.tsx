import React, { useState } from "react";
import type { ServicePackage, Product } from "../../types";
import type { ViewportSize } from "../../hooks/useViewportSize";
import { HorizontalRow } from "./HorizontalRow";
import { TierCard } from "./TierCard";
import { TierProductList } from "./TierProductList";
import {
  isRearBrakePackage,
  filterByBrakeType,
  recalcTierTotal,
  detectAvailableBrakeTypes,
  type RearBrakeType,
} from "../../utils/rearBrakeFilter";
import { CARFIX_COLORS, getServicePackageDescription } from "../../styles/carfix-tokens";

interface ServicePackageCardProps {
  pkg: ServicePackage;
  viewportSize: ViewportSize;
  onAddToCart?: (products: Product | Product[]) => void;
}

export const ServicePackageCard: React.FC<ServicePackageCardProps> = ({
  pkg,
  viewportSize,
  onAddToCart,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTierName, setSelectedTierName] = useState<string | null>(null);
  const [brakeType, setBrakeType] = useState<RearBrakeType>("disc");

  const isRearBrake = isRearBrakePackage(pkg);
  const rawVisibleTiers = (pkg.preparedTiers || []).filter((t) => !t.isHidden);

  const { hasDisc, hasDrum } = isRearBrake
    ? detectAvailableBrakeTypes(rawVisibleTiers)
    : { hasDisc: false, hasDrum: false };

  const effectiveBrakeType: RearBrakeType =
    isRearBrake && hasDisc && !hasDrum ? "disc" :
    isRearBrake && hasDrum && !hasDisc ? "drum" :
    brakeType;

  let visibleTiers = rawVisibleTiers;
  if (isRearBrake) {
    visibleTiers = rawVisibleTiers.map((tier) => {
      const filtered = filterByBrakeType(tier.products, effectiveBrakeType);
      return { ...tier, products: filtered, totalPrice: recalcTierTotal(filtered), productCount: filtered.length };
    });
  }

  const defaultTier = visibleTiers.find((t) => t.isRecommended)?.tierName || visibleTiers[0]?.tierName || "";
  const activeTierName = selectedTierName || defaultTier;
  const selectedTier = visibleTiers.find((t) => t.tierName === activeTierName);

  const description = getServicePackageDescription(pkg.title);
  const shortDescription = description.split(".")[0] + ".";

  return (
    <div
      className="transition-all duration-300"
      style={{
        borderRadius: "20px",
        background: "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.95) 100%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid rgba(226,232,240,0.8)",
      }}
    >
      {/* Package Header */}
      <div
        className="px-4 py-3.5 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${CARFIX_COLORS.primary} 0%, #0066DD 100%)`,
          borderRadius: "20px 20px 0 0",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-[15px] leading-tight truncate">{pkg.title}</h3>
            {pkg.estimated_time && (
              <span className="text-white/60 text-[11px] flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {pkg.estimated_time}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description + brake toggle */}
      <div className="px-4 py-2.5">
        <p className="text-[12px] leading-relaxed" style={{ color: CARFIX_COLORS.mutedForeground }}>
          {shortDescription}
        </p>
        {isRearBrake && hasDisc && hasDrum && (
          <div className="mt-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${CARFIX_COLORS.border}` }}>
              <button
                onClick={() => setBrakeType("disc")}
                className="flex-1 py-1.5 px-3 text-[11px] font-semibold transition-all"
                style={{
                  background: effectiveBrakeType === "disc" ? CARFIX_COLORS.primary : "transparent",
                  color: effectiveBrakeType === "disc" ? "#FFFFFF" : CARFIX_COLORS.mutedForeground,
                }}
              >
                Disc Brakes
              </button>
              <button
                onClick={() => setBrakeType("drum")}
                className="flex-1 py-1.5 px-3 text-[11px] font-semibold transition-all"
                style={{
                  background: effectiveBrakeType === "drum" ? CARFIX_COLORS.primary : "transparent",
                  color: effectiveBrakeType === "drum" ? "#FFFFFF" : CARFIX_COLORS.mutedForeground,
                }}
              >
                Drum Brakes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tier Cards — Horizontal scroll */}
      {visibleTiers.length > 0 && (
        <div className="pb-3">
          <HorizontalRow viewportSize={viewportSize} className="gap-2.5 px-4 pb-2">
            {visibleTiers.map((tier) => (
              <TierCard
                key={tier.tierName}
                tier={tier}
                isSelected={tier.tierName === activeTierName}
                viewportSize={viewportSize}
                packageTitle={pkg.title}
                packageId={pkg.id}
                onSelect={() => setSelectedTierName(tier.tierName)}
                onAddToCart={onAddToCart as ((products: Product[]) => void) | undefined}
              />
            ))}
          </HorizontalRow>
        </div>
      )}

      {/* Show/Hide details toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center gap-1.5 py-2 cursor-pointer transition-colors"
        style={{ borderTop: `1px solid ${CARFIX_COLORS.border}` }}
      >
        <span style={{ fontSize: "11px", color: CARFIX_COLORS.mutedForeground }}>
          {isExpanded ? "Hide details" : "Show details"}
        </span>
        <svg
          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          style={{ width: "14px", height: "14px", color: CARFIX_COLORS.mutedForeground }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Accordion — Products for selected tier */}
      {isExpanded && selectedTier && <TierProductList tier={selectedTier} />}
    </div>
  );
};
