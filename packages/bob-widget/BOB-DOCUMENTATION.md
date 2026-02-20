# Bob Widget - Complete Documentation

> **Version:** 3.2.1 | **Last Updated:** February 2026

AI-powered automotive parts assistant widget for seamless integration into partner websites.

---

## 📖 Documentation Map

| Document | What It Covers |
|----------|---------------|
| **This file** | Technical reference: props, API, CSS, troubleshooting, 3-stage install |
| **[README.md](./README.md)** | Quick start, installation, container setup, callbacks |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history |
| **[BOB-COMPLETE-PROCESS-FLOW.md](../../BOB-COMPLETE-PROCESS-FLOW.md)** (project root) | Bob's personality, conversation states, Brain diagnostics, canned speech, customer playbook |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Integration Guide](#3-integration-guide)
4. [Props Reference](#4-props-reference)
5. [Session Handoff](#5-session-handoff)
6. [CSS Customization](#6-css-customization)
7. [Bob's Personality & Behaviour](#7-bobs-personality--behaviour)
8. [API Reference](#8-api-reference)
9. [Troubleshooting](#9-troubleshooting)
10. [CARFIX 3-Stage Installation](#10-carfix-3-stage-installation)

---

## 1. Overview

Bob is a friendly Kiwi auto parts expert that helps customers find the right parts for their vehicles through natural conversation. The widget is designed as a **"black box"** that auto-configures from the database—partners only need to provide a partner code.

### Key Features (v3.1.19)

| Feature | Description |
|---------|-------------|
| **CLI Installer** | 3-stage installation via `npx @gymmymac/bob-widget carfix stage-a\|b\|c` |
| **`--with-layout` Flag** | Stage B can generate CARFIX Header (72px) and BottomNav (72px) components |
| **BobStandalone** | Auto-configures from database - 4 lines to integrate |
| **No Hardcoded Blur** | Background uses CSS variable `--bob-blur-intensity` (default: 0) |
| **Partner Config System** | All settings stored in `bob_partners` table |
| **CSS Variables** | Customizable blur, opacity, colors via CSS |
| **Debug Overlay** | Visual diagnostic tool for troubleshooting |
| **Session Handoff** | Pre-authenticated sessions for vehicle handoff |
| **SwipeableBob** | Gesture-based interactions - swipe Bob away or back |
| **RAF Animations** | Smooth 60fps animations using requestAnimationFrame |
| **HTTPS Validation** | Programmatic check for PTT with user warnings |

---

## 2. Quick Start

> ⚠️ **IMPORTANT: Run the 3-Stage Installer First**
> 
> Bob v3.1.10 includes an executable CLI installer. Do NOT skip this step.
>
> ```bash
> npx @gymmymac/bob-widget carfix stage-a  # Forensic removal
> npx @gymmymac/bob-widget carfix stage-b --target next-pages  # Generate template
> npx @gymmymac/bob-widget carfix stage-c --partner CARFIX  # Install & verify
> ```

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

console.log(`Bob Widget Version: ${getBobVersion()}`); // "3.1.9"
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

### Pre-Installation Checklist

> ⚠️ **MANDATORY: Complete the 3-Stage Installation Process (Section 10) BEFORE proceeding**

1. ✅ Complete **Stage A: Forensic Removal** ([Section 10](#10-carfix-3-stage-installation))
2. ✅ Complete **Stage B: Page Preparation** ([Section 10](#10-carfix-3-stage-installation))
3. ✅ Ensure HTTPS is enabled (required for Push-to-Talk)
4. ✅ Verify Node.js v18+ is installed
5. ✅ Confirm React ^18.0.0 is installed

### Installation (Stage C)

```bash
# Install Bob Widget (Stage C - after completing Stages A and B)
npm install @gymmymac/bob-widget@^3.1.9

# Clear cache after installation
rm -rf node_modules/.vite
npm run dev
```

### Container Requirements

> **CRITICAL: Page Layout Context**
> 
> The Bob container is designed to be placed on a page that **already includes** the CARFIX Header (72px) and Bottom Navigation (72px). Bob's container occupies the space **between** these fixed elements—it does NOT replace them.

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

## 7. Bob's Personality & Behaviour

> **Full reference moved →** See **[BOB-COMPLETE-PROCESS-FLOW.md](../../BOB-COMPLETE-PROCESS-FLOW.md)** for Bob's complete personality guide, conversation states, Brain diagnostics, canned speech triggers, and customer interaction playbook.
>
> This section previously duplicated that content. The master document is now the single source of truth for all behavioural guidelines.

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

## 10. CARFIX 3-Stage Installation

> 🚨 **CRITICAL: Use the CLI Installer**
> 
> Bob v3.1.10 includes an executable CLI for the 3-stage installation process.
>
> ```bash
> # Stage A: Forensic Scan & Purge
> npx @gymmymac/bob-widget carfix stage-a
>
> # Stage B: Generate Page Template
> npx @gymmymac/bob-widget carfix stage-b --target next-pages --output pages/ask-bob.tsx
>
> # Stage C: Install & Verify
> npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
> ```

### Where the Install Files Live

After installation, you can find the scripts in:
```
node_modules/@gymmymac/bob-widget/
├── bin/bob-widget.mjs           # CLI entrypoint
├── BOB-DOCUMENTATION.md         # Full documentation
└── CHANGELOG.md                 # Version history
```

### Why 3 Stages?

> **Must complete BEFORE Stage B**

Remove **every line** of Bob-related code from the CARFIX codebase. This is a FULL CODE AUDIT.

#### What Gets Removed

| Category | Patterns |
|----------|----------|
| Component files | `Bob*.tsx`, `*Bob*.tsx`, `AskBob*.tsx` |
| Hook files | `useBob*.ts`, `useBob*.tsx` |
| Type definitions | `*bob*.d.ts` |
| Imports | Any file with `@gymmymac/bob-widget` or `useBob` |
| State variables | `vehicle`, `parts`, `servicePackages` managed for Bob |
| Environment variables | Any containing `BOB_` |
| Cached packages | `node_modules/@gymmymac`, `.vite`, `.next/cache` |
| The npm package | `@gymmymac/bob-widget` |

#### Stage A Cleanup Script

> ⚠️ **This script EXITS with an error** if any Bob files or imports are found, forcing you to manually delete them. This is intentional.

```bash
#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════════════"
echo "  STAGE A: FORENSIC REMOVAL - Bob Widget Complete Uninstall"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  WARNING: This will remove ALL Bob-related code from your project"
echo ""

# Step 1: Find and list all Bob-related files
echo "Step 1: Scanning for Bob-related files..."
BOB_FILES=$(find . -path ./node_modules -prune -o \( \
  -name "Bob*.tsx" -o \
  -name "*Bob*.tsx" -o \
  -name "AskBob*.tsx" -o \
  -name "useBob*.ts" -o \
  -name "useBob*.tsx" -o \
  -name "*bob*.d.ts" \
\) -print 2>/dev/null | grep -v node_modules || true)

if [ -n "$BOB_FILES" ]; then
  echo "  ✗ Found Bob component/hook files:"
  echo "$BOB_FILES"
  echo ""
  echo "  ACTION REQUIRED: Delete these files manually, then re-run this script."
  exit 1
fi

# Step 2: Check for Bob imports in remaining files
echo "Step 2: Scanning for Bob imports in source files..."
BOB_IMPORTS=$(grep -rl "@gymmymac/bob-widget\|from 'bob-widget'\|useBob\|<Bob\|<BobWidget\|<BobStandalone" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null || true)

if [ -n "$BOB_IMPORTS" ]; then
  echo "  ✗ Found Bob imports in:"
  echo "$BOB_IMPORTS"
  echo ""
  echo "  ACTION REQUIRED: Remove all Bob imports from these files, then re-run this script."
  exit 1
fi

# Step 3: Check for BOB_ environment variables
echo "Step 3: Scanning for legacy environment variables..."
BOB_ENV=$(grep -l "BOB_SUPABASE\|BOB_API\|BOB_PARTNER" .env* 2>/dev/null || true)

if [ -n "$BOB_ENV" ]; then
  echo "  ✗ Found BOB_ variables in:"
  echo "$BOB_ENV"
  echo ""
  echo "  ACTION REQUIRED: Remove all BOB_ variables from these files, then re-run this script."
  exit 1
fi

# Step 4: Uninstall package and clear all caches
echo "Step 4: Uninstalling Bob package..."
npm uninstall @gymmymac/bob-widget 2>/dev/null || true

echo "Step 5: Removing node_modules..."
rm -rf node_modules

echo "Step 6: Clearing all caches..."
rm -rf node_modules/.vite node_modules/.cache .next/cache .vite dist .turbo

echo "Step 7: Removing lock file..."
rm -f package-lock.json

echo "Step 8: Cleaning npm cache..."
npm cache clean --force

echo "Step 9: Reinstalling base dependencies..."
npm install

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✓ STAGE A COMPLETE - Forensic removal successful"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "NEXT: Proceed to STAGE B - Page Preparation"
```

#### Stage A Verification

Before proceeding to Stage B, confirm:

- [ ] Script completed without errors (exit code 0)
- [ ] No `Bob*.tsx` files exist outside node_modules
- [ ] No `useBob*.ts` files exist outside node_modules
- [ ] No `BOB_` environment variables in `.env*` files
- [ ] `npm ls @gymmymac/bob-widget` returns "empty" or not found

---

### STAGE B: Page Preparation

> **Must complete AFTER Stage A, BEFORE Stage C**

Create the blank page that will host Bob. **Do NOT import Bob yet** - that happens in Stage C.

#### CARFIX Layout Components (Required)

Before creating the Bob container, ensure your CARFIX application has:

1. **Fixed Header (72px)** - Fixed to top of viewport
2. **Fixed Bottom Navigation (72px)** - Fixed to bottom of viewport

**If these elements do NOT exist**, you must create them first. The 144px height offset
in the container formula ASSUMES both elements are present.

##### Option A: Use Existing Layout

If your CARFIX app already has a header and bottom nav, confirm their heights:
- Header: Must be exactly 72px
- Bottom Nav: Must be exactly 72px (plus safe-area-inset-bottom on mobile)

##### Option B: Generate Layout Components

Run Stage B with the `--with-layout` flag to generate placeholder components:

```bash
npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout
```

This generates:
- `components/CarfixHeader.tsx` (72px header)
- `components/CarfixBottomNav.tsx` (72px bottom nav)
- `pages/ask-bob.tsx` (complete page with layout)

#### Requirements

1. Page must use the standard CARFIX layout (Header + Bottom Navigation)
2. Page must have a container BETWEEN these fixed elements
3. Container must have the correct height calculation

#### Layout Diagram

```text
┌─────────────────────────────────────────────────────────┐
│                  CARFIX HEADER (72px)                   │  ← Fixed position: top
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                                                         │
│               BOB CONTAINER (Stage B)                   │
│     height: calc(100dvh - 144px - env(...))             │  ← position: relative
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│               BOTTOM NAVIGATION (72px)                  │  ← Fixed position: bottom
│           + env(safe-area-inset-bottom)                 │
└─────────────────────────────────────────────────────────┘
```

#### Stage B Page Template

```tsx
// pages/ask-bob.tsx (or your routing equivalent)
// 
// ⚠️ PREREQUISITES:
// - STAGE A (Forensic Removal) must be complete
// - This file should be EMPTY before starting Stage B
// - Do NOT import Bob yet - that happens in Stage C

import React from 'react';

/**
 * AskBob Page - Bob Widget Container
 * 
 * This page is rendered within the CARFIX layout which provides:
 * - Header: 72px fixed at top
 * - Bottom Navigation: 72px fixed at bottom
 * 
 * The container below fits BETWEEN these elements.
 */
export default function AskBobPage() {
  // Placeholder container - Bob will be installed in Stage C
  return (
    <div 
      id="bob-container"
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#0a1628', // Placeholder background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <p>Bob Container Ready - Proceed to Stage C</p>
    </div>
  );
}
```

#### Stage B Verification

Before proceeding to Stage C, confirm:

- [ ] Page renders within CARFIX layout (header visible at top)
- [ ] Bottom navigation is visible at bottom
- [ ] Container shows placeholder text "Bob Container Ready"
- [ ] Container fills space between header and bottom nav
- [ ] No Bob imports in the file

---

### STAGE C: Install & Verify

> **Must complete AFTER Stage B**

Install Bob and run verification tests.

#### Stage C Installation Script

```bash
#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════════════"
echo "  STAGE C: INSTALL & VERIFY - Bob Widget v3.1.9"
echo "══════════════════════════════════════════════════════════════"

# Check Stage A was completed
if npm ls @gymmymac/bob-widget 2>/dev/null | grep -q "@gymmymac"; then
  echo "  ✗ ERROR: Old Bob package still detected!"
  echo "  ✗ Please complete STAGE A before running Stage C"
  exit 1
fi

# Install Bob
echo ""
echo "Step 1: Installing @gymmymac/bob-widget@3.1.9..."
npm install @gymmymac/bob-widget@3.1.9

# Verify installation
echo ""
echo "Step 2: Verifying installation..."
INSTALLED_VERSION=$(npm ls @gymmymac/bob-widget --depth=0 2>/dev/null | grep "@gymmymac/bob-widget" | sed 's/.*@//')

if [ "$INSTALLED_VERSION" != "3.1.9" ]; then
  echo "  ✗ ERROR: Expected v3.1.9 but found $INSTALLED_VERSION"
  exit 1
fi

echo "  ✓ Package version: $INSTALLED_VERSION"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✓ STAGE C COMPLETE - Bob Widget installed successfully"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "NEXT: Add BobStandalone component to your container and test"
```

#### Final Code Integration

Update your page from Stage B to import and use Bob:

```tsx
// pages/ask-bob.tsx - FINAL VERSION after Stage C
import React from 'react';
import { BobStandalone } from '@gymmymac/bob-widget';
import { useCart } from '@/hooks/useCart';  // Your cart hook
import { useRouter } from 'next/router';     // Or your router

/**
 * AskBob Page - Bob Widget Container
 * 
 * This page is rendered within the CARFIX layout which provides:
 * - Header: 72px fixed at top
 * - Bottom Navigation: 72px fixed at bottom
 * 
 * Bob container height = 100dvh - 144px (header + nav) - safe-area
 */
export default function AskBobPage() {
  const { addToCart } = useCart();
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div 
      id="bob-container"
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
```

#### Stage C Verification Checklist (MANDATORY)

| Test | How to Verify | Expected Result |
|------|---------------|-----------------|
| **Version** | Open browser console | `[BobWidget] Package loaded - v3.1.9` |
| **DB Connection** | Open Network tab, filter `gjoguxzstsihhxvdgpto` | 200 responses from Supabase |
| **Animation Data** | Check console for `[BobWidget]` logs | Animation states loaded (idle, talking, etc.) |
| **Partner Config** | Check Network for `bob_partners` query | CARFIX config returned |
| **Bob Visibility** | Visual check | Bob character fully visible, not cropped |
| **No Blur** | Visual check | Background is NOT blurred (clean backdrop) |
| **Correct Scale** | Visual check | Bob is prominently sized, not tiny |
| **Position** | Visual check | Bob positioned above counter overlay |
| **Chat Input** | Type a message | Message sends and Bob responds |
| **PTT** | Click microphone (HTTPS only) | Speech recognition activates |
| **Vehicle Lookup** | Enter REGO | Vehicle results returned |
| **Add to Cart** | Say "add to cart" | onAddToCart callback fires |

---

### Migration Comparison

| Aspect | Old Process | v3.1.9 3-Stage Process |
|--------|-------------|------------------------|
| Cleanup | Intermingled with install | **Stage A**: Separate, mandatory |
| Page setup | Assumed | **Stage B**: Explicit template |
| Installation | Single step | **Stage C**: With verification |
| Error detection | After issues appear | Script exits on detection |
| Verification | Optional | Mandatory checklist |
| Success rate | Variable | High (issues caught early) |

---

## Dependencies

Bob Widget v3.1.9 **bundles** its own dependencies. Your project only needs:

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
