import React from "react";
import type { Product } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { ViewportSize } from "../../hooks/useViewportSize";
import { HorizontalRow } from "./HorizontalRow";
import { ProductTile } from "../ProductTile";

interface PartslotSectionProps {
  name: string;
  products: Product[];
  viewportSize: ViewportSize;
  isHighlighted: boolean;
  highlightedProduct?: HighlightedProduct | null;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

const productMatchesSpotlight = (product: Product, spotlight: HighlightedProduct): boolean => {
  const brandMatch = product.brand?.toLowerCase() === spotlight.brand.toLowerCase();
  const priceMatch = Math.abs(product.price - spotlight.price) < 1;
  return brandMatch && priceMatch;
};

export const PartslotSection: React.FC<PartslotSectionProps> = ({
  name,
  products,
  viewportSize,
  isHighlighted,
  highlightedProduct,
  onProductClick,
  onAddToCart,
}) => (
  <section
    className="transition-all duration-300"
    style={{ background: "transparent", borderRadius: "24px" }}
  >
    {/* Blue pill header */}
    <div
      data-testid="partslot-header"
      data-partslot-name={name}
      className="px-3 py-2.5 flex items-center justify-between"
      style={{
        background: isHighlighted ? "rgba(0, 102, 204, 0.95)" : "rgba(0, 51, 102, 0.9)",
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        marginBottom: "8px",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: isHighlighted
              ? "linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 1) 100%)"
              : "rgba(255,255,255,0.2)",
          }}
        >
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span
          className="text-xs font-bold truncate uppercase tracking-wide"
          style={{ color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        >
          {name}
        </span>
      </div>
      <span
        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: "rgba(255, 149, 0, 0.9)", color: "white", boxShadow: "0 2px 8px rgba(255, 149, 0, 0.4)" }}
      >
        {products.length}
      </span>
    </div>

    {/* Products Row */}
    <HorizontalRow viewportSize={viewportSize} className="gap-3 pb-2">
      {products.map((product, index) => {
        const isSpotlighted = !!(highlightedProduct && productMatchesSpotlight(product, highlightedProduct));
        return (
          <div
            key={`${product.id}-${index}`}
            data-testid="partslot-product"
            className="snap-start flex-shrink-0"
            style={{
              width: viewportSize === "desktop" ? "250px" : viewportSize === "tablet" ? "45%" : "65%",
              minWidth: viewportSize === "desktop" ? "250px" : undefined,
            }}
          >
            <ProductTile
              product={product}
              isSpotlighted={isSpotlighted}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
            />
          </div>
        );
      })}
    </HorizontalRow>
  </section>
);
