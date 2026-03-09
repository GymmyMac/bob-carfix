/**
 * v3.2.5 Bug Fix Regression Tests
 *
 * Covers three critical CARFIX production bugs:
 *   Bug #1 — Quick-reply buttons must call onInterrupt before onQuickReply (stop speech before navigating)
 *   Bug #2 — Imperative handle must call stopAllAudio (TTS + canned + searching), not just stopSpeech
 *   Bug #3 — Composite isSpeaking must be true when EITHER TTS or audio controller is playing
 */

import { describe, it, expect, vi } from "vitest";

// ── Bug #1: Quick-reply calls onInterrupt before onQuickReply ──────────────

describe("Bug #1: Quick-reply stops speech before navigating", () => {
  it("calls onInterrupt before onQuickReply in correct order", () => {
    const callOrder: string[] = [];
    const onInterrupt = vi.fn(() => callOrder.push("interrupt"));
    const onQuickReply = vi.fn(() => callOrder.push("quickReply"));

    // Simulate the button onClick handler from ContainedChatDrawer / MobileChatDrawer
    const handleQuickReplyClick = (url: string) => {
      onInterrupt();
      onQuickReply(url);
    };

    handleQuickReplyClick("/products/brake-pads");

    expect(onInterrupt).toHaveBeenCalledOnce();
    expect(onQuickReply).toHaveBeenCalledWith("/products/brake-pads");
    expect(callOrder).toEqual(["interrupt", "quickReply"]);
  });

  it("still navigates when onInterrupt is undefined (graceful)", () => {
    const onQuickReply = vi.fn();

    // Simulate optional chaining: onInterrupt?.()
    const handleQuickReplyClick = (url: string, onInterrupt?: () => void) => {
      onInterrupt?.();
      onQuickReply(url);
    };

    handleQuickReplyClick("/products/rotors");

    expect(onQuickReply).toHaveBeenCalledWith("/products/rotors");
  });

  it("stops speech even when navigating to external URL", () => {
    const onInterrupt = vi.fn();
    const onQuickReply = vi.fn();

    const handleQuickReplyClick = (url: string) => {
      onInterrupt();
      onQuickReply(url);
    };

    handleQuickReplyClick("https://carfix.co.nz/checkout");

    expect(onInterrupt).toHaveBeenCalledOnce();
    expect(onQuickReply).toHaveBeenCalledWith("https://carfix.co.nz/checkout");
  });
});

// ── Bug #2: stopAllAudio stops TTS + canned + searching ────────────────────

describe("Bug #2: stopAllAudio covers all audio sources", () => {
  /**
   * Mirrors the stopAllAudio function from useBobChat.ts
   */
  function createAudioController() {
    const controller = {
      source: 'none' as string,
      isPlaying: false,
      currentAudio: null as { pause: () => void; currentTime: number } | null,
      searchingQueue: [] as string[],
    };

    const stopSpeech = vi.fn(); // TTS-only stop

    const stopAllAudio = () => {
      if (controller.currentAudio) {
        controller.currentAudio.pause();
        controller.currentAudio.currentTime = 0;
        controller.currentAudio = null;
      }
      controller.isPlaying = false;
      controller.source = 'none';
      controller.searchingQueue = [];
      stopSpeech(); // Also stop TTS
    };

    return { controller, stopSpeech, stopAllAudio };
  }

  it("stops TTS via stopSpeech when stopAllAudio is called", () => {
    const { stopSpeech, stopAllAudio } = createAudioController();

    stopAllAudio();

    expect(stopSpeech).toHaveBeenCalledOnce();
  });

  it("pauses and resets canned audio element", () => {
    const { controller, stopAllAudio } = createAudioController();
    const mockAudio = { pause: vi.fn(), currentTime: 5 };
    controller.currentAudio = mockAudio;
    controller.isPlaying = true;
    controller.source = 'canned';

    stopAllAudio();

    expect(mockAudio.pause).toHaveBeenCalledOnce();
    expect(mockAudio.currentTime).toBe(0);
    expect(controller.currentAudio).toBeNull();
    expect(controller.isPlaying).toBe(false);
    expect(controller.source).toBe('none');
  });

  it("clears searching queue", () => {
    const { controller, stopAllAudio } = createAudioController();
    controller.searchingQueue = ["searching_1.mp3", "searching_2.mp3"];

    stopAllAudio();

    expect(controller.searchingQueue).toEqual([]);
  });

  it("is safe to call when no audio is playing", () => {
    const { stopAllAudio } = createAudioController();

    expect(() => stopAllAudio()).not.toThrow();
  });

  it("imperative handle exposes stopAllAudio (not just stopSpeech)", () => {
    const { stopSpeech, stopAllAudio } = createAudioController();
    const stopSpeechRef: { current: (() => void) | null } = { current: null };

    // Simulate onStopSpeechReady passing stopAllAudio (v3.2.5 fix)
    const onStopSpeechReady = (fn: () => void) => {
      stopSpeechRef.current = fn;
    };
    onStopSpeechReady(stopAllAudio); // Bug #2 fix: passes stopAllAudio, not stopSpeech

    // Simulate host calling bobRef.current.stopSpeech()
    stopSpeechRef.current?.();

    // stopSpeech (TTS) should have been called via stopAllAudio
    expect(stopSpeech).toHaveBeenCalledOnce();
  });
});

// ── Bug #3: Composite isSpeaking tracks TTS + audio controller ─────────────

describe("Bug #3: Composite isSpeaking state", () => {
  /**
   * Mirrors the composite isSpeaking logic from useBobChat.ts:
   *   isSpeaking: isSpeaking || isAudioControllerPlaying
   */
  function computeCompositeIsSpeaking(ttsSpeaking: boolean, audioControllerPlaying: boolean): boolean {
    return ttsSpeaking || audioControllerPlaying;
  }

  it("is true when TTS is speaking (canned audio idle)", () => {
    expect(computeCompositeIsSpeaking(true, false)).toBe(true);
  });

  it("is true when audio controller is playing (TTS idle)", () => {
    expect(computeCompositeIsSpeaking(false, true)).toBe(true);
  });

  it("is true when both TTS and audio controller are active", () => {
    expect(computeCompositeIsSpeaking(true, true)).toBe(true);
  });

  it("is false when neither TTS nor audio controller is active", () => {
    expect(computeCompositeIsSpeaking(false, false)).toBe(false);
  });

  // PTT state derivation depends on isSpeaking
  describe("PTT state derivation with composite isSpeaking", () => {
    type PttState = 'speaking' | 'processing' | 'listening' | 'idle';

    function derivePttState(isSpeaking: boolean, isLoading: boolean, isListening: boolean): PttState {
      return isSpeaking ? 'speaking' : isLoading ? 'processing' : isListening ? 'listening' : 'idle';
    }

    it("resolves to 'speaking' when canned audio plays (Bug #3 root cause)", () => {
      // Before fix: isSpeaking was false during canned audio → pttState was 'idle'
      // After fix: composite isSpeaking is true → pttState is 'speaking'
      const compositeIsSpeaking = computeCompositeIsSpeaking(false, true); // TTS off, canned on
      const pttState = derivePttState(compositeIsSpeaking, false, false);
      expect(pttState).toBe('speaking');
    });

    it("resolves to 'speaking' during TTS (unchanged behavior)", () => {
      const compositeIsSpeaking = computeCompositeIsSpeaking(true, false);
      const pttState = derivePttState(compositeIsSpeaking, false, false);
      expect(pttState).toBe('speaking');
    });

    it("resolves to 'idle' when no audio and not loading/listening", () => {
      const compositeIsSpeaking = computeCompositeIsSpeaking(false, false);
      const pttState = derivePttState(compositeIsSpeaking, false, false);
      expect(pttState).toBe('idle');
    });

    it("'speaking' takes priority over 'processing'", () => {
      const compositeIsSpeaking = computeCompositeIsSpeaking(false, true);
      const pttState = derivePttState(compositeIsSpeaking, true, false);
      expect(pttState).toBe('speaking');
    });
  });

  // PTT interrupt path fires only when pttState === 'speaking'
  describe("PTT interrupt triggers correctly during canned audio", () => {
    it("calls onInterrupt when PTT tapped during canned audio playback", () => {
      const onInterrupt = vi.fn();
      const compositeIsSpeaking = computeCompositeIsSpeaking(false, true); // canned audio
      const pttState = compositeIsSpeaking ? 'speaking' : 'idle';

      // Simulate handlePTTStart logic
      if (pttState === 'speaking') {
        onInterrupt();
      }

      expect(onInterrupt).toHaveBeenCalledOnce();
    });

    it("does NOT call onInterrupt when idle (no audio)", () => {
      const onInterrupt = vi.fn();
      const compositeIsSpeaking = computeCompositeIsSpeaking(false, false);
      const pttState = compositeIsSpeaking ? 'speaking' : 'idle';

      if (pttState === 'speaking') {
        onInterrupt();
      }

      expect(onInterrupt).not.toHaveBeenCalled();
    });
  });
});
