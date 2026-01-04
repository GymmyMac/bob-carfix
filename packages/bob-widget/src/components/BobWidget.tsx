import React from 'react';
import { BobProvider } from '../BobProvider';
import { Bob, BobVariant } from './Bob';
import type {
  BobConfig,
  HostApiConfig,
  HostContext,
  BobCallbacks,
} from '../types';
import type { BobGA4Config } from '../types/analytics';

// Import CSS reset for isolation
import '../styles/widget-reset.css';

/**
 * Props for the self-contained BobWidget component
 */
export interface BobWidgetProps {
  /** Bob's Supabase configuration (for animations, TTS) */
  bobConfig: BobConfig;
  /** Host's API configuration for product/vehicle lookups */
  hostApiConfig: HostApiConfig;
  /** Current host context (user, vehicle, cart, history) */
  hostContext?: HostContext;
  /** Event callbacks for Bob actions */
  callbacks?: BobCallbacks;
  /** Display variant */
  variant?: BobVariant;
  /** Initial animation state */
  initialState?: string;
  /** Show chat interface */
  showChat?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom backdrop URL (overrides database) */
  backdropUrl?: string;
  /** Custom counter overlay URL */
  counterOverlayUrl?: string;
  /** Counter height as percentage */
  counterHeightPercent?: number;
  /** Fallback Bob image URL */
  defaultBobImage?: string;
  /** Vertical offset for Bob character */
  verticalOffset?: number;
  /** Scale percentage for Bob character */
  scale?: number;
  /** GA4 configuration for analytics */
  ga4Config?: BobGA4Config;
  /** Enable/disable analytics tracking */
  analyticsEnabled?: boolean;
  /** 
   * Bottom offset in pixels for host navigation bars.
   * Bob's UI will be positioned this many pixels above the viewport bottom.
   * Use this when your host site has a bottom navigation bar.
   * @example bottomOffset={60} // For a 60px bottom nav
   */
  bottomOffset?: number;
  /**
   * Base z-index for Bob's UI elements. Default: 50
   * Bob calculates internal z-indexes relative to this base.
   */
  zIndexBase?: number;
}

/**
 * BobWidget - Self-contained Bob widget component
 * 
 * This is the easiest way to integrate Bob into your application.
 * It handles all providers internally - no QueryClientProvider needed!
 * 
 * @example
 * ```tsx
 * import { BobWidget } from '@gymmymac/bob-widget';
 * 
 * function App() {
 *   return (
 *     <BobWidget
 *       bobConfig={{
 *         supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
 *         supabaseKey: 'eyJhbGciOiJI...',
 *       }}
 *       hostApiConfig={{
 *         baseUrl: 'https://api.yoursite.com',
 *         apiKey: process.env.API_KEY!,
 *         partnerCode: 'YOUR_CODE',
 *       }}
 *       variant="mobile"
 *     />
 *   );
 * }
 * ```
 */
export const BobWidget: React.FC<BobWidgetProps> = ({
  bobConfig,
  hostApiConfig,
  hostContext,
  callbacks,
  variant = 'mobile',
  initialState,
  showChat,
  className,
  backdropUrl,
  counterOverlayUrl,
  counterHeightPercent,
  defaultBobImage,
  verticalOffset,
  scale,
  ga4Config,
  analyticsEnabled = true,
  bottomOffset = 0,
  zIndexBase = 50,
}) => {
  return (
    <div className="bob-widget-root" style={{ width: '100%', height: '100%' }}>
      <BobProvider
        bobConfig={bobConfig}
        hostApiConfig={hostApiConfig}
        hostContext={hostContext}
        callbacks={callbacks}
        ga4Config={ga4Config}
        analyticsEnabled={analyticsEnabled}
        bottomOffset={bottomOffset}
        zIndexBase={zIndexBase}
      >
        <Bob
          variant={variant}
          initialState={initialState}
          showChat={showChat}
          className={className}
          backdropUrl={backdropUrl}
          counterOverlayUrl={counterOverlayUrl}
          counterHeightPercent={counterHeightPercent}
          defaultBobImage={defaultBobImage}
          verticalOffset={verticalOffset}
          scale={scale}
        />
      </BobProvider>
    </div>
  );
};

export default BobWidget;
