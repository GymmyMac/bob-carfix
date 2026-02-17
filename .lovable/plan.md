# Plan: Integrate Bob's Brain (`diagnose_symptom` Tool)

## Overview

Add a new `diagnose_symptom` tool to the `bob-chat` edge function that calls the CARFIX Brain API (`query-brain`) when users describe vehicle symptoms. If the Brain returns commercial SKUs, chain them through `lookup-part-sku` to get pricing. This gives Bob expert diagnostic capabilities powered by the 3-layer RAG system.

## What Changes

### 1. Add `diagnose_symptom` to the tools array

Add a new tool definition in `bob-chat/index.ts` (after the existing tools at ~line 1215):

```json
{
  "name": "diagnose_symptom",
  "description": "Consult the CARFIX Expert Brain for technical analysis of vehicle symptoms or failures. Use when a customer describes a problem (e.g., 'brakes feel spongy', 'engine overheating', 'rattling noise'). Returns physics-based diagnosis with confidence tiers and optional commercial fix SKUs.",
  "parameters": {
    "type": "object",
    "properties": {
      "user_query": {
        "type": "string",
        "description": "The exact symptom description provided by the user."
      }
    },
    "required": ["user_query"]
  }
}
```

### 2. Add two new async functions

`**diagnoseBrainSymptom(query)**` -- Calls the external `query-brain` endpoint on the CARFIX Supabase instance:

- URL: `https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/query-brain`
- Headers: `apikey` (CARFIX anon key) + `x-partner-key` (from `CARFIX_PARTNER_API_KEY` secret, already configured)
- Returns the raw Brain response including `no_match`, `diagnosis_trace[]`, and `confidence_tier`

`**lookupPartBySku(sku)**` -- Calls the external `lookup-part-sku` endpoint:

- URL: `https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/lookup-part-sku`
- Same auth headers as above
- Returns part details (name, brand, price, image) for a given commercial SKU

### 3. Wire into `executeToolCall` switch

Add `case "diagnose_symptom"` that:

1. Calls `diagnoseBrainSymptom(args.user_query)`
2. If `no_match: true`, returns a structured "no diagnosis found" result
3. If diagnosis found, iterates `diagnosis_trace` and for each entry with a `commercial_sku`, chains a call to `lookupPartBySku(sku)` to enrich with pricing
4. Returns the combined diagnosis + catalog data back to the AI for natural language synthesis

### 4. Update the system prompt guidance

Add a line to the fallback system prompt (and document for the DB prompt):

> "If a user reports a vehicle symptom (noise, vibration, warning light, performance issue), use `diagnose_symptom` with their exact description. Present the physics logic in plain language, then recommend the fix part with pricing if available. If no_match, acknowledge you couldn't find a specific bulletin and suggest they describe it differently or manually look up the vehicle on CARFIX and start the process of elimination."

## Technical Details

### Authentication (already working)

- `CARFIX_PARTNER_API_KEY` secret is already configured in this project
- The CARFIX anon key is already hardcoded in `apiConfig.customHeaders`
- Both Brain endpoints require: `apikey` header (Supabase gateway) + `x-partner-key` header (partner auth)

### Response Flow

```text
User: "My brakes feel spongy after a track day"
  -> AI invokes diagnose_symptom({ user_query: "brakes feel spongy after track day" })
  -> bob-chat calls query-brain (CARFIX Supabase)
  -> Brain returns: diagnosis_trace with "Vapour Lock (Hydraulic Boiling)", confidence: high, SKU: 300021
  -> bob-chat chains: lookup-part-sku({ sku: "300021" })
  -> Gets: Brembo Sport Brake Fluid, $45.00
  -> Combined result returned to AI
  -> Bob says: "Ah mate, sounds like vapour lock - you used the brakes so hard that the brake fluid boiled from the heat. 
     You'll want some Brembo Sport Brake Fluid ($45.00) - it's rated for track temps. Sweet as!"
```

### Error Handling

- Brain API timeout: 10s abort controller
- `no_match` response: Return structured message so AI can gracefully say "couldn't find a specific bulletin"
- `lookup-part-sku` failure: Return diagnosis without pricing (the physics logic is still valuable)
- Low confidence results: Pass `confidence_tier` to AI so it can hedge language ("could be..." vs "definitely...")

### No Frontend Changes Required

The diagnosis flows through the existing chat stream. The AI synthesizes the Brain's physics logic + catalog pricing into natural Bob-style responses. No new SSE event types or UI components needed.

## Files Modified

- `supabase/functions/bob-chat/index.ts` -- Add tool definition, two API functions, switch case, and prompt guidance

## Dependencies

- Brain endpoints (`query-brain`, `lookup-part-sku`) must be deployed on the CARFIX Supabase instance first
- The Brain database must be seeded with observation/physics/commercial data