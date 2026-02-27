

# Further Token Usage Optimization for bob-chat

## Current State After Recent Fixes

The recent work addressed the double-fetch bug and added compact package summaries. However, significant token waste remains in several areas.

## Remaining Token Waste Identified

### 1. Tool Definitions Always Sent (~1,200 tokens wasted on deterministic bypass)
All 13 tool definitions (lines 1121-1359) are included in every LLM call, even when `canBypassToolLoop` is true and the final streaming call at line 3429 sends them implicitly via conversation history. The streaming call at line 3429 already omits tools, but the tool definitions still inflate the conversation via prior `tool_calls` and `tool` role messages from previous turns.

**Fix:** When `canBypassToolLoop` is active, strip `tool_calls` and `tool` role messages from `conversationMessages` before the streaming call. The AI doesn't need to see the tool call history to answer "I need an oil change" -- it just needs the display context.

### 2. FALLBACK_SYSTEM_PROMPT is 48 lines of static text (~800 tokens)
Lines 1370-1417 contain a large fallback prompt that duplicates what's in the DB prompts. When DB prompts load (99% of the time), this is dead code but still shipped. Not a runtime token issue but adds to function size.

**Fix:** No change needed -- it's only used when DB is down.

### 3. ENGINE_CODE_PERSONALITIES map (73 entries, ~600 tokens in-memory)
Lines 308-381 define engine personalities. These are used by `getVehicleCharacterization()` which is only called during variant selection. They never enter the LLM prompt directly, so no token impact. No change needed.

### 4. The Display Context block is still verbose (~400 tokens of instructions)
Lines 3371-3400 inject 30 lines of "SHELF TALKER" instructions and "PREFERRED BRAND RULES" every time packages exist. These static instructions repeat on every request and should already be in the DB system prompt.

**Fix:** Move the static Shelf Talker and Preferred Brand Rules into the DB-stored system prompt (they're already partially there in the fallback). Only inject the dynamic data (package list, value tiers, brand notes). This saves ~300 tokens per request.

### 5. Vehicle context block duplicates fields (lines 2493-2513, ~250 tokens)
The `PRE-CONFIRMED VEHICLE SESSION` block lists 10 fields including rarely-used ones (VIN, Engine Number, CC Rating) plus 6 lines of rules. Several rules duplicate the DB prompt content.

**Fix:** Condense to essential fields only: `Vehicle: {year} {make} {model} ({rego}), ID: {vehicleId}, {fuel_type}`. Move the "BRAIN-ONLY DIAGNOSIS" instruction to the DB prompt since it applies globally. Saves ~150 tokens.

### 6. Returning customer context can be verbose (~300-500 tokens)
Lines 2548-2596 inject greeting rules, garage lists, and hints. The 6-line "Greeting Rules" block at the end is static and should be in the DB prompt.

**Fix:** Move the static greeting rules to DB prompt. Only inject dynamic data (name, orders, vehicles, hints). Saves ~100 tokens.

### 7. Conversation history includes all prior messages unfiltered
On follow-up turns, the full conversation history (including long assistant responses from previous turns) is sent. For multi-turn conversations, this grows rapidly.

**Fix:** For the streaming call only (not tool calls), truncate assistant messages beyond the last 3 turns to a summary. Keep all user messages intact. This is the highest-impact optimization for multi-turn conversations but requires careful implementation.

### 8. `buildPromotionContextBlock` is injected twice
Once in the system prompt (line 2475) and again inside the display context (line 3369). Double injection wastes tokens.

**Fix:** Remove from the display context since it's already in the system prompt.

## Implementation Steps

### Step 1: Strip tool history from streaming call on bypass path
When `canBypassToolLoop` is true, filter `conversationMessages` before the streaming call to remove `tool_calls` properties from assistant messages and `tool` role messages entirely. The AI only needs: system prompt + user messages + display context.

### Step 2: Condense vehicle context injection
Replace the 20-line `PRE-CONFIRMED VEHICLE SESSION` block with a 3-line compact version:
```
Vehicle: 2011 VOLKSWAGEN TIGUAN (KMT21), ID: 26384, Diesel
Do NOT ask for vehicle details. Use vehicle_id 26384 for tool calls.
```

### Step 3: Trim display context to data-only
Remove the 20-line static "SHELF TALKER" and "PREFERRED BRAND RULES" blocks from the display context injection. Move these to the DB system prompt. Keep only dynamic content: package summaries, value tiers, and preferred brand notes.

### Step 4: Remove duplicate promotion injection
Remove `buildPromotionContextBlock(activePromotions)` from the display context (line 3369) since it's already in the system prompt (line 2475).

### Step 5: Condense returning customer context
Move the 6-line static "Greeting Rules" to the DB prompt. Only inject dynamic data (name, order count, vehicle list, hints).

### Step 6: Truncate old assistant messages (multi-turn optimization)
For the final streaming call, if conversation has more than 6 messages, summarize assistant messages older than the last 3 turns to their first sentence only. Preserves context without sending full previous responses.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | Steps 1-6: strip tool history, condense vehicle/customer context, trim display context, remove duplicate promos, truncate old messages |

## Expected Additional Savings

| Optimization | Token Savings |
|---|---|
| Strip tool history on bypass | ~500-1,000 tokens |
| Condense vehicle context | ~150 tokens |
| Trim display context to data-only | ~300 tokens |
| Remove duplicate promotion block | ~100-200 tokens |
| Condense returning customer | ~100 tokens |
| Truncate old assistant messages | ~500-2,000 tokens (grows per turn) |
| **Total per request** | **~1,650-3,750 tokens** |

Combined with the previous optimization (~2,500 token reduction), total savings would be ~4,000-6,000 tokens per request compared to the original flow.

