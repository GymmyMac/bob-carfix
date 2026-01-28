
# Fix: Chat Drawer Hidden Behind Counter Overlay

## Problem Identified

The chat interface is appearing **behind the counter overlay** because of a z-index conflict:

| Element | Current z-index | Position |
|---------|-----------------|----------|
| Background | z-0 | Correct |
| Bob Character | z-60 | Correct |
| Counter Overlay | **z-70** | Too high |
| Chat Drawer | zIndexBase+10 = **z-60** | Blocked by counter |
| Header/BottomNav | z-50 | Correct |

The counter overlay at `z-70` is sitting **on top of** the chat drawer at `z-60`, making the chat appear "behind" the counter in the screenshot.

## Solution: Increase Chat Drawer z-index above Counter

The fix is straightforward - the chat drawer needs a z-index **higher than the counter overlay (z-70)**.

### Option A (Recommended): Increase Chat Drawer z-index
Change `ContainedChatDrawer.tsx` line 139:
```tsx
// Before:
zIndex: zIndexBase + 10,  // = 60, BEHIND counter (70)

// After:
zIndex: zIndexBase + 30,  // = 80, ABOVE counter (70)
```

Also update the expand/collapse handle and PTT button:
- Handle: `zIndexBase + 20` → `zIndexBase + 40` (line 158)
- PTT button: `zIndexBase + 25` → `zIndexBase + 45` (line 376)

### Files to Modify

| File | Change |
|------|--------|
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Increase z-index values by +20 |
| `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx` | Apply same fix for consistency |

### Detailed Changes

**ContainedChatDrawer.tsx:**
```tsx
// Line 139 - Main drawer container
zIndex: zIndexBase + 30,  // Was +10

// Line 158 - Expand/collapse handle
zIndex: zIndexBase + 40,  // Was +20

// Line 376 - PTT button
zIndex: zIndexBase + 45,  // Was +25
```

### Z-Index Hierarchy After Fix

| Element | z-index | Purpose |
|---------|---------|---------|
| Background | z-0 | Backdrop image |
| Bob Character | z-60 | Bob animation |
| Counter Overlay | z-70 | Counter sits in front of Bob |
| **Chat Drawer** | **z-80** | Chat UI above counter |
| **Handle Button** | **z-90** | Expand/collapse above drawer |
| **PTT Button** | **z-95** | Talk button always accessible |
| Header/BottomNav | z-50 | Host UI below widget |

### Version Bump
This is a patch fix - bump to **v3.1.12**

### Verification
1. Navigate to `/ask-bob` route
2. Confirm chat drawer (message preview + input) is visible above the wooden counter
3. Confirm PTT button is fully visible and tappable
4. Test on mobile and desktop viewports
