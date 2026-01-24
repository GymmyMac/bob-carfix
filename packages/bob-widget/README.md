# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for integration into partner websites.

**v3.0.5** - Stability release with complete CARFIX integration documentation, animation state manifest, and TTS configuration guide.

## What's New in v3.0.0

- 🎭 **SwipeableBob**: Gesture-based interactions - swipe Bob away or back into view
- 🏢 **Multi-Tenant Support**: Configurable looks and animations per tenant
- 🎬 **RAF Animations**: Smooth 60fps animations using requestAnimationFrame
- ⚡ **MatrixProductLoader**: Cyberpunk-style loading with phased states
- 🔥 **SparkDealBanner**: Animated promotional banners
- 👋 **Returning User Detection**: Personalized greetings for repeat visitors
- 🎨 **Theme Settings**: Dynamic theme configuration from database

## Installation

```bash
npm install @gymmymac/bob-widget
```

## Quick Start (Recommended)

The easiest way to integrate Bob - just use the `BobWidget` component:

```tsx
import { BobWidget } from '@gymmymac/bob-widget';

function App() {
  return (
    <BobWidget
      bobConfig={{
        supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
        supabaseKey: 'eyJhbGciOiJI...', // Bob's public anon key
      }}
      hostApiConfig={{
        baseUrl: 'https://api.yoursite.com',
        apiKey: process.env.API_KEY!,
        partnerCode: 'YOUR_PARTNER_CODE',
      }}
      hostContext={{
        user: { id: user?.id, email: user?.email },
        vehicle: { selectedVehicle: currentVehicle },
      }}
      callbacks={{
        onVehicleIdentified: (vehicle) => saveVehicle(vehicle),
        onAddToCart: (item) => addToCart(item),
      }}
      variant="mobile"
    />
  );
}
```

**That's it!** No `QueryClientProvider` wrapping needed - Bob handles everything internally.

## Alternative: BobProvider + Bob

If you need access to Bob's context in other components:

```tsx
import { BobProvider, Bob, useHostContext } from '@gymmymac/bob-widget';

function App() {
  return (
    <BobProvider
      bobConfig={{
        supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
        supabaseKey: 'eyJhbGciOiJI...',
      }}
      hostApiConfig={{
        baseUrl: 'https://api.yoursite.com',
        apiKey: process.env.API_KEY!,
        partnerCode: 'YOUR_PARTNER_CODE',
      }}
      hostContext={{
        user: { id: user?.id, email: user?.email },
      }}
      callbacks={{
        onAddToCart: (item) => addToCart(item),
      }}
    >
      <YourApp />
      <Bob variant="mobile" />
    </BobProvider>
  );
}
```

## Checking Bob's Version

Ask Bob directly: "What version are you running?"

Or programmatically:
```tsx
import { BOB_VERSION, getBobVersion } from '@gymmymac/bob-widget';

console.log(`Bob Widget Version: ${getBobVersion()}`); // "3.0.5"
```

Check the console for startup logs:
```
[BobWidget] Package loaded - v3.0.5
[BobWidget] v3.0.5 initialized
[BobWidget] QueryClient: internal
```

## Configuration

### BobWidget / BobProvider Props

| Prop | Type | Description |
|------|------|-------------|
| `bobConfig` | `BobConfig` | Bob's Supabase credentials (for animations, TTS) |
| `hostApiConfig` | `HostApiConfig` | Your API credentials for product/vehicle lookups |
| `hostContext` | `HostContext` | Current user, vehicle, cart, and purchase history |
| `callbacks` | `BobCallbacks` | Event handlers for Bob actions |
| `queryClient` | `QueryClient` | Optional: share your app's QueryClient |

### BobWidget Additional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'mobile' \| 'inline' \| 'floating' \| 'fullscreen'` | `'mobile'` | Display variant |
| `showChat` | `boolean` | `true` | Show chat interface |
| `className` | `string` | `''` | Additional CSS classes |

### Host Context

Pass your app's state to Bob for personalized interactions:

```tsx
const hostContext = useMemo(() => ({
  user: {
    id: user?.id,
    email: user?.email,
    name: user?.name,
    isAuthenticated: !!user,
  },
  vehicle: {
    selectedVehicle: currentVehicle,
    garageVehicles: userVehicles,
  },
  cart: {
    items: cartItems,
    totalValue: cartTotal,
  },
  history: {
    purchases: orderHistory,
    lastOrderDate: lastOrder?.date,
  },
  currentPage: location.pathname,
}), [user, currentVehicle, userVehicles, cartItems, cartTotal, orderHistory]);
```

### Callbacks

Handle Bob's actions in your app:

```tsx
const callbacks = {
  onVehicleIdentified: (vehicle) => {
    dispatch(setCurrentVehicle(vehicle));
  },
  onPartsFound: (parts) => {
    dispatch(setParts(parts));
  },
  onAddToCart: (item) => {
    dispatch(addToCart(item));
  },
  onCheckoutRequested: (url) => {
    window.location.href = url;
  },
};
```

## Hooks

Access Bob's context from anywhere in your app (when using BobProvider):

```tsx
import { 
  useBobContext,
  useHostContext,
  useBobCallbacks,
} from '@gymmymac/bob-widget';

function MyComponent() {
  const { hostContext, updateHostContext } = useBobContext();
  
  // Update context when your app state changes
  useEffect(() => {
    updateHostContext({ user: { email: newEmail } });
  }, [newEmail]);
}
```

## Advanced: Shared QueryClient

If you want Bob to share your app's React Query cache:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BobProvider, Bob } from '@gymmymac/bob-widget';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BobProvider
        bobConfig={...}
        hostApiConfig={...}
        queryClient={queryClient} // Share the cache
      >
        <Bob variant="mobile" />
      </BobProvider>
    </QueryClientProvider>
  );
}
```

## Dependencies

Bob Widget v3.0.0+ bundles its own dependencies. You only need:
- `react` ^18.0.0
- `react-dom` ^18.0.0

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## Integration Guide

For detailed integration instructions, see [CARFIX-INTEGRATION.md](./CARFIX-INTEGRATION.md).

## License

MIT
