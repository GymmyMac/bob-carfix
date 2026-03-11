

# Investigation: Bob's Server-Side Add-to-Cart & Garage Capabilities

## Findings

### 1. Bob's Server-Side `add_to_cart` — NOT Forwarding to Widget

There are **two separate cart paths**, and the server-side one is broken:

**Path A — Manual UI click (widget-side):** User taps the green "+" on a product tile. This flows through `Bob.tsx` → `handleAddToCart` → `callbacks.onAddToCart()`. This was fixed in v3.2.14 and works correctly.

**Path B — Bob adds to cart via AI tool call (server-side):** Bob's LLM calls the `add_to_cart` tool, which calls the CARFIX Partner API directly. The edge function then tries to emit a `cart_updated` SSE event to the frontend. **However, `_cartItemsToEmit` is never populated** — the code reads it from `conversationMessages` (line 3592) but no code ever writes it. This means:

- Bob calls the Partner API successfully (items ARE added server-side to CARFIX's cart)
- But the widget **never receives** the `cart_updated` SSE event
- So `onCartUpdated` callback is never fired
- The widget has no awareness that items were added

**The fix:** After the `add_to_cart` tool executes, store the result items onto `conversationMessages._cartItemsToEmit` so the SSE emission code (line 3592-3597) actually has data to send. Also, the `cart_updated` SSE payload shape (`{ productName, quantity }`) doesn't match the `CartItem` interface expected by `onCartUpdated` — this needs alignment.

### 2. Garage — Bob Can View & Remove, But Cannot Add

Bob's available tools:
- **`get_returning_customer_context`** — fetches garage vehicles, purchase history, name ✅
- **`remove_vehicle`** — removes a vehicle from garage (with confirmation) ✅
- **`add_vehicle` / `save_vehicle`** — **DOES NOT EXIST** ❌

When Bob identifies a vehicle via REGO lookup, it's not saved to the customer's garage. There's no tool definition for adding a vehicle to the garage.

**The fix:** Add an `add_vehicle_to_garage` tool that calls the Partner API with the identified vehicle details and customer email. Include guardrails: require confirmed vehicle context and customer email before calling.

### 3. Security Review of Bob's Tools

Current tools and their risk assessment:

| Tool | Risk | Status |
|---|---|---|
| `lookup_vehicle` | Low — read-only REGO lookup | ✅ Safe |
| `retrieve_parts` | Low — read-only catalog query | ✅ Safe |
| `retrieve_service_packages` | Low — read-only | ✅ Safe |
| `search_general_products` | Low — read-only search | ✅ Safe |
| `get_product_details` | Low — read-only | ✅ Safe |
| `search_products` | Low — read-only | ✅ Safe |
| `check_vehicle_fitment` | Low — read-only | ✅ Safe |
| `diagnose_symptom` | Low — read-only Brain query | ✅ Safe |
| `search_web` | Low — read-only web search | ✅ Safe |
| `get_customer_context` | Medium — reads customer data, gated by email | ✅ Acceptable |
| `get_returning_customer_context` | Medium — reads customer data | ✅ Acceptable |
| `add_to_cart` | Medium — writes to cart, requires email | ✅ Acceptable (customer must confirm) |
| `get_cart` | Low — reads cart | ✅ Safe |
| `create_checkout` | Medium — generates payment URL | ✅ Acceptable (customer initiates) |
| `remove_vehicle` | Medium — destructive, requires confirmation prompt | ✅ Has guardrail in description |

No elevated security risks. All write operations require customer email (provided via session handoff, not user input), and destructive actions require explicit confirmation in Bob's prompt rules.

## Proposed Changes

### Fix 1: Wire `_cartItemsToEmit` in `bob-chat/index.ts`

After the `add_to_cart` tool call executes successfully, store the items on the conversation messages array so the SSE emitter can send `cart_updated`:

```typescript
// After add_to_cart tool result
if (name === "add_to_cart" && !toolResult.error) {
  (conversationMessages as any)._cartItemsToEmit = args.items.map(i => ({
    product_id: i.product_id,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    vehicle_id: i.vehicle_id,
  }));
}
```

Also update the SSE payload shape to match `CartItem` (currently sends `{ productName, quantity }` — needs `{ product_id, product_name, quantity, unit_price }`).

### Fix 2: Add `add_vehicle_to_garage` tool

Add a new tool definition and handler that calls the Partner API's `add_vehicle` action with the confirmed vehicle's details and customer email. Include the guardrail: "Only use after a vehicle has been confirmed via REGO lookup and customer email is available."

### Fix 3: Update widget `useBobChat.ts` to fire `onAddToCart` on `cart_updated`

Currently `cart_updated` only fires `onCartUpdated`. It should ALSO fire `onAddToCart` for each item, so the host site (CARFIX) can handle items from Bob's AI-initiated cart adds the same way as manual clicks.

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | Wire `_cartItemsToEmit` after `add_to_cart` tool; add `add_vehicle_to_garage` tool; fix `cart_updated` payload shape |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Fire `onAddToCart` for each item in `cart_updated` event |
| `packages/bob-widget/package.json` | Bump to 3.2.15 |
| `packages/bob-widget/src/version.ts` | Bump to 3.2.15 |
| `packages/bob-widget/CHANGELOG.md` | Document fixes |

