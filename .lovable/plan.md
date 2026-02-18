
# Fix: Quick-Reply Navigation Buttons + Imperative stopSpeech() Handle

## What is broken

### Bug 1 — Suggestion buttons insert text into the chat input
When Bob presents a "View Brake Pads" style button, tapping it falls through to a path that calls `setInput(label)` or `sendDirectMessage(label)` rather than calling `onNavigate(url)`. This happens because:
- The `Message` type has no `quickReplies` field
- No SSE event type for navigation actions exists in the stream parser
- No UI component renders CTA buttons from the message stream
- The only wiring from tapped product tiles goes to `onProductClick` → which in some layouts calls `sendDirectMessage` instead of `onNavigate`

### Bug 2 — No imperative stopSpeech() handle
`BobStandalone` and `BobWidget` are plain `React.FC` components — no `forwardRef`, no `useImperativeHandle`. Hosts cannot call `widgetRef.current.stopSpeech()`.

---

## The Fix — 4 targeted changes

### Change 1 — Add `quickReplies` to the Message type
**File:** `packages/bob-widget/src/types/message.ts`

Add a `quickReplies` field to the `Message` interface:
```ts
export interface QuickReply {
  label: string;   // e.g. "View Brake Pads"
  url: string;     // e.g. "/products/brake-pads"
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  suggestedProducts?: Product[];
  suggestionsTitle?: string;
  quickReplies?: QuickReply[];   // NEW
}
```

### Change 2 — Parse `navigate_url` SSE events in `useBobChat`
**File:** `packages/bob-widget/src/hooks/useBobChat.ts`

In the SSE stream parser loop, handle a new event type `navigate_url`:
```ts
if (parsed.type === "navigate_url" && parsed.url) {
  // Stop speech immediately and call the host navigation callback
  stopSpeech();
  callbacks.onNavigateToProductPage?.({ sku: parsed.sku, url: parsed.url } as any);
  continue;
}
```

Also handle `quick_replies` SSE event to attach buttons to the last assistant message:
```ts
if (parsed.type === "quick_replies" && Array.isArray(parsed.replies)) {
  setMessages(prev => {
    const updated = [...prev];
    const lastMsg = updated[updated.length - 1];
    if (lastMsg?.role === "assistant") {
      return updated.map((m, i) =>
        i === updated.length - 1 ? { ...m, quickReplies: parsed.replies } : m
      );
    }
    return updated;
  });
  continue;
}
```

### Change 3 — Render QuickReply buttons in MobileChatDrawer and ContainedChatDrawer
**Files:**
- `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`
- `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

Add an `onQuickReply` prop:
```ts
onQuickReply?: (url: string) => void;
```

In the message rendering loop, after `BobSuggestions`, render quick-reply buttons if `msg.quickReplies` is set:
```tsx
{msg.role === "assistant" && msg.quickReplies && msg.quickReplies.length > 0 && (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
    {msg.quickReplies.map((qr, i) => (
      <button
        key={i}
        onClick={(e) => {
          e.stopPropagation();
          onQuickReply?.(qr.url);
        }}
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(0,102,204,0.6)',
          background: 'rgba(0,102,204,0.15)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        {qr.label}
      </button>
    ))}
  </div>
)}
```

These buttons call `onQuickReply(url)` directly — **no chat message is sent, no setInput is called**.

Wire `onQuickReply` up through the component tree:
- `MobileChatDrawer` → `ContainedChatDrawer` → `ContainedMobileBobLayout` → `MobileBobLayout` → `Bob` → calls `callbacks.onNavigateToProductPage` or `callbacks.onNavigate`

### Change 4 — Expose imperative `stopSpeech()` via ref on BobStandalone
**File:** `packages/bob-widget/src/components/BobStandalone.tsx`

Convert `BobStandalone` to use `forwardRef` + `useImperativeHandle`:

```ts
export interface BobStandaloneHandle {
  stopSpeech: () => void;
  interrupt: () => void;
}

export const BobStandalone = React.forwardRef<BobStandaloneHandle, StandaloneWidgetProps>(
  (props, ref) => {
    const stopSpeechRef = useRef<(() => void) | null>(null);

    useImperativeHandle(ref, () => ({
      stopSpeech: () => stopSpeechRef.current?.(),
      interrupt: () => stopSpeechRef.current?.(),
    }));

    // Pass stopSpeechRef down via a new BobProvider context value or
    // use a shared ref pattern through BobWidget's callbacks.onReadyToSpeak
    ...
  }
);
```

Since the actual `stopSpeech` lives inside `useBobChat` (inside `Bob`), the cleanest approach is to **expose it through a callback ref** passed via `BobProvider` context. Specifically:

1. Add `onStopSpeechReady?: (fn: () => void) => void` to `BobCallbacks` in `context.ts`
2. In `useBobChat`, when `stopSpeech` is initialized, call `callbacks.onStopSpeechReady?.(stopSpeech)`
3. In `BobStandalone`, capture that function in `stopSpeechRef` and expose it via `useImperativeHandle`

This lets the host do:
```tsx
const bobRef = useRef<BobStandaloneHandle>(null);

// When navigating away:
bobRef.current?.stopSpeech();

<BobStandalone ref={bobRef} ... />
```

---

## Files to change

| File | Change |
|---|---|
| `packages/bob-widget/src/types/message.ts` | Add `QuickReply` interface + `quickReplies` field to `Message` |
| `packages/bob-widget/src/types/context.ts` | Add `onStopSpeechReady` to `BobCallbacks` |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Parse `quick_replies` SSE event; call `onStopSpeechReady` on init |
| `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx` | Add `onQuickReply` prop; render quick-reply buttons |
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Add `onQuickReply` prop; render quick-reply buttons |
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Thread `onQuickReply` prop down |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | Thread `onQuickReply` prop down |
| `packages/bob-widget/src/components/Bob.tsx` | Wire `onQuickReply` → `callbacks.onNavigateToProductPage` or `callbacks.onNavigate` |
| `packages/bob-widget/src/components/BobStandalone.tsx` | Convert to `forwardRef`, expose `BobStandaloneHandle` with `stopSpeech()` and `interrupt()` |
| `packages/bob-widget/src/index.ts` | Export `BobStandaloneHandle` type |

## What this does NOT change
- The bob-chat edge function does not need to be modified for this to work. The `quick_replies` SSE event is opt-in — the UI just renders nothing if no such event arrives. When the edge function is later updated to emit `quick_replies` events, the UI will automatically render them.
- No existing product shelf, variant cards, or suggestion tiles are affected.
- The `onNavigate` → `onNavigateToProductPage` mapping in `BobStandalone.tsx` already correctly maps to a URL, so no change needed there.
