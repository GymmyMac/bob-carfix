/**
 * iOS Audio Unlock Utility
 *
 * iOS Safari blocks Audio.play() unless it originates from a direct user
 * gesture (touch/click).  This module registers a one-time listener on the
 * widget root that plays a tiny silent WAV on the very first interaction,
 * "unlocking" the audio context so subsequent programmatic play() calls
 * succeed.
 *
 * Call `setupIOSAudioUnlock()` once when the widget mounts.
 */

// Minimal 44-byte silent WAV encoded as a data URI (no network request)
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

let unlocked = false;

/**
 * Play a silent audio buffer – called on the first user gesture.
 * Resolves immediately if audio is already unlocked.
 */
const unlock = async (): Promise<void> => {
  if (unlocked) return;
  try {
    const a = new Audio(SILENT_WAV);
    a.volume = 0;
    await a.play();
    unlocked = true;
    console.log('[BobWidget] iOS audio unlocked via user gesture');
  } catch (e) {
    // Not critical – TTS will still attempt play() on its own
    console.warn('[BobWidget] iOS audio unlock failed:', e);
  }
};

/**
 * Attach a one-shot touchstart/click listener to the given element.
 * Returns a cleanup function to remove the listener.
 */
export const setupIOSAudioUnlock = (
  root: HTMLElement | null,
): (() => void) => {
  if (!root || unlocked) return () => {};

  const handler = () => {
    unlock();
    root.removeEventListener('touchstart', handler, true);
    root.removeEventListener('click', handler, true);
  };

  root.addEventListener('touchstart', handler, { capture: true, passive: true });
  root.addEventListener('click', handler, { capture: true });

  return () => {
    root.removeEventListener('touchstart', handler, true);
    root.removeEventListener('click', handler, true);
  };
};

/** Check whether audio has been unlocked */
export const isAudioUnlocked = (): boolean => unlocked;
