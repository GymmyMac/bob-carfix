# Bob's Conversation Process Flow

This document defines the complete state machine for Bob's conversation flow, including all error handling scenarios.

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
            │            └────────────┬────────────┘
            │                         │
            │      ┌──────────────────┼──────────────────┐
            │      │                  │                  │
            │      ▼                  ▼                  ▼
            │ ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
            │ │ PARTS_FOUND │  │ NO_PARTS_    │  │ PARTS_FETCH_     │
            │ │ (display    │  │ FOUND        │  │ ERROR            │
            │ │  products)  │  │ (empty state)│  │ (API failure)    │
            │ └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘
            │        │                │                   │
            │        ▼                ▼                   ▼
            │ ┌──────────────────────────────────────────────────┐
            └►│                 CONVERSATION                     │
              │ (Ready to help, handle follow-up questions)      │
              └──────────────────────────────────────────────────┘
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
**Bob's Response:**  
```
"Hmm, I couldn't find a vehicle for that rego [PLATE] in the system. 
Could be a typo or maybe it's a newer/imported vehicle that's not 
in the database yet. Mind double-checking the plate, or tell me the 
make, model and year instead?"
```
**Bob's Tone:** Apologetic, helpful, offers alternative  
**Audio:** Play "vehicle_not_found" clip  
**Next State:** AWAITING_REGO (retry loop)  

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
**Bob's Response:**  
```
"Ah, looks like we don't have specific parts catalogued for 
your [YEAR] [MAKE] [MODEL] yet. No worries though! 
I can help you find universal items like wipers, batteries, 
or cleaning gear. Or if you know the part number, I can 
search that for you. What do you need?"
```
**Bob's Tone:** Apologetic but helpful, offers alternatives  
**Next State:** CONVERSATION  

### 10. PARTS_FETCH_ERROR ⚠️ NEW STATE
**Trigger:** API returns 500, timeout, or network error  
**Bob's Response:**  
```
"Aw heck, I'm having a bit of trouble connecting to the 
parts database right now. Give me a sec to try again..."
[Retry once after 2s delay]

If retry fails:
"Still no luck, mate. There might be a glitch in the system. 
You could try refreshing the page, or I can help you with 
general products that don't need vehicle matching – things 
like cleaning supplies, tools, or accessories. What do you reckon?"
```
**Bob's Tone:** Apologetic, transparent about the issue, offers fallback  
**Error Logging:** Log full error for debugging  
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
| Invalid REGO format | N/A | "That doesn't look like a NZ plate..." | - | Re-prompt |
| Vehicle not found | 404 or empty | "Couldn't find that rego..." | vehicle_not_found | Re-prompt |
| Multiple variants | 200 + vehicles[] | "Which version is yours?" | - | Show cards |
| Parts API 500 | 500 | "Having trouble connecting..." | - | Retry, then fallback |
| Parts API timeout | timeout | "Taking longer than expected..." | - | Retry, then fallback |
| Service packages empty | 200 + [] | "No packages catalogued yet..." | - | Offer alternatives |
| Network error | fetch fails | "Connection issue..." | - | Check internet, retry |
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
4. Offer degraded experience (general products only)

### Vehicle Lookup  
1. First attempt fails → Prompt user to re-check plate
2. User provides same plate again → Retry
3. Still fails → Suggest make/model/year input instead

---

## FRONTEND SSE EVENT HANDLING

The widget must handle these events:

| Event Type | Payload | UI Action |
|------------|---------|-----------|
| vehicle_identified | { vehicle: {...} } | Show vehicle header, enable parts shelf |
| vehicle_candidates_found | { candidates: [...] } | Display variant selection cards |
| parts_found | { parts: [...] } | Populate product shelf |
| service_packages_found | { packages: [...] } | Display service package tiles |
| no_parts_found | {} | Show empty state with alternatives |
| multiple_vehicles_found | {} | Suppress no_parts_found, wait for selection |
| bob_searching | { search_type, audio_url } | Play searching animation + audio |
| error | { message } | Display error banner, log to analytics |

---

## IMPLEMENTATION CHECKLIST

- [ ] Add PARTS_FETCH_ERROR state handling to bob-chat
- [ ] Add retry logic with 2s delay for parts/packages fetch
- [ ] Create "connection_error" audio clip
- [ ] Add error analytics event tracking
- [ ] Update frontend to handle "parts_fetch_error" event
- [ ] Add timeout handling (15s) for API calls
- [ ] Create degraded mode UI for when parts unavailable
- [ ] Test all error scenarios end-to-end
