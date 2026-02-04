import React from "react";
import { cn } from "@/lib/utils";
import type { VariantCard } from "@/types/vehicle";

interface VariantSelectionCardsProps {
  variants: VariantCard[];
  make: string;
  model: string;
  onSelect: (variant: VariantCard) => void;
}

/**
 * Clickable variant cards for vehicle selection on Bob's shelf.
 * Touch-friendly with large tap targets and visual feedback.
 */
export const VariantSelectionCards: React.FC<VariantSelectionCardsProps> = ({
  variants,
  make,
  model,
  onSelect,
}) => {
  if (variants.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 0.95) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 102, 204, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">
              Which {make} {model}?
            </span>
            <span className="text-white/70 text-xs block">
              Tap your variant to continue
            </span>
          </div>
        </div>
      </div>

      {/* Variant Cards */}
      <div className="flex flex-col gap-2 px-1">
        {variants.map((variant) => (
          <VariantCardItem
            key={variant.vehicle_id}
            variant={variant}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface VariantCardItemProps {
  variant: VariantCard;
  onSelect: (variant: VariantCard) => void;
}

const VariantCardItem: React.FC<VariantCardItemProps> = ({ variant, onSelect }) => {
  const [isPressed, setIsPressed] = React.useState(false);

  // Build a clean specs line from the structured data
  const specsLine = [
    variant.engineCode,
    variant.kw ? `${variant.kw}kW` : null,
    variant.ccDisplay || (variant.cc ? `${variant.cc}cc` : null),
    variant.fuelType,
  ].filter(Boolean).join(' · ');

  // Use characterization as the primary title, fallback to a short summary
  const primaryTitle = variant.characterization || specsLine || variant.displayTitle;
  
  // Show specs as subtitle if characterization is used as title
  const subtitle = variant.characterization ? specsLine : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(variant)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={cn(
        "w-full text-left transition-all duration-200 cursor-pointer",
        "rounded-2xl overflow-hidden",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
        isPressed && "scale-[0.98]"
      )}
      style={{
        background: isPressed
          ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.25) 0%, rgba(255, 255, 255, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.85) 100%)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        boxShadow: isPressed
          ? '0 4px 20px rgba(0, 102, 204, 0.3)'
          : '0 4px 24px rgba(0, 0, 0, 0.12)',
        border: isPressed
          ? '2px solid rgba(0, 102, 204, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.4)',
        minHeight: '64px',
      }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Option Number Badge */}
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-base text-white"
          style={{
            background: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
            boxShadow: '0 2px 8px rgba(0, 102, 204, 0.4)',
          }}
        >
          {variant.optionNumber}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {primaryTitle}
          </p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Chevron */}
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0, 102, 204, 0.1)' }}
        >
          <svg 
            className="w-3.5 h-3.5 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default VariantSelectionCards;
