import { useViewportSize, type ViewportSize } from './useViewportSize';

/**
 * Position factors for responsive Bob positioning and UI scaling.
 * These factors allow fine-tuned control across mobile, tablet, and desktop.
 */
export interface PositionFactors {
  /** Multiplier for Bob's position offsets (1.0 = full offset, 0.5 = half) */
  bobOffset: number;
  /** Multiplier for product column width (1.0 = 80%, 0.6 = 48%) */
  productWidth: number;
  /** General UI element scaling factor */
  uiScale: number;
  /** Bob's partial-left position (percentage from left edge) */
  partialLeftPosition: number;
  /** Bob's hidden position (percentage from left edge) */
  hiddenPosition: number;
}

/**
 * Returns device-specific position factors for consistent Bob positioning
 * across mobile, tablet, and desktop viewports.
 */
export function usePositionFactors(): PositionFactors {
  const viewport = useViewportSize();
  
  return getPositionFactors(viewport);
}

/**
 * Get position factors for a specific viewport size.
 * Can be used directly if viewport is known.
 */
export function getPositionFactors(viewport: ViewportSize): PositionFactors {
  switch (viewport) {
    case 'mobile':
      return {
        bobOffset: 1.0,
        productWidth: 1.0,
        uiScale: 1.0,
        partialLeftPosition: -30,  // v3.1.16: Reduced from -55 to keep more of Bob visible
        hiddenPosition: -100,      // Fully off-screen
      };
    case 'tablet':
      return {
        bobOffset: 0.7,
        productWidth: 0.85,
        uiScale: 1.1,
        partialLeftPosition: -25,  // More offset on tablet (was -10)
        hiddenPosition: -80,       // Slightly visible edge
      };
    case 'desktop':
      return {
        bobOffset: 0.5,
        productWidth: 0.7,  // v3.1.19: Aligned with MobileProductColumn 70% width
        uiScale: 1.2,
        partialLeftPosition: -5,   // Slight left shift on desktop (was 5)
        hiddenPosition: -60,       // Can still see some of Bob
      };
    default:
      return {
        bobOffset: 1.0,
        productWidth: 1.0,
        uiScale: 1.0,
        partialLeftPosition: -20,
        hiddenPosition: -100,
      };
  }
}
