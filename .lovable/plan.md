

# Update CARFIX Installation Guide to v3.1.5

## Summary

Update `BOB-DOCUMENTATION.md` with corrected layout measurements based on actual CARFIX component analysis, v3.1.5 version references, and an expanded forensic cleanup/installation section.

---

## Key Changes

### 1. Version Updates Throughout

| Location | Current | Update To |
|----------|---------|-----------|
| Header version | 3.1.2 | 3.1.5 |
| Installation command | `@^3.1.2` | `@^3.1.5` |
| Console log examples | v3.1.0 | v3.1.5 |
| Cleanup section | v3.1.0 | v3.1.5 |
| Changelog summary | v3.1.2 (Current) | v3.1.5 (Current) |

---

### 2. Corrected CARFIX Layout Measurements

**Current (Incorrect):**
- Header: ~52px
- Bottom Navigation: ~60px
- Total: ~112px

**Updated (Based on BottomNavigation.tsx Analysis):**
- Header: 72px
- Bottom Navigation: 72px (56px button + 16px padding)
- Safe Area Buffer: `env(safe-area-inset-bottom, 0px)` for notched devices
- Total: 144px + safe area

**New Container Formula:**
```css
height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))
```

---

### 3. Updated Layout Diagram

```text
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

---

### 4. Expanded CARFIX Cleanup & Upgrade Section (Section 10)

Replace the current cleanup section with a comprehensive process:

#### Phase 1: Forensic Detection
Add file pattern detection checklist:
- `**/Bob*.tsx`, `**/AskBob*.tsx`, `**/*bob*.tsx`
- `**/useBob*.ts`, `**/useBob*.tsx`
- `**/bob*.d.ts`
- `.env*` containing `BOB_`
- Files with `from '@gymmymac/bob-widget'` or `from 'bob-widget'`
- `node_modules/@gymmymac`, `node_modules/.vite`, `.next/cache`

#### Phase 2: Forensic Cleanup Script
```bash
#!/bin/bash
set -e

echo "Phase 1: Detecting previous Bob installations..."
BOB_TRACES_FOUND=false

if npm ls @gymmymac/bob-widget 2>/dev/null; then
  echo "  ✗ Package found"
  BOB_TRACES_FOUND=true
fi

if find . -name "Bob*.tsx" -o -name "useBob*.ts" 2>/dev/null | grep -q .; then
  echo "  ✗ Bob component/hook files detected"
  BOB_TRACES_FOUND=true
fi

if [ "$BOB_TRACES_FOUND" = true ]; then
  echo "Phase 2: Forensic cleanup..."
  npm uninstall @gymmymac/bob-widget 2>/dev/null || true
  rm -rf node_modules
  rm -rf node_modules/.vite node_modules/.cache .next/cache .vite dist
  rm -f package-lock.json
  npm cache clean --force
  npm install
fi

echo "Phase 3: Installing Bob v3.1.5..."
npm install @gymmymac/bob-widget@3.1.5

echo "Phase 4: Verification..."
npm ls @gymmymac/bob-widget
```

#### Phase 3: Environment Criteria
| Requirement | Check | Notes |
|-------------|-------|-------|
| Node.js | v18+ | Modern ESM support |
| React | ^18.0.0 | Peer dependency |
| HTTPS | Required for PTT | Speech recognition needs secure context |

#### Phase 4: Updated Integration Code
```tsx
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
```

#### Phase 5: Verification Tests
- Console shows `[BobWidget] Package loaded - v3.1.5`
- Bob character fully visible (not cut off)
- Text chat works
- PTT works (HTTPS + mic permission)
- Vehicle lookup with REGO returns results
- Add to cart fires callback

---

### 5. Updated Changelog Summary Section

Add v3.1.5 and v3.1.4 entries:

```markdown
### v3.1.5 (Current)
- 📦 **Version Sync**: Re-released to sync package.json version with GitHub release tag

### v3.1.4
- 📦 **Supabase Bundling**: Removed @supabase/supabase-js from external to prevent "module not found" errors
- 🔒 **HTTPS Validation**: Added programmatic check for PTT - warns users on HTTP connections
- 🔧 **Debug Logging**: Consolidated all internal logs via bobLog utility respecting debug prop

### v3.1.3
- 🎨 **CSS Isolation**: Enhanced with isolation: isolate and all: initial
- 📐 **Embedded Mode**: Added embedded prop for fullscreen variant in host containers
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/bob-widget/BOB-DOCUMENTATION.md` | All updates listed above |

---

## Technical Details

### Layout Calculation Breakdown

Based on CARFIX's `BottomNavigation.tsx`:
- `py-2` = 8px top + 8px bottom = 16px total padding
- `min-h-[56px]` = 56px button height
- **Visible height**: 72px
- **Safe area**: `env(safe-area-inset-bottom, 0px)` adds extra on notched devices (iPhone X+)

Based on CARFIX's `Layout.tsx`:
- `pb-20` (80px) is a content buffer, not a height calculation
- Header is 72px fixed

**Final formula**: `calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))`

### bottomOffset Prop Clarification

The `bottomOffset` prop (default: 72) tells Bob's internal components how much space to leave at the bottom for the chat drawer positioning. This is separate from the container height calculation.

