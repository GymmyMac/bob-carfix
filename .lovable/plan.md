

# Fix Stage B Instructions: Add CARFIX Header & Bottom Navigation Preparation

## Problem Summary

The CARFIX team followed the 3-stage installation process, but the instructions for **Stage B** failed to provide:
1. **Code for the CARFIX Header** (72px fixed at top)
2. **Code for the Bottom Navigation** (72px fixed at bottom)
3. **Clear explanation** that the 144px height calculation assumes these elements exist

The documentation says "Page must use the standard CARFIX layout (Header + Bottom Navigation)" but never explains how to create them or what they should look like.

---

## Solution: Enhanced Stage B with Full Layout Components

### What We'll Add

| File | Changes |
|------|---------|
| `packages/bob-widget/BOB-DOCUMENTATION.md` | Add "CARFIX Layout Components" section with Header and BottomNav code |
| `packages/bob-widget/bin/bob-widget.mjs` | Update Stage B template to include optional `--with-layout` flag that generates full page with header/nav |
| `packages/bob-widget/install/carfix/00-README-PREINSTALL.md` | Add prerequisite note about layout components |

---

## Technical Details

### 1. CARFIX Header Component (72px)

```tsx
// components/CarfixHeader.tsx
export function CarfixHeader() {
  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '72px',
        backgroundColor: '#0052CC', // CARFIX Royal Blue
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/carfix-logo.svg" alt="CARFIX" style={{ height: '40px' }} />
        <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>CARFIX</span>
      </div>
      <nav style={{ display: 'flex', gap: '16px' }}>
        {/* Navigation items */}
      </nav>
    </header>
  );
}
```

### 2. CARFIX Bottom Navigation Component (72px)

```tsx
// components/CarfixBottomNav.tsx
export function CarfixBottomNav() {
  return (
    <nav 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '72px',
        backgroundColor: '#0F172A', // CARFIX Deep Navy
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 16px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        zIndex: 50,
      }}
    >
      <button>Home</button>
      <button>Search</button>
      <button>Cart</button>
      <button>Account</button>
    </nav>
  );
}
```

### 3. Complete Page Layout Template

```tsx
// pages/ask-bob.tsx - COMPLETE LAYOUT
import React from 'react';
import { CarfixHeader } from '@/components/CarfixHeader';
import { CarfixBottomNav } from '@/components/CarfixBottomNav';

export default function AskBobPage() {
  return (
    <>
      {/* CARFIX Header - 72px fixed at top */}
      <CarfixHeader />
      
      {/* Bob Container - fills space between header and nav */}
      <main
        style={{
          marginTop: '72px', // Push below fixed header
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <p>Bob Container Ready - Proceed to Stage C</p>
      </main>
      
      {/* CARFIX Bottom Navigation - 72px fixed at bottom */}
      <CarfixBottomNav />
    </>
  );
}
```

---

## Updated CLI Template Generator

Add a `--with-layout` flag to Stage B:

```bash
# Without layout (current behavior - assumes layout exists)
npx @gymmymac/bob-widget carfix stage-b --target next-pages

# With full layout (new option - generates header/nav too)
npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout
```

---

## Updated Documentation Structure

### New Section in BOB-DOCUMENTATION.md (before Stage B template)

```markdown
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
Run Stage B with the --with-layout flag to generate placeholder components:

\`\`\`bash
npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout
\`\`\`

This generates:
- \`components/CarfixHeader.tsx\` (72px header)
- \`components/CarfixBottomNav.tsx\` (72px bottom nav)
- \`pages/ask-bob.tsx\` (complete page with layout)
```

---

## Demo Route for This Repo

Add an `/ask-bob` route to the demo repo that includes a mock CARFIX layout so you can test Bob properly:

```tsx
// src/pages/AskBob.tsx
import { BobStandalone } from '../packages/bob-widget/src';

function MockCarfixHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[72px] bg-[#0052CC] flex items-center px-4 z-50">
      <span className="text-white text-xl font-bold">CARFIX Demo</span>
    </header>
  );
}

function MockCarfixBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#0F172A] flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom)]">
      <button className="text-white">Home</button>
      <button className="text-white">Search</button>
      <button className="text-white">Cart</button>
    </nav>
  );
}

export default function AskBobPage() {
  return (
    <>
      <MockCarfixHeader />
      <main
        className="mt-[72px]"
        style={{
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BobStandalone
          partner="CARFIX"
          sessionToken=""
          onAddToCart={(item) => console.log('Add to cart:', item)}
          onNavigate={(url) => console.log('Navigate:', url)}
        />
      </main>
      <MockCarfixBottomNav />
    </>
  );
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `packages/bob-widget/BOB-DOCUMENTATION.md` | Add "CARFIX Layout Components" section before Stage B template |
| `packages/bob-widget/bin/bob-widget.mjs` | Add `--with-layout` flag to Stage B, generate header/nav components |
| `packages/bob-widget/install/carfix/00-README-PREINSTALL.md` | Add note: "Ensure CARFIX Header (72px) and Bottom Nav (72px) exist or use --with-layout" |
| `src/pages/AskBob.tsx` | Create demo route with mock CARFIX layout |
| `src/App.tsx` | Add route for `/ask-bob` |

---

## Version Bump

This is a documentation/CLI enhancement - bump to **v3.1.11** with CHANGELOG entry:

```markdown
## [3.1.11] - 2025-01-28

### Added
- Stage B: New `--with-layout` flag generates CARFIX Header and Bottom Navigation components
- Documentation: Added "CARFIX Layout Components" section explaining 72px header + 72px nav requirement

### Fixed
- Clarified that Stage B requires existing layout OR use of `--with-layout` flag
- Added mock CARFIX layout to demo repo for testing
```

