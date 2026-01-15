import React from "react";
import type { Product } from "../types/product";
import { glassCard, glassButtonPrimary, glassText, glassImageContainer } from "../styles/glass";

interface BobSuggestionsProps {
  products: Product[];
  title?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * Displays products Bob is actively recommending - styled like Service Packages.
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
            fontSize: "15px",
            fontWeight: 600,
            ...glassText.primary,
          }}
        >
          🚗 {title}
        </div>
      )}

      {/* Product Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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

      {/* Show more indicator if more than 6 products */}
      {products.length > 6 && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.6)",
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
  const imageUrl = product.image_url || product.image;
  const brandName = product.brand || "Quality Part";
  const productName = product.name || "Product";
  const price = product.price ?? 0;

  return (
    <div
      style={{
        ...glassCard,
        padding: "12px",
        display: "flex",
        gap: "12px",
        cursor: onProductClick ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onClick={() => onProductClick?.(product)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
      }}
    >
      {/* Product Image */}
      <div
        style={{
          ...glassImageContainer,
          width: "72px",
          height: "72px",
          minWidth: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "4px",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML =
                '<span style="font-size:28px">🔧</span>';
            }}
          />
        ) : (
          <span style={{ fontSize: "28px" }}>🔧</span>
        )}
      </div>

      {/* Product Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Brand + Recommended Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.5px",
            }}
          >
            {brandName}
          </span>
          {isRecommended && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "6px",
                background: "rgba(255, 149, 0, 0.3)",
                color: "#FFD700",
                border: "1px solid rgba(255, 149, 0, 0.4)",
              }}
            >
              ⭐ Bob's Pick
            </span>
          )}
        </div>

        {/* Product Name */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            ...glassText.primary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: "1.3",
            marginBottom: "8px",
          }}
        >
          {productName}
        </div>

        {/* Price + Add to Cart */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              ...glassText.price,
            }}
          >
            ${price.toFixed(2)}
          </span>

          {onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              style={{
                ...glassButtonPrimary,
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "white",
                cursor: "pointer",
                border: "none",
                minHeight: "unset",
                minWidth: "unset",
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
