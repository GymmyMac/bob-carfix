import React from "react";
import type { Product } from "../../types";

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart?: (product: Product) => void;
  onNavigateToProductPage?: (product: Product) => void;
}

/**
 * ProductDetailView - Full product detail display within Bob widget
 * Allows customer to see all product info while Bob remains visible (scaled down)
 */
export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onBack,
  onAddToCart,
  onNavigateToProductPage
}) => {
  const hasExternalUrl = product.product_url || onNavigateToProductPage;

  return (
    <div className="absolute inset-0 z-35 flex flex-col bg-white/95 backdrop-blur-md overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-600 font-medium text-sm hover:text-blue-700 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Product Image */}
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-contain p-4" 
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg className="h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium uppercase tracking-wide">No Image Available</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-4 space-y-4">
          {/* Name & Brand */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
            {product.brand && (
              <p className="text-sm text-gray-600 font-medium">{product.brand}</p>
            )}
          </div>

          {/* Price */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Price</p>
            <p className="text-2xl font-bold text-blue-600">
              {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Price on Request'}
            </p>
            {product.price > 0 && (
              <p className="text-xs text-gray-500 mt-1">Inc. GST</p>
            )}
          </div>

          {/* Part Details */}
          <div className="space-y-3">
            {product.partslotDescription && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900">{product.partslotDescription}</span>
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">SKU</span>
                <span className="text-sm font-medium text-gray-900">{product.sku}</span>
              </div>
            )}
            {product.part_number && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Part Number</span>
                <span className="text-sm font-medium text-gray-900">{product.part_number}</span>
              </div>
            )}
          </div>

          {/* External Link */}
          {hasExternalUrl && (
            <a
              href={product.product_url || '#'}
              onClick={(e) => {
                if (onNavigateToProductPage) {
                  e.preventDefault();
                  onNavigateToProductPage(product);
                }
              }}
              target={product.product_url && !onNavigateToProductPage ? "_blank" : undefined}
              rel={product.product_url && !onNavigateToProductPage ? "noopener noreferrer" : undefined}
              className="block text-center text-blue-600 text-sm font-medium hover:underline py-2"
            >
              View Full Details on CARFIX →
            </a>
          )}
        </div>
      </div>

      {/* Fixed bottom action */}
      <div className="p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <button
          onClick={() => onAddToCart?.(product)}
          className="w-full bg-blue-600 text-white text-base font-semibold py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};
