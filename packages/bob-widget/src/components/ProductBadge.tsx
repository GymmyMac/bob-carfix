import React from "react";
import { BADGE_CONFIG } from "../styles/carfix-tokens";

type BadgeType = keyof typeof BADGE_CONFIG;

interface ProductBadgeProps {
  type: BadgeType;
  value?: string; // For dynamic content like "5W-30" or "5L"
  className?: string;
}

/**
 * Consistent badge component for product attributes
 * Matches CARFIX website styling exactly
 */
export const ProductBadge: React.FC<ProductBadgeProps> = ({
  type,
  value,
  className = "",
}) => {
  const config = BADGE_CONFIG[type];
  const displayText = value || ("label" in config ? config.label : "");

  // Icon components inline for simplicity
  const renderIcon = () => {
    if (!("icon" in config)) return null;
    
    const iconStyle = { width: 12, height: 12 };
    
    switch (config.icon) {
      case "Check":
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "Sparkles":
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
          </svg>
        );
      case "Gauge":
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case "Droplets":
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        background: config.background,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {renderIcon()}
      {displayText}
    </span>
  );
};

export default ProductBadge;
