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

// Types
export type {
  // Host context types
  HostContext,
  HostUserContext,
  HostVehicleContext,
  HostCartContext,
  HostHistoryContext,
  
  // Data types
  Vehicle,
  CartItem,
  SavedItem,
  PurchaseRecord,
  
  // Configuration types
  BobConfig,
  HostApiConfig,
  BobCallbacks,
  BobProviderConfig,
} from './types';
