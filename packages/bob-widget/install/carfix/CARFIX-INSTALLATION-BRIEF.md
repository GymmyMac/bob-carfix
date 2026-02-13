# Bob Widget — CARFIX Installation Brief

**Package:** `@gymmymac/bob-widget@3.1.19`  
**Date:** 2026-02-13  
**Status:** Production-ready, 36 unit tests passing, E2E baseline locked

---

## 1. Peer Dependencies (Critical for Build)

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "dependencies (bundled — no action needed)": {
    "@supabase/supabase-js": "^2.84.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

> If CARFIX already uses `@tanstack/react-query`, ensure versions are compatible (v5+).

---

## 2. Installation

```bash
npm install @gymmymac/bob-widget@latest
```

---

## 3. Minimal Integration (4 lines)

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

function AskBobPage() {
  const router = useRouter();
  const sessionToken = router.query.session as string;

  return (
    <div style={{
      height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
      position: 'relative',
      /* DO NOT use overflow: hidden — clips PTT button and chat drawer */
    }}>
      <BobStandalone
        partner="CARFIX"
        sessionToken={sessionToken}
        bottomOffset={0}       /* Container already handles spacing */
        zIndexBase={100}       /* Above header z-40 and nav z-30 */
        onAddToCart={async (item) => {
          // See Section 6 for full item shape including bundle metadata
          await carfixCart.add(item);
        }}
        onNavigate={(url) => router.push(url)}
        onCheckout={(checkoutUrl) => window.location.href = checkoutUrl}
        onError={(error) => console.error('[Bob Error]', error)}
      />
    </div>
  );
}
```

> **Auto-configuration:** The `partner="CARFIX"` prop loads all API URLs, credentials, layout defaults, and feature flags from the `bob_partners` database table. No manual config needed.

---

## 4. CARFIX API Configuration (Already in Database)

```json
{
  "baseUrl": "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1",
  "apiKey": "eyJhbGciOiJIUzI1NiIs...wKoJ51_VPro_BrJz-A-NRpSmUW0XBP-7TJJcrhvYwxE",
  "partnerCode": "CARFIX"
}
```

### Available Endpoints

| Endpoint | Purpose |
|---|---|
| `partner-api` | Session creation, cart, user context, orders |
| `calculate-service-bundles` | Service packs with `preparedTiers[]` (incl. bundle discounts) |
| `retrieve-vehicle-info` | NZ rego lookup |
| `retrieve-parts` | Vehicle parts by category |

---

## 5. Layout Constraints

```
┌──────────────────────────────┐
│  CARFIX Header (72px, z-40)  │
├──────────────────────────────┤
│                              │
│  Bob Container               │
│  height: calc(100dvh - 144px │
│          - safe-area-inset)  │
│  position: relative          │
│  NO overflow: hidden!        │
│                              │
├──────────────────────────────┤
│  Bottom Nav (72px, z-30)     │
└──────────────────────────────┘
```

**Bob's internal z-index stack (relative to `zIndexBase={100}`):**

| Layer | z-index |
|---|---|
| Chat PTT Button | 145 |
| Chat Drawer | 130 |
| Counter Overlay | 70 |
| Bob Character | 60 |
| Product Shelf | 55 |
| Backdrop | 10 |

---

## 6. Callback Signatures

### onAddToCart

```typescript
onAddToCart: (item: {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;       // Final price (discount already applied for bundle items)
  sku?: string;
  brand?: string;
  image_url?: string;
  vehicle_id?: string;
  // Bundle metadata (present when item is part of a service package)
  is_bundle_item?: boolean;
  bundle_discount_percentage?: number;
  service_package_name?: string;
  service_package_id?: string;
  quality_tier?: string;    // "Economy" | "Standard" | "Premium" | "Performance"
}) => Promise<void> | void;
```

### onNavigate

```typescript
onNavigate: (url: string) => void;
// Example urls: "/product/SKU123", "/checkout"
```

### onCheckout

```typescript
onCheckout: (checkoutUrl: string) => void;
// checkoutUrl is a full Stripe payment URL
```

### onError

```typescript
onError: (error: Error) => void;
// Bob shows toast by default — this is for host-side logging
```

---

## 7. Bundle Discount Fields (NEW)

The `calculate-service-bundles` API returns these fields per `PreparedTier`:

```typescript
interface PreparedTier {
  tierName: string;              // "Economy" | "Standard" | "Premium" | "Performance"
  displayName: string;
  description: string;
  isRecommended: boolean;        // true = CARFIX Value tier
  isHidden: boolean;             // true = filter out (duplicate price)
  
  // Pricing (pre-calculated by API — never recompute)
  totalPrice: number;            // Discounted bundle price
  originalTotalPrice?: number;   // Full price before discount
  savingsAmount?: number;        // Dollar savings (originalTotalPrice - totalPrice)
  bundleDiscountPercentage?: number; // Discount % applied (0-50)
  
  productCount: number;
  dominantBrand: string | null;
  brands: PreparedTierBrand[];
  products: PreparedTierProduct[];
}

interface PreparedTierProduct {
  partslotId: number;
  partslotName: string;          // "BRAKE PADS FRONT"
  sku: string;
  name: string;
  brand: string;
  brandFullName: string;
  brandImageUrl: string;         // Full URL — use directly in <img>
  productImageUrl: string;       // Full URL — use directly in <img>
  price: number;                 // Legacy unit price
  unitPrice: number;             // Per-unit price
  displayPrice: number;          // Total (unitPrice × perCarQty) — USE THIS
  isRotor: boolean;              // Show "[Pair]" badge
  isMultiQty: boolean;           // Show quantity breakdown (e.g. spark plugs)
  perCarQty: number;             // Quantity needed
  partNumber: string | null;
  webDescription: string | null;
  viscosity: string | null;
  volume: number | null;
}

interface PreparedTierBrand {
  name: string;
  fullName: string;
  imageUrl: string;              // Full URL
}
```

### Rendering Rules

1. **Filter hidden tiers:** `preparedTiers.filter(t => !t.isHidden)`
2. **When `savingsAmount > 0`:** Show ~~$originalTotalPrice~~ → **$totalPrice** + "SAVE $XX — X% Bundle Deal"
3. **When `savingsAmount === 0`:** Show `totalPrice` normally, no discount UI
4. **Use `displayPrice`** for individual products (already includes quantity)
5. **Never calculate prices client-side** — all values arrive pre-calculated

---

## 8. Session Handoff (Pre-authenticated Users)

To pass vehicle/customer context from CARFIX to Bob:

```
1. CARFIX calls partner-api with action: "create_session"
   → Body: { vehicle_id: 42899 }   ← MUST be a NUMBER
   → Returns: { session_token: "abc123..." }

2. Redirect to Bob page: /ask-bob?session=abc123...

3. BobStandalone reads sessionToken from URL
   → Calls session-handoff edge function
   → Injects vehicle + customer context into chat
```

> **Critical:** `vehicle_id` must be numeric throughout the pipeline. String values cause silent API failures.

---

## 9. Design Tokens

The full design token file is exported from the package:

```typescript
import {
  CARFIX_COLORS,
  QUALITY_TIER_CONFIG,
  IMAGE_URLS,
  BADGE_CONFIG,
  TYPOGRAPHY,
  isRotorProduct,
  getDisplayPrice,
  formatNZD,
} from '@gymmymac/bob-widget';
```

### Key Colors

| Token | Value | Usage |
|---|---|---|
| `primary` | `#0052CC` | Standard tier, CTAs, CARFIX Value |
| `secondary` | `#38BDF8` | Accents, links |
| `accent` | `#FF8C00` | Premium tier |
| `success` | `#22C55E` | "Fits Vehicle" badges, Add to Cart |
| `destructive` | `#EF4444` | Performance tier |
| `foreground` | `#0F172A` | Headers, primary text |
| `mutedForeground` | `#64748B` | Descriptions |

### Tier Visual Config

| Tier | Color | Badge |
|---|---|---|
| Economy | `#475569` on `#F1F5F9` | 💰 |
| Standard | `#0052CC` on `rgba(0,82,204,0.1)` | ⭐ CARFIX Value |
| Premium | `#D97706` on `#FEF3C7` | 🏆 |
| Performance | `#DC2626` on `#FEE2E2` | ⚡ |

---

## 10. Exported Types (Full List)

```typescript
// Core widget components
export { BobStandalone } from '@gymmymac/bob-widget';
export type { StandaloneWidgetProps } from '@gymmymac/bob-widget';

// Types available for CARFIX integration
export type {
  // Context & Config
  HostContext, HostUserContext, HostVehicleContext, HostCartContext,
  BobConfig, HostApiConfig, BobCallbacks, BobProviderConfig, BobLayoutConfig,
  
  // Products & Packages
  Product, CartItem, ServicePackage, PreparedTier, PreparedTierProduct, PreparedTierBrand,
  Partslot, QualityTiers, Part,
  
  // Partner
  PartnerConfig, PartnerFeatureFlags, EssentialCallbacks,
  
  // Vehicle
  Vehicle,
  
  // Messages
  Message, HighlightedProduct,
  
  // Analytics
  BobAnalyticsEvent, BobGA4Config,
} from '@gymmymac/bob-widget';
```

---

## 11. Verification Checklist (Post-Install)

```
□ npm install completes without peer dependency warnings
□ BobStandalone renders loading spinner, then Bob appears
□ Bob character sits between header and bottom nav
□ Chat drawer opens above bottom navigation (z-index check)
□ PTT button is visible and not clipped
□ Vehicle lookup works (try rego: HZP550)
□ Service packages appear with tier cards
□ Bundle discount shows Was/Now pricing where applicable
□ "Add to Cart" callback fires with correct item shape
□ Session handoff works (pass ?session=TOKEN)
□ No console errors related to Bob
□ Mobile: safe-area-inset respected on notched devices
```

---

## 12. Test Baseline

Bob ships with **36 unit tests** and **8+ E2E scenarios** covering:

- Callback mapping and stability
- Tier validation and empty states
- Rear Brake Disc/Drum filter logic
- Bundle discount display and cart pricing
- Vehicle lookup flow
- Service package rendering
- Chat drawer positioning

Run locally: `cd packages/bob-widget && npx vitest run`

---

## Support

For integration issues, the Bob team needs:
1. Browser console output (filter for `[Bob`)
2. Network tab showing failed API calls
3. Screenshot of layout issue
4. Device/browser/viewport info
