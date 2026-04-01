import React, { useState } from "react";
import type { PreparedTier, Product } from "../../types";
import type { ViewportSize } from "../../hooks/useViewportSize";
import {
  CARFIX_COLORS,
  QUALITY_TIER_CONFIG,
  IMAGE_URLS,
  formatNZD,
} from "../../styles/carfix-tokens";

interface TierCardProps {
  tier: PreparedTier;
  isSelected: boolean;
  viewportSize: ViewportSize;
  packageTitle: string;
  packageId: string;
  onSelect: () => void;
  onAddToCart?: (products: Product[]) => void;
}

export const TierCard: React.FC<TierCardProps> = ({
  tier,
  isSelected,
  viewportSize,
  packageTitle,
  packageId,
  onSelect,
  onAddToCart,
}) => {
  const tierConfig = QUALITY_TIER_CONFIG[tier.tierName as keyof typeof QUALITY_TIER_CONFIG];
  const hasSavings = tier.savingsAmount && tier.savingsAmount > 0;
  const cardWidth = viewportSize === "desktop" ? "240px" : viewportSize === "tablet" ? "190px" : "160px";

  const firstBrand = tier.brands[0];
  const correctedUrl = firstBrand
    ? `${IMAGE_URLS.storageBase}/brand_images/${firstBrand.fullName.replace(/\s+/g, "")}.jpg`
    : "";

  const [heroFailed, setHeroFailed] = useState(0);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const discountPct = tier.bundleDiscountPercentage || 0;
    const discountMultiplier = 1 - discountPct / 100;
    const productsToAdd: Product[] = tier.products.map((p) => ({
      id: p.sku,
      name: p.name,
      brand: p.brand,
      price: discountPct > 0 ? Math.round(p.displayPrice * discountMultiplier * 100) / 100 : p.displayPrice,
      image_url: p.productImageUrl,
      brandImageUrl: p.brandImageUrl,
      sku: p.sku,
      partNumber: p.partNumber || undefined,
      partslotDescription: p.partslotName,
      quantity: 1,
      _bundleMeta: {
        is_bundle_item: true,
        bundle_discount_percentage: discountPct,
        service_package_name: packageTitle,
        service_package_id: packageId,
        quality_tier: tier.tierName,
      },
    }));
    onAddToCart?.(productsToAdd);
  };

  return (
    <div
      onClick={onSelect}
      className="flex-shrink-0 cursor-pointer transition-all duration-200 snap-start"
      style={{
        width: cardWidth,
        minWidth: "140px",
        borderRadius: "16px",
        background: tier.isRecommended
          ? "linear-gradient(145deg, rgba(0,82,204,0.04) 0%, rgba(56,189,248,0.04) 100%)"
          : isSelected
            ? "rgba(248,250,252,1)"
            : "#FFFFFF",
        border: tier.isRecommended
          ? `2.5px solid ${CARFIX_COLORS.primary}`
          : isSelected
            ? `2px solid ${CARFIX_COLORS.primary}60`
            : "1.5px solid #E2E8F0",
        boxShadow: tier.isRecommended
          ? "0 4px 16px rgba(0,82,204,0.15)"
          : isSelected
            ? "0 2px 12px rgba(0,0,0,0.06)"
            : "0 1px 4px rgba(0,0,0,0.04)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* CARFIX Value banner — overlays the hero image */}
      {tier.isRecommended && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            background: CARFIX_COLORS.primary,
            color: "white",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textAlign: "center",
            padding: "5px 0",
          }}
        >
          ★ CARFIX VALUE
        </div>
      )}

      {/* Hero image zone — fills top of card */}
      <div
        style={{
          height: "130px",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 12px",
          overflow: "hidden",
          paddingTop: tier.isRecommended ? "32px" : "8px",
        }}
      >
        {firstBrand && heroFailed < 2 ? (
          <img
            src={heroFailed === 0 ? firstBrand.imageUrl : correctedUrl}
            alt={firstBrand.fullName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            onError={() => {
              if (heroFailed === 0 && correctedUrl) {
                setHeroFailed(1);
              } else {
                setHeroFailed(2);
              }
            }}
          />
        ) : (
          <span
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#334155",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {firstBrand?.fullName || tier.dominantBrand}
          </span>
        )}
      </div>

      {/* Tier info row — left-aligned: emoji + name ... brand pill pushed right */}
      <div
        style={{
          padding: "6px 12px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "14px", lineHeight: 1 }}>{tierConfig?.emoji}</span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: tierConfig?.textColor || CARFIX_COLORS.foreground,
            }}
          >
            {tier.displayName}
          </span>
        </div>
        {/* Brand logo pill — 2x larger */}
        {firstBrand && heroFailed < 2 && (
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: "6px",
              padding: "3px 6px",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              height: "28px",
            }}
          >
            <img
              src={heroFailed === 0 ? firstBrand.imageUrl : correctedUrl}
              alt={firstBrand.fullName}
              style={{ height: "28px", width: "auto", objectFit: "contain", maxWidth: "60px" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>

      {/* Parts count — prominent */}
      <p style={{ fontSize: "13px", fontWeight: 700, color: CARFIX_COLORS.foreground, textAlign: "left", margin: "3px 0 0", padding: "0 12px" }}>
        {tier.productCount} {tier.productCount === 1 ? "part" : "parts"}
      </p>

      {/* Price section — large & proud */}
      <div style={{ padding: "4px 12px 0", textAlign: "center" }}>
        {hasSavings ? (
          <>
            <p style={{ fontSize: "12px", textDecoration: "line-through", color: "#94A3B8", margin: "0 0 1px" }}>
              {formatNZD(tier.originalTotalPrice!)}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "5px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: viewportSize === "mobile" ? "22px" : "26px",
                  fontWeight: 800,
                  color: CARFIX_COLORS.foreground,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {formatNZD(tier.totalPrice)}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "white",
                  background: CARFIX_COLORS.success,
                  padding: "2px 6px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                SAVE {tier.bundleDiscountPercentage}%
              </span>
            </div>
            <p style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground, margin: "2px 0 0" }}>inc GST</p>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: viewportSize === "mobile" ? "22px" : "26px",
                fontWeight: 800,
                color: tier.isRecommended ? CARFIX_COLORS.primary : CARFIX_COLORS.foreground,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {formatNZD(tier.totalPrice)}
            </p>
            <p style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground, margin: "2px 0 0" }}>inc GST</p>
          </>
        )}
      </div>

      {/* Bottom row: Add + Heart */}
      <div style={{ padding: "8px 12px 12px", display: "flex", gap: "6px", marginTop: "auto" }}>
        <button
          onClick={handleAdd}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            border: tier.isRecommended ? "none" : "1.5px solid #E2E8F0",
            background: tier.isRecommended
              ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
              : "#FFFFFF",
            color: tier.isRecommended ? "white" : CARFIX_COLORS.foreground,
            boxShadow: tier.isRecommended ? "0 4px 12px rgba(34,197,94,0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Add
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "38px",
            minWidth: "38px",
            padding: "9px 0",
            borderRadius: "10px",
            fontSize: "16px",
            cursor: "pointer",
            border: "1.5px solid #E2E8F0",
            background: "#FFFFFF",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#EF4444",
          }}
        >
          ♡
        </button>
      </div>
    </div>
  );
};
