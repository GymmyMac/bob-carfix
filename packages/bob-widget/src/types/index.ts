/**
 * Type exports for @carfix/bob-widget
 */

// Context types
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
  CartItem as ContextCartItem,
  SavedItem,
  PurchaseRecord,
  Vehicle as ContextVehicle,
} from './context';

// Vehicle types
export type { Vehicle } from './vehicle';

// Product types
export type { APIPart, CartItem, ServicePackage } from './product';

// Message types
export type { Message, HighlightedProduct } from './message';
