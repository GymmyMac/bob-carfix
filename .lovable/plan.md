

# Bob's Complete Process Flow, Canned Speech & Customer Interaction Guide

## Purpose

Create a new standalone Markdown document (`BOB-COMPLETE-PROCESS-FLOW.md` in the project root) that consolidates everything about how Bob interacts with customers. This replaces the existing `packages/bob-widget/BOB-PROCESS-FLOW.md` as the single source of truth. The document will be structured for non-technical editing (e.g., updating response wording, adding canned clips) while containing a technical appendix for developers.

## Document Structure

The file will contain these major sections:

### 1. Bob's Personality & Voice Guide
- Kiwi persona rules, tone calibration (busy vs. chatty customer sensing)
- Approved Kiwi-isms reference list
- "Never offer to fit parts" golden rule
- Confidence-tier language mapping (high/medium/low from Brain results)

### 2. Complete Conversation State Machine
Updated state diagram incorporating the Brain diagnostic path:

```text
PAGE_LOAD -> AWAITING_REGO -> VEHICLE_LOOKUP_IN_PROGRESS
  |-> VEHICLE_NOT_FOUND (retry loop)
  |-> MULTIPLE_VARIANTS_FOUND -> VARIANT_CONFIRMED
  |-> SINGLE_MATCH_CONFIRMED
       |-> PARTS_FETCH_IN_PROGRESS
            |-> PARTS_FOUND -> CONVERSATION
            |-> NO_PARTS_FOUND -> CONVERSATION (degraded)
            |-> PARTS_FETCH_ERROR -> CONVERSATION (degraded)

NEW BRANCH (from CONVERSATION with vehicle context):
CONVERSATION + symptom detected -> BRAIN_DIAGNOSIS_IN_PROGRESS
  |-> DIAGNOSIS_MATCH (shelf scrolls to category, Bob explains physics)
  |-> DIAGNOSIS_NO_MATCH (Bob acknowledges gap, does NOT self-diagnose)
```

Each state will include:
- Trigger condition
- Bob's action (animation, audio, API calls)
- Response variations (3 per state for naturalness)
- Next state transitions
- Error handling

### 3. Brain Diagnostic Flow (NEW section)
- Symptom keyword list (the 40+ keywords that trigger forced `diagnose_symptom`)
- Requirement: vehicle must be confirmed before Brain activates
- Forced `tool_choice` override on first loop iteration
- Confidence tier language rules:
  - High (>0.85): "That's your [X]" (definitive)
  - Medium (0.70-0.85): "Sounds like [X]" (likely)
  - Low (<0.70): "Could be [X]" (possible)
- `highlight_category` SSE event -> shelf auto-scroll
- No-match protocol: acknowledge gap, do NOT self-diagnose, suggest rewording or carfix.co.nz
- Brain -> Parts pipeline: when `partslot_description` returned, auto-fetch filtered parts for that category

### 4. Canned Speech & Audio Clip Reference
Complete table of all 8 active clips from `bob_audio_clips`:

| clip_key | Transcript | Trigger Context | When Played |
|----------|-----------|-----------------|-------------|
| greeting_welcome | "G'day! Bob from CARFIX here..." | First page load, new user | PAGE_LOAD |
| greeting_returning | "Ah hey... you again!..." | Returning user detected | PAGE_LOAD |
| ask_rego | "Just need your rego..." | Parts request without vehicle | AWAITING_REGO (canned bypass) |
| rego_searching | "Sweet! Let's see what car..." | REGO lookup started | VEHICLE_LOOKUP_IN_PROGRESS |
| vehicle_not_found | "Hmm, couldn't find that one..." | Lookup returns no match | VEHICLE_NOT_FOUND |
| parts_searching | "Chur, lets have a wee peek..." | Vehicle confirmed, fetching | PARTS_FETCH_IN_PROGRESS |
| no_parts_found | "Sorry mate, nothing came up..." | Parts fetch returns empty | NO_PARTS_FOUND |
| checkout_ready | "Choice! Ready to checkout." | Cart ready | CHECKOUT |

Plus the canned response bypass system (how `bypass_ai=true` clips skip the LLM entirely).

### 5. Customer Interaction Playbook
Step-by-step script for the ideal customer journey:
1. Welcome & sense urgency
2. Ask for REGO (primary) or make/model/year (fallback)
3. Vehicle small talk (motorsport pedigree, reputation)
4. Ask about symptoms / what's wrong / dashboard lights / OBD2 codes
5. If symptom detected -> Brain diagnosis flow
6. Suggest service packages (always quote CARFIX VALUE tier price)
7. Suggest add-ons (tire shine, windscreen wash, etc.)
8. Never offer fitment - parts only

### 6. Error Handling Matrix
Updated table covering all error scenarios including Brain-specific errors:
- `statement_timeout` from Brain RPC
- `no_match` from Brain (similarity < 0.70)
- `ambiguous column` or other SQL errors
- All existing error types (vehicle_not_found, parts API 500, timeout, etc.)

### 7. SSE Event Reference
Complete event table including the new `highlight_category` event.

### 8. Technical Appendix
- Tool definitions summary (all 11 tools)
- Symptom keyword list (exact array from code)
- Deterministic variant matcher methods
- Vehicle characterization engine (engine code personalities, make modifiers)
- Retry logic specifications
- Error analytics logging schema

## What This Replaces

The existing `packages/bob-widget/BOB-PROCESS-FLOW.md` will remain as-is for now (it's referenced by the widget package). The new document will be the editable master copy that can be updated independently and used to refresh the existing one.

## File Location

`BOB-COMPLETE-PROCESS-FLOW.md` in the project root -- easily accessible for editing outside of the codebase.

