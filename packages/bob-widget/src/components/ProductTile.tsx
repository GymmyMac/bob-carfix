import React, { useState } from "react";
import type { Product } from "../types";
import {
  CARFIX_COLORS,
  IMAGE_URLS,
  formatNZD,
} from "../styles/carfix-tokens";

interface ProductTileProps {
  product: Product;
  isSpotlighted?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * ProductTile — Clean card design, visually lighter than TierCard.
 *
 * Image fallback: product photo → brand logo → brand name text.
 */
export const ProductTile: React.FC<ProductTileProps> = ({
  product,
  isSpotlighted = false,
  onProductClick,
  onAddToCart,
}) => {
  const [imgStage, setImgStage] = useState<0 | 1 | 2>(0);

  const brandImgCorrected = product.brand
    ? `${IMAGE_URLS.storageBase}/brand_images/${product.brand.replace(/\s+/g, "")}.jpg`
    : undefined;

  const imgSrc =
    imgStage === 0
      ? product.image_url
      : imgStage === 1
        ? product.brandImageUrl || brandImgCorrected
        : undefined;

  const handleImgError = () => {
    if (imgStage === 0 && (product.brandImageUrl || brandImgCorrected)) {
      setImgStage(1);
    } else {
      setImgStage(2);
    }
  };

  const displayName = product.webDescription || product.name;

  return (
    <div
      onClick={() => onProductClick?.(product)}
      className="flex-shrink-0 cursor-pointer transition-all duration-200"
      style={{
        borderRadius: "14px",
        background: "#FFFFFF",
        border: isSpotlighted
          ? `2px solid ${CARFIX_COLORS.primary}`
          : "1px solid #E2E8F0",
        boxShadow: isSpotlighted
          ? "0 4px 16px rgba(0,82,204,0.12)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Bob's Pick badge */}
      {isSpotlighted && (
        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            zIndex: 2,
            background: CARFIX_COLORS.primary,
            color: "white",
            fontSize: "9px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "10px",
            letterSpacing: "0.03em",
          }}
        >
          ⭐ Bob's Pick
        </div>
      )}

      {/* Hero image — shorter than TierCard */}
      <div
        style={{
          height: "90px",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 10px",
          overflow: "hidden",
        }}
      >
        {imgSrc && imgStage < 2 ? (
          <img
            src={imgSrc}
            alt={product.name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            onError={handleImgError}
          />
        ) : (
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            {product.brand || "No Image"}
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ padding: "8px 10px 0" }}>
        {/* Product name */}
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: CARFIX_COLORS.foreground,
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            margin: 0,
          }}
        >
          {displayName}
        </p>

        {/* Brand + part number row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
          {product.brand && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: CARFIX_COLORS.mutedForeground,
                background: "#F1F5F9",
                padding: "1px 6px",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
              }}
            >
              {product.brand}
            </span>
          )}
          {product.perCarQty && product.perCarQty > 1 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: CARFIX_COLORS.accent,
                background: `${CARFIX_COLORS.accent}12`,
                padding: "1px 6px",
                borderRadius: "6px",
              }}
            >
              Qty: {product.perCarQty}
            </span>
          )}
        </div>

        {/* Oil specs */}
        {(product.viscosity || product.volume) && (
          <p style={{ fontSize: "10px", color: CARFIX_COLORS.mutedForeground, marginTop: "2px" }}>
            {[product.viscosity, product.volume].filter(Boolean).join(" / ")}
          </p>
        )}
      </div>

      {/* Price — prominent but smaller than TierCard */}
      <div style={{ padding: "6px 10px 0" }}>
        <p
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: CARFIX_COLORS.foreground,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            margin: 0,
          }}
        >
          {product.price > 0 ? formatNZD(product.price) : "POA"}
        </p>
        <p style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground, margin: "1px 0 0" }}>inc GST</p>
      </div>

      {/* Add button — simple, less prominent than TierCard */}
      <div style={{ padding: "8px 10px 10px", marginTop: "auto" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          style={{
            width: "100%",
            padding: "7px 0",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid #E2E8F0",
            background: "#FFFFFF",
            color: CARFIX_COLORS.foreground,
            transition: "all 0.15s ease",
          }}
        >
          Add
        </button>
      </div>

      {/* Part type tag */}
      {product.partslotDescription && (
        <div
          style={{
            borderTop: "1px solid #F1F5F9",
            padding: "4px 10px 6px",
          }}
        >
          <span style={{ fontSize: "9px", color: CARFIX_COLORS.mutedForeground }}>
            {product.partslotDescription}
          </span>
        </div>
      )}
    </div>
  );
};
