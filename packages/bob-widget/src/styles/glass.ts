/**
 * Premium Glassmorphism Style Utilities - iOS 26 Inspired
 * 
 * Design specs:
 * - Backgrounds: rgba(255,255,255,0.1) to 0.25
 * - Backdrop-filter: blur(20px) saturate(180%)
 * - Border: 1px solid rgba(255,255,255,0.2–0.35)
 * - Border-radius: 24–32px
 * - Box-shadow: 0 10px 40px rgba(0,0,0,0.25)
 * - Hover: scale(1.04–1.08), translateY(-4px), increased shadow/blur
 */

import type { CSSProperties } from 'react';

/** Base glass panel (cards, tiles) */
export const glassCard: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: '28px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255,255,255,0.1)',
};

/** Premium/Spotlighted card variant */
export const glassCardPremium: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)',
  backdropFilter: 'blur(24px) saturate(200%)',
  WebkitBackdropFilter: 'blur(24px) saturate(200%)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '32px',
  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
};

/** Glass button base */
export const glassButton: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
};

/** Primary CTA button - CARFIX Orange accent */
export const glassButtonPrimary: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.95) 0%, rgba(230, 134, 0, 1) 100%)',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: '24px',
  boxShadow: '0 10px 40px rgba(255, 149, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
};

/** CARFIX Blue primary button */
export const glassButtonBlue: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.95) 0%, rgba(0, 73, 153, 1) 100%)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '32px',
  boxShadow: '0 10px 40px rgba(0, 102, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
};

/** Glass input field */
export const glassInput: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
};

/** Glass panel/container */
export const glassPanel: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '28px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
};

/** Hover transform styles - apply on :hover state */
export const glassHoverTransform = {
  scale: 1.04,
  translateY: -4,
  boxShadow: '0 16px 56px rgba(0, 0, 0, 0.4), 0 0 24px rgba(255,255,255,0.08)',
};

/** Text styles for glass surfaces */
export const glassText = {
  primary: {
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  secondary: {
    color: 'rgba(255, 255, 255, 0.7)',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  price: {
    color: '#FF9500',
    textShadow: '0 2px 8px rgba(255, 149, 0, 0.4)',
  },
};

/** Image container on glass surface */
export const glassImageContainer: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
};

/** Badge on glass surface */
export const glassBadge: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.15)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: '12px',
};

/** Scroll indicator dot */
export const glassScrollDot: CSSProperties = {
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.6)',
  boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
};
