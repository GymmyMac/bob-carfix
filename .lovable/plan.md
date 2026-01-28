
# Restructure Bob Installation Documentation - v3.1.9

## Summary

Complete rewrite of the installation documentation to enforce a strict 3-stage sequential process. The current documentation has cleanup and installation intermingled. This update will make each stage distinct, mandatory, and clearly ordered.

---

## The 3-Stage Installation Process

### **STAGE A: Forensic Removal** (Must complete BEFORE Stage B)

Remove every line of Bob-related code from the CARFIX codebase. This is a FULL CODE AUDIT.

**What Gets Removed:**
1. All Bob component files (`Bob*.tsx`, `AskBob*.tsx`, `*bob*.tsx`)
2. All Bob hook files (`useBob*.ts`, `useBob*.tsx`)
3. All Bob type definitions (`bob*.d.ts`)
4. All Bob imports from any file
5. All Bob-related state variables (`vehicle`, `parts`, `servicePackages`)
6. All environment variables containing `BOB_`
7. All cached Bob packages (`node_modules/@gymmymac`, `.vite`, `.next/cache`)
8. The npm package itself

**New Cleanup Script (Enhanced):**
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

**Key Difference**: The script now EXITS with an error if ANY Bob files or imports are found, forcing the developer to manually delete them before continuing. This prevents partial cleanup.

---

### **STAGE B: Page Preparation** (Must complete AFTER Stage A, BEFORE Stage C)

Create the blank page that will host Bob.

**Requirements:**
1. Page must use the standard CARFIX layout (Header + Bottom Navigation)
2. Page must have a container BETWEEN these fixed elements
3. Container must have the correct height calculation

**New Page Template:**

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

**Layout Diagram (Updated):**

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

---

### **STAGE C: Install & Verify** (Must complete AFTER Stage B)

Install Bob and run verification tests.

**Installation Script:**

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

**Final Code Integration:**

```tsx
// pages/ask-bob.tsx - FINAL VERSION after Stage C
import React from 'react';
import { BobStandalone } from '@gymmymac/bob-widget';
import { useCart } from '@/hooks/useCart';  // Your cart hook
import { useRouter } from 'next/router';     // Or your router

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

**Verification Checklist (MANDATORY):**

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

## Files to Modify

| File | Changes |
|------|---------|
| `packages/bob-widget/BOB-DOCUMENTATION.md` | Complete rewrite of Section 10 with 3-stage process |
| `packages/bob-widget/package.json` | Version 3.1.9 |
| `packages/bob-widget/src/version.ts` | Version 3.1.9 |
| `packages/bob-widget/README.md` | Version 3.1.9, emphasize 3-stage process |
| `packages/bob-widget/CHANGELOG.md` | Add 3.1.9 entry with documentation changes |

---

## Memory Update

Store this 3-stage process in memory for future reference:
- **Stage A**: Forensic Removal - Remove ALL Bob code before anything else
- **Stage B**: Page Preparation - Create blank container page with CARFIX layout
- **Stage C**: Install & Verify - Install Bob and run verification tests

---

## Technical Notes

### Why Forensic Removal is Critical

The issues you saw (blur, wrong scale, wrong position) were caused by:
1. Old Bob components still in the codebase with hardcoded blur values
2. Old state management interfering with the new standalone architecture
3. Cached packages serving old versions

The 3-stage process ensures:
1. No old code remains (Stage A)
2. Container is correctly configured (Stage B)
3. Only the new version is installed and verified (Stage C)

### Why the Script Exits on Detection

The enhanced Stage A script EXITS if any Bob files or imports are found. This is intentional:
- Forces manual review of each file
- Prevents automatic deletion of files that might have other code
- Ensures the developer understands what's being removed
- Creates a checkpoint where the developer must confirm removal

### Database Verification (Stage C)

The verification tests confirm:
- Bob connects to its own Supabase instance (`gjoguxzstsihhxvdgpto`)
- Partner config loads from `bob_partners` table
- Animation data loads correctly
- No dependency on CARFIX-side configuration
