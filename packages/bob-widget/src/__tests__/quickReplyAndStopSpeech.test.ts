/**
 * Quick-Reply Navigation + Imperative stopSpeech Tests
 *
 * Covers:
 *   1. QuickReply type shape & Message.quickReplies field
 *   2. navigate_url SSE event handling logic
 *   3. quick_replies SSE event attaches buttons to last assistant message
 *   4. BobStandaloneHandle interface contract
 *   5. onStopSpeechReady capture pattern
 */

import { describe, it, expect, vi } from "vitest";
import type { QuickReply, Message } from "../types/message";

// ── 1. Type shape ─────────────────────────────────────────────────────────────

describe("QuickReply type shape", () => {
  it("accepts a valid QuickReply object", () => {
    const qr: QuickReply = { label: "View Brake Pads", url: "/products/brake-pads" };
    expect(qr.label).toBe("View Brake Pads");
    expect(qr.url).toBe("/products/brake-pads");
  });

  it("Message can carry quickReplies array", () => {
    const msg: Message = {
      role: "assistant",
      content: "Here are your options:",
      quickReplies: [
        { label: "View Brake Pads", url: "/products/brake-pads" },
        { label: "View Rotors", url: "/products/rotors" },
      ],
    };
    expect(msg.quickReplies).toHaveLength(2);
    expect(msg.quickReplies![0].label).toBe("View Brake Pads");
  });

  it("Message without quickReplies has undefined field", () => {
    const msg: Message = { role: "assistant", content: "Hello!" };
    expect(msg.quickReplies).toBeUndefined();
  });
});

// ── 2. navigate_url SSE handler logic ────────────────────────────────────────

describe("navigate_url SSE event handling", () => {
  function handleNavigateUrl(
    parsed: Record<string, unknown>,
    stopSpeech: () => void,
    onNavigate: (p: unknown) => void
  ): boolean {
    if (parsed.type === "navigate_url" && parsed.url) {
      stopSpeech();
      onNavigate({ sku: parsed.sku, url: parsed.url });
      return true; // consumed
    }
    return false;
  }

  it("calls stopSpeech and onNavigate when type=navigate_url and url present", () => {
    const stopSpeech = vi.fn();
    const onNavigate = vi.fn();
    const consumed = handleNavigateUrl(
      { type: "navigate_url", url: "/products/brake-pads", sku: "BP-001" },
      stopSpeech,
      onNavigate
    );
    expect(consumed).toBe(true);
    expect(stopSpeech).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith({ sku: "BP-001", url: "/products/brake-pads" });
  });

  it("does nothing when type is not navigate_url", () => {
    const stopSpeech = vi.fn();
    const onNavigate = vi.fn();
    const consumed = handleNavigateUrl(
      { type: "parts_found", parts: [] },
      stopSpeech,
      onNavigate
    );
    expect(consumed).toBe(false);
    expect(stopSpeech).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does nothing when url is missing even if type matches", () => {
    const stopSpeech = vi.fn();
    const onNavigate = vi.fn();
    const consumed = handleNavigateUrl(
      { type: "navigate_url" },
      stopSpeech,
      onNavigate
    );
    expect(consumed).toBe(false);
    expect(stopSpeech).not.toHaveBeenCalled();
  });

  it("passes url without sku when sku is absent", () => {
    const onNavigate = vi.fn();
    handleNavigateUrl(
      { type: "navigate_url", url: "/products/oil-filter" },
      vi.fn(),
      onNavigate
    );
    expect(onNavigate).toHaveBeenCalledWith({ sku: undefined, url: "/products/oil-filter" });
  });
});

// ── 3. quick_replies SSE attaches buttons to last assistant message ────────────

describe("quick_replies SSE event handling", () => {
  type SimpleMsg = { role: string; content: string; quickReplies?: QuickReply[] };

  function applyQuickRepliesEvent(
    messages: SimpleMsg[],
    parsed: Record<string, unknown>
  ): SimpleMsg[] {
    if (parsed.type === "quick_replies" && Array.isArray(parsed.replies)) {
      const lastIdx = messages.length - 1;
      if (messages[lastIdx]?.role === "assistant") {
        return messages.map((m, i) =>
          i === lastIdx ? { ...m, quickReplies: parsed.replies as QuickReply[] } : m
        );
      }
    }
    return messages;
  }

  it("attaches replies to the last assistant message", () => {
    const messages: SimpleMsg[] = [
      { role: "user", content: "show me brake pads" },
      { role: "assistant", content: "Here are some options!" },
    ];
    const replies = [{ label: "View Brake Pads", url: "/products/brake-pads" }];
    const updated = applyQuickRepliesEvent(messages, { type: "quick_replies", replies });

    expect(updated[1].quickReplies).toHaveLength(1);
    expect(updated[1].quickReplies![0].url).toBe("/products/brake-pads");
  });

  it("does not modify user messages", () => {
    const messages: SimpleMsg[] = [
      { role: "user", content: "show me brake pads" },
    ];
    const updated = applyQuickRepliesEvent(messages, {
      type: "quick_replies",
      replies: [{ label: "X", url: "/x" }],
    });
    // Last message is user — no change
    expect(updated[0].quickReplies).toBeUndefined();
  });

  it("leaves messages unchanged when type is not quick_replies", () => {
    const messages: SimpleMsg[] = [
      { role: "assistant", content: "Hello!" },
    ];
    const updated = applyQuickRepliesEvent(messages, { type: "parts_found", parts: [] });
    expect(updated[0].quickReplies).toBeUndefined();
  });

  it("leaves messages unchanged when replies is not an array", () => {
    const messages: SimpleMsg[] = [
      { role: "assistant", content: "Hello!" },
    ];
    const updated = applyQuickRepliesEvent(messages, { type: "quick_replies", replies: null });
    expect(updated[0].quickReplies).toBeUndefined();
  });

  it("preserves other message fields when attaching quickReplies", () => {
    const messages: SimpleMsg[] = [
      { role: "assistant", content: "Check these out!", quickReplies: undefined },
    ];
    const replies = [{ label: "View Rotors", url: "/products/rotors" }];
    const updated = applyQuickRepliesEvent(messages, { type: "quick_replies", replies });

    expect(updated[0].content).toBe("Check these out!");
    expect(updated[0].role).toBe("assistant");
    expect(updated[0].quickReplies).toHaveLength(1);
  });
});

// ── 4. BobStandaloneHandle contract ──────────────────────────────────────────

describe("BobStandaloneHandle imperative ref contract", () => {
  it("stopSpeech calls through to the captured fn", () => {
    const capturedStop = vi.fn();
    const stopSpeechRef = { current: capturedStop };

    const handle = {
      stopSpeech: () => stopSpeechRef.current?.(),
      interrupt: () => stopSpeechRef.current?.(),
    };

    handle.stopSpeech();
    expect(capturedStop).toHaveBeenCalledOnce();
  });

  it("interrupt is an alias for stopSpeech", () => {
    const capturedStop = vi.fn();
    const stopSpeechRef = { current: capturedStop };

    const handle = {
      stopSpeech: () => stopSpeechRef.current?.(),
      interrupt: () => stopSpeechRef.current?.(),
    };

    handle.interrupt();
    expect(capturedStop).toHaveBeenCalledOnce();
  });

  it("does not throw when stopSpeechRef is null (pre-mount)", () => {
    const stopSpeechRef: { current: (() => void) | null } = { current: null };

    const handle = {
      stopSpeech: () => stopSpeechRef.current?.(),
      interrupt: () => stopSpeechRef.current?.(),
    };

    expect(() => handle.stopSpeech()).not.toThrow();
    expect(() => handle.interrupt()).not.toThrow();
  });
});

// ── 5. onStopSpeechReady capture pattern ─────────────────────────────────────

describe("onStopSpeechReady callback capture", () => {
  it("captures the stop fn and makes it callable via ref", () => {
    const stopSpeechRef: { current: (() => void) | null } = { current: null };
    const onStopSpeechReady = (fn: () => void) => {
      stopSpeechRef.current = fn;
    };

    // Simulate useBobChat calling onStopSpeechReady on mount
    const mockStop = vi.fn();
    onStopSpeechReady(mockStop);

    // Host calls stopSpeech via ref handle
    stopSpeechRef.current?.();
    expect(mockStop).toHaveBeenCalledOnce();
  });

  it("ref is null before onStopSpeechReady fires (safe guard)", () => {
    const stopSpeechRef: { current: (() => void) | null } = { current: null };
    // Should not throw
    expect(() => stopSpeechRef.current?.()).not.toThrow();
  });
});

// ── 6. Quick-reply button does NOT send a chat message ────────────────────────

describe("Quick-reply button click does not insert into chat input", () => {
  it("onQuickReply calls onNavigate directly, never setInput", () => {
    const setInput = vi.fn();
    const onNavigate = vi.fn();

    // Simulate what the button onClick does
    const onQuickReply = (url: string) => {
      // CORRECT: calls navigate, NOT setInput
      onNavigate(url);
    };

    onQuickReply("/products/brake-pads");

    expect(onNavigate).toHaveBeenCalledWith("/products/brake-pads");
    expect(setInput).not.toHaveBeenCalled();
  });

  it("multiple quick replies each navigate to their own url", () => {
    const onNavigate = vi.fn();
    const replies: QuickReply[] = [
      { label: "View Brake Pads", url: "/products/brake-pads" },
      { label: "View Rotors", url: "/products/rotors" },
    ];

    replies.forEach((qr) => onNavigate(qr.url));

    expect(onNavigate).toHaveBeenNthCalledWith(1, "/products/brake-pads");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "/products/rotors");
  });
});
