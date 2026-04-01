import React from "react";
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
  const cardWidth = viewportSize === "desktop" ? "220px" : viewportSize === "tablet" ? "180px" : "150px";

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
        minWidth: "130px",
        borderRadius: "16px",
        padding: "12px 10px",
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
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* CARFIX Value badge */}
      {tier.isRecommended && (
        <div
          style={{
            position: "absolute",
            top: "-1px",
            left: "-1px",
            right: "-1px",
            background: CARFIX_COLORS.primary,
            color: "white",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textAlign: "center",
            padding: "3px 0",
            borderRadius: "14px 14px 0 0",
          }}
        >
          ★ CARFIX VALUE
        </div>
      )}

      {/* Tier icon + name */}
      <div style={{ marginTop: tier.isRecommended ? "14px" : "0" }}>
        <span style={{ fontSize: "20px" }}>{tierConfig?.emoji}</span>
        <p style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px", color: tierConfig?.textColor || CARFIX_COLORS.foreground }}>
          {tier.displayName}
        </p>
      </div>

      {/* Brand Logo */}
      <div style={{ margin: "8px 0", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tier.brands.slice(0, 1).map((brand, idx) => {
          const correctedUrl = `${IMAGE_URLS.storageBase}/brand_images/${brand.fullName.replace(/\s+/g, "")}.jpg`;
          return (
            <div
              key={idx}
              style={{
                background: "#FFFFFF",
                borderRadius: "10px",
                padding: "4px 8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid #F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "36px",
                maxWidth: "80px",
              }}
            >
              <img
                src={brand.imageUrl}
                alt={brand.fullName}
                style={{ height: "24px", width: "auto", objectFit: "contain" }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.src !== correctedUrl) {
                    img.src = correctedUrl;
                  } else {
                    img.style.display = "none";
                    img.parentElement!.innerHTML = `<span style="font-size:10px;font-weight:600;color:#475569">${brand.fullName}</span>`;
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Parts count */}
      <p style={{ fontSize: "10px", color: CARFIX_COLORS.mutedForeground }}>
        {tier.productCount} {tier.productCount === 1 ? "part" : "parts"}
      </p>

      {/* Price */}
      <div style={{ marginTop: "6px" }}>
        {hasSavings ? (
          <>
            <p style={{ fontSize: "11px", textDecoration: "line-through", color: "#94A3B8" }}>
              {formatNZD(tier.originalTotalPrice!)}
            </p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: CARFIX_COLORS.success, letterSpacing: "-0.02em" }}>
              {formatNZD(tier.totalPrice)}
            </p>
            <p
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: CARFIX_COLORS.success,
                background: `${CARFIX_COLORS.success}12`,
                padding: "2px 6px",
                borderRadius: "8px",
                marginTop: "2px",
              }}
            >
              SAVE {tier.bundleDiscountPercentage}%
            </p>
          </>
        ) : (
          <p
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: tier.isRecommended ? CARFIX_COLORS.primary : CARFIX_COLORS.foreground,
              letterSpacing: "-0.02em",
            }}
          >
            {formatNZD(tier.totalPrice)}
          </p>
        )}
        <p style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground, marginTop: "1px" }}>inc GST</p>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        style={{
          marginTop: "8px",
          width: "100%",
          padding: "7px 0",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
          border: "none",
          background: tier.isRecommended ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" : "#F1F5F9",
          color: tier.isRecommended ? "white" : CARFIX_COLORS.success,
          boxShadow: tier.isRecommended ? "0 4px 12px rgba(34,197,94,0.3)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        Add
      </button>
    </div>
  );
};
