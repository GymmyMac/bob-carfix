
# Fix: Chat Drawer Positioning Above Counter Overlay

## Problem Summary

The chat drawer is positioned at `bottom: 0px` (or `bottom: ${bottomOffset}px`), which places it at the very bottom of the container. However, the counter overlay occupies the bottom portion of the container (e.g., 22% height). This means the chat drawer is positioned **behind the counter** even with correct z-index, because they overlap at the same vertical position.

The z-index fix (v3.1.12) ensured the chat is **in front of** the counter when they overlap, but the real issue is the chat should be **above** the counter, not overlapping it.

---

## Visual Explanation

**Current (Broken):**
```text
┌──────────────────────────────┐
│         Bob + Backdrop       │
│                              │
├──────────────────────────────┤ ← Chat drawer starts here (bottom: 0)
│ ████ Counter (22% height) ████│ ← Counter overlaps chat drawer
│ ████ [Chat Input Field]  █████│ ← Chat is behind counter
└──────────────────────────────┘
```

**Expected (Fixed):**
```text
┌──────────────────────────────┐
│         Bob + Backdrop       │
│                              │
├──────────────────────────────┤ ← Chat drawer starts here (above counter)
│  [Chat Preview + Input]      │
├──────────────────────────────┤
│ ████ Counter (22% height) ████│ ← Counter sits below chat drawer
└──────────────────────────────┘
```

---

## Technical Solution

### Option A: Position Chat Drawer Above Counter (Recommended)

Pass the `counterHeightPercent` to `ContainedChatDrawer` and position it above the counter:

**ContainedMobileBobLayout.tsx** (line 299-312):
```tsx
<ContainedChatDrawer
  // ... existing props
  counterHeightPercent={counterHeightPercent}  // NEW PROP
/>
```

**ContainedChatDrawer.tsx** - Add prop and update bottom position:
```tsx
interface ContainedChatDrawerProps {
  // ... existing props
  counterHeightPercent?: number;  // NEW
}

// In component:
style={{
  position: 'absolute',
  // Position above the counter, not at container bottom
  bottom: `calc(${counterHeightPercent || 0}% + ${bottomOffset}px)`,
  // ... rest
}}
```

### Option B: Use Percentage-Based Bottom (Alternative)

If counter height is always ~22%, hardcode a percentage offset:
```tsx
bottom: `calc(22% + ${bottomOffset}px)`,
```

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Pass `counterHeightPercent` to `ContainedChatDrawer` |
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Accept `counterHeightPercent` prop, update `bottom` calculation |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | Apply same fix to `MobileChatDrawer` if used |
| `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx` | Accept `counterHeightPercent` prop, update `bottom` calculation |

---

## Detailed Implementation

### 1. ContainedChatDrawer.tsx

**Add prop to interface:**
```tsx
interface ContainedChatDrawerProps {
  messages: Message[];
  // ... existing props
  counterHeightPercent?: number;  // ADD THIS
}
```

**Update component signature:**
```tsx
export const ContainedChatDrawer: React.FC<ContainedChatDrawerProps> = ({
  // ... existing props
  counterHeightPercent = 22  // Default to 22% if not provided
}) => {
```

**Update drawer style (line 127-141):**
```tsx
style={{
  position: 'absolute',
  // Position above the counter overlay
  bottom: `calc(${counterHeightPercent}% + ${bottomOffset}px)`,
  left: 0,
  right: 0,
  // ... rest of styles
}}
```

### 2. ContainedMobileBobLayout.tsx

**Pass counterHeightPercent to ContainedChatDrawer (around line 299):**
```tsx
<ContainedChatDrawer
  messages={messages}
  input={input}
  setInput={setInput}
  isLoading={isLoading}
  onSend={onSend}
  onKeyPress={onKeyPress}
  onInputFocus={onInputFocus}
  onInputBlur={onInputBlur}
  chatEndRef={chatEndRef}
  isMuted={isMuted}
  onToggleMute={onToggleMute}
  isSpeaking={isSpeaking}
  counterHeightPercent={counterHeightPercent}  // ADD THIS
/>
```

### 3. Apply Same Fix to MobileChatDrawer

Ensure `MobileChatDrawer.tsx` also receives and uses `counterHeightPercent` for the `MobileBobLayout` variant.

---

## Why This Works on CARFIX

1. **Container-relative positioning**: The chat drawer uses `position: absolute`, anchoring to the Bob widget container (not the viewport).

2. **Counter-aware offset**: By adding `counterHeightPercent%` to the bottom position, the chat drawer sits **above** the counter graphic, not overlapping it.

3. **Safe area handling**: The existing `bottomOffset` from `BobProvider` still applies for host bottom navs, stacking on top of the counter offset.

4. **Portable**: This fix works in both the demo route (`/ask-bob`) and the production CARFIX site because it uses the same `counterHeightPercent` value from the database.

---

## Version Bump

This is a layout positioning fix - bump to **v3.1.13**:

```markdown
## [3.1.13] - 2026-01-28

### Fixed
- 📐 **Chat Drawer Positioning**: Chat drawer now positions above counter overlay using `counterHeightPercent`
- 🎨 **Visual Alignment**: Chat input and preview no longer overlap with counter graphic
```

---

## Verification Checklist

After implementation:
1. Navigate to `/ask-bob` route
2. Confirm chat drawer (message preview + input + PTT button) appears ABOVE the wooden counter
3. Confirm the PTT button is fully visible and not cut off
4. Expand the chat drawer and confirm it expands upward, not into the counter
5. Test on both mobile (375px) and desktop (1920px) viewports
6. Deploy to CARFIX test site and verify same behavior
