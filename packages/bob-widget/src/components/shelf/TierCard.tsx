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

  // Image fallback: brand logo → corrected URL → text
  const [heroFailed, setHeroFailed] = useState(0); // 0=primary, 1=corrected, 2=text

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
          ? "linear-gradient(145deg, rgba(0,82,204,0.06) 0%, rgba(56,189,248,0.06) 100%)"
          : isSelected
            ? "rgba(248,250,252,1)"
            : "#FFFFFF",
        border: tier.isRecommended
          ? `2px solid ${CARFIX_COLORS.primary}`
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
      {/* CARFIX Value banner */}
      {tier.isRecommended && (
        <div
          style={{
            background: CARFIX_COLORS.primary,
            color: "white",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textAlign: "center",
            padding: "4px 0",
          }}
        >
          ★ CARFIX VALUE
        </div>
      )}

      {/* Hero image zone */}
      <div
        style={{
          height: "100px",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid #F1F5F9",
          padding: "12px",
          marginTop: tier.isRecommended ? 0 : 0,
        }}
      >
        {firstBrand && heroFailed < 2 ? (
          <img
            src={heroFailed === 0 ? firstBrand.imageUrl : correctedUrl}
            alt={firstBrand.fullName}
            style={{
              maxHeight: "48px",
              maxWidth: "100%",
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
              fontSize: "16px",
              fontWeight: 700,
              color: "#475569",
              textAlign: "center",
            }}
          >
            {firstBrand?.fullName || tier.dominantBrand}
          </span>
        )}
      </div>

      {/* Tier info row + parts count */}
      <div style={{ padding: "8px 10px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "16px" }}>{tierConfig?.emoji}</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: tierConfig?.textColor || CARFIX_COLORS.foreground,
            }}
          >
            {tier.displayName}
          </span>
        </div>
        <p
          style={{
            fontSize: "10px",
            color: CARFIX_COLORS.mutedForeground,
            textAlign: "center",
            marginTop: "2px",
          }}
        >
          {tier.productCount} {tier.productCount === 1 ? "part" : "parts"}
        </p>
      </div>

      {/* Price section */}
      <div style={{ padding: "6px 10px 0", textAlign: "center" }}>
        {hasSavings ? (
          <>
            <p style={{ fontSize: "11px", textDecoration: "line-through", color: "#94A3B8", margin: 0 }}>
              {formatNZD(tier.originalTotalPrice!)}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: CARFIX_COLORS.success,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {formatNZD(tier.totalPrice)}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "white",
                  background: CARFIX_COLORS.success,
                  padding: "2px 6px",
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                SAVE {tier.bundleDiscountPercentage}%
              </span>
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: tier.isRecommended ? CARFIX_COLORS.primary : CARFIX_COLORS.foreground,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {formatNZD(tier.totalPrice)}
          </p>
        )}
        <p style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground, marginTop: "2px" }}>inc GST</p>
      </div>

      {/* Bottom row: Add + Heart */}
      <div style={{ padding: "6px 10px 10px", display: "flex", gap: "6px", marginTop: "auto" }}>
        <button
          onClick={handleAdd}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: tier.isRecommended
              ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
              : "#F1F5F9",
            color: tier.isRecommended ? "white" : CARFIX_COLORS.success,
            boxShadow: tier.isRecommended ? "0 4px 12px rgba(34,197,94,0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Add
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "36px",
            minWidth: "36px",
            padding: "8px 0",
            borderRadius: "10px",
            fontSize: "14px",
            cursor: "pointer",
            border: "1.5px solid #E2E8F0",
            background: "#FFFFFF",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ♡
        </button>
      </div>
    </div>
  );
};
