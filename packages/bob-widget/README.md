# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for integration into partner websites.

## Installation

```bash
npm install @gymmymac/bob-widget
```

## Quick Start

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BobProvider, Bob } from '@gymmymac/bob-widget';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BobProvider
        bobConfig={{
          supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
          supabaseKey: 'eyJhbGciOiJI...', // Bob's public anon key
        }}
        hostApiConfig={{
          baseUrl: 'https://api.yoursite.com',
          apiKey: process.env.CARFIX_PARTNER_API_KEY!,
          partnerCode: 'YOUR_PARTNER_CODE',
        }}
        hostContext={{
          user: { id: user?.id, email: user?.email, name: user?.name },
          vehicle: { selectedVehicle: currentVehicle },
        }}
        callbacks={{
          onVehicleIdentified: (vehicle) => saveVehicle(vehicle),
          onPartsFound: (parts) => displayParts(parts),
          onAddToCart: (item) => addToCart(item),
        }}
      >
        <YourApp />
        <Bob variant="floating" />
      </BobProvider>
    </QueryClientProvider>
  );
}
```

## Troubleshooting

### "No QueryClient set" Error

If you see this error, ensure:

1. **Install `@tanstack/react-query`** as a peer dependency:
   ```bash
   npm install @tanstack/react-query
   ```

2. **Wrap `BobProvider` inside `QueryClientProvider`**:
   ```tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   
   const queryClient = new QueryClient();
   
   <QueryClientProvider client={queryClient}>
     <BobProvider ...>
       ...
     </BobProvider>
   </QueryClientProvider>
   ```

### Checking Bob's Version

You can ask Bob directly: "What version are you running?"

Or programmatically:
```tsx
import { BOB_VERSION, getBobVersion } from '@gymmymac/bob-widget';

console.log(`Bob Widget Version: ${getBobVersion()}`); // e.g., "1.1.3"
```

## Configuration

### BobProvider Props

| Prop | Type | Description |
|------|------|-------------|
| `bobConfig` | `BobConfig` | Bob's Supabase credentials (for animations, TTS) |
| `hostApiConfig` | `HostApiConfig` | Your API credentials for product/vehicle lookups |
| `hostContext` | `HostContext` | Current user, vehicle, cart, and purchase history |
| `callbacks` | `BobCallbacks` | Event handlers for Bob actions |

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
  // Called when Bob identifies a vehicle
  onVehicleIdentified: (vehicle) => {
    dispatch(setCurrentVehicle(vehicle));
  },
  
  // Called when parts are found
  onPartsFound: (parts) => {
    dispatch(setParts(parts));
  },
  
  // Called when user wants to add to cart
  onAddToCart: (item) => {
    dispatch(addToCart(item));
  },
  
  // Called when checkout is requested
  onCheckoutRequested: (url) => {
    window.location.href = url;
  },
};
```

## Hooks

Access Bob's context from anywhere in your app:

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

## License

MIT
