import { useState, useEffect, type RefObject } from "react";

/**
 * useContainerHeight — ResizeObserver-based hook that returns the actual
 * pixel height of the referenced element.  Falls back to `null` when
 * ResizeObserver is unavailable (the caller should use `height: 100%`).
 *
 * Why: On mobile Safari, `100dvh` / percentage heights fluctuate during
 * URL-bar show/hide and virtual-keyboard transitions.  An explicit pixel
 * height keeps the widget layout stable and prevents the "gap" between
 * the chat drawer and the host's bottom navigation.
 */
export function useContainerHeight(ref: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Seed with current height immediately
    setHeight(el.getBoundingClientRect().height);

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // borderBoxSize is the most accurate; fall back to contentRect
        const h =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (h > 0) setHeight(h);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return height;
}
