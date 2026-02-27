

# Comprehensive Data Flow Optimization Plan for Bob

## The Problem

The `bob-chat` edge function has grown to **3,832 lines** through iterative fixes. The data flow has accumulated multiple overlapping paths that create redundancy, latency, and data corruption risks. Here's what's happening on a typical KMT21 "I need an oil change" request:

```text
CURRENT FLOW (KMT21 example):

1. REQUEST ARRIVES (0ms)
   ├── Extract REGO from message
   ├── Forced REGO lookup → retrieve-vehicle-info API (~2s)
   │   └── Returns CarJam data + 1 TecDoc match (vehicle_id=26384)
   │
2. DETERMINISTIC FETCH (~2s mark, parallel)
   ├── retrieveParts(26384) ─────────── 500 parts (~13s)
   ├── retrieveServicePackages(26384) ── 9 packages (~14s)
   └── filterDisplayable → 6 packages
   │
3. DB QUERIES (parallel with step 2)
   ├── fetchPromptsFromDB() ── cached after first call
   ├── fetchBrandAffinities() ── cached
   ├── fetchActivePromotions() ── cached
   └── returningCustomerContext (if email, first exchange)
   │
4. SYSTEM PROMPT ASSEMBLY (~14s mark)
   ├── Base identity prompt (from DB)
   ├── Vehicle context block
   ├── Brand affinity block
   ├── Promotion block
   ├── Error handling instructions
   ├── Multi-variant instructions
   └── Returning customer block
   │
5. TOOL CALLING LOOP — Iteration 1 (~14s → ~20s)
   ├── Non-streaming call to Gemini 2.5 Flash
   ├── AI decides to call retrieve_service_packages (REDUNDANT!)
   ├── Guard BLOCKS it ✅ (recent fix)
   ├── AI decides to call lookup_vehicle (REDUNDANT!)
   └── Guard BLOCKS it ✅ (recent fix)
   │
6. TOOL CALLING LOOP — Iteration 2 (~20s → ~26s)
   ├── Another non-streaming call to Gemini
   └── AI returns final text (no more tool calls)
   │
7. DISPLAY CONTEXT INJECTION (~26s mark)
   ├── generateCompactPackageSummary() — builds per-tier product listings
   └── Injects as system message before final streaming call
   │
8. FINAL STREAMING CALL (~26s → ~32s)
   ├── Streaming call to Gemini 2.5 Flash
   ├── SSE: vehicle_identified
   ├── SSE: service_packages_found (FULL preparedTiers)
   ├── SSE: parts_found (500 parts)
   └── SSE: streamed text tokens
   │
9. TOTAL: ~30-35 seconds end-to-end
```

### Key Bottlenecks Identified

| # | Issue | Impact |
|---|---|---|
| 1 | **Two LLM round-trips minimum** — even when guards block tools, the AI still wastes a round-trip attempting them | +6-8s latency |
| 2 | **500 parts fetched always** — full catalog loaded even when user asked about oil only | Large payload, slow fetch |
| 3 | **Full preparedTiers in SSE** — each package has 4 tiers × N products with image URLs, descriptions, etc. | ~200-500KB SSE payload |
| 4 | **System prompt is enormous** — identity + rules + vehicle + returning customer + error handling + variant instructions + display context = potentially 5,000+ tokens | Slower LLM inference |
| 5 | **Compact summaries still include per-product listings** — the "compact" summary still lists every product in every tier | Still large context |
| 6 | **No SSE event ordering/prioritization** — vehicle, packages, and 500 parts all blast at stream start before any text | Frontend waits for massive payload before Bob speaks |
| 7 | **`_cachedBrandContext` not persisted across requests** — stored on `conversationMessages` which is rebuilt each request | Brand cache doesn't survive across turns |

## Proposed Optimization Strategy

### Phase 1: Reduce LLM Round-Trips (Biggest latency win)

**Problem**: The AI always gets tools, always tries to call them, and even when guards block, it costs a full non-streaming round-trip.

**Fix**: When `_deterministicMatch` is true (vehicle already confirmed, data already loaded), **remove tools from the first LLM call** and go straight to streaming. The AI doesn't need tools — it just needs to respond to the user's question using the display context.

```text
IF deterministicMatch AND partsLoaded AND packagesLoaded:
  → Skip tool loop entirely
  → Inject display context
  → Go straight to streaming final response
  → Save 6-12 seconds
```

**Exception**: Keep tools available if symptom keywords are detected (needs `diagnose_symptom`), or if the user asks about cart/checkout.

### Phase 2: Trim System Prompt Payload

**Problem**: The system prompt includes massive blocks of static instructions that don't change between requests (error handling templates, variant selection instructions, Kiwi-isms, etc.).

**Fix**: Split the system prompt into:
- **Static identity** (loaded once, never changes) — keep short
- **Session context** (vehicle, customer, brand data) — inject per request
- **Display context** (what's on the shelf) — inject only when data exists

Remove from the prompt entirely:
- The 40-line error handling response templates (the AI can handle errors naturally with simpler instructions)
- The multi-variant instructions (only inject when state is `AWAITING_VARIANT_SELECTION`)
- The full "Common Customer Slang" mapping (move to a lighter 1-line instruction)
- Engine code personalities (lines 308-381) — only used for variant characterization, not needed in prompt

### Phase 3: Further Slim Display Context

**Problem**: `generateCompactPackageSummary` still includes every product in every tier. For 6 packages × 4 tiers × 3 products = 72 product lines in the LLM context.

**Fix**: Reduce to **package-level summary only**:
```text
SERVICE PACKAGES (6):
- Oil Service: Economy $170, Standard $220 (CARFIX VALUE, Penrite ⭐), Premium $310
- Front Brakes: Economy $185, Standard $250 (CARFIX VALUE, RDA ⭐), Premium $380
```

That's ~6 lines instead of ~72. The AI only needs package name, tier prices, which is recommended, and which has preferred brands. Individual product details (partslotName, brand per product, displayPrice per product) are render-only data that the frontend handles.

### Phase 4: Prioritize SSE Event Ordering

**Problem**: All data events (vehicle, 6 packages with full tiers, 500 parts) blast before any text token, causing the frontend to process a massive payload before Bob can "speak".

**Fix**: Emit events in priority order with text interleaving:
1. `vehicle_identified` — immediate (tiny payload)
2. `service_packages_found` — immediate (needed for shelf)
3. Start streaming text tokens (Bob starts talking)
4. `parts_found` — emit AFTER first text chunk (user sees Bob responding while parts load in background)

### Phase 5: Persist Brand Context Across Turns

**Problem**: `_cachedBrandContext` is stored on `conversationMessages` which is rebuilt each request. On follow-up messages, the cache is empty.

**Fix**: The client (widget) should store the brand context received in the first response and pass it back in subsequent requests as a new field `cachedBrandContext` in the request body. The edge function checks for this field before attempting any re-fetch.

## Implementation Plan

### Step 1: Add tool-loop bypass for deterministic matches
In `bob-chat/index.ts`, after the deterministic fetch section (~line 2907), add a check: if `_deterministicMatch` is true, no symptom detected, and no cart-related intent, skip the tool calling loop entirely and jump to display context injection + streaming.

### Step 2: Slim the display context to package-level summaries
Rewrite `generateCompactPackageSummary` to output only: package title, per-tier price, recommended flag, and preferred brand flag. Remove per-product listings from LLM context.

### Step 3: Trim static prompt bloat
Remove the 40-line error response templates, engine code personality map from runtime (keep for variant characterization only), and multi-variant instructions (inject conditionally). Consolidate to ~50% shorter system prompt.

### Step 4: Defer parts emission after text stream starts
In the `transformedStream` section, move `parts_found` emission to after the first text chunk is written, so Bob starts talking before the 500-part payload transfers.

### Step 5: Pass cached brand context from client
Add `cachedBrandContext` field to the request schema. Widget stores it from the first response's brand data and sends it back on subsequent messages. Edge function uses this instead of re-fetching.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | Steps 1-4: tool-loop bypass, slimmer summaries, trimmed prompt, deferred parts emission |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Step 5: store and pass back `cachedBrandContext` |

## Expected Impact

| Metric | Before | After |
|---|---|---|
| LLM round-trips (deterministic match) | 2-3 | 1 (streaming only) |
| Time to first Bob text token | ~26s | ~16s |
| System prompt tokens | ~5,000+ | ~2,500 |
| Display context tokens | ~1,500 | ~300 |
| SSE payload before speech | ~500KB | ~50KB (parts deferred) |

## What We Are NOT Doing
- Not splitting the external CARFIX API into separate endpoints (out of scope)
- Not changing the frontend rendering logic (preparedTiers still sent in full via SSE)
- Not removing any existing functionality or features
- Not changing the widget's visual design or UX flow

