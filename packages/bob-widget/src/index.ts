/**
 * @gymmymac/bob-widget
 * 
 * AI-powered automotive parts assistant widget - Full immersive experience
 * 
 * v1.1.4+ - Self-contained with internal QueryClientProvider
 */

import { BOB_VERSION } from './version';

// Log package load for debugging
console.log(`[BobWidget] Package loaded - v${BOB_VERSION}`);

// Version
export { BOB_VERSION, getBobVersion } from './version';

// Provider and hooks
export {
  BobProvider,
  useBobContext,
  useBobSupabase,
  useHostContext,
  useHostApiConfig,
  useBobCallbacks,
} from './BobProvider';

// Self-contained widget (recommended for easy integration)
export { BobWidget } from './components/BobWidget';
export type { BobWidgetProps } from './components/BobWidget';

// Main components
export { Bob } from './components/Bob';
export type { BobVariant } from './components/Bob';
export { BobCharacter } from './components/BobCharacter';
export { ChatInterface } from './components/ChatInterface';

// Mobile components
export {
  MobileBobCharacter,
  MobileChatDrawer,
  MobileProductColumn,
  MobileBobLayout
} from './components/mobile';

// Core hooks
export { useBobChat } from './hooks/useBobChat';
export { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
export { useBobAnimation } from './hooks/useBobAnimation';
export { useBobAnimationData } from './hooks/useBobAnimationData';
export { useBobStateTransitions } from './hooks/useBobStateTransitions';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export { useBobBackdrop } from './hooks/useBobBackdrop';

// Types
export type {
  HostContext,
  HostUserContext,
  HostVehicleContext,
  HostCartContext,
  HostHistoryContext,
  BobConfig,
  HostApiConfig,
  BobCallbacks,
  BobProviderConfig,
} from './types/context';

export type { Vehicle } from './types/vehicle';

export type {
  Product,
  APIPart,
  CartItem,
  ServicePackage,
} from './types/product';

export type {
  Message,
  HighlightedProduct,
} from './types/message';

export type {
  BobAnimationConfig,
  AnimationStateDefinition,
  BobLook,
  BobAnimationData,
} from './hooks/useBobAnimationData';
