

# Fix Plan: Bob's CARFIX Value Recommendation & First-Message REGO Detection

## Summary of Issues

| # | Issue | Root Cause | Severity |
|---|-------|------------|----------|
| 1 | Bob recommends wrong tier (says "Standard" when Performance is highlighted) | Prompt says "check isRecommended" but doesn't explicitly inject the tier data format into the AI context | 🔴 Critical |
| 2 | Bob ignores REGO in first message and asks for it again | Canned response triggers "need_rego" without checking if user already provided a REGO | 🔴 Critical |

---

## Root Cause Analysis

### Issue 1: Bob Recommending Wrong Tier

The current flow:
1. `retrieve_service_packages` is called and returns `preparedTiers` data
2. Each tier has `isRecommended: true/false` flag
3. The prompt tells Bob to "check the isRecommended flag"
4. **PROBLEM**: The AI receives the data but doesn't consistently parse and speak the correct tier name

The issue is that the AI may be interpreting the instructions loosely. We need to:
- Make the prompt MORE explicit about extracting and speaking the EXACT tier name
- Add a concrete example showing the data structure the AI will receive

### Issue 2: REGO in First Message Ignored

Current `checkCannedResponse()` logic (lines 164-222):
```typescript
const isVehicleSpecificRequest = VEHICLE_SPECIFIC_KEYWORDS.some(kw => 
  userText.includes(kw.toLowerCase())
);
const hasVehicleContext = !!vehicleContext;

// Trigger if vehicle-specific request WITHOUT vehicle context
if (isVehicleSpecificRequest && !hasVehicleContext) {
  // Return canned "need_rego" response → BYPASSES AI
}
```

**Problem**: User says "I need wipers for ABC123" → triggers "need_rego" even though REGO is in the message!

**Fix**: Add REGO pattern detection - if message contains a NZ plate pattern, skip canned response and let AI process it.

---

## Implementation Plan

### File: `supabase/functions/bob-chat/index.ts`

#### Change 1: Add REGO Pattern Detection (lines 96-106)

Add a regex to detect NZ registration plates:

```typescript
// NZ Registration plate patterns:
// - Standard: 3 letters + 3 numbers (ABC123)
// - Old: 2 letters + 4 numbers (AB1234)
// - Personalized: 2-6 alphanumeric
const REGO_PATTERN = /\b[A-Z]{2,3}\s?[0-9]{2,4}[A-Z]?\b/i;

function containsRegoPattern(text: string): boolean {
  // Check for common REGO patterns
  const patterns = [
    /\b[A-Z]{3}\s?[0-9]{3}\b/i,    // ABC123 or ABC 123
    /\b[A-Z]{2}\s?[0-9]{4}\b/i,    // AB1234 or AB 1234
    /\b[A-Z]{3}\s?[0-9]{2,3}\b/i,  // ABC12 or ABC123
    /\b[0-9]{2,3}\s?[A-Z]{3}\b/i,  // 123ABC (older format)
  ];
  return patterns.some(p => p.test(text));
}
```

#### Change 2: Update `checkCannedResponse()` to Skip if REGO Present (lines 179-187)

```typescript
// Check if this is a vehicle-specific request without vehicle context
const isVehicleSpecificRequest = VEHICLE_SPECIFIC_KEYWORDS.some(kw => 
  userText.includes(kw.toLowerCase())
);

const hasVehicleContext = !!vehicleContext;

// NEW: Check if user already provided a REGO in their message
const userProvidedRego = containsRegoPattern(userText);

// Trigger: User asks for parts but no vehicle AND didn't provide REGO
if (isVehicleSpecificRequest && !hasVehicleContext && !userProvidedRego) {
  // ... existing canned response logic
}
```

This ensures that if the user says "I need wipers for ABC123", the AI processes the message and calls `lookup_vehicle` with the plate.

#### Change 3: Enhance `sales_flow` Prompt for Explicit Tier Recommendation

Update the `bob_prompts.sales_flow` content to be MORE explicit:

```
CRITICAL - CARFIX VALUE TIER MATCHING:
When you call retrieve_service_packages, you will receive preparedTiers array like this:
{
  "preparedTiers": [
    { "tierName": "Economy", "isRecommended": false, "totalPrice": 150 },
    { "tierName": "Standard", "isRecommended": false, "totalPrice": 200 },
    { "tierName": "Performance", "isRecommended": true, "totalPrice": 315 }  // ← THIS IS THE CARFIX VALUE TIER
  ]
}

YOUR TASK:
1. Find the tier where isRecommended = true
2. Read the tierName value from that tier (e.g., "Performance")
3. Read the totalPrice from that tier (e.g., 315)
4. Say: "I'd recommend the CARFIX Value option - the [tierName] tier at around $[totalPrice]"

EXAMPLE - If Performance is the recommended tier:
✅ CORRECT: "I'd recommend the CARFIX Value option - the Performance tier at around $315"
❌ WRONG: "I'd recommend the Standard tier" (Never assume Standard!)

The CARFIX Value tier varies by vehicle and package - ALWAYS read the data!
```

---

## Files to Modify

1. **`supabase/functions/bob-chat/index.ts`**
   - Add `containsRegoPattern()` helper function
   - Update `checkCannedResponse()` to check for REGO before triggering "need_rego"

2. **Database: `bob_prompts` table**
   - Update `sales_flow` prompt with more explicit tier extraction instructions

---

## Verification Checklist

### Issue 1: CARFIX Value Recommendation
1. Ask Bob "I need brake pads for my [REGO]"
2. Wait for service packages to load
3. Check console logs for which tier has `isRecommended: true`
4. Verify Bob verbally recommends THAT tier by name (not always "Standard")

### Issue 2: First-Message REGO Detection
1. Send first message: "I need wipers for ABC123"
2. Verify Bob does NOT ask for REGO again
3. Verify Bob immediately looks up the vehicle
4. Verify vehicle is identified and products are shown

---

## Expected Behavior After Fix

**Before:**
> User: "I need wipers for ABC123"
> Bob: "Just need your rego and we'll get cracking!" (ignores REGO)

**After:**
> User: "I need wipers for ABC123"
> Bob: "Let me look up ABC123 for ya... Ah, a 2018 Toyota Corolla! Sweet ride. Here's the CARFIX Wiper Service Pack - I'd recommend the CARFIX Value option, the Performance tier at around $95."

