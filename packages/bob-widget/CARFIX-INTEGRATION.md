# CARFIX Integration Guide - Bob Widget v1.1.4

## 🚀 One-Click Install Instructions

This guide provides step-by-step instructions to integrate or update Bob Widget in your CARFIX application.

---

## Quick Summary

| What Changed | Impact |
|-------------|--------|
| Internal QueryClientProvider | **No more "No QueryClient set" errors!** |
| New `BobWidget` component | Simpler one-component integration |
| Bundled react-query | No peer dependency required |
| Startup logging | Easy version verification |

---

## Step 1: Update Bob Widget

```bash
# Remove old version and clear cache
npm uninstall @gymmymac/bob-widget
rm -rf node_modules/.vite

# Install latest version
npm install @gymmymac/bob-widget@^1.1.4

# Restart dev server
npm run dev
```

---

## Step 2: Choose Your Integration Method

### Option A: BobWidget (Recommended - Simplest)

This is the easiest way to integrate Bob. It handles all providers internally.

```tsx
import { BobWidget } from '@gymmymac/bob-widget';

function App() {
  return (
    <div className="app">
      {/* Your existing app content */}
      
      <BobWidget
        bobConfig={{
          supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
          supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb2d1eHpzdHNpaGh4dmRncHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgyODEsImV4cCI6MjA3OTUxNDI4MX0.detu4TKB7RjC6l6CrVaPYoi0Hhz2asDt6zxNx1cdzq8',
        }}
        hostApiConfig={{
          baseUrl: 'YOUR_API_BASE_URL',
          apiKey: 'YOUR_API_KEY',
          partnerCode: 'CARFIX',
        }}
        hostContext={{
          user: { id: user?.id, email: user?.email },
          vehicle: { selectedVehicle: currentVehicle },
        }}
        callbacks={{
          onVehicleIdentified: (vehicle) => setVehicle(vehicle),
          onPartsFound: (parts) => setParts(parts),
          onAddToCart: (item) => addToCart(item),
        }}
        variant="mobile"
      />
    </div>
  );
}
```

**Benefits of BobWidget:**
- ✅ Zero configuration required
- ✅ No QueryClientProvider wrapping needed
- ✅ All props in one component
- ✅ Self-contained and isolated

---

### Option B: BobProvider + Bob (More Control)

Use this if you need to access Bob's context in other parts of your app.

```tsx
import { BobProvider, Bob, useHostContext } from '@gymmymac/bob-widget';

function App() {
  return (
    <BobProvider
      bobConfig={{
        supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb2d1eHpzdHNpaGh4dmRncHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgyODEsImV4cCI6MjA3OTUxNDI4MX0.detu4TKB7RjC6l6CrVaPYoi0Hhz2asDt6zxNx1cdzq8',
      }}
      hostApiConfig={{
        baseUrl: 'YOUR_API_BASE_URL',
        apiKey: 'YOUR_API_KEY',
        partnerCode: 'CARFIX',
      }}
      hostContext={{
        user: { id: user?.id, email: user?.email },
      }}
      callbacks={{
        onAddToCart: (item) => addToCart(item),
      }}
    >
      <YourAppLayout>
        <VehicleDisplay /> {/* Can use useHostContext() */}
        <Bob variant="mobile" />
      </YourAppLayout>
    </BobProvider>
  );
}

// Example: Access Bob's context in child components
function VehicleDisplay() {
  const { vehicle } = useHostContext();
  return <div>Current: {vehicle?.selectedVehicle?.rego}</div>;
}
```

---

### Option C: Shared QueryClient (Advanced)

If you already use React Query and want to share the cache with Bob:

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
        queryClient={queryClient} // Pass your QueryClient
      >
        <Bob variant="mobile" />
      </BobProvider>
    </QueryClientProvider>
  );
}
```

This allows Bob's queries to share the same cache as your app.

---

## Step 3: Verify Installation

### Console Verification

Open browser DevTools (F12) and check the console. You should see:

```
[BobWidget] Package loaded - v1.1.4
[BobWidget] v1.1.4 initialized
[BobWidget] QueryClient: internal
```

If you see "QueryClient: external (shared)", you're using a shared QueryClient.

### Ask Bob

Type in the chat: **"What version are you running?"**

Bob should respond with his current version (1.1.4).

### Programmatic Check

```tsx
import { getBobVersion, BOB_VERSION } from '@gymmymac/bob-widget';

console.log('Bob Version:', getBobVersion()); // "1.1.4"
console.log('BOB_VERSION constant:', BOB_VERSION); // "1.1.4"
```

---

## Step 4: Remove Old Workarounds

If you had any of these workarounds, you can safely remove them:

```tsx
// ❌ NO LONGER NEEDED - Remove this wrapper
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
<QueryClientProvider client={queryClient}>
  ...
</QueryClientProvider>

// ✅ Just use BobWidget directly
<BobWidget ... />
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Old version showing in console | Clear `node_modules/.vite`, restart dev server |
| Blank screen | Check console for errors, verify bobConfig credentials |
| "Package loaded" but not "initialized" | BobProvider/BobWidget not rendered yet |
| No products loading | Verify hostApiConfig credentials and baseUrl |
| Version mismatch | Run `npm ls @gymmymac/bob-widget` to check installed version |

### Cache Clearing Commands

```bash
# Full clean install
rm -rf node_modules package-lock.json
npm install
npm run dev

# Just clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## Dependencies

Bob Widget v1.1.4 **bundles** its own dependencies. Your project only needs:

| Dependency | Version | Required |
|------------|---------|----------|
| `react` | ^18.0.0 | ✅ Yes |
| `react-dom` | ^18.0.0 | ✅ Yes |
| `@tanstack/react-query` | any | ❌ Optional (bundled) |

---

## API Reference

### BobWidget Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `bobConfig` | `BobConfig` | ✅ | Bob's Supabase credentials |
| `hostApiConfig` | `HostApiConfig` | ✅ | Your API configuration |
| `hostContext` | `HostContext` | ❌ | Current user/vehicle/cart state |
| `callbacks` | `BobCallbacks` | ❌ | Event handlers |
| `variant` | `'mobile' \| 'inline' \| 'floating' \| 'fullscreen'` | ❌ | Display mode (default: 'mobile') |
| `showChat` | `boolean` | ❌ | Show chat interface (default: true) |
| `className` | `string` | ❌ | Additional CSS classes |

### BobConfig

```typescript
interface BobConfig {
  supabaseUrl: string;  // Bob's Supabase URL
  supabaseKey: string;  // Bob's public anon key
}
```

### HostApiConfig

```typescript
interface HostApiConfig {
  baseUrl: string;           // Your API base URL
  apiKey: string;            // Your API key
  partnerCode?: string;      // Partner identifier (e.g., 'CARFIX')
  customHeaders?: Record<string, string>;
}
```

### BobCallbacks

```typescript
interface BobCallbacks {
  onVehicleIdentified?: (vehicle: Vehicle) => void;
  onPartsFound?: (parts: unknown[]) => void;
  onServicePackagesFound?: (packages: unknown[]) => void;
  onAddToCart?: (item: CartItem) => void;
  onCartUpdated?: (cart: { items: CartItem[]; total: number }) => void;
  onCheckoutRequested?: (checkoutUrl: string) => void;
  onBobMessage?: (message: string) => void;
  onError?: (error: Error) => void;
}
```

---

## Support

If you encounter any issues:

1. Check the browser console for error messages
2. Verify the version with `getBobVersion()`
3. Review this guide's troubleshooting section
4. Contact the Bob Widget team with console logs and version info

---

## Changelog

### v1.1.4 (Current)
- ✅ Internal QueryClientProvider - no wrapper needed
- ✅ New `BobWidget` component for easy integration
- ✅ Startup logging for debugging
- ✅ Bundled react-query dependency
- ✅ Optional `queryClient` prop for shared caching

### v1.1.3
- Version reporting feature
- `getBobVersion()` and `BOB_VERSION` exports

### v1.1.2
- Initial multi-tenant widget release
