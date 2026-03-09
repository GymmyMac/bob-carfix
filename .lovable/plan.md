

# Remove Optimistic "Parts Searching" Canned Audio

## Problem
The `parts_searching.mp3` audio clip ("Chur, let's have a wee peak at what parts are listed for your sweet ride bro!") plays at inappropriate times. It's triggered **optimistically** in `useBobChat.ts` (lines 562-576) whenever:
1. A vehicle is identified, AND
2. The user's message contains any word from `PRODUCT_KEYWORDS` (which includes extremely common words like "part", "need", "oil", "brake", "price", "$", etc.)

This means nearly any follow-up question triggers the audio, even when it doesn't make contextual sense (e.g., asking about pricing, availability, or unrelated questions).

Per the project's architecture decision (memory: `audio-system-disabled-v2`), canned audio triggers should be disabled in Bob V2.0.

## Fix

**File: `packages/bob-widget/src/hooks/useBobChat.ts`**
- Remove lines 560-577: the entire "optimistic audio" block that plays `parts_searching.mp3` before the backend responds.
- This is the only place `parts_searching` is referenced in widget code.

**Version bump:** 3.2.8 across `version.ts`, `package.json`, `CHANGELOG.md`.

## Scope
~18 lines removed from 1 file + version bump in 3 files.

