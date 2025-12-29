import React from 'react';
import { BobProvider } from '../BobProvider';
import { Bob, BobVariant } from './Bob';
import type {
  BobConfig,
  HostApiConfig,
  HostContext,
  BobCallbacks,
} from '../types';

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
}) => {
  return (
    <BobProvider
      bobConfig={bobConfig}
      hostApiConfig={hostApiConfig}
      hostContext={hostContext}
      callbacks={callbacks}
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
  );
};

export default BobWidget;
