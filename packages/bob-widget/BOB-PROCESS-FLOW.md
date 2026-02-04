# Bob's Conversation Process Flow

This document defines the complete state machine for Bob's conversation flow, including all error handling scenarios with response variety.

---

## STATE DIAGRAM

```
                           ┌─────────────────────┐
                           │     PAGE_LOAD       │
                           │ (Initial greeting)  │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   AWAITING_REGO     │
                           │ "What's your rego?" │
                           └──────────┬──────────┘
                                      │ User provides REGO
                                      ▼
                     ┌────────────────────────────────┐
                     │    VEHICLE_LOOKUP_IN_PROGRESS  │
                     │  (researching animation plays) │
                     └───────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
   ┌─────────────────┐   ┌─────────────────────┐  ┌──────────────────┐
   │ VEHICLE_NOT_    │   │ MULTIPLE_VARIANTS   │  │ SINGLE_MATCH     │
   │ FOUND           │   │ _FOUND              │  │ _CONFIRMED       │
   │                 │   │ (show variant cards)│  │ (auto-confirm)   │
   └────────┬────────┘   └──────────┬──────────┘  └────────┬─────────┘
            │                       │                      │
            │                       │ User selects variant │
            │                       ▼                      │
            │            ┌─────────────────────┐           │
            │            │  VARIANT_CONFIRMED  │◄──────────┘
            │            └──────────┬──────────┘
            │                       │
            │                       ▼
            │            ┌─────────────────────────┐
            │            │ PARTS_FETCH_IN_PROGRESS │
            │            │ (searching animation)   │
            │            │ (Retry x1 if error)     │
            │            └────────────┬────────────┘
            │                         │
            │      ┌──────────────────┼──────────────────┐
            │      │                  │                  │
            │      ▼                  ▼                  ▼
            │ ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
            │ │ PARTS_FOUND │  │ NO_PARTS_    │  │ PARTS_FETCH_     │
            │ │ (display    │  │ FOUND        │  │ ERROR            │
            │ │  products)  │  │ "Head to     │  │ "Refresh or      │
            │ └──────┬──────┘  │ carfix.co.nz"│  │  carfix.co.nz?"  │
            │        │         └──────┬───────┘  └────────┬─────────┘
            │        ▼                ▼                   ▼
            │ ┌──────────────────────────────────────────────────────┐
            └►│             CONVERSATION (With rephrase option)      │
              │ Ready to help, handle follow-up questions            │
              └──────────────────────────────────────────────────────┘
```

---

## STATE DEFINITIONS

### 1. PAGE_LOAD
**Trigger:** Widget initialized  
**Bob's Action:** Play greeting audio, wave animation  
**Next State:** AWAITING_REGO  
**Error Handling:** If greeting audio fails, proceed silently  

### 2. AWAITING_REGO
**Trigger:** No vehicle context, user hasn't provided REGO  
**Bob's Action:** Prompt for REGO or make/model  
**User Input Expected:** License plate (e.g., "ABC123") or vehicle description  
**Next State:**
- User provides REGO → VEHICLE_LOOKUP_IN_PROGRESS
- User asks general question → CONVERSATION  

### 3. VEHICLE_LOOKUP_IN_PROGRESS
**Trigger:** REGO detected in user message  
**Bob's Action:** 
- Play "researching" animation
- Play "rego_searching" audio clip
- Call `retrieve-vehicle-info` API  
**Duration:** ~2-5 seconds  
**Next States:**
- API returns single match → SINGLE_MATCH_CONFIRMED
- API returns multiple variants → MULTIPLE_VARIANTS_FOUND
- API returns error/no match → VEHICLE_NOT_FOUND

### 4. VEHICLE_NOT_FOUND
**Trigger:** `retrieve-vehicle-info` returns error or no matches  
**Response Variations (cycle for naturalness):**
1. "Couldn't find a match for [REGO] in the system. Might be too new or an import. Try the make, model, and year?"
2. "Hmm, [REGO] isn't showing up. Sometimes newer cars take a while to get catalogued. Got the make and model handy?"
3. "No joy on [REGO], mate. Could be a typo, or it might be a fresh import. Mind double-checking?"

**Bob's Tone:** Apologetic, helpful, offers alternative  
**Audio:** Play "vehicle_not_found" clip  
**Next State:** AWAITING_REGO (retry loop)  

### 4a. INVALID_REGO_FORMAT ⚠️ NEW STATE
**Trigger:** User input matches no valid NZ plate pattern  
**Response Variations (Acknowledgment + Clarification):**
1. "Oops, I didn't quite catch that one! I need a valid NZ plate like ABC123 or HZP550."
2. "Hmm, that doesn't look like a Kiwi rego to me. Mind trying again? Format's usually ABC123."
3. "No luck with that plate, mate. Double-check it's a standard NZ format like ABC123?"

**Retry Limit:** After 2-3 failed attempts:
"We're having a bit of trouble with that rego. How about you tell me the make, model, and year instead?"

**Metrics:** Track retry-to-success rate (target 70%+)
**Analytics:** Log to bob_error_logs with error_type='invalid_rego_format'
**UX:** Consider adding input field with format hint

### 5. MULTIPLE_VARIANTS_FOUND
**Trigger:** `retrieve-vehicle-info` returns >1 unique variants  
**Bob's Action:**
- Display variant selection cards on shelf
- Present numbered list in speech
- Wait for user selection  
**Bob's Response:**  
```
"I found [N] versions of the [MAKE] [MODEL]. Which one is yours?

1) 2.0L Petrol · 110kW · 1AZ-FE
2) 2.4L Petrol · 125kW · 2AZ-FE  
3) 2.2L Diesel · 130kW · 2AD-FTV

Just say the number or tap your choice, mate."
```
**Next State:** User selects variant → VARIANT_CONFIRMED  
**Timeout (30s):** Prompt again or offer to start over  

### 6. SINGLE_MATCH_CONFIRMED / VARIANT_CONFIRMED
**Trigger:** Single match from API, or user selected a variant  
**Bob's Action:**
- Emit `vehicle_identified` event
- Store vehicle context
- Immediately trigger parts/packages fetch  
**Bob's Response:**  
```
"Sweet, got it! [YEAR] [MAKE] [MODEL] – [VARIANT_PERSONALITY]. 
Pulling up what we've got for you now..."
```
**Audio:** Play "parts_searching" clip  
**Next State:** PARTS_FETCH_IN_PROGRESS  

### 7. PARTS_FETCH_IN_PROGRESS
**Trigger:** Vehicle confirmed  
**Bob's Action:**
- Call `retrieve-parts` + `calculate-service-bundles` in parallel
- Show "researching" or "showing_product" animation  
**Duration:** ~2-5 seconds  
**Retry Logic:**
- 1 silent retry after 2s delay if first attempt fails
- If retry fails: transition to PARTS_FETCH_ERROR

**Next States:**
- Both APIs succeed with data → PARTS_FOUND
- APIs succeed but empty → NO_PARTS_FOUND
- API returns 500 or error → PARTS_FETCH_ERROR

### 8. PARTS_FOUND
**Trigger:** `retrieve-parts` returns parts array, `calculate-service-bundles` returns packages  
**Bob's Action:**
- Emit `parts_found` event (products appear on shelf)
- Emit `service_packages_found` event (packages appear)
- Transition to "showing_product" animation  
**Bob's Response:**  
```
"Here's what we've got for your [MAKE] [MODEL]. 
I'd recommend checking out the [CARFIX_VALUE_TIER] 
[PACKAGE_NAME] at $[PRICE] – it's a sweet deal.
What are you working on today?"
```
**Next State:** CONVERSATION  

### 9. NO_PARTS_FOUND
**Trigger:** APIs succeed but return empty arrays  
**Response Variations (cycle for naturalness) – Direct to carfix.co.nz:**
1. "Ah, Bob's parts system isn't set up for your [VEHICLE] yet. Head over to carfix.co.nz and browse manually – the team there will sort you!"
2. "No parts coming up for your [VEHICLE] in my system – sometimes happens with imports. Try carfix.co.nz for the full catalogue!"
3. "Drawing a blank for your [VEHICLE], mate. Best bet is to pop over to carfix.co.nz and browse there!"

**CRITICAL:** Bob does NOT offer universal products – he directs to website only

**Bob's Tone:** Apologetic but helpful, directs to manual browsing  
**Metrics:** Track drop-off rate post-message (target <20%)
**Analytics:** Log to bob_error_logs for catalog expansion prioritization
**Next State:** CONVERSATION  

### 10. PARTS_FETCH_ERROR ⚠️ ENHANCED STATE
**Trigger:** API returns 500, timeout, or network error  
**Response Variations (cycle for naturalness, add Bob humor):**
1. "Bob's taking a quick pit stop! Having trouble connecting – try refreshing, or hop over to carfix.co.nz while we sort this out."
2. "Bit of a glitch on my end, mate. Give the page a refresh, or browse directly at carfix.co.nz."
3. "She's playing up a bit – connection trouble. Try again in a tick, or carfix.co.nz has what you need!"

**CRITICAL:** Bob does NOT offer fallback products – he directs to website

**Retry Logic:** 
- 1 silent retry after 2s delay
- If fails: transparent message with humor + website fallback

**Bob's Tone:** Apologetic, transparent about the issue, offers recovery path
**Metrics:** Track retry success rate, time to recovery
**Analytics:** Log error type and vehicle context for uptime improvements
**Error Logging:** Log full error to bob_error_logs for debugging  
**Next State:** CONVERSATION (degraded mode)  

### 11. CONVERSATION
**Trigger:** Any terminal state above  
**Bob's Action:** Ready to answer questions, guide to products  
**Capabilities in this state:**
- Answer product questions
- Recommend add-ons
- Add items to cart
- Navigate to checkout
- Start over with a new vehicle  

---

## ERROR SCENARIO HANDLING MATRIX

| Error Type | API Response | Bob's Response | Audio Clip | Next Action |
|------------|--------------|----------------|------------|-------------|
| Invalid REGO format | N/A | "That doesn't look like a NZ plate..." (varied) | - | Re-prompt, escalate after 3 tries |
| Vehicle not found | 404 or empty | "Couldn't find that rego..." (varied) | vehicle_not_found | Re-prompt |
| Multiple variants | 200 + vehicles[] | "Which version is yours?" | - | Show cards |
| Parts not in catalog | vehicle_not_in_parts_db | "Head to carfix.co.nz..." (varied) | - | Direct to website |
| Parts API 500 | 500 | "Bob's taking a pit stop..." (varied) | - | Retry, then fallback to website |
| Parts API timeout | timeout | "Taking longer than expected..." | - | Retry, then fallback to website |
| Service packages empty | 200 + [] | "No packages catalogued yet..." | - | Direct to website |
| Network error | fetch fails | "Connection issue..." (varied) | - | Suggest refresh or website |
| Rate limited | 429 | "Busy right now, hold on..." | - | Wait and retry |

---

## AUDIO CLIP TRIGGERS

| clip_key | Trigger Context | When to Play |
|----------|-----------------|--------------|
| greeting_welcome | First page load, new user | PAGE_LOAD |
| greeting_returning | Returning user detected | PAGE_LOAD |
| ask_rego | User asks for vehicle parts without REGO | AWAITING_REGO |
| rego_searching | REGO lookup started | VEHICLE_LOOKUP_IN_PROGRESS |
| vehicle_not_found | Lookup returns no match | VEHICLE_NOT_FOUND |
| parts_searching | Vehicle confirmed, fetching parts | PARTS_FETCH_IN_PROGRESS |
| no_parts_found | Parts fetch returns empty | NO_PARTS_FOUND |
| checkout_ready | Cart ready for purchase | CHECKOUT |

---

## RETRY LOGIC

### Parts/Packages Fetch
1. First attempt fails → Wait 2 seconds
2. Retry with same vehicle_id
3. Retry fails → Emit PARTS_FETCH_ERROR state
4. Direct to carfix.co.nz for manual browsing

### Vehicle Lookup  
1. First attempt fails → Prompt user to re-check plate (varied response)
2. User provides same plate again → Retry
3. Still fails → Suggest make/model/year input instead

### REGO Validation
1. First invalid format → Acknowledge + clarify (varied response)
2. Second invalid → Prompt with example format
3. Third invalid → Escalate to make/model/year input

---

## FRONTEND SSE EVENT HANDLING

The widget must handle these events:

| Event Type | Payload | UI Action |
|------------|---------|-----------|
| vehicle_identified | { vehicle: {...} } | Show vehicle header, enable parts shelf |
| vehicle_candidates_found | { candidates: [...] } | Display variant selection cards |
| variant_selection_required | { candidates, make, model, promptText } | Show structured variant cards |
| parts_found | { parts: [...] } | Populate product shelf |
| service_packages_found | { packages: [...] } | Display service package tiles |
| no_parts_found | { reason } | Show empty state, direct to website |
| parts_fetch_error | { errorType, message, canRetry } | Show error + retry option |
| multiple_vehicles_found | {} | Suppress no_parts_found, wait for selection |
| bob_searching | { search_type, audio_url } | Play searching animation + audio |
| audio_hint | { audio_url, clip_key } | Play pre-recorded audio |
| cart_updated | { items: [...] } | Update cart badge |
| error | { message } | Display error banner, log to analytics |

---

## ERROR ANALYTICS LOGGING

All error events are logged to `bob_error_logs` table for analytics:

| Field | Description |
|-------|-------------|
| error_type | Classification: invalid_rego_format, vehicle_not_found, vehicle_not_in_parts_db, server_error, timeout, network_error, empty_results |
| vehicle_id | Numeric vehicle ID if available |
| vehicle_make | Make string for catalog tracking |
| vehicle_model | Model string for catalog tracking |
| rego | Registration plate for lookup analysis |
| additional_data | JSONB with context (retry count, raw error, etc.) |
| created_at | Timestamp for time-series analysis |

**Analytics Use Cases:**
- Track which vehicles lack catalog coverage (prioritize expansion)
- Monitor API reliability (uptime metrics)
- Measure REGO retry-to-success rate
- Identify drop-off patterns for UX improvements

---

## IMPLEMENTATION CHECKLIST

- [x] Add PARTS_FETCH_ERROR state handling to bob-chat
- [x] Add retry logic with 2s delay for parts/packages fetch
- [x] Add year_of_manufacture priority in vehicle context
- [x] Update error prompts to direct to carfix.co.nz (no universal products)
- [x] Add response variations for naturalness
- [x] Add error analytics logging to bob_error_logs table
- [ ] Create "connection_error" audio clip
- [ ] Update frontend to handle "parts_fetch_error" event with retry button
- [x] Add timeout handling (15s) for API calls
- [ ] Create degraded mode UI for when parts unavailable
- [ ] Test all error scenarios end-to-end
