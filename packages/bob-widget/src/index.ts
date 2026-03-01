/**
 * @gymmymac/bob-widget
 * 
 * AI-powered automotive parts assistant widget - Full immersive experience
 * 
 * v3.1.0 - Standalone partner integration: auto-config from database, simplified props
 * v3.0.0 - Major rebuild with multi-tenant support, RAF animations, swipeable Bob
 * v1.4.0 - Redesigned PTT button: 3x larger, green "TALK" text, floating cartoon style
 * v1.3.1 - Bottom offset support for host navigation bars
 * v1.3.0 - GA4 Analytics integration
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
  useBobSupabaseSafe,
  useHostContext,
  useHostApiConfig,
  useBobCallbacks,
  useBobAnalyticsConfig,
  useBobAnalytics,
  useBobLayoutConfig,
} from './BobProvider';

// Self-contained widget (recommended for easy integration)
export { BobWidget } from './components/BobWidget';
export type { BobWidgetProps } from './components/BobWidget';

// v3.1.0 Standalone widget (simplest integration - auto-configures from database)
export { BobStandalone } from './components/BobStandalone';
export type { BobStandaloneHandle } from './components/BobStandalone';
export type { StandaloneWidgetProps } from './types/partner';

// Partner configuration hook (for advanced integrations)
export { usePartnerConfig, getFeatureFlag } from './hooks/usePartnerConfig';
export type { PartnerConfig, PartnerFeatureFlags, EssentialCallbacks } from './types/partner';

// Debug overlay (can be used standalone)
export { BobDebugOverlay } from './components/BobDebugOverlay';

// Main components
export { Bob } from './components/Bob';
export type { BobVariant } from './components/Bob';
export { BobCharacter } from './components/BobCharacter';
export { ChatInterface } from './components/ChatInterface';
export { BobSuggestions } from './components/BobSuggestions';
export { ProductBadge } from './components/ProductBadge';

// CARFIX Design Tokens
export {
  CARFIX_COLORS,
  QUALITY_TIER_CONFIG,
  IMAGE_URLS,
  BADGE_CONFIG,
  TYPOGRAPHY,
  isRotorProduct,
  getDisplayPrice,
  formatNZD,
} from './styles/carfix-tokens';

// v3.0 New components
export { SwipeableBob } from './components/SwipeableBob';
export { ProductTile } from './components/ProductTile';
export { MatrixProductLoader } from './components/MatrixProductLoader';
export type { LoaderPhase } from './components/MatrixProductLoader';
export { SparkDealBanner } from './components/SparkDealBanner';

// Mobile components
export {
  MobileBobCharacter,
  MobileChatDrawer,
  MobileProductColumn,
  MobileBobLayout,
  MobileBobLayoutCore,
  ContainedMobileBobLayout,
  ContainedChatDrawer,
  ServicePackageDetailView
} from './components/mobile';

// Core hooks
export { useBobChat } from './hooks/useBobChat';
export { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
export { useBobAnimation } from './hooks/useBobAnimation';
export { useBobAnimationData } from './hooks/useBobAnimationData';
export { useBobStateTransitions } from './hooks/useBobStateTransitions';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export { useMicPermission } from './hooks/useMicPermission';
export { useBobBackdrop } from './hooks/useBobBackdrop';

// v3.0 New hooks
export { useThemeSettings } from './hooks/useThemeSettings';
export { useSparkDeals } from './hooks/useSparkDeals';
export { useReturningUser } from './hooks/useReturningUser';
export { useBobHealthCheck } from './hooks/useBobHealthCheck';
export type { BobHealthCheckResult } from './hooks/useBobHealthCheck';

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
  BobLayoutConfig,
} from './types/context';

export type { Vehicle } from './types/vehicle';

export type {
  Product,
  APIPart,
  CartItem,
  ServicePackage,
  Partslot,
  QualityTiers,
  Part,
} from './types/product';

export type {
  Message,
  HighlightedProduct,
  QuickReply,
} from './types/message';

export type {
  BobAnimationConfig,
  AnimationStateDefinition,
  BobLook,
  BobAnimationData,
} from './hooks/useBobAnimationData';

// Analytics types
export type {
  BobEventName,
  BobAnalyticsEvent,
  BobGA4Config,
  SessionStartParams,
  MessageSentParams,
  VehicleIdentifiedParams,
  PartsViewedParams,
  ProductParams,
  CheckoutParams,
  SpeechParams,
  ErrorParams,
} from './types/analytics';
