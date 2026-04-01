import React from "react";
import type { PreparedTier } from "../../types";
import { CARFIX_COLORS, formatNZD } from "../../styles/carfix-tokens";

interface TierProductListProps {
  tier: PreparedTier;
}

export const TierProductList: React.FC<TierProductListProps> = ({ tier }) => (
  <div className="px-4 pb-4" style={{ borderTop: `1px solid ${CARFIX_COLORS.border}` }}>
    <div className="pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: CARFIX_COLORS.mutedForeground }}>
        {tier.displayName} Tier Products
      </p>
      <div className="space-y-2">
        {tier.products.map((product) => (
          <div
            key={product.sku}
            className="flex items-center gap-3 p-2 rounded-lg"
            style={{ background: CARFIX_COLORS.background, border: `1px solid ${CARFIX_COLORS.border}` }}
          >
            <div
              className="flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center"
              style={{ width: "48px", height: "48px", minWidth: "48px" }}
            >
              {product.productImageUrl ? (
                <img src={product.productImageUrl} alt={product.name} className="object-contain" style={{ width: "100%", height: "100%", padding: "4px" }} />
              ) : (
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: CARFIX_COLORS.foreground }}>{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px]" style={{ color: CARFIX_COLORS.mutedForeground }}>{product.brand}</span>
                {product.isRotor && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Pair</span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: CARFIX_COLORS.primary }}>{formatNZD(product.displayPrice)}</p>
              {product.isRotor && (
                <p className="text-[9px]" style={{ color: CARFIX_COLORS.mutedForeground }}>${product.price.toFixed(2)} ea</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
