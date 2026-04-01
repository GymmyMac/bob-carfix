import React from "react";
import type { VariantCard } from "./ShelfColumn";

interface VariantSelectorProps {
  variants: VariantCard[];
  make?: string;
  model?: string;
  onSelect: (variant: VariantCard) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  make,
  model,
  onSelect,
}) => {
  // Pre-compute display labels and detect duplicates
  const labels = variants.map((v) => {
    const specsLine = [
      v.engineCode,
      v.kw ? `${v.kw}kW` : null,
      v.ccDisplay || (v.cc ? `${v.cc}cc` : null),
      v.fuelType,
    ].filter(Boolean).join(" · ");
    return specsLine || v.displayTitle;
  });

  const labelCounts = labels.reduce((acc, l) => {
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: "linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 0.95) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0, 102, 204, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Which {make} {model}?</span>
            <span className="text-white/70 text-xs block">Tap your variant to continue</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-1">
        {variants.map((variant, index) => {
          const primaryLabel = labels[index];
          const isDuplicate = labelCounts[primaryLabel] > 1;
          const displayLabel = isDuplicate && variant.displaySubtitle ? variant.displaySubtitle : primaryLabel;

          return (
            <button
              key={variant.vehicle_id}
              type="button"
              onClick={() => onSelect(variant)}
              className="w-full text-left transition-all duration-200 cursor-pointer rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.85) 100%)",
                backdropFilter: "blur(12px) saturate(150%)",
                WebkitBackdropFilter: "blur(12px) saturate(150%)",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                minHeight: "72px",
              }}
            >
              <div className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #0052A3 100%)", boxShadow: "0 2px 8px rgba(0, 102, 204, 0.4)" }}
                >
                  {variant.optionNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base leading-tight">{displayLabel}</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(0, 102, 204, 0.1)" }}>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
