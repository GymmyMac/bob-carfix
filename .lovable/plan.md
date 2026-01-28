

# Fix Plan: Bob Layout, State Terminology, and Counter Stretching (v3.1.15)

## Issues Summary

After deep-diving the codebase and database, I've identified **5 critical issues**:

| # | Issue | Impact | Severity |
|---|-------|--------|----------|
| 1 | State terminology mismatch | Bob defaults to "talk" but V2 Bob only has "talking" | 🔴 Critical |
| 2 | Chat drawer at counter height | Chat overlaps counter instead of sitting below it | 🔴 Critical |
| 3 | Counter height mismatch | DB says 12%, code defaults to 22% | 🟡 Medium |
| 4 | Duplicate counter appearance | User reported seeing two counters | 🟡 Medium |
| 5 | Counter image stretched wrong | Need `object-fill` to stretch to fit space | 🟡 Medium |

---

## Technical Analysis

### Issue 1: State Terminology Mismatch

**Database (V2 Bob active look):**
| State Key | Frame Count |
|-----------|-------------|
| `talking` | 4 |
| `researching` | 2 |
| `listening` | 2 |
| `idle` | 3 |
| `waving` | 5 |

**Code defaults (`useBobChat.ts` lines 148-152):**
```tsx
talkingState = "talk",       // ❌ V2 has "talking"
thinkingState = "research",  // ❌ V2 has "researching"
completeState = "complete",  // ❌ V2 has no "complete"
idleState = "idle",          // ✅ Correct
listenState = "talk_pause",  // ❌ V2 has "listening"
```

This causes console warnings like:
```
[useBobAnimation] No images for "talk", using fallback: waving
```

---

### Issue 2: Chat Drawer Positioning

**Current positioning:**
- `ContainedChatDrawer.tsx` line 134: `bottom: ${counterHeightPercent}%`
- This positions the chat drawer AT the same height as the counter overlay

**The intended layer architecture:**
```text
Layer 1: Backdrop (z-0)       - Full container background
Layer 2: Bob Character (z-60) - Standing behind counter
Layer 3: Counter (z-70)       - Overlaps Bob's lower body
Layer 4: Chat Drawer (z-80)   - Below counter visually, in front via z-index
```

**The fix:** Chat drawer should be at `bottom: 0`, not at `counterHeightPercent%`.

---

### Issue 3: Counter Height Configuration

**Database `bob_backdrops`:**
- `counter_height_percent: 12`

**Code defaults:**
- `MobileBobCharacter.tsx` line 30: `counterHeightPercent = 15`
- `ContainedMobileBobLayout.tsx` line 67: `counterHeightPercent = 22`
- `ContainedChatDrawer.tsx` line 41: `counterHeightPercent = 22`

The database value (12%) should be the source of truth.

---

### Issue 4: Duplicate Counter

The user screenshot shows two counters at different scales. This could be caused by:
1. The backdrop image containing a counter AND the counter overlay rendering separately
2. Multiple render paths rendering the same element

**Root cause:** The backdrop image itself may contain a counter graphic. Combined with the `counterOverlayUrl` rendering a separate counter layer, this creates duplication.

**Solution options:**
- Option A: Use a backdrop image that does NOT include the counter
- Option B: Skip the counter overlay when backdrop already has it (add `skipCounterOverlay` prop)
- **Option C (user selected):** Stretch the counter image to fill the required space using `object-fill`

---

### Issue 5: Counter Image Stretching

Currently, `MobileBobCharacter.tsx` uses:
```tsx
<img 
  src={counterOverlayUrl} 
  className="w-full h-full object-cover object-top"
/>
```

`object-cover` maintains aspect ratio and crops. For stretching to fit the exact space, use:
```tsx
className="w-full h-full object-fill"  // Stretches to fill container
```

---

## Implementation Plan

### File 1: `packages/bob-widget/src/hooks/useBobChat.ts`

Update default state names to match V2 Bob (lines 148-152):

```tsx
talkingState = "talking",      // Was "talk"
thinkingState = "researching", // Was "research"
completeState = "idle",        // Was "complete" (V2 has no complete)
idleState = "idle",            // Unchanged
listenState = "listening",     // Was "talk_pause"
```

---

### File 2: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

Position chat at container bottom (line 134):

```tsx
// BEFORE:
bottom: `${counterHeightPercent}%`,

// AFTER - Chat sits at the very bottom of container:
bottom: 0,
```

Also increase collapsed height for more space (line 142):

```tsx
// BEFORE:
height: isExpanded ? '55%' : '70px',

// AFTER:
height: isExpanded ? '55%' : '90px',
```

---

### File 3: `packages/bob-widget/src/components/mobile/MobileBobCharacter.tsx`

Change counter image rendering to use `object-fill` for stretching (lines 123-127):

```tsx
// BEFORE:
<img 
  src={counterOverlayUrl} 
  className="w-full h-full object-cover object-top"
/>

// AFTER - Stretch to fill the counter space:
<img 
  src={counterOverlayUrl} 
  className="w-full h-full"
  style={{ objectFit: 'fill' }}
/>
```

---

### File 4: `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

Apply same positioning fix (bottom: 0) for consistency across both drawer variants.

---

### File 5: Version files

Bump to **v3.1.15**:
- `packages/bob-widget/package.json`
- `packages/bob-widget/src/version.ts`
- `packages/bob-widget/CHANGELOG.md`

---

## Correct Layer Architecture After Fix

```text
┌─────────────────────────────────────┐
│ Host Header (72px)                  │ ← OUTSIDE Bob container
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Layer 1: Backdrop (z-0)         ││ ← Full height background
│  │                                 ││
│  │    ┌──────────────────┐         ││
│  │    │ Layer 2: Bob     │         ││ ← Character (z-60)
│  │    │ (animations)     │         ││
│  │    └──────────────────┘         ││
│  │                                 ││
│  ├─────────────────────────────────┤│
│  │ Layer 3: Counter (z-70)         ││ ← 12% height, stretched to fit
│  │ (overlaps Bob's lower body)     ││
│  ├─────────────────────────────────┤│
│  │ Layer 4: Chat Drawer (z-80)     ││ ← bottom: 0
│  │ [Preview] [Input] [PTT]         ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│ Host Bottom Nav (72px)              │ ← OUTSIDE Bob container
└─────────────────────────────────────┘
```

---

## Changelog Entry

```markdown
## [3.1.15] - 2026-01-28

### Fixed
- 🗣️ **State Terminology**: Default animation states updated to match V2 Bob:
  - "talking" (was "talk")
  - "researching" (was "research")
  - "listening" (was "talk_pause")
  - "idle" for complete state (was "complete")
- 📐 **Chat Drawer Position**: Chat drawer now positioned at `bottom: 0` to sit below the counter overlay
- 🖼️ **Counter Stretching**: Counter overlay now uses `object-fit: fill` to stretch to configured height
- 📏 **Chat Height**: Increased collapsed chat drawer height from 70px to 90px
```

---

## Verification Checklist

1. Navigate to `/ask-bob`
2. Verify Bob animates correctly (no console warnings about missing states)
3. Verify single counter (not duplicated)
4. Verify counter stretches to fill its 12% height allocation
5. Verify chat drawer sits at the bottom of the container (below counter visually)
6. Verify PTT button is fully visible and tappable
7. Test chat expansion/collapse
8. Test on mobile viewport (375px) and desktop (1920px)

