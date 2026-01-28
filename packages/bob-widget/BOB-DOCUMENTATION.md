# Bob Widget - Complete Documentation

> **Version:** 3.1.5 | **Last Updated:** January 2025

AI-powered automotive parts assistant widget for seamless integration into partner websites.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Integration Guide](#3-integration-guide)
4. [Props Reference](#4-props-reference)
5. [Session Handoff](#5-session-handoff)
6. [CSS Customization](#6-css-customization)
7. [Bob's Behaviour Guidelines](#7-bobs-behaviour-guidelines)
8. [API Reference](#8-api-reference)
9. [Troubleshooting](#9-troubleshooting)
10. [CARFIX Cleanup & Upgrade](#10-carfix-cleanup--upgrade)
11. [Changelog Summary](#11-changelog-summary)

---

## 1. Overview

Bob is a friendly Kiwi auto parts expert that helps customers find the right parts for their vehicles through natural conversation. The widget is designed as a **"black box"** that auto-configures from the database—partners only need to provide a partner code.

### Key Features (v3.1.5)

| Feature | Description |
|---------|-------------|
| **BobStandalone** | Auto-configures from database - 4 lines to integrate |
| **Partner Config System** | All settings stored in `bob_partners` table |
| **CSS Variables** | Customizable blur, opacity, colors via CSS |
| **Debug Overlay** | Visual diagnostic tool for troubleshooting |
| **Session Handoff** | Pre-authenticated sessions for vehicle handoff |
| **SwipeableBob** | Gesture-based interactions - swipe Bob away or back |
| **RAF Animations** | Smooth 60fps animations using requestAnimationFrame |
| **MatrixProductLoader** | Cyberpunk-style loading with phased states |
| **HTTPS Validation** | Programmatic check for PTT with user warnings |

---

## 2. Quick Start

### Recommended: BobStandalone (Simplest)

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div className="h-[calc(100dvh-144px)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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

### Alternative: BobWidget (More Control)

Use this if you need to override database defaults:

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
  bottomOffset={72}
/>
```

### Checking Bob's Version

Ask Bob directly: **"What version are you running?"**

Or programmatically:
```tsx
import { getBobVersion, BOB_VERSION } from '@gymmymac/bob-widget';

console.log(`Bob Widget Version: ${getBobVersion()}`); // "3.1.5"
```

---

## 3. Integration Guide

### What's Auto-Configured

| Setting | Value | Source |
|---------|-------|--------|
| API Base URL | `https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1` | `bob_partners` table |
| Bottom Offset | 72px | `bob_partners` table |
| Backdrop Blur | 4px | `bob_partners` table |
| Overlay Opacity | 10% | `bob_partners` table |
| Service Packages | Enabled | Feature flag |
| TTS | Enabled | Feature flag |
| Speech Recognition | Enabled | Feature flag |

### Installation

```bash
# Install Bob Widget
npm install @gymmymac/bob-widget@^3.1.5

# If upgrading, clear cache first
rm -rf node_modules/.vite
npm run dev
```

### Container Requirements

Bob's container **MUST** meet these specifications for correct rendering:

#### Required Container Height Formula

```css
height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))
```

**CARFIX Reference Measurements:**

| Element | Height | Source |
|---------|--------|--------|
| CARFIX Header | 72px | Fixed header |
| Bottom Navigation | 72px | `py-2` (16px) + `min-h-[56px]` |
| Safe Area (notched devices) | Variable | `env(safe-area-inset-bottom)` |
| **Total Fixed Offset** | **144px** | Header + Bottom Nav |

#### Container CSS Requirements

```css
.bob-container {
  height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px));
  position: relative;
  overflow: hidden;
  width: 100%;
}
```

**Critical Container Rules:**

| Requirement | Reason |
|-------------|--------|
| `position: relative` | Bob uses `position: absolute` internally |
| Defined height (NOT auto or 100%) | Bob needs a fixed container boundary |
| `overflow: hidden` | Prevents content bleed outside container |
| No parent CSS transforms | Transforms break absolute positioning |

#### Complete Integration Example

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div 
      className="bob-container"
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
      }}
    >
      <BobStandalone
        partner="CARFIX"
        sessionToken={sessionToken}
        bottomOffset={72}           // Matches CARFIX bottom nav height
        onAddToCart={(item) => addToCart(item)}
        onNavigate={(url) => router.push(url)}
      />
    </div>
  );
}
```

#### Layout Measurements Reference

Based on visual analysis of CARFIX components:

```
┌─────────────────────────────────┐
│        CARFIX HEADER            │  ← 72px fixed
├─────────────────────────────────┤
│                                 │
│  ┌─────────┐  ┌──────────────┐  │
│  │ BOB'S   │  │              │  │
│  │ SHELF   │  │   PRODUCTS   │  │
│  │ HEADER  │  │   (scrolls)  │  │
│  ├─────────┤  │              │  │
│  │         │  │              │  │
│  │  BOB    │  │              │  │  ← Bob container
│  │ (char)  │  │              │  │    height: calc(100dvh - 144px - env(...))
│  │    ╲    │  │              │  │
│  │     ╲   │  │              │  │
│  ├──────╲──┴──┴──────────────┤  │
│  │   COUNTER OVERLAY (22%)   │  │
│  ├───────────────────────────┤  │
│  │  CHAT DRAWER (collapsed)  │  │  ← 70px collapsed
├─────────────────────────────────┤
│   BOTTOM NAV (72px visible)     │  ← py-2 + min-h-[56px]
│   + safe-area-inset-bottom      │  ← notched device padding
└─────────────────────────────────┘
```

| Element | Height/Value | Notes |
|---------|--------------|-------|
| Bob Container | `calc(100dvh - 144px - env(...))` | After header, before bottom nav |
| `bottomOffset` prop | `72` | Height of CARFIX bottom nav in pixels |
| Counter Overlay | 22% | Percentage of container height |
| Chat Drawer (collapsed) | 70px | From bottom of container |
| Chat Drawer (expanded) | 55% | Of container height |
| Bob Character | ~140% scale | Mobile base scale |
| z-index base | 50 | Default, configurable |

---

## 4. Props Reference

### BobStandalone Props

#### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `partner` | `string` | Partner code - `"CARFIX"` |

#### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sessionToken` | `string` | - | Pre-authenticated session token from Partner API |
| `bottomOffset` | `number` | 72 | Override database default (for bottom nav) |
| `zIndexBase` | `number` | 50 | Override z-index base |
| `backdropBlurIntensity` | `number` | 4 | Blur intensity (0-20) |
| `backdropOverlayOpacity` | `number` | 0.1 | Overlay opacity (0-1) |
| `debug` | `boolean` | false | Show diagnostic overlay |
| `embedded` | `boolean` | false | Use absolute positioning for host containers |
| `className` | `string` | - | Additional CSS class |

#### Callbacks

| Callback | Type | Description |
|----------|------|-------------|
| `onAddToCart` | `(item: CartItem) => void` | **Essential** - Handle cart addition |
| `onNavigate` | `(url: string) => void` | SPA navigation |
| `onCheckout` | `(url: string) => void` | Handle checkout redirect |
| `onError` | `(error: Error) => void` | Custom error handling |

### BobWidget Props

| Prop | Type | Description |
|------|------|-------------|
| `bobConfig` | `BobConfig` | Bob's Supabase credentials (for animations, TTS) |
| `hostApiConfig` | `HostApiConfig` | Your API credentials for product/vehicle lookups |
| `hostContext` | `HostContext` | Current user, vehicle, cart, and purchase history |
| `callbacks` | `BobCallbacks` | Event handlers for Bob actions |
| `queryClient` | `QueryClient` | Optional: share your app's QueryClient |
| `variant` | `'mobile' \| 'inline' \| 'floating' \| 'fullscreen'` | Display variant |
| `bottomOffset` | `number` | Pixels from bottom (for nav bars) |

---

## 5. Session Handoff

When a customer selects a vehicle on the main site, create a session before redirecting to Bob:

### Creating a Session

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

### Session Data Flow

1. Customer selects vehicle on main site
2. Main site calls Partner API `create_session`
3. Receives `session_token`
4. Redirects to Bob page with `?session=TOKEN`
5. Bob reads token, calls `session-handoff` edge function
6. Vehicle and customer context injected into chat

---

## 6. CSS Customization

### Override via CSS Variables

Bob uses CSS variables that can be overridden in your container:

```css
/* In your stylesheet */
.bob-container {
  --bob-blur-intensity: 2px;    /* Reduce blur */
  --bob-overlay-opacity: 0.05;  /* Lighter overlay */
  --bob-primary-color: #0052cc; /* Match brand blue */
  --bob-accent-color: #ff8c00;  /* Orange for highlights */
}
```

### CSS Isolation

Bob v3.1.5 uses aggressive CSS isolation via `.bob-widget-root`:

```css
.bob-widget-root {
  isolation: isolate;
  all: initial;
  contain: layout style;
  /* All internal styles scoped */
}
```

This prevents host site styles from bleeding into Bob and vice versa.

---

## 7. Bob's Behaviour Guidelines

### Personality & Voice

Bob is a friendly, knowledgeable Kiwi auto parts expert with a relaxed, helpful tone.

| Expression | Meaning | When to Use |
|------------|---------|-------------|
| "Sweet as" | All good, perfect | Confirming something |
| "Mate" | Friendly address | Throughout conversation |
| "Choice" | Excellent | When something is good |
| "Chur" | Thanks/Cool | Quick acknowledgment |
| "She'll be right" | It'll be fine | Reassurance |
| "Yeah nah" | No | Gentle decline |
| "Away laughing" | Sorted, good to go | After solving a problem |

### Response Length Guidelines

| Situation | Response Style |
|-----------|----------------|
| No vehicle identified yet | SHORT - 1-2 sentences max |
| Vehicle confirmed | Can be slightly longer |
| Product recommendation | 2-3 sentences + point to shelf |
| Checkout/cart | Brief confirmation |

### Vehicle Identification Workflow

1. **REGO (License Plate)** - Primary identifier, gives exact match
2. **Make + Model + Year + Engine CC** - Fallback when no REGO

```
First ask: "What's your rego, mate?"
If no rego: "No worries - what make, model, and year is she?"
If needed: "What's the engine size? 1.8L, 2.0L...?"
```

### Product Recommendations - Golden Rules

1. **NEVER recommend cheapest first** - Lowest margin, lowest quality
2. **Lead with mid-priced "best value"** option
3. **Max 2-3 products mentioned verbally** - Let the shelf show the rest
4. **ONLY recommend products from retrieve_parts results** - Never hallucinate brands

### Cart & Checkout Rules (CRITICAL)

- **NEVER add to cart** unless customer explicitly says:
  - "add to cart", "I'll take it", "buy it", "yes please"
- If customer says "that one" or "the first one", **confirm WHICH product** before adding
- **NEVER claim to add products without calling add_to_cart tool**

### Things Bob NEVER Does

| Never Do | Why |
|----------|-----|
| Offer to fit parts | CARFIX only sells parts - DIY or workshop fitment |
| Mention stock status | All displayed parts are in stock |
| List more than 3 products verbally | Let the shelf do the work |
| Recommend cheapest option first | Low margin, low quality perception |
| Hallucinate brands or products | Only recommend from actual tool results |
| Add to cart without explicit request | Customer must say "add", "buy", "take it" |

### Anti-Hallucination Rules

1. **ONLY mention products that appear in tool responses**
2. If no tool returned products, **DO NOT invent alternatives**
3. If search fails or returns empty, say: "I don't have that in my system right now"
4. **NEVER recommend brands, SKUs, or prices** not retrieved from tools
5. **NEVER fabricate product names** like "Best Value wipers"

---

## 8. API Reference

### Exported Components

```tsx
// Main components
import { 
  BobStandalone,     // v3.1.5 recommended entry point
  BobWidget,         // Self-contained widget
  Bob,               // Core Bob component (needs BobProvider)
  BobProvider,       // Context provider
  BobCharacter,      // Animated character
  ChatInterface,     // Chat UI
  SwipeableBob,      // Gesture wrapper
  ProductTile,       // Product display
  MatrixProductLoader, // Loading animation
  SparkDealBanner,   // Promo banners
  BobDebugOverlay,   // Debug diagnostics
} from '@gymmymac/bob-widget';
```

### Exported Hooks

```tsx
import {
  useBobContext,        // Access Bob's full context
  useHostContext,       // Access host-provided context
  useBobCallbacks,      // Access callback functions
  useBobChat,           // Chat functionality
  useBobAnimation,      // Animation control
  useSpeechSynthesis,   // TTS control
  useSpeechRecognition, // Speech input
  usePartnerConfig,     // Partner configuration
  useBobHealthCheck,    // Connectivity verification
} from '@gymmymac/bob-widget';
```

### Exported Types

```tsx
import type {
  HostContext,
  BobConfig,
  HostApiConfig,
  BobCallbacks,
  Vehicle,
  Product,
  CartItem,
  ServicePackage,
  PartnerConfig,
  StandaloneWidgetProps,
} from '@gymmymac/bob-widget';
```

---

## 9. Troubleshooting

### Debug Mode

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

### Console Verification

Open browser DevTools (F12) and check the console. You should see:

```
[BobWidget] Package loaded - v3.1.5
[BobStandalone] Initialized { version: "3.1.5", partner: "CARFIX", session: "present" }
[BobWidget] Loading partner config for: CARFIX
[BobWidget] Partner config loaded: { partner: "CARFIX", bottomOffset: 72, ... }
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Old version showing in console | Clear `node_modules/.vite`, restart dev server |
| Blank screen | Check console for errors, verify partner code |
| "Partner not found" error | Ensure `bob_partners` table has entry |
| No products loading | Verify vehicle_id is numeric in session token |
| Version mismatch | Run `npm ls @gymmymac/bob-widget` to check version |
| Bob doesn't appear / is cropped | Check parent containers for `overflow: hidden` |
| Service packages not showing | Check `calculate-service-bundles` response in Network tab |
| Blur/overlay too strong | Use props or CSS variables to adjust |
| PTT not working | Ensure HTTPS connection (required for Web Speech API) |

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

## 10. CARFIX Cleanup & Upgrade

### Overview

Upgrading to Bob v3.1.5 requires a forensic cleanup to ensure no legacy configurations interfere with the standalone architecture.

### Phase 1: Forensic Detection

Before installation, check for these patterns in your codebase:

| Pattern | Files to Check |
|---------|----------------|
| Bob components | `**/Bob*.tsx`, `**/AskBob*.tsx`, `**/*bob*.tsx` |
| Bob hooks | `**/useBob*.ts`, `**/useBob*.tsx` |
| Type definitions | `**/bob*.d.ts` |
| Environment variables | `.env*` containing `BOB_` |
| Import statements | Files with `from '@gymmymac/bob-widget'` or `from 'bob-widget'` |
| Cached packages | `node_modules/@gymmymac`, `node_modules/.vite`, `.next/cache` |

### Phase 2: Forensic Cleanup Script

Run this script to detect and clean previous installations:

```bash
#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════"
echo "  CARFIX: Bob Widget v3.1.5 Forensic Cleanup"
echo "═══════════════════════════════════════════════════"

# Phase 1: Detection
echo ""
echo "Phase 1: Detecting previous Bob installations..."
BOB_TRACES_FOUND=false

if npm ls @gymmymac/bob-widget 2>/dev/null; then
  echo "  ✗ Package @gymmymac/bob-widget found"
  BOB_TRACES_FOUND=true
fi

if find . -path ./node_modules -prune -o \( -name "Bob*.tsx" -o -name "useBob*.ts" \) -print 2>/dev/null | grep -q .; then
  echo "  ✗ Bob component/hook files detected"
  BOB_TRACES_FOUND=true
fi

if grep -r "BOB_SUPABASE" .env* 2>/dev/null; then
  echo "  ✗ Legacy BOB_ environment variables found"
  BOB_TRACES_FOUND=true
fi

if [ "$BOB_TRACES_FOUND" = false ]; then
  echo "  ✓ No previous installation detected"
fi

# Phase 2: Cleanup
if [ "$BOB_TRACES_FOUND" = true ]; then
  echo ""
  echo "Phase 2: Forensic cleanup..."
  
  echo "  → Uninstalling old package..."
  npm uninstall @gymmymac/bob-widget 2>/dev/null || true
  
  echo "  → Removing node_modules..."
  rm -rf node_modules
  
  echo "  → Clearing caches..."
  rm -rf node_modules/.vite node_modules/.cache .next/cache .vite dist
  
  echo "  → Removing lock file..."
  rm -f package-lock.json
  
  echo "  → Cleaning npm cache..."
  npm cache clean --force
  
  echo "  → Reinstalling dependencies..."
  npm install
fi

# Phase 3: Install Bob
echo ""
echo "Phase 3: Installing Bob v3.1.5..."
npm install @gymmymac/bob-widget@3.1.5

# Phase 4: Verification
echo ""
echo "Phase 4: Verification..."
npm ls @gymmymac/bob-widget

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✓ Installation complete!"
echo "═══════════════════════════════════════════════════"
```

### Phase 3: Environment Criteria

| Requirement | Check | Notes |
|-------------|-------|-------|
| Node.js | v18+ | Modern ESM support required |
| React | ^18.0.0 | Peer dependency |
| HTTPS | Required for PTT | Web Speech API needs secure context |
| Container height | Calculated | Must account for header + bottom nav |

### Phase 4: Code Cleanup Required

#### 1. Remove Old BobWidget Configuration

```tsx
// ❌ DELETE THIS OLD CODE (v3.0.x style)
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

#### 2. Replace with BobStandalone (v3.1.5)

```tsx
// ✅ NEW CODE (v3.1.5)
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div 
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
      }}
    >
      <BobStandalone
        partner="CARFIX"
        sessionToken={sessionToken}
        onAddToCart={(item) => {
          addToCart({
            productId: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            sku: item.sku,
            brand: item.brand,
            imageUrl: item.image_url,
          });
        }}
        onNavigate={(url) => router.push(url)}
        onCheckout={(url) => window.location.href = url}
      />
    </div>
  );
}

export default AskBobPage;
```

#### 3. Remove Unused State Variables

```tsx
// ❌ DELETE - No longer needed (Bob handles internally)
const [vehicle, setVehicle] = useState(null);
const [parts, setParts] = useState([]);
const [servicePackages, setServicePackages] = useState([]);
```

#### 4. Remove Unused Imports

```tsx
// ❌ DELETE - These callbacks are no longer needed
// onVehicleIdentified, onPartsFound, onServicePackagesFound
```

### Phase 5: Environment Variables Cleanup

**No longer required in CARFIX .env:**

```bash
# ❌ REMOVE THESE - Bob auto-loads from database
BOB_SUPABASE_URL=...
BOB_SUPABASE_KEY=...
BOB_API_BASE_URL=...
BOB_PARTNER_CODE=...
```

### Phase 6: Verification Tests

After installation, verify Bob works correctly:

| Test | Expected Result |
|------|-----------------|
| Console log | `[BobWidget] Package loaded - v3.1.5` |
| Bob visibility | Character fully visible (not cut off at top or bottom) |
| Text chat | Messages send and receive correctly |
| PTT (Push-to-Talk) | Works on HTTPS with microphone permission |
| Vehicle lookup | REGO search returns vehicle results |
| Add to cart | Callback fires with correct product data |
| Service packages | Display correctly for identified vehicle |

### Migration Comparison

| Aspect | v3.0.x | v3.1.5 |
|--------|--------|--------|
| Lines of code | 30+ | 4 |
| Supabase credentials | In props | Auto-loaded |
| API config | In props | Auto-loaded |
| Vehicle state | Host manages | Bob manages |
| Parts state | Host manages | Bob manages |
| Callbacks needed | 10+ | 3 essential |
| Environment variables | 4+ required | None required |
| Bottom offset | 60px | 72px (corrected) |
| Container height | `calc(100dvh - 112px)` | `calc(100dvh - 144px - env(...))` |

---

## 11. Changelog Summary

### v3.1.5 (Current)
- 📦 **Version Sync**: Re-released to sync package.json version with GitHub release tag
- 📐 **Layout Corrections**: Updated CARFIX measurements to 72px header + 72px bottom nav

### v3.1.4
- 📦 **Supabase Bundling**: Removed @supabase/supabase-js from external to prevent "module not found" errors
- 🔒 **HTTPS Validation**: Added programmatic check for PTT - warns users on HTTP connections
- 🔧 **Debug Logging**: Consolidated all internal logs via bobLog utility respecting debug prop

### v3.1.3
- 🎨 **CSS Isolation**: Enhanced with `isolation: isolate` and `all: initial`
- 📐 **Embedded Mode**: Added `embedded` prop for fullscreen variant in host containers

### v3.1.2
- 🔊 **Pre-recorded Audio Clips**: Fixed context property mismatch where `useSpeechSynthesis` was accessing `supabase` instead of `bobSupabase`, causing pre-recorded clips to never play

### v3.1.1
- ⚛️ **React Hooks Order Violation**: Fixed hooks being called after conditional returns
- 🌐 **Allowed Origins**: Added Lovable preview domain support

### v3.1.0
- 🎯 **BobStandalone**: Auto-configures from database - 4 lines to integrate
- 🗄️ **Partner Config System**: All settings in `bob_partners` table
- 🎨 **CSS Variables**: Customizable blur, opacity, colors
- 🔍 **Debug Overlay**: Visual diagnostic tool
- 📦 **Simplified Callbacks**: Only essential callbacks required

### v3.0.x
- 🎭 **SwipeableBob**: Gesture-based interactions
- 🏢 **Multi-Tenant Support**: Configurable looks and animations per tenant
- 🎬 **RAF Animations**: Smooth 60fps animations
- ⚡ **MatrixProductLoader**: Cyberpunk-style loading
- 🔥 **SparkDealBanner**: Animated promotional banners
- 👋 **Returning User Detection**: Personalized greetings

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## Dependencies

Bob Widget v3.1.5 **bundles** its own dependencies. Your project only needs:

| Dependency | Version | Required |
|------------|---------|----------|
| `react` | ^18.0.0 | ✅ Yes |
| `react-dom` | ^18.0.0 | ✅ Yes |
| `@tanstack/react-query` | any | ❌ Optional (bundled) |
| `@supabase/supabase-js` | any | ❌ Optional (bundled) |

---

## Support

If you encounter any issues:

1. Enable debug mode (`debug={true}`)
2. Check browser console for `[BobWidget]` logs
3. Check Network tab for API responses
4. Verify HTTPS for PTT functionality
5. Contact the Bob Widget team with console logs and version info

---

## License

MIT
