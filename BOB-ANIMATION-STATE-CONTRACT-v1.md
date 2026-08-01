# BOB ANIMATION STATE CONTRACT — v1.0

> **Status:** DEPLOYED 2026-08-01 · TECH-252 (Bob 2.0 epic TECH-249)
> **Purpose:** The renderer-independent definition of how Bob's face follows the conversation. Today the renderer is the frame-based (PNG) player; when the Rive rig is commissioned, the rig's state machine is built to THIS contract — same state keys, same triggers — and only the renderer swaps. **State keys and trigger names below are frozen.** Changing them is a contract revision, not a config tweak.

---

## 1. Canonical states (7)

Stored in `animation_states` (per Look) in the production Supabase; frames in `bob_animations`. The admin panel (this project → Gallery) remains the editing surface.

| State key | Purpose | Trigger (`chat_trigger`) | Frames (Default look) | Loop behaviour |
|---|---|---|---|---|
| `greeting` | First open / recognition beat | `page_load` | 8 (ex-waving 5 + ex-hello 3) | Plays 3 loops → listen |
| `idle` | Nothing happening; alive, not frozen | `idle` (60s inactivity) | 3 | Infinite, slow (700ms) |
| `listening` | Awaiting/receiving customer input | `awaiting_input` | 2 | Infinite |
| `thinking` | Bob is working — tools running, parts lookup | `processing_input` | 2 (ex-researching) | Infinite until response |
| `talking` | Response streaming / TTS speaking | `streaming_response` | 4 | Infinite while speaking |
| `celebrating` | Response complete / cart add — the win beat | `response_complete` | 2 (ex-complete) | 2 loops + pause → listen |
| `showing_product` | Parts/packages landed on the shelf | `showing_product` | 2 | 3s → listen |

**Deactivated (not deleted — art preserved in DB):** `researching` (frames moved to thinking), `hello` (frames moved to greeting), `happy` (had zero frames). Old states remain in `animation_states` with `is_active=false` for history/rollback.

**Deferred state:** `apologetic` (error/empty-result beat) — no art exists and the MVP rule is minimal new frames. Errors currently fall back to idle; when a frame set is produced, add the state with trigger `error` — the contract reserves the name.

## 2. The driver — how the app talks to the face

Chat code NEVER names an image or file — it fires lifecycle events; states resolve via `chat_trigger` lookup (primary) with legacy key fallbacks (safety net). Lifecycle events (carfix-beta widget): initialize → greeting→listen; onUserInput → thinking; onReadyToSpeak → talking; onStreamComplete → celebrating/idle; onShowingProduct → showing_product→listen; onCartAdded (added by TECH-252) → celebrating→listen, skipped while TTS is speaking; 60s inactivity → idle. Interrupt rules: thinking/talking may interrupt anything; greeting/celebrating/showing_product are one-shot beats that auto-return to listening; manual mode (admin panel) suspends all transitions.

## 3. The renderer — swappable by design

Today: RAF frame player (all frames preloaded once — repeated network fetches impossible by construction; per-state speed/pause/loop from DB) + BobCharacter/MobileBobCharacter with a 100ms opacity cross-fade on every image change (added by TECH-252). Future: a RivePlayer implementing the same 7 states + triggers replaces the frame player and character components; the driver, DB contract, admin panel and chat code remain untouched. The Rive animator's brief is §1 of this document, plus ~20 visemes per the Duolingo pipeline when voice ships.

## 4. Change control

Same regime as the Character Bible: this doc first, then DB/panel, then live-verify. Speeds/pauses/loops/frames are FREE to tune in the panel (rendering parameters, not contract). State keys, trigger names and lifecycle events are CONTRACT — revise this doc before touching them.
