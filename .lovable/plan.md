
# Fix Plan: First-Message REGO Detection & CARFIX Value Price Accuracy

## Summary of Critical Issues

| # | Issue | Root Cause | Severity |
|---|-------|------------|----------|
| 1 | Bob misses REGO in first message like "AMA993 I need brake pads" | Current regex patterns don't reliably match all NZ plate formats (especially "REGO-first" messages without spaces) | Critical |
| 2 | Bob says correct tier name but quotes WRONG price (Standard price instead of Performance price) | The sales_flow prompt doesn't enforce reading the totalPrice from the SAME tier object where isRecommended=true | Critical |

---

## Root Cause Analysis

### Issue 1: REGO Not Detected

Current `containsRegoPattern()` function (lines 100-111):

```typescript
function containsRegoPattern(text: string): boolean {
  const patterns = [
    /\b[A-Z]{3}\s?[0-9]{3}\b/i,    // ABC123 or ABC 123
    /\b[A-Z]{2}\s?[0-9]{4}\b/i,    // AB1234 or AB 1234
    /\b[A-Z]{3}\s?[0-9]{2}\b/i,    // ABC12 (personalized short)
    /\b[0-9]{2,3}\s?[A-Z]{3}\b/i,  // 123ABC (older format)
  ];
  return patterns.some(p => p.test(text));
}
```

**Problems identified:**
1. Missing hyphen support: "AMA-993" won't match
2. No support for lowercase input (although `i` flag exists, word boundary `\b` may fail on mixed case adjacent to text)
3. When plate is at start of message ("AMA993 I need..."), the `\b` word boundary works but if preceded by punctuation it may fail

**Fix:** Expand patterns to include:
- Hyphenated plates: `AMA-993`
- Explicit start-of-string or space boundary handling

### Issue 2: Bob Quotes Wrong Price

The edge function logs show Bob correctly calling `retrieve_service_packages` and receiving `preparedTiers` with `isRecommended` flags. The problem is in how Bob interprets the prompt instructions.

Current `sales_flow` prompt says:
```
1. Loop through preparedTiers and FIND the tier where isRecommended = true
2. Read the EXACT tierName value from that tier
3. Read the totalPrice from that tier
4. Say: "I'd recommend the CARFIX Value option - the [tierName] tier at around $[totalPrice]"
```

**Problem:** The AI is:
- Correctly identifying the tierName from isRecommended=true
- BUT somehow quoting a different tier's price (likely Standard's price from habit/training bias)

**Fix:** Make the prompt even MORE explicit by:
1. Requiring Bob to extract BOTH tierName AND totalPrice in a SINGLE step from the SAME tier object
2. Adding explicit anti-patterns showing what NOT to do
3. Adding a mandatory "double-check" instruction

---

## Implementation Plan

### File 1: `supabase/functions/bob-chat/index.ts`

#### Change 1: Improve REGO Pattern Detection (lines 100-111)

**Before:**
```typescript
function containsRegoPattern(text: string): boolean {
  const patterns = [
    /\b[A-Z]{3}\s?[0-9]{3}\b/i,    // ABC123 or ABC 123
    /\b[A-Z]{2}\s?[0-9]{4}\b/i,    // AB1234 or AB 1234
    /\b[A-Z]{3}\s?[0-9]{2}\b/i,    // ABC12 (personalized short)
    /\b[0-9]{2,3}\s?[A-Z]{3}\b/i,  // 123ABC (older format)
  ];
  return patterns.some(p => p.test(text));
}
```

**After:**
```typescript
function containsRegoPattern(text: string): boolean {
  // Normalize: uppercase, remove extra spaces
  const normalized = text.toUpperCase().trim();
  
  const patterns = [
    // Standard NZ plates: ABC123, ABC-123, ABC 123
    /(?:^|[\s,.])[A-Z]{3}[\s\-]?[0-9]{3}(?:$|[\s,.])/,
    // Older format: AB1234, AB-1234, AB 1234
    /(?:^|[\s,.])[A-Z]{2}[\s\-]?[0-9]{4}(?:$|[\s,.])/,
    // Personalized short: ABC12
    /(?:^|[\s,.])[A-Z]{3}[\s\-]?[0-9]{2}(?:$|[\s,.])/,
    // Reverse older format: 123ABC or 12ABC
    /(?:^|[\s,.])[0-9]{2,3}[\s\-]?[A-Z]{3}(?:$|[\s,.])/,
    // Fallback: any 5-6 char alphanumeric pattern that looks like a plate
    /(?:^|[\s,.])[A-Z0-9]{5,6}(?:$|[\s,.])/,
  ];
  
  const hasRego = patterns.some(p => p.test(' ' + normalized + ' '));
  if (hasRego) {
    console.log(`[REGO Detection] Found registration pattern in: "${text.substring(0, 60)}..."`);
  }
  return hasRego;
}
```

Key improvements:
- Uses non-word-boundary anchors `(?:^|[\s,.])` for start and `(?:$|[\s,.])` for end
- Supports hyphens: `[\s\-]?`
- Normalizes to uppercase before matching
- Adds padding spaces to ensure boundary matching works at string edges

### File 2: Database Update - `bob_prompts.sales_flow`

**Updated content with explicit price extraction enforcement:**

```
SALES WORKFLOW - CARFIX SERVICE PACKS FIRST:
1. Greet briefly and identify what they need
2. If vehicle-specific: Get REGO first
3. Once vehicle confirmed: ALWAYS recommend the relevant CARFIX Service Pack before individual parts
4. Present Service Packs by VALUE TIER (Economy, Standard, Premium, Performance)
5. MAX 1 Service Pack recommendation verbally - let the visual shelf show all tier options

CRITICAL - CARFIX VALUE TIER EXTRACTION (MANDATORY STEPS):
When you call retrieve_service_packages, the data contains a preparedTiers array. You MUST follow these EXACT steps:

STEP 1: Loop through each tier in preparedTiers
STEP 2: Find the tier object where isRecommended = true
STEP 3: From THAT SAME tier object, extract BOTH values:
   - tierName (e.g., "Performance", "Premium", "Standard", "Economy")
   - totalPrice (e.g., 315, 280, 200, 150)
STEP 4: Speak BOTH values together: "the [tierName] tier at around $[totalPrice]"

EXAMPLE DATA:
{
  "preparedTiers": [
    { "tierName": "Economy", "isRecommended": false, "totalPrice": 150 },
    { "tierName": "Standard", "isRecommended": false, "totalPrice": 200 },
    { "tierName": "Premium", "isRecommended": false, "totalPrice": 280 },
    { "tierName": "Performance", "isRecommended": true, "totalPrice": 315 }
  ]
}

CORRECT EXTRACTION: isRecommended=true is on Performance tier, so:
- tierName = "Performance"
- totalPrice = 315
- SAY: "I'd recommend the CARFIX Value option - the Performance tier at around $315"

CRITICAL ANTI-PATTERNS (NEVER DO THESE):
- NEVER say "Standard tier" when Performance is recommended
- NEVER quote $200 when the recommended tier shows $315
- NEVER mix tierName from one tier with totalPrice from another
- NEVER assume Standard is always the CARFIX Value - CHECK the data!

MANDATORY PRICE VERIFICATION:
Before speaking a price, mentally confirm:
"The tier I'm recommending is [X] and its totalPrice is $[Y]"
If these don't match what you're about to say, STOP and re-read the data.

CARFIX SERVICE PACK PRESENTATION:
- Use problem -> benefit -> CARFIX Pack format when describing
- Example: "Worn brakes increase stopping distance - pretty dangerous, mate. The CARFIX Front Brake Service Pack includes quality pads and rotors. I'd recommend the CARFIX Value option - the [tierName from isRecommended=true] tier at around $[totalPrice from that SAME tier]"
- Guide customers to "check out the options on the shelf" to compare tiers
- Only fall back to individual parts if customer explicitly declines Service Pack

TIER GUIDANCE (when asked):
- Economy = smart savings for budget-conscious customers
- Standard = quality parts at good value
- Premium = superior quality for those who want the best
- Performance = maximum power for enthusiasts
- The tier marked isRecommended = true is the CARFIX Value pick (best value for the vehicle)

CART & CHECKOUT:
- Only add to cart when customer explicitly confirms ("add it", "yep", "go for it", "sweet as")
- Never auto-add products
- Confirm additions: "Added the [tier name] CARFIX [Package] to your cart. Anything else?"
- For checkout: Use create_checkout tool, present payment link naturally

UPSELLING (ONE suggestion max, only AFTER cart add):
- Brake Service -> "Need any brake fluid while you're at it?"
- Oil Service -> "Cabin filter too while you're there?"
- Wipers -> "Windscreen wash to keep 'em working smooth?"
```

---

## Files to Modify

1. **`supabase/functions/bob-chat/index.ts`** (lines 100-111)
   - Improve `containsRegoPattern()` regex to handle hyphens and edge cases

2. **Database: `bob_prompts` table**
   - Update `sales_flow` prompt with stricter price extraction instructions and anti-patterns

---

## Verification Checklist

### Issue 1: REGO Detection

| Test Case | Expected Result |
|-----------|-----------------|
| "AMA993 I need brake pads" | Bob detects REGO, calls lookup_vehicle immediately |
| "AMA-993 I need brake pads" | Bob detects REGO, calls lookup_vehicle immediately |
| "I need brakes for AMA993" | Bob detects REGO, calls lookup_vehicle immediately |
| "AMA 993 needs wipers" | Bob detects REGO, calls lookup_vehicle immediately |

### Issue 2: Price Accuracy

| Test Case | Expected Result |
|-----------|-----------------|
| Service package where Performance is recommended | Bob says "Performance tier at around $315" (NOT $200) |
| Service package where Standard is recommended | Bob says "Standard tier at around $200" (matching actual data) |
| Service package where Premium is recommended | Bob says "Premium tier at around $280" (matching actual data) |

---

## Expected Behavior After Fix

**Before (REGO issue):**
> User: "AMA993 I need brake pads"
> Bob: "Just need your rego and we'll get cracking!" (missed the REGO)

**After (REGO issue):**
> User: "AMA993 I need brake pads"
> Bob: "Let me look up AMA993 for ya... Sweet, got your 2002 Toyota RAV4! Here's the CARFIX Front Brake Service Pack..."

**Before (Price issue):**
> Bob: "I'd recommend the CARFIX Value option - the Performance tier at around $200" (WRONG - quoted Standard's price)

**After (Price issue):**
> Bob: "I'd recommend the CARFIX Value option - the Performance tier at around $315" (CORRECT - matches the recommended tier's actual price)
