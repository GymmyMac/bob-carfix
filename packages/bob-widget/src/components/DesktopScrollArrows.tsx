import React, { useRef, useState, useEffect, useCallback } from "react";

interface DesktopScrollArrowsProps {
  children: React.ReactNode;
  /** Only show arrows on desktop */
  isDesktop: boolean;
  /** Extra className for the scroll container */
  className?: string;
  /** Extra style for the scroll container */
  style?: React.CSSProperties;
}

/**
 * Wraps a horizontal scroll row with left/right arrow buttons on desktop.
 * Arrows only appear when the row overflows and update as the user scrolls.
 * On mobile/tablet, renders children as-is with no arrows.
 */
export const DesktopScrollArrows: React.FC<DesktopScrollArrowsProps> = ({
  children,
  isDesktop,
  className = "",
  style,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth + 2; // 2px tolerance
    setHasOverflow(overflows);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    // Re-check on resize (window or element)
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    window.addEventListener("resize", checkScroll);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, children]);

  const scroll = (direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollTo({
      left: el.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount),
      behavior: "smooth",
    });
  };

  const showArrows = isDesktop && hasOverflow;

  return (
    <div
      className="desktop-scroll-wrapper"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left fade mask + arrow */}
      {showArrows && canScrollLeft && (
        <>
          <div className="desktop-scroll-fade desktop-scroll-fade-left" />
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => scroll("left", e)}
            className="desktop-scroll-arrow desktop-scroll-arrow-left"
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Scrollable row - explicit width constraint to force overflow */}
      <div
        ref={scrollRef}
        className={className}
        style={{
          ...style,
          width: "100%",
          maxWidth: "100%",
        }}
        onScroll={checkScroll}
      >
        {children}
      </div>

      {/* Right fade mask + arrow */}
      {showArrows && canScrollRight && (
        <>
          <div className="desktop-scroll-fade desktop-scroll-fade-right" />
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => scroll("right", e)}
            className="desktop-scroll-arrow desktop-scroll-arrow-right"
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};
