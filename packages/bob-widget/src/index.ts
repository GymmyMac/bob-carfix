/**
 * @carfix/bob-widget
 * 
 * AI-powered automotive parts assistant widget
 * 
 * @example
 * ```tsx
 * import { BobProvider, Bob } from '@carfix/bob-widget';
 * 
 * function App() {
 *   return (
 *     <BobProvider
 *       bobConfig={{
 *         supabaseUrl: 'https://your-bob-project.supabase.co',
 *         supabaseKey: 'your-anon-key',
 *       }}
 *       hostApiConfig={{
 *         baseUrl: 'https://your-api.com',
 *         apiKey: 'your-api-key',
 *       }}
 *       hostContext={{
 *         user: { email: 'user@example.com' },
 *       }}
 *     >
 *       <YourApp />
 *       <Bob variant="floating" />
 *     </BobProvider>
 *   );
 * }
 * ```
 */

// Provider and hooks
export {
  BobProvider,
  useBobContext,
  useBobSupabase,
  useHostContext,
  useHostApiConfig,
  useBobCallbacks,
} from './BobProvider';

// Components
export { Bob } from './components/Bob';
export type { BobVariant } from './components/Bob';
export { BobCharacter } from './components/BobCharacter';
export { ChatInterface } from './components/ChatInterface';

// Hooks
export { useBobChat } from './hooks/useBobChat';
export { useSpeechSynthesis } from './hooks/useSpeechSynthesis';

// Types
export type {
  // Host context types
  HostContext,
  HostUserContext,
  HostVehicleContext,
  HostCartContext,
  HostHistoryContext,
  
  // Configuration types
  BobConfig,
  HostApiConfig,
  BobCallbacks,
  BobProviderConfig,
} from './types/context';

export type {
  Vehicle,
} from './types/vehicle';

export type {
  APIPart,
  CartItem,
  ServicePackage,
} from './types/product';

export type {
  Message,
  HighlightedProduct,
} from './types/message';
