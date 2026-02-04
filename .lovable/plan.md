# Enhanced Error Handling Integration Plan

## Status: ✅ IMPLEMENTED

**Implementation Date:** 2026-02-04

## Overview

This plan integrates the $5000/hr consultant feedback to transform Bob's error handling from basic acknowledgment into a "commerce superpower" that builds trust and prevents churn. The key improvements are:

1. **Response Variety** - Cycle 2-3 phrase variations to feel natural, not robotic
2. **User Empowerment** - Always provide actionable next steps (buttons, retry options)
3. **Kiwi Personality** - Add light humor for animated Bob ("Bob's taking a quick pit stop!")
4. **Analytics Logging** - Track error types for iterative improvement
5. **REGO Validation** - Acknowledge + Clarify pattern with retry limits

---

## Changes Summary

### 1. System Prompt Error Handling (bob-chat/index.ts)

**Current Problem:** Single-phrase responses, offers "universal products" Bob can't access

**New Approach:**
- Remove all references to "universal products" or "accessories"
- Add response variations for naturalness
- Direct to carfix.co.nz as primary recovery
- Kiwi-friendly humour for connection issues

```text
## CRITICAL - ERROR HANDLING AND RECOVERY

When things go wrong, respond transparently and helpfully:

### Invalid REGO Format (Acknowledgment + Clarification)
Cycle these responses (vary each time):
- "Oops, I didn't quite catch that one! I need a valid NZ plate like ABC123 or HZP550."
- "Hmm, that doesn't look like a Kiwi rego to me. Mind trying again? Format's usually ABC123."
- "No luck with that plate, mate. Double-check it's a standard NZ format like ABC123?"

After 2-3 failed attempts:
- "We're having a bit of trouble with that rego. How about you tell me the make, model, and year instead?"

### Vehicle Not Found in Database
Cycle these responses:
- "Couldn't find a match for [REGO] in the system. Might be too new or an import. Try the make, model, and year?"
- "Hmm, [REGO] isn't showing up. Sometimes newer cars take a while to get catalogued. Got the make and model handy?"
- "No joy on [REGO], mate. Could be a typo, or it might be a fresh import. Mind double-checking?"

### Parts Fetch Error (vehicle_not_in_parts_db)
Cycle these responses:
- "Ah, Bob's parts system isn't set up for your [VEHICLE] yet. Head over to carfix.co.nz and browse manually – the team there will sort you!"
- "No parts coming up for your [VEHICLE] in my system – sometimes happens with imports. Try carfix.co.nz for the full catalogue!"
- "Drawing a blank for your [VEHICLE], mate. Best bet is to pop over to carfix.co.nz and browse there!"

### Parts Fetch Error (server_error/timeout/network)
Cycle these responses (add Bob personality):
- "Bob's taking a quick pit stop! Having trouble connecting – try refreshing, or hop over to carfix.co.nz while we sort this out."
- "Bit of a glitch on my end, mate. Give the page a refresh, or browse directly at carfix.co.nz."
- "She's playing up a bit – connection trouble. Try again in a tick, or carfix.co.nz has what you need!"

### Empty Results (Parts search succeeded but zero results)
Cycle these responses:
- "Hmm, no parts showing for your [VEHICLE] in our catalogue – common with imports. Try carfix.co.nz for the full range!"
- "Nothing coming up for that one. Head to carfix.co.nz and browse manually – they'll have it sorted!"

### General Rules:
- NEVER output "undefined", "null", or empty template variables
- NEVER invent products or prices not in tool results
- NEVER offer "universal products" or "accessories" – Bob doesn't have this capability
- ALWAYS empower users: provide clear next steps, suggest retry or website
- ALWAYS direct to carfix.co.nz as the fallback recovery path
- Track error scenarios for dev team improvements
- Kiwi-friendly tone: apologetic yet optimistic ("she'll be right" attitude)
```

---

### 2. Year Field Mapping Fix (bob-chat/index.ts)

**Current Bug:** Code uses `vehicle.year || vehicle.start_year`, missing `year_of_manufacture`

**Fix Locations:**

**Line ~1917 (forced single vehicle):**
```typescript
forcedSingleVehicle = {
  vehicle_id: (vehicle.vehicle_id || vehicle.id) as number,
  make: vehicle.make as string,
  model: vehicle.model as string,
  // FIXED: Prioritize year_of_manufacture from CarJam
  year: (vehicle.year_of_manufacture ?? vehicle.year ?? vehicle.start_year) as number,
  year_of_manufacture: vehicle.year_of_manufacture,
  start_year: vehicle.start_year,
  end_year: vehicle.end_year,
  // ... rest unchanged
};
```

**Line ~1894-1908 (vehicle candidates):**
```typescript
forcedCandidates = vehicles.map((v: any) => ({
  vehicle_id: v.vehicle_id || v.id,
  // ... existing fields ...
  year_of_manufacture: v.year_of_manufacture, // ADD THIS
  // ... rest unchanged
}));
```

**Line ~2250 (deterministic vehicle context):**
```typescript
year: deterministicVehicle.year_of_manufacture ?? deterministicVehicle.year ?? deterministicVehicle.start_year,
```

**Add Year Validation Warning (new code):**
```typescript
// After vehicle lookup success, validate year consistency
if (vehicle.year_of_manufacture && vehicle.start_year && vehicle.end_year) {
  if (vehicle.year_of_manufacture < vehicle.start_year || vehicle.year_of_manufacture > vehicle.end_year) {
    console.warn(`[Year Validation] Mismatch: year_of_manufacture=${vehicle.year_of_manufacture} outside range ${vehicle.start_year}-${vehicle.end_year}`);
  }
}
```

---

### 3. Fetch Error Context Messages (bob-chat/index.ts)

**Lines ~2279-2287 – Replace with enhanced messaging:**

```typescript
if (partsResult.errorType === 'vehicle_not_in_parts_db') {
  fetchErrorContext = `\n\n[PARTS FETCH RESULT] Vehicle_id ${vehicleId} not in parts catalog. 
  Direct customer to carfix.co.nz for manual browsing. 
  DO NOT offer universal products or accessories – Bob cannot access these.
  Use varied, Kiwi-friendly phrasing. Log this for catalog expansion tracking.`;
} else if (['server_error', 'timeout', 'network_error'].includes(partsResult.errorType)) {
  fetchErrorContext = `\n\n[PARTS FETCH RESULT] Technical issue (${partsResult.errorType}). 
  Suggest page refresh or carfix.co.nz fallback. 
  Add light humor – "Bob's taking a pit stop!" 
  This is recoverable; offer retry or website.`;
} else {
  fetchErrorContext = `\n\n[PARTS FETCH RESULT] Unknown error. 
  Apologize and direct to carfix.co.nz.`;
}

// For empty results (success but zero parts):
fetchErrorContext = `\n\n[PARTS FETCH RESULT] Search completed, zero matches. 
Direct to carfix.co.nz. 
Use encouraging phrasing – "common with imports" or "catalogue is growing". 
DO NOT suggest fallback products Bob cannot access.`;
```

---

### 4. REGO Validation with Retry Limits (bob-chat/index.ts)

**New Feature:** Track failed REGO attempts and escalate gracefully

**Add conversation tracking:**
```typescript
// Near line 1850, before REGO extraction
const regoAttemptCount = (conversationMessages.filter(m => 
  m.role === 'user' && containsRegoPattern(m.content)
).length);

if (regoAttemptCount >= 3) {
  // Escalate to make/model/year input
  conversationMessages.push({
    role: "system",
    content: `[REGO VALIDATION LIMIT] User has attempted ${regoAttemptCount} REGO lookups without success. 
    Suggest they provide make, model, and year instead. 
    Do NOT keep asking for REGO – try alternative identification.`
  });
}
```

---

### 5. Error Analytics Logging (bob-chat/index.ts)

**New Feature:** Log error events for iterative improvement

**Add logging function:**
```typescript
async function logErrorEvent(
  errorType: string,
  vehicleContext: { vehicleId?: number; make?: string; model?: string; rego?: string },
  additionalData?: Record<string, unknown>
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('bob_error_logs').insert({
      error_type: errorType,
      vehicle_id: vehicleContext.vehicleId,
      vehicle_make: vehicleContext.make,
      vehicle_model: vehicleContext.model,
      rego: vehicleContext.rego,
      additional_data: additionalData,
      created_at: new Date().toISOString()
    });
    
    console.log(`[Error Analytics] Logged: ${errorType}`);
  } catch (e) {
    console.warn('[Error Analytics] Failed to log:', e);
  }
}
```

**Call logging at error points:**
```typescript
// In retrieveParts error handling
if (!partsResult.success) {
  await logErrorEvent(partsResult.errorType || 'unknown', {
    vehicleId: vehicleId,
    make: effectiveVehicleContext?.make,
    model: effectiveVehicleContext?.model
  }, { retryCount, rawError: partsResult.error });
}
```

---

### 6. Database Migration for Error Logging

**New table: `bob_error_logs`**

```sql
CREATE TABLE IF NOT EXISTS bob_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  vehicle_id INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  rego TEXT,
  additional_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_bob_error_logs_type ON bob_error_logs(error_type);
CREATE INDEX idx_bob_error_logs_created ON bob_error_logs(created_at);

-- RLS: Only service role can insert/read (backend only)
ALTER TABLE bob_error_logs ENABLE ROW LEVEL SECURITY;
```

---

### 7. Documentation Update (BOB-PROCESS-FLOW.md)

**Update Section 9: NO_PARTS_FOUND**
```text
### 9. NO_PARTS_FOUND
**Trigger:** APIs succeed but return empty arrays  
**Response Variations (cycle for naturalness):**
1. "Ah, Bob's parts system isn't set up for your [VEHICLE] yet. Head over to carfix.co.nz and browse manually!"
2. "No parts coming up for your [VEHICLE] – common with imports. Try carfix.co.nz for the full catalogue!"
3. "Drawing a blank, mate. Pop over to carfix.co.nz – they'll have what you need!"

**CRITICAL:** Bob does NOT offer universal products – he directs to website only

**Metrics:** Track drop-off rate post-message (target <20%)
**Analytics:** Log to bob_error_logs for catalog expansion prioritization
```

**Update Section 10: PARTS_FETCH_ERROR**
```text
### 10. PARTS_FETCH_ERROR
**Trigger:** API returns 500, timeout, or network error  
**Response Variations (cycle for naturalness, add Bob humor):**
1. "Bob's taking a quick pit stop! Try refreshing, or hop over to carfix.co.nz."
2. "Bit of a glitch on my end, mate. Give it another go, or browse at carfix.co.nz."
3. "She's playing up – try refreshing or head to the website!"

**Retry Logic:** 
- 1 silent retry after 2s delay
- If fails: transparent message with humor + website fallback

**Metrics:** Track retry success rate, time to recovery
**Analytics:** Log error type and vehicle context for uptime improvements
```

**Add Section: Invalid REGO Handling**
```text
### 4a. INVALID_REGO_FORMAT
**Trigger:** User input matches no valid NZ plate pattern  
**Response (Acknowledgment + Clarification):**
"Oops, I didn't quite catch that! I need a valid NZ plate like ABC123."

**Retry Limit:** After 2-3 failed attempts:
"Having trouble with the rego – how about you tell me the make, model, and year instead?"

**Metrics:** Track retry-to-success rate (target 70%+)
**UX:** Consider adding input field with format hint
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bob-chat/index.ts` | Year mapping fix, enhanced error prompts, retry limits, analytics logging |
| `packages/bob-widget/BOB-PROCESS-FLOW.md` | Updated state documentation with variations, metrics, new states |
| **NEW:** Database migration | Create `bob_error_logs` table |

---

## Testing Verification

After implementation:
1. **REGO "AMA993"** (Toyota RAV4) → Verify year displays correctly (not "undefined")
2. **Parts fetch failure** → Verify Bob says "head to carfix.co.nz" (NOT "universal products")
3. **Multiple invalid REGOs** → Verify escalation to make/model/year input after 3 attempts
4. **Response variety** → Verify different phrases on repeated errors
5. **Analytics** → Verify `bob_error_logs` captures error events

---

## Expected Outcomes

- **20-30% UX improvement** based on e-commerce benchmarks
- **Trust building** through transparent acknowledgment
- **Reduced churn** via actionable recovery paths
- **Data-driven iteration** via error analytics
- **Kiwi personality** with light humor on connection issues

