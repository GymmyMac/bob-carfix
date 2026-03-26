/**
 * iOS Audio Unlock Utility — Web Audio API Approach
 *
 * All iOS browsers (Safari, Chrome, Firefox) use WebKit under the hood.
 * WebKit blocks programmatic audio playback unless an AudioContext has been
 * `.resume()`'d during a direct user gesture (touch/click).
 *
 * This module creates a **singleton AudioContext** that is resumed on the
 * first interaction.  Once resumed it stays in the "running" state for the
 * lifetime of the page, so all subsequent `decodeAudioData` / `start()`
 * calls succeed — even after async network requests.
 *
 * Call `setupIOSAudioUnlock(root)` once when the widget mounts.
 * Use `playAudioBuffer()` to route all TTS playback through the shared context.
 */

// ---------------------------------------------------------------------------
// Singleton AudioContext
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

const AudioCtx =
  typeof window !== 'undefined'
    ? window.AudioContext || (window as any).webkitAudioContext
    : null;

/**
 * Get (or lazily create) the shared AudioContext singleton.
 */
export const getAudioContext = (): AudioContext => {
  if (!ctx && AudioCtx) {
    ctx = new AudioCtx();
    console.log('[BobWidget] AudioContext created, initial state:', ctx.state);
  }
  return ctx!;
};

/**
 * Resume the AudioContext — must be called inside a user-gesture handler.
 * Returns `true` if the context is now in the "running" state.
 */
export const resumeAudioContext = async (): Promise<boolean> => {
  const ac = getAudioContext();
  if (!ac) return false;
  if (ac.state === 'running') return true;

  try {
    await ac.resume();
    console.log('[BobWidget] AudioContext resumed →', ac.state);
    return ac.state === 'running';
  } catch (e) {
    console.warn('[BobWidget] AudioContext resume failed:', e);
    return false;
  }
};

/** Check whether the AudioContext is in the "running" state */
export const isAudioContextReady = (): boolean =>
  ctx?.state === 'running';

/** Legacy compat — kept so existing callers still work */
export const isAudioUnlocked = (): boolean => isAudioContextReady();

// ---------------------------------------------------------------------------
// Playback via shared AudioContext
// ---------------------------------------------------------------------------

export interface PlaybackHandle {
  source: AudioBufferSourceNode;
  stop: () => void;
}

/**
 * Decode raw audio bytes (MP3, WAV, etc.) and play them through the shared
 * AudioContext.  Returns a handle with a `.stop()` method for interrupts.
 *
 * @param arrayBuffer  Raw audio data (e.g. from `fetch().arrayBuffer()`)
 * @param onStart      Called when playback actually begins
 * @param onEnded      Called when the buffer finishes playing (or is stopped)
 */
export const playAudioBuffer = async (
  arrayBuffer: ArrayBuffer,
  onStart?: () => void,
  onEnded?: () => void,
): Promise<PlaybackHandle> => {
  const ac = getAudioContext();

  // Ensure the context is running (may have been suspended by the OS)
  if (ac.state !== 'running') {
    await ac.resume();
  }

  const decoded = await ac.decodeAudioData(arrayBuffer);
  const source = ac.createBufferSource();
  source.buffer = decoded;
  source.connect(ac.destination);

  let ended = false;
  source.onended = () => {
    if (ended) return;
    ended = true;
    onEnded?.();
  };

  source.start(0);
  onStart?.();

  return {
    source,
    stop: () => {
      try {
        source.stop();
      } catch {
        // Already stopped — safe to ignore
      }
    },
  };
};

// ---------------------------------------------------------------------------
// First-gesture setup (attach to widget root)
// ---------------------------------------------------------------------------

let resumed = false;

/**
 * Attach a one-shot touchstart / pointerdown / click listener to the given
 * element that resumes the AudioContext on the first user gesture.
 * Returns a cleanup function to remove the listeners.
 */
export const setupIOSAudioUnlock = (
  root: HTMLElement | null,
): (() => void) => {
  if (!root || resumed) return () => {};

  const handler = async () => {
    const ok = await resumeAudioContext();
    if (!ok) return; // keep listeners for next tap

    resumed = true;
    root.removeEventListener('touchstart', handler, true);
    root.removeEventListener('pointerdown', handler, true);
    root.removeEventListener('click', handler, true);
  };

  root.addEventListener('touchstart', handler, { capture: true, passive: true });
  root.addEventListener('pointerdown', handler, { capture: true });
  root.addEventListener('click', handler, { capture: true });

  return () => {
    root.removeEventListener('touchstart', handler, true);
    root.removeEventListener('pointerdown', handler, true);
    root.removeEventListener('click', handler, true);
  };
};
