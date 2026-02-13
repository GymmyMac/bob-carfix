# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for partner websites.

**Current Version:** 3.1.19 | **36 unit tests** | **8+ E2E scenarios** | Production-ready

---

## 🚨 STOP — RUN THE INSTALLER FIRST

Bob v3.1.19 includes an **executable 3-stage installer**. Do NOT skip this step.

```bash
# Stage A: Forensic Scan & Purge (removes old Bob code)
npx @gymmymac/bob-widget carfix stage-a

# Stage B: Generate Page Template (creates container)
npx @gymmymac/bob-widget carfix stage-b --target next-pages --output pages/ask-bob.tsx

# Stage C: Install & Verify (installs Bob + tests backend)
npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
```

---

## 1. Peer Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

> `@supabase/supabase-js` and `@tanstack/react-query` are bundled — no action needed.  
> If CARFIX already uses `@tanstack/react-query`, ensure v5+ compatibility.

---

## 2. Minimal Integration (4 Lines)

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
        bottomOffset={0}
        zIndexBase={100}
        onAddToCart={async (item) => await carfixCart.add(item)}
        onNavigate={(url) => router.push(url)}
        onCheckout={(checkoutUrl) => window.location.href = checkoutUrl}
        onError={(error) => console.error('[Bob Error]', error)}
      />
    </div>
  );
}
```

> **Auto-configuration:** `partner="CARFIX"` loads all API URLs, credentials, layout defaults, and feature flags from the `bob_partners` database table. No manual config needed.

---

## 3. CARFIX API Configuration (Already in Database)

```json
{
  "baseUrl": "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1",
  "apiKey": "(anon key — auto-loaded)",
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

## 4. Layout Constraints

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

## 5. Callback Signatures

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

## 6. Bundle Discount Fields (NEW)

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
  savingsAmount?: number;        // Dollar savings
  bundleDiscountPercentage?: number; // Discount % (0–50)

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
  perCarQty: number;
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

## 7. Session Handoff (Pre-authenticated Users)

```
1. CARFIX calls partner-api: { action: "create_session", vehicle_id: 42899 }
   → vehicle_id MUST be a NUMBER (not string)
   → Returns: { session_token: "abc123..." }

2. Redirect to: /ask-bob?session=abc123...

3. BobStandalone reads sessionToken → resolves vehicle + customer context
```

> **Critical:** `vehicle_id` must be numeric throughout the pipeline. String values cause silent API failures.

---

## 8. Design Tokens

Exported from the package for use on CARFIX pages that mirror Bob's styling:

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

### Tier Visual Config

| Tier | Color | Background | Badge |
|---|---|---|---|
| Economy | `#475569` | `#F1F5F9` | 💰 |
| Standard | `#0052CC` | `rgba(0,82,204,0.1)` | ⭐ CARFIX Value |
| Premium | `#D97706` | `#FEF3C7` | 🏆 |
| Performance | `#DC2626` | `#FEE2E2` | ⚡ |

---

## 9. Exported Types (Full List)

```typescript
// Components
export { BobStandalone } from '@gymmymac/bob-widget';
export type { StandaloneWidgetProps } from '@gymmymac/bob-widget';

// Types
export type {
  HostContext, HostUserContext, HostVehicleContext, HostCartContext,
  BobConfig, HostApiConfig, BobCallbacks, BobProviderConfig, BobLayoutConfig,
  Product, CartItem, ServicePackage, PreparedTier, PreparedTierProduct, PreparedTierBrand,
  Partslot, QualityTiers, Part,
  PartnerConfig, PartnerFeatureFlags, EssentialCallbacks,
  Vehicle, Message, HighlightedProduct,
  BobAnalyticsEvent, BobGA4Config,
} from '@gymmymac/bob-widget';
```

---

## 10. Post-Install Verification Checklist

```
□ npm install completes without peer dependency warnings
□ BobStandalone renders loading spinner, then Bob appears
□ Bob character sits between header (72px) and bottom nav (72px)
□ Chat drawer opens above bottom navigation (z-index check)
□ PTT button is visible and not clipped
□ Vehicle lookup works (try rego: HZP550)
□ Service packages appear with tier cards
□ Bundle discount shows Was/Now pricing where applicable
□ "Add to Cart" callback fires with correct item shape
□ Session handoff works (pass ?session=TOKEN)
□ No console errors (filter for [Bob)
□ Mobile: safe-area-inset respected on notched devices
```

---

## 11. Test Baseline

Bob ships with **36 unit tests** and **8+ E2E scenarios** covering:

- Callback mapping and stability
- Tier validation and empty states
- Rear Brake Disc/Drum filter logic
- Bundle discount display and cart pricing
- Vehicle lookup flow
- Service package rendering

Run locally: `cd packages/bob-widget && npx vitest run`

---

## 📖 Additional Documentation

| Document | Description |
|----------|-------------|
| **[BOB-DOCUMENTATION.md](./BOB-DOCUMENTATION.md)** | Complete integration guide with troubleshooting |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes |
| **[install/carfix/](./install/carfix/)** | Installer scripts, templates, and verification checklists |

---

## Support

For integration issues, the Bob team needs:
1. Browser console output (filter for `[Bob`)
2. Network tab showing failed API calls
3. Screenshot of layout issue
4. Device / browser / viewport info

## License

MIT
