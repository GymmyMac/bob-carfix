
# Option B Implementation Plan - Hybrid State Machine Architecture

## Executive Summary
This plan implements a robust, deterministic state machine for Bob's vehicle identification and variant selection flow, with a global audio controller to prevent overlap. The AI is relegated to conversational polish only, while critical decisions (REGO detection, variant matching, parts fetching) happen deterministically on the server.

## Root Causes of Current Failures

### Issue 1: Audio Overlap (Canned + TTS)
The backend emits a `bob_searching` event with audio URL, which plays via `searchingAudioQueueRef`. Then, separately, an `audio_hint` or AI response triggers TTS. Neither system knows about the other, causing simultaneous playback.

**Specific Failure Flow:**
1. User says "MKT21"
2. Backend emits `bob_searching` event for "parts_searching.mp3"
3. Frontend queues and plays searching audio
4. Stream completes → AI response triggers TTS
5. TTS plays OVER the still-playing searching audio

### Issue 2: Multi-Variant Not Handled Correctly
The forced REGO lookup finds 4 Toyota Altezza variants, stores them in `_multipleVehicleCandidates`, but:
- AI response says "She's a TOYOTA ALTEZZA, sweet as" without listing variants
- No deterministic selection is attempted on the SAME request
- Response audio plays while user hasn't selected anything
- UI shows empty shelf

### Issue 3: Vehicle ID Mismatch
When parts are fetched, the `vehicle_id` from TecDoc mapping (e.g., `5002`) is passed to the external `retrieve-parts` API which returns 500 "Vehicle not found". The external API may expect a different ID format.

### Issue 4: Allowed Origins Missing
The `bob_partners.allowed_origins` array doesn't include the preview domain pattern.

---

## Implementation Plan

### Phase 1: Global Audio Controller (30 minutes)

**File: `packages/bob-widget/src/hooks/useBobChat.ts`**

Create a centralized audio controller that prevents overlap:

```text
CHANGES:
1. Add new refs for audio state management:
   - audioControllerRef: { 
       source: 'none' | 'searching' | 'canned' | 'tts',
       isPlaying: boolean,
       queue: AudioQueueItem[]
     }

2. Create helper functions:
   - stopAllAudio(): Stop any playing audio and clear queues
   - queueAudio(source, url, priority): Add to queue with priority
   - playNextFromQueue(): Process queue FIFO with priority override

3. Modify bob_searching handler:
   - Stop any TTS in progress when searching audio starts
   - Use audioControllerRef instead of separate isPlayingSearchingRef

4. Modify audio_hint handler:
   - Set a flag: skipTTSForCurrentMessage = true
   - This prevents TTS from playing when canned audio exists

5. After stream completes:
   - Check skipTTSForCurrentMessage BEFORE calling speak()
   - If canned audio is queued/playing, skip TTS entirely
   - Only call speak() if no canned audio exists
```

**Key Logic:**
```typescript
// Priority order: canned > searching > tts
// When higher priority audio starts, stop lower priority

// In stream parsing, when receiving audio_hint:
if (parsed.type === "audio_hint" && parsed.audio_url) {
  audioControllerRef.current.hasCannedAudio = true;
  audioControllerRef.current.cannedUrl = parsed.audio_url;
  stopAllAudio(); // Stop any searching audio
  continue;
}

// After stream completes:
if (!isMuted && latestAssistantMessageRef.current.trim()) {
  if (audioControllerRef.current.hasCannedAudio) {
    // Play canned audio ONLY - skip TTS
    playAudio(audioControllerRef.current.cannedUrl, 'canned');
    audioControllerRef.current.hasCannedAudio = false;
    audioControllerRef.current.cannedUrl = null;
  } else if (!audioControllerRef.current.isPlaying) {
    // Only TTS if nothing else is playing
    speak(ttsText);
  }
}
```

### Phase 2: Conversation State Machine (1 hour)

**File: `supabase/functions/bob-chat/index.ts`**

Add explicit conversation state tracking:

```text
CONVERSATION STATES:
- AWAITING_REGO: No vehicle context, need registration
- AWAITING_VARIANT_SELECTION: Multiple variants found, waiting for user choice
- VEHICLE_CONFIRMED: Vehicle selected, parts/packages loaded
- CONVERSATION: General chat with confirmed vehicle
```

**State Determination Logic (before AI call):**

```typescript
type ConversationState = 
  | 'AWAITING_REGO'
  | 'AWAITING_VARIANT_SELECTION'  
  | 'VEHICLE_CONFIRMED'
  | 'CONVERSATION';

function determineConversationState(
  vehicleContext: unknown,
  forcedCandidates: VehicleCandidate[],
  clientCandidates: VehicleCandidate[],
  deterministicVehicle: VehicleCandidate | null
): ConversationState {
  // Already have confirmed vehicle
  if (vehicleContext || deterministicVehicle) {
    return 'VEHICLE_CONFIRMED';
  }
  
  // Multiple variants found - need user selection
  if (forcedCandidates.length > 1 || clientCandidates.length > 1) {
    return 'AWAITING_VARIANT_SELECTION';
  }
  
  return 'AWAITING_REGO';
}
```

**State-Driven Response Generation:**

When state = `AWAITING_VARIANT_SELECTION`:
1. DO NOT call AI for this response
2. Generate variant list directly from candidates
3. Stream pre-built response text
4. Include natural language helper: "Reply with the number or describe it (e.g., 'the 2.0L one')"

```typescript
if (conversationState === 'AWAITING_VARIANT_SELECTION') {
  const variantList = allCandidates.map((c, i) => {
    const cc = c.cc_rating ? `${(c.cc_rating / 1000).toFixed(1)}L` : '';
    const fuel = c.fuel_type || '';
    const kw = extractKwFromName(c.vehicle_name_nz) || '';
    const eng = c.engine_code || '';
    return `${i + 1}) ${cc} ${fuel} ${kw} ${eng}`.trim() || `Option ${i + 1}`;
  }).join('\n');
  
  const response = `I found ${allCandidates.length} versions of that model. Which one is yours?\n\n${variantList}\n\nJust say the number or describe it (e.g., 'the diesel one'), mate.`;
  
  // Stream this directly - NO AI call
  return streamDirectResponse(response, {
    emitCandidates: true,
    candidates: allCandidates,
    skipTTS: false // Use TTS for this message
  });
}
```

### Phase 3: Enhanced Deterministic Matcher (30 minutes)

**File: `supabase/functions/bob-chat/index.ts`**

Enhance `matchUserInputToCandidate` with your refinements:

```text
MATCHING PRIORITY:
1. Option number: "1", "2", "option 1", "the first one", "#2"
2. Direct vehicle_id: User types exact 4-6 digit ID
3. Engine code: "3S-GE", "1G-FE", "K20A" (case insensitive)
4. Displacement/CC: "2.0", "2.0L", "2000", "2000cc", "2 litre"
5. Power/kW: "150kw", "103 kW"
6. Fuel type: "petrol", "diesel" (only if unique match)
7. Substring fuzzy: Match 2+ keywords against vehicle_name_nz
8. Affirmative + single/top-scored: "yes", "that's it"
```

**NEW: Add fuzzy/semantic matching for descriptive inputs:**
```typescript
// Method 9: Descriptive matching (e.g., "the silver one", "the bigger engine")
const descriptivePatterns = [
  { pattern: /big(?:ger)?|larger?/i, compareFn: (a, b) => (b.cc_rating || 0) - (a.cc_rating || 0) },
  { pattern: /small(?:er)?|lighter?/i, compareFn: (a, b) => (a.cc_rating || 0) - (b.cc_rating || 0) },
  { pattern: /newer|later/i, compareFn: (a, b) => (b.start_year || 0) - (a.start_year || 0) },
  { pattern: /older|earlier/i, compareFn: (a, b) => (a.start_year || 0) - (b.start_year || 0) },
];

for (const { pattern, compareFn } of descriptivePatterns) {
  if (pattern.test(input)) {
    const sorted = [...candidates].sort(compareFn);
    if (sorted[0]) {
      return { candidate: sorted[0], method: 'descriptive' };
    }
  }
}
```

### Phase 4: State Emission + Frontend Sync (30 minutes)

**Backend: Emit conversation_state event**

```typescript
// At stream start, emit current state
const stateEvent = `data: ${JSON.stringify({ 
  type: "conversation_state", 
  state: conversationState,
  candidates: conversationState === 'AWAITING_VARIANT_SELECTION' ? allCandidates : undefined
})}\n\n`;
controller.enqueue(encoder.encode(stateEvent));
```

**Frontend: Handle state and update UI**

```typescript
// In useBobChat.ts stream parsing:
if (parsed.type === "conversation_state") {
  console.log('[useBobChat] Conversation state:', parsed.state);
  // Store state for UI hints
  conversationStateRef.current = parsed.state;
  
  // Callback for UI updates
  callbacks.onConversationStateChange?.(parsed.state);
  
  if (parsed.candidates) {
    vehicleCandidatesRef.current = parsed.candidates;
  }
  continue;
}
```

**UI Hints (optional future enhancement):**
- When state = AWAITING_VARIANT_SELECTION: Show "Select your variant" hint in chat
- When state = VEHICLE_CONFIRMED: Enable product shelf display
- Disable shelf during AWAITING_REGO state

### Phase 5: Fix Vehicle ID for Parts API (15 minutes)

**Investigation needed:** The `retrieve-parts` API at `flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-parts` returns 500 for `vehicle_id=5002`. 

**Potential Fixes:**
1. Check if API expects `vehicle_id` (TecDoc) vs `id` (CarJam) 
2. Log both IDs from lookup response and try both
3. Add fallback: If first ID fails with 500, try the other

```typescript
async function retrievePartsWithFallback(
  candidate: VehicleCandidate,
  apiConfig: ApiConfig
): Promise<{ success: boolean; parts: unknown[] }> {
  // Try TecDoc vehicle_id first
  const primaryId = candidate.vehicle_id;
  const fallbackId = candidate.id;
  
  console.log(`[retrieveParts] Trying primary ID: ${primaryId}`);
  let result = await retrieveParts(primaryId, apiConfig);
  
  if (!result.success && fallbackId && fallbackId !== primaryId) {
    console.log(`[retrieveParts] Primary failed, trying fallback ID: ${fallbackId}`);
    result = await retrieveParts(fallbackId, apiConfig);
  }
  
  return result;
}
```

### Phase 6: Database Update - Allowed Origins (5 minutes)

**SQL to run:**
```sql
UPDATE bob_partners 
SET allowed_origins = array_cat(
  allowed_origins, 
  ARRAY['https://preview--bob-carfix.lovable.app', 'https://*.lovable.app']
)
WHERE partner_code = 'CARFIX' 
  AND NOT ('https://preview--bob-carfix.lovable.app' = ANY(allowed_origins));
```

### Phase 7: Add Comprehensive Logging (15 minutes)

**Structured logs for debugging:**

```typescript
// At state determination
console.log(`[State Machine] Determined state: ${conversationState}`, {
  hasVehicleContext: !!vehicleContext,
  forcedCandidatesCount: forcedCandidates.length,
  clientCandidatesCount: clientCandidates.length,
  deterministicMatch: deterministicSelectionMethod,
});

// At variant selection
console.log(`[Variant Selection]`, {
  userMessage: lastUserContent.slice(0, 60),
  method: matchResult?.method || 'none',
  selectedVehicleId: matchResult?.candidate?.vehicle_id,
  selectedVehicleName: matchResult?.candidate?.vehicle_name_nz,
});

// At fetch results
console.log(`[Data Fetch]`, {
  partsCount: partsResult.parts?.length || 0,
  packagesCount: displayablePackages?.length || 0,
  partsSuccess: partsResult.success,
  packagesSuccess: packagesResult.success,
  partsError: partsResult.error,
});

// At stream emission
console.log(`[Stream Emission Summary]`, {
  emittedVehicle: vehicleEmitted,
  emittedPackages: packagesToSend?.length || 0,
  emittedParts: partsToEmit?.length || 0,
  emittedNoPartsFound: !partsEmitted && confirmedVehicleStored,
  conversationState,
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/bob-widget/src/hooks/useBobChat.ts` | Global audio controller, state sync, prevent TTS overlap |
| `supabase/functions/bob-chat/index.ts` | State machine, deterministic response generation, enhanced matcher, logging |
| Database: `bob_partners` | Add preview domain to allowed_origins |

---

## Testing Plan

### Test 1: Multi-Variant REGO (MKT21)
1. Open /ask-bob
2. Type "MKT21"
3. **Expected:**
   - Bob presents numbered list of variants (no AI deciding)
   - NO TTS overlap with searching audio
   - Shelf stays empty until selection
4. Type "1" or "the 2.0L one"
5. **Expected:**
   - Deterministic matcher selects correct variant
   - Parts AND packages load
   - Bob confirms selection conversationally

### Test 2: Single-Variant REGO
1. Type a REGO that returns single match (e.g., "HZP550")
2. **Expected:**
   - Auto-confirm immediately
   - Parts and packages load
   - No variant selection prompt

### Test 3: Audio Overlap Prevention
1. Type any REGO
2. **Expected:**
   - Searching audio plays
   - When response comes, searching audio stops
   - Only ONE audio source plays at a time

### Test 4: REGO in Sentence
1. Type "MKT21 I need brake pads"
2. **Expected:**
   - Forced lookup extracts REGO
   - Variant list presented OR parts loaded (single match)
   - No "what's your rego?" response

### Test 5: Regression - General Chat
1. Type "Hi Bob"
2. **Expected:**
   - Normal greeting response
   - No crashes or errors

---

## Sequence Diagram - Fixed Flow

```text
User: "MKT21"
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. extractRegoFromText → "MKT21"        │
│ 2. Force lookupVehicle call             │
│ 3. Result: 4 variants                   │
│ 4. State = AWAITING_VARIANT_SELECTION   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. SKIP AI - Generate variant list      │
│    directly from candidates             │
│ 6. Emit vehicle_candidates_found        │
│ 7. Emit conversation_state event        │
│ 8. Stream variant list text             │
└─────────────────────────────────────────┘
    │
    ▼
Frontend receives → Shows variant list
Frontend stores candidates in vehicleCandidatesRef

User: "2" or "the diesel one"
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Request includes vehicleCandidates   │
│ 2. matchUserInputToCandidate runs       │
│ 3. Match found: option_number or        │
│    fuel_type method                     │
│ 4. State = VEHICLE_CONFIRMED            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. Fetch parts + packages in parallel   │
│ 6. Store in _partsToEmit, etc.          │
│ 7. Add system context for AI            │
│ 8. Call AI for conversational response  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 9. Emit vehicle_identified              │
│ 10. Emit service_packages_found         │
│ 11. Emit parts_found                    │
│ 12. Stream AI text (confirmation)       │
└─────────────────────────────────────────┘
    │
    ▼
Frontend: Shelf populates, Bob confirms selection
Audio: Only TTS plays (no overlap)
```

---

## Guardrails

Even after state machine implementation, add AI prompt guardrails as fallback:

```text
GUARDRAIL PROMPT ADDITION:
"CRITICAL: You are NOT responsible for vehicle confirmation. The system handles this deterministically.
- If you receive a system message saying '[VEHICLE LOOKUP COMPLETED - MULTIPLE VARIANTS FOUND]', 
  present the variants as listed. Do NOT add your own options.
- If you receive '[VEHICLE CONFIRMED AUTOMATICALLY]', acknowledge the confirmed vehicle.
- NEVER say 'loading parts' or 'fetching' until you see a system message confirming parts are loaded.
- If unsure about the vehicle, ask for clarification. Better to ask than to assume wrong."
```
