

# Shelf Talker + Promotions + Brand Affinity System

## Summary

Build a unified **product recommendation engine** that controls how Bob talks about products across all touchpoints -- individual parts, service packages, and conversational mentions. The system has three layers that stack in priority order:

1. **Brand Affinity** (always-on baseline) -- Preferred brands like RDA get a persistent boost everywhere
2. **Promotions** (time-limited override) -- Active deals like "20% off Penrite" temporarily override defaults  
3. **Shelf Talker** (verbal curation) -- Bob recommends ONE product intelligently instead of listing everything

---

## Architecture

```text
                  Admin Panel
                      |
        +-------------+-------------+
        |                           |
  bob_brand_affinity          bob_promotions
  (always-on prefs)         (time-limited deals)
        |                           |
        +-------------+-------------+
                      |
              bob-chat edge function
              (recommendation engine)
                      |
        +-------------+-------------+
        |             |             |
  Tool Result    Display Context  sales_flow
  Summariser     Injection        Prompt Update
  (compress      (verbal          (Shelf Talker
   parts JSON)    strategy)        rules)
```

---

## Layer 1: Brand Affinity Table (`bob_brand_affinity`)

A persistent table that tells Bob which brands CARFIX favours, with context for WHY. This applies **globally** -- not just in parts results, but whenever Bob mentions brakes, rotors, or any category where an affinity brand exists.

| Column | Type | Example |
|---|---|---|
| id | uuid | auto |
| brand | text | "RDA" |
| category | text | "BRAKE ROTORS" (nullable = brand-wide) |
| affinity_level | text | "preferred" / "recommended" / "house_brand" |
| talk_track | text | "RDA rotors are precision-machined in Australia -- they're our go-to for brakes" |
| is_active | boolean | true |
| priority | integer | 10 (higher wins) |
| created_at / updated_at | timestamptz | auto |

**How it differs from Promotions:**
- No `valid_from` / `valid_until` -- always active
- No discount info -- this is about brand preference, not price
- Stacks WITH promotions (a promoted product from a preferred brand gets double emphasis)

**Example rows:**
- brand: "RDA", category: "BRAKE ROTORS", talk_track: "RDA are our pick for rotors -- precision-machined and built to last"
- brand: "RDA", category: "BRAKE DRUMS", talk_track: "RDA drums are solid as -- great heat dissipation"
- brand: "PENRITE", category: null (all Penrite products), talk_track: "Penrite is Aussie-made and one of our most popular oil brands"

---

## Layer 2: Promotions Table (`bob_promotions`)

Time-limited deals that temporarily override the default recommendation.

| Column | Type | Example |
|---|---|---|
| id | uuid | auto |
| title | text | "February Penrite Oil Sale" |
| brand | text | "PENRITE" (nullable) |
| category | text | "ENGINE OIL" (nullable) |
| sku_list | text[] | null (or specific SKUs) |
| discount_percent | numeric | 20 |
| talk_track | text | "We've got 20% off Penrite this month" |
| priority | integer | 20 |
| is_active | boolean | true |
| valid_from | timestamptz | 2026-02-01 |
| valid_until | timestamptz | 2026-02-28 |
| created_at / updated_at | timestamptz | auto |

---

## Layer 3: Shelf Talker (Edge Function + Prompt Update)

### 3a. Tool Result Summarisation

Currently at line ~3059 of `bob-chat/index.ts`, the raw `retrieve_parts` JSON (every field for every part) is passed straight to the LLM. This will be replaced with a compressed summary that:

1. Groups parts by `partslot_description` (category)
2. Within each category, identifies tiers by price range (Economy / Standard / Premium / Performance)
3. Queries `bob_brand_affinity` and `bob_promotions` for active matches
4. Tags the recommended product per category using this priority:
   - Active promotion match (highest priority)
   - Brand affinity match (second)
   - Mid-range branded option (default fallback)
5. Injects a structured summary instead of raw JSON

**Example summary injected as the tool result:**

```text
BRAKE PADS FRONT for your 2022 FORD RANGER (4 options):
- Economy: PROTEX Blue, $62.00
- Standard: BOSCH QuietCast, $89.00
- Premium: RDA GP MAX, $119.00 [CARFIX PREFERRED - RDA are our go-to for brakes]
- Performance: DBA XP650 Ceramic, $149.00

RECOMMENDATION: RDA GP MAX at $119.00
REASON: RDA is a CARFIX preferred brand for brake components
DO NOT list every product. Recommend ONE and close.
```

If a promotion were active on BOSCH this month, it would override:

```text
RECOMMENDATION: BOSCH QuietCast at $89.00 [PROMOTION: 15% off Bosch brakes this month]
```

### 3b. Display Context Enhancement

The existing display context injection (line ~3199) will gain two new blocks:

```text
=== BRAND AFFINITY (ALWAYS ACTIVE) ===
- RDA: Preferred brand for BRAKE ROTORS, BRAKE DRUMS
  Talk track: "RDA are our pick for rotors -- precision-machined and built to last"
- PENRITE: Preferred brand (all categories)
  Talk track: "Penrite is Aussie-made and one of our most popular oil brands"

=== ACTIVE PROMOTION (OVERRIDES DEFAULT) ===
PROMOTION: "February Penrite Oil Sale"
MATCH: Brand "PENRITE" in category "ENGINE OIL"
TALK TRACK: "We've got 20% off Penrite this month"
PRIORITY: Lead with promoted product. If declined, fall back to affinity brand, then CARFIX Value.
```

### 3c. Sales Flow Prompt Update

Add "THE SHELF TALKER" section to the `sales_flow` prompt in `bob_prompts`:

```text
THE SHELF TALKER (HOW TO TALK ABOUT PRODUCTS):

1. NEVER list all products. The shelf shows them visually -- your job is to SELL one.
2. Lead with ONE recommendation using this priority:
   a) Active PROMOTION match (if present in context)
   b) Brand AFFINITY match (if present in context) 
   c) CARFIX VALUE tier (for service packages)
   d) Mid-range branded option (for individual parts)
3. Give a REASON tied to the customer's situation:
   - Helper: "It's the best value for everyday driving"
   - Consultant: "Based on that symptom, you'll want..."
   - Enthusiast: "For towing/performance, this handles..."
4. CLOSE immediately: "Want me to add it?"
5. Acknowledge alternatives: "You've got Economy through Performance on the shelf"
6. If customer asks "what are my options?": Give a 1-line summary per tier, not full specs
7. Brand affinity phrasing: When recommending an affinity brand, use the talk_track naturally
```

---

## Recommendation Priority Hierarchy (Final)

```text
Priority 1: Active Promotion (time-limited, highest priority)
     |
     v  (if no promotion matches)
Priority 2: Brand Affinity (always-on preferred brands)
     |
     v  (if no affinity matches)
Priority 3: CARFIX Value Tier (isRecommended: true for service packs)
     |
     v  (if no CARFIX Value flag)
Priority 4: Mid-range branded option (price-based fallback)
```

---

## Where Brand Affinity Applies (Beyond Parts)

The key difference from promotions: brand affinity is injected into Bob's system context at session start, not just at tool-result time. This means Bob naturally leans into preferred brands in:

- **Conversational mentions**: "For brakes, I'd always go RDA -- they're precision-machined in Australia"
- **Diagnostic recommendations**: When Brain returns "BRAKE ROTORS" as the fix, Bob leads with RDA
- **Service package discussions**: When comparing tiers, Bob highlights tiers containing affinity brands
- **Upsell moments**: "While you're doing the pads, grab the RDA rotors too -- they're our pick"

This is achieved by loading active `bob_brand_affinity` rows at conversation start (alongside prompts) and injecting them as a system message.

---

## Admin Panel Changes

Two new tabs in the existing Admin panel:

### Promotions Tab
- CRUD for `bob_promotions` (title, brand, category, discount, talk track, dates)
- Active/inactive toggle
- Expiry countdown display
- Preview of what Bob would say

### Brand Affinity Tab
- CRUD for `bob_brand_affinity` (brand, category, affinity level, talk track)
- Active/inactive toggle
- Preview of Bob's phrasing

---

## Files Changed

| File | Change |
|---|---|
| **Database** | Create `bob_promotions` table (RLS: admin write, public read) |
| **Database** | Create `bob_brand_affinity` table (RLS: admin write, public read) |
| `supabase/functions/bob-chat/index.ts` | Load brand affinity at session start alongside prompts |
| `supabase/functions/bob-chat/index.ts` | Add tool result summarisation layer (~line 3059) |
| `supabase/functions/bob-chat/index.ts` | Query promotions + affinity at tool-result time, inject override blocks (~line 3154) |
| `bob_prompts` table (DB row) | Update `sales_flow` content with Shelf Talker protocol |
| `src/components/PromotionsManager.tsx` | New admin component for promotions CRUD |
| `src/components/BrandAffinityManager.tsx` | New admin component for brand affinity CRUD |
| `src/pages/Admin.tsx` | Add Promotions and Brand Affinity tabs |
| `BOB-MASTER-PROMPTS-AND-PROCESS-FLOW.md` | Document Shelf Talker, Promotions, and Brand Affinity in Section 5 |
| `packages/bob-widget/src/__tests__/bobV2DirectorModes.test.ts` | Add tests: "Bob recommends one product", "Bob uses brand affinity talk track", "Bob leads with promotion when active" |

---

## Example Scenarios

**Scenario A: RDA Affinity, No Promotion**
- Customer: "I need front brake pads for my Ranger"
- Bob: "Sweet -- I've loaded the brake pads for your Ranger. I'd go with the RDA GP MAX at $119 -- RDA are precision-machined and our go-to for brakes. Want me to add them?"

**Scenario B: Penrite Promotion Active + Penrite Affinity**
- Customer: "Need an oil change for my Hilux"
- Bob: "Choice timing -- we've got 20% off Penrite this month. The HPR 5 is a top drop for your Hilux at $42. Want me to add it?"

**Scenario C: No Affinity or Promotion for Category**
- Customer: "Need wiper blades"
- Bob: "I've loaded the wipers for your car. The Bosch Aerotwin at $35 is a solid pick -- quiet and lasts well. Add it?"

**Scenario D: Consultant Mode + RDA Affinity**
- Customer: "My brakes are squealing"
- Bob diagnoses via Brain tool, gets "BRAKE PADS FRONT"
- Bob: "That squealing is your wear indicators -- pads are due. I'd grab the RDA GP MAX pads at $119 and do the rotors at the same time with the Brake Service Pack at $285. Shall I add the pack?"

