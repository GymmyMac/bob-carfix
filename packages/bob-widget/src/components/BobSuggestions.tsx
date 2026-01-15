import React from "react";
import type { Product } from "../types/product";
import { ProductBadge } from "./ProductBadge";
import {
  CARFIX_COLORS,
  IMAGE_URLS,
  TYPOGRAPHY,
  isRotorProduct,
  getDisplayPrice,
  formatNZD,
} from "../styles/carfix-tokens";

interface BobSuggestionsProps {
  products: Product[];
  title?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * Displays products Bob is actively recommending - styled to match CARFIX website.
 * Rendered inline within chat messages when Bob presents specific products.
 */
export const BobSuggestions: React.FC<BobSuggestionsProps> = ({
  products,
  title,
  onProductClick,
  onAddToCart,
}) => {
  if (!products || products.length === 0) return null;

  return (
    <div style={{ marginTop: "16px", width: "100%" }}>
      {/* Header */}
      {title && (
        <div
          style={{
            marginBottom: "12px",
            fontSize: TYPOGRAPHY.partslotName.fontSize,
            fontWeight: TYPOGRAPHY.partslotName.fontWeight,
            color: CARFIX_COLORS.foreground,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px" }}>🚗</span>
          {title}
        </div>
      )}

      {/* Product Grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {products.slice(0, 6).map((product, index) => (
          <ProductSuggestionCard
            key={product.id || product.sku || index}
            product={product}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            isRecommended={index === 0}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {products.length > 6 && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "13px",
            color: CARFIX_COLORS.mutedForeground,
            textAlign: "center",
          }}
        >
          + {products.length - 6} more options available
        </div>
      )}
    </div>
  );
};

interface ProductSuggestionCardProps {
  product: Product;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  isRecommended?: boolean;
}

const ProductSuggestionCard: React.FC<ProductSuggestionCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  isRecommended = false,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [brandImageError, setBrandImageError] = React.useState(false);

  // Determine image URL with fallbacks
  const imageUrl = product.image_url || product.image || 
    (product.sku ? IMAGE_URLS.productImage(product.sku) : null);
  
  const brandImageUrl = product.brand 
    ? IMAGE_URLS.brandLogo(product.brand)
    : null;

  const brandName = product.brand || "Quality Part";
  const productName = product.name || "Product";
  const unitPrice = product.price ?? 0;
  const partNumber = product.partNumber || product.part_number;
  
  // Check if this is a rotor product (sold in pairs)
  const isRotor = isRotorProduct({
    name: product.name,
    partslotDescription: product.partslotDescription,
    per_car_qty: product.quantity,
  });
  
  const { displayPrice, unitPriceLabel } = getDisplayPrice(unitPrice, isRotor);

  return (
    <div
      style={{
        background: CARFIX_COLORS.card,
        borderRadius: "12px",
        border: `2px solid ${CARFIX_COLORS.border}`,
        overflow: "hidden",
        cursor: onProductClick ? "pointer" : "default",
        transition: "all 0.2s ease",
      }}
      onClick={() => onProductClick?.(product)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${CARFIX_COLORS.primary}80`;
        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = CARFIX_COLORS.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Partslot Header */}
      {product.partslotDescription && (
        <div
          style={{
            background: "rgba(0,0,0,0.03)",
            borderBottom: `1px solid ${CARFIX_COLORS.border}`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: TYPOGRAPHY.partslotName.fontSize,
              fontWeight: TYPOGRAPHY.partslotName.fontWeight,
              color: CARFIX_COLORS.foreground,
            }}
          >
            {product.partslotDescription}
          </span>
          {isRecommended && <ProductBadge type="carfixValue" />}
        </div>
      )}

      {/* Product Content */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          gap: "16px",
        }}
      >
        {/* Product Image */}
        <div
          style={{
            width: "96px",
            minWidth: "96px",
            height: "96px",
            borderRadius: "8px",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: `1px solid ${CARFIX_COLORS.border}`,
          }}
        >
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={productName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: "4px",
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <span style={{ fontSize: "32px", opacity: 0.5 }}>🔧</span>
          )}
        </div>

        {/* Product Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Brand with logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            {brandImageUrl && !brandImageError && (
              <img
                src={brandImageUrl}
                alt={brandName}
                style={{
                  height: "16px",
                  width: "auto",
                  objectFit: "contain",
                }}
                onError={() => setBrandImageError(true)}
              />
            )}
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: CARFIX_COLORS.foreground,
                textTransform: "uppercase",
              }}
            >
              {brandName}
            </span>
          </div>

          {/* Product Name */}
          <div
            style={{
              fontSize: TYPOGRAPHY.productName.fontSize,
              fontWeight: TYPOGRAPHY.productName.fontWeight,
              color: CARFIX_COLORS.foreground,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: "1.4",
              marginBottom: "8px",
            }}
          >
            {productName}
          </div>

          {/* Badges Row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "12px",
            }}
          >
            <ProductBadge type="fitsVehicle" />
            {isRotor && <ProductBadge type="rotorPair" />}
            {product.quantity && product.quantity > 1 && !isRotor && (
              <ProductBadge type="quantity" value={`Qty: ${product.quantity}`} />
            )}
            {partNumber && (
              <span
                style={{
                  fontSize: "12px",
                  color: CARFIX_COLORS.mutedForeground,
                }}
              >
                #{partNumber}
              </span>
            )}
          </div>
        </div>

        {/* Price + Action */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "space-between",
            minWidth: "100px",
          }}
        >
          {/* Price Block */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: TYPOGRAPHY.priceMain.fontSize,
                fontWeight: TYPOGRAPHY.priceMain.fontWeight,
                color: CARFIX_COLORS.foreground,
              }}
            >
              {formatNZD(displayPrice)}
            </div>
            {unitPriceLabel && (
              <div
                style={{
                  fontSize: TYPOGRAPHY.priceSecondary.fontSize,
                  color: CARFIX_COLORS.mutedForeground,
                }}
              >
                {unitPriceLabel}
              </div>
            )}
            <div
              style={{
                fontSize: TYPOGRAPHY.priceSecondary.fontSize,
                color: CARFIX_COLORS.mutedForeground,
              }}
            >
              inc GST
            </div>
          </div>

          {/* Add to Cart Button */}
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              style={{
                background: CARFIX_COLORS.primary,
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = CARFIX_COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = CARFIX_COLORS.primary;
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BobSuggestions;
