import { useState, useEffect, useRef } from 'react';

type MicPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

/**
 * Proactively requests microphone permission on mount so the browser dialog
 * appears early (e.g. when Bob loads) rather than mid-conversation when the
 * user first taps PTT.
 *
 * Once granted, the browser remembers the choice for the domain.
 */
export const useMicPermission = (requestEarly = true) => {
  const [state, setState] = useState<MicPermissionState>('prompt');
  const requested = useRef(false);

  useEffect(() => {
    if (!requestEarly) return;

    // Check if Permissions API is available for a non-intrusive query first
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setState(result.state as MicPermissionState);

        // Already granted – nothing to do
        if (result.state === 'granted') return;

        // Still 'prompt' – fire getUserMedia to trigger the dialog early
        if (result.state === 'prompt' && !requested.current) {
          requested.current = true;
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              // Immediately release the mic – we only needed the permission
              stream.getTracks().forEach((t) => t.stop());
              setState('granted');
            })
            .catch(() => setState('denied'));
        }

        // Listen for future changes (user toggles in browser settings)
        result.addEventListener('change', () => {
          setState(result.state as MicPermissionState);
        });
      }).catch(() => {
        // Permissions API not supported for 'microphone' (Safari) – fall through
        requestMicDirectly();
      });
    } else {
      requestMicDirectly();
    }

    function requestMicDirectly() {
      if (requested.current) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        return;
      }
      requested.current = true;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          setState('granted');
        })
        .catch(() => setState('denied'));
    }
  }, [requestEarly]);

  return { micPermission: state };
};
