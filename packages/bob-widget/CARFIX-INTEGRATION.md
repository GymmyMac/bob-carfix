# CARFIX Integration Guide - Bob Widget v3.1.0

## 🚀 Current Release: v3.1.0 (Standalone Architecture)

This guide provides step-by-step instructions to integrate Bob Widget in your CARFIX application using the new simplified v3.1.0 architecture.

---

## What's New in v3.1.0

| Feature | Description |
|---------|-------------|
| **BobStandalone** | Auto-configures from database - 4 lines to integrate |
| **Partner Config System** | All settings stored in `bob_partners` table |
| **CSS Variables** | Customizable blur, opacity, colors via CSS |
| **Debug Overlay** | Visual diagnostic tool for troubleshooting |
| **sessionToken Prop** | Pre-authenticated sessions for vehicle handoff |
| **Simplified Callbacks** | Only 3 essential callbacks required |

---

## Quick Start (Recommended)

With v3.1.0, Bob auto-loads all configuration from the database. CARFIX only needs 4 lines of code:

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div className="h-[calc(100dvh-136px)] relative">
      <BobStandalone
        partner="CARFIX"
        sessionToken={sessionToken}
        onAddToCart={(item) => addToCart(item)}
        onNavigate={(url) => router.push(url)}
      />
    </div>
  );
}
```

**That's it!** Bob handles everything else internally.

---

## What's Auto-Configured

| Setting | Value | Source |
|---------|-------|--------|
| API Base URL | `https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1` | `bob_partners` table |
| Bottom Offset | 60px | `bob_partners` table |
| Backdrop Blur | 4px | `bob_partners` table |
| Overlay Opacity | 10% | `bob_partners` table |
| Service Packages | Enabled | Feature flag |
| TTS | Enabled | Feature flag |
| Speech Recognition | Enabled | Feature flag |

---

## Step 1: Install/Update Bob Widget

```bash
# Remove old version and clear cache
npm uninstall @gymmymac/bob-widget
rm -rf node_modules/.vite

# Install latest version
npm install @gymmymac/bob-widget@^3.1.0

# Restart dev server
npm run dev
```

---

## Step 2: Choose Your Integration Method

### Option A: BobStandalone (Recommended - Simplest)

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session;

  return (
    <div className="h-[calc(100dvh-136px)] relative">
      <BobStandalone
        partner="CARFIX"
        sessionToken={sessionToken}
        onAddToCart={(item) => addToCart(item)}
        onNavigate={(url) => router.push(url)}
      />
    </div>
  );
}
```

### Option B: BobWidget (More Control)

Use this if you need to override database defaults or access more callbacks:

```tsx
import { BobWidget } from '@gymmymac/bob-widget';

<BobWidget
  bobConfig={{
    supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }}
  hostApiConfig={{
    baseUrl: 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1',
    apiKey: '',  // Handled server-side
    partnerCode: 'CARFIX',
  }}
  callbacks={{
    onAddToCart: (item) => addToCart(item),
  }}
  variant="mobile"
  bottomOffset={60}
/>
```

---

## Props Reference

### BobStandalone Props

#### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `partner` | `string` | Partner code - `"CARFIX"` |

#### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sessionToken` | `string` | - | Pre-authenticated session token from Partner API |
| `bottomOffset` | `number` | 60 | Override database default (for CARFIX bottom nav) |
| `zIndexBase` | `number` | 50 | Override z-index base |
| `backdropBlurIntensity` | `number` | 4 | Blur intensity (0-20) |
| `backdropOverlayOpacity` | `number` | 0.1 | Overlay opacity (0-1) |
| `debug` | `boolean` | false | Show diagnostic overlay |
| `className` | `string` | - | Additional CSS class |

#### Callbacks

| Callback | Type | Description |
|----------|------|-------------|
| `onAddToCart` | `(item: CartItem) => void` | **Essential** - Handle cart addition |
| `onNavigate` | `(url: string) => void` | SPA navigation within CARFIX |
| `onCheckout` | `(url: string) => void` | Handle checkout redirect |
| `onError` | `(error: Error) => void` | Custom error handling |

---

## Session Handoff (Pre-Selected Vehicle)

When a customer selects a vehicle on the main CARFIX site, create a session before redirecting to Bob:

```typescript
// 1. Create session via Partner API
const response = await fetch('https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Partner-Key': 'bob_carfix_p4rtner_2024_x7kL9mNqR3wY5vBc' 
  },
  body: JSON.stringify({
    action: 'create_session',
    vehicle: { 
      vehicle_id: 42899,  // MUST be numeric
      make: 'MAZDA',
      model: 'DEMIO',
      year: 2008
    },
    user_email: customer?.email  // Optional
  })
});

const { session_token } = await response.json();

// 2. Redirect to Bob with session
router.push(`/ask-bob?session=${session_token}`);
```

**Critical:** `vehicle_id` MUST be a numeric type, not a string!

---

## CSS Customization

### Override via CSS Variables

Bob uses CSS variables that can be overridden in your container:

```css
/* In your CARFIX stylesheet */
.bob-container {
  --bob-blur-intensity: 2px;    /* Reduce blur */
  --bob-overlay-opacity: 0.05;  /* Lighter overlay */
  --bob-primary-color: #0052cc; /* Match CARFIX blue */
  --bob-accent-color: #ff8c00;  /* Orange for highlights */
}
```

### CSS Isolation

Bob v3.1.0 uses aggressive CSS isolation via `.bob-widget-root`:

```css
.bob-widget-root {
  isolation: isolate;
  contain: layout style;
  /* All internal styles scoped */
}
```

This prevents CARFIX styles from bleeding into Bob and vice versa.

---

## Debug Mode

Enable debug overlay for troubleshooting:

```tsx
<BobStandalone
  partner="CARFIX"
  debug={true}  // Shows diagnostic overlay
/>
```

The overlay displays:
- Partner config loaded status
- Session token status
- Viewport size and device type
- Position factors being applied
- Feature flags
- CSS conflicts detected

---

## Container Requirements

Bob's container should:

1. Have a defined height (not auto)
2. Have `position: relative`
3. NOT have `overflow: hidden` on parent elements
4. NOT have transforms that would affect Bob's positioning

**Recommended container:**

```tsx
<div 
  className="bob-container"
  style={{ 
    height: 'calc(100dvh - 136px)', // Account for header + footer
    position: 'relative',
  }}
>
  <BobStandalone partner="CARFIX" />
</div>
```

---

## Verification

### Console Output

Open browser DevTools (F12) and check the console. You should see:

```
[BobWidget] Package loaded - v3.1.0
[BobStandalone] Initialized { version: "3.1.0", partner: "CARFIX", session: "present" }
[BobWidget] Loading partner config for: CARFIX
[BobWidget] Partner config loaded: { partner: "CARFIX", bottomOffset: 60, ... }
[BobWidget] v3.1.0 initialized
```

### Version Check

```tsx
import { getBobVersion, BOB_VERSION } from '@gymmymac/bob-widget';

console.log('Bob Version:', getBobVersion()); // "3.1.0"
```

### Ask Bob

Type in the chat: **"What version are you running?"**

Bob should respond with his current version.

---

## Troubleshooting

### Bob doesn't appear / is cropped

1. Check parent containers for `overflow: hidden`
2. Ensure container has explicit height
3. Check z-index conflicts with CARFIX header/nav
4. Enable debug mode to see CSS conflicts

### Service packages not showing

1. Check browser Network tab for `calculate-service-bundles` response
2. Verify the vehicle has service packages allocated
3. Check console for `[BobWidget] Service Packages Received` log

### Products not loading

1. Verify session token is being passed correctly
2. Check `retrieve-parts` API response in Network tab
3. Ensure `vehicle_id` is numeric type

### Blur/overlay too strong

1. Use `backdropBlurIntensity` and `backdropOverlayOpacity` props
2. Or override CSS variables in container

### Common Issues

| Issue | Solution |
|-------|----------|
| Old version showing in console | Clear `node_modules/.vite`, restart dev server |
| Blank screen | Check console for errors, verify partner code |
| "Partner not found" error | Ensure `bob_partners` table has CARFIX entry |
| No products loading | Verify vehicle_id is numeric in session token |
| Version mismatch | Run `npm ls @gymmymac/bob-widget` to check version |

### Cache Clearing

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

## Migration from v3.0.x

### Before (v3.0.6)
```tsx
<BobWidget
  bobConfig={{
    supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
    supabaseKey: 'eyJhbGciOiJI...',
  }}
  hostApiConfig={{
    baseUrl: 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1',
    apiKey: 'secret_key',
    partnerCode: 'CARFIX',
  }}
  hostContext={{
    user: { email: user?.email },
    vehicle: { selectedVehicle },
  }}
  callbacks={{
    onVehicleIdentified: (v) => setVehicle(v),
    onPartsFound: (p) => setParts(p),
    onServicePackagesFound: (s) => setPackages(s),
    onAddToCart: (item) => addToCart(item),
  }}
  variant="mobile"
  bottomOffset={60}
/>
```

### After (v3.1.0)
```tsx
<BobStandalone
  partner="CARFIX"
  sessionToken={sessionToken}
  onAddToCart={(item) => addToCart(item)}
  onNavigate={(url) => router.push(url)}
/>
```

**Lines of code: 30+ → 4**

---

## Dependencies

Bob Widget v3.1.0 **bundles** its own dependencies. Your project only needs:

| Dependency | Version | Required |
|------------|---------|----------|
| `react` | ^18.0.0 | ✅ Yes |
| `react-dom` | ^18.0.0 | ✅ Yes |
| `@tanstack/react-query` | any | ❌ Optional (bundled) |

---

## Support

If you encounter any issues:

1. Enable debug mode (`debug={true}`)
2. Check browser console for `[BobWidget]` logs
3. Check Network tab for API responses
4. Contact the Bob Widget team with console logs and version info

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

### v3.1.0 (Current)
- 🎯 **BobStandalone**: Auto-configures from database - 4 lines to integrate
- 🗄️ **Partner Config System**: All settings in `bob_partners` table
- 🎨 **CSS Variables**: Customizable blur, opacity, colors
- 🔍 **Debug Overlay**: Visual diagnostic tool
- 📦 **Simplified Callbacks**: Only essential callbacks required

### v3.0.6
- 🔄 Release process fix
- 📚 Documentation consolidation

### v3.0.0-v3.0.5
- SwipeableBob, RAF animations, MatrixProductLoader, SparkDealBanner
- Multi-tenant support, returning user detection
- External audio hosting, CSS isolation, TTS validation
