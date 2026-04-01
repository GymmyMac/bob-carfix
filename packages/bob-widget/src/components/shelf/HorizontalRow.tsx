import React, { useRef, useState, useEffect, useCallback } from "react";
import type { ViewportSize } from "../../hooks/useViewportSize";

interface HorizontalRowProps {
  children: React.ReactNode;
  viewportSize: ViewportSize;
  /** Extra className for the scroll track */
  className?: string;
  /** Extra style for the scroll track */
  style?: React.CSSProperties;
}

/**
 * HorizontalRow — The single scroll primitive for all horizontal rows.
 *
 * Mobile/Tablet: snap-x mandatory, touch-action: pan-x, overscroll-behavior: contain, hidden scrollbar
 * Desktop: no snap, orange arrow buttons, thin scrollbar, fade masks
 */
export const HorizontalRow: React.FC<HorizontalRowProps> = ({
  children,
  viewportSize,
  className = "",
  style,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const isDesktop = viewportSize === "desktop";

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth + 2;
    setHasOverflow(overflows);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    // Also observe children changing size
    Array.from(el.children).forEach((child) => ro.observe(child));
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
    const amount = el.clientWidth * 0.75;
    el.scrollTo({
      left: el.scrollLeft + (direction === "left" ? -amount : amount),
      behavior: "smooth",
    });
  };

  const showArrows = isDesktop && hasOverflow;

  // Snap classes for mobile/tablet only
  const snapClasses = !isDesktop ? "snap-x snap-mandatory" : "";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left fade + arrow */}
      {showArrows && canScrollLeft && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 40,
              zIndex: 5,
              pointerEvents: "none",
              background: "linear-gradient(to right, rgba(0,0,0,0.15), transparent)",
              borderRadius: "8px 0 0 8px",
            }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => scroll("left", e)}
            aria-label="Scroll left"
            style={arrowStyle("left")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className={`${snapClasses} ${className}`}
        style={{
          ...style,
          display: "flex",
          overflowX: "auto",
          width: "100%",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
          ...(isDesktop
            ? {
                scrollbarWidth: "thin" as const,
                scrollbarColor: "rgba(255,255,255,0.4) rgba(255,255,255,0.1)",
              }
            : {
                scrollbarWidth: "none" as const,
                msOverflowStyle: "none" as const,
                touchAction: "pan-x",
                overscrollBehavior: "contain",
              }),
        }}
        onScroll={checkScroll}
      >
        {children}
      </div>

      {/* Right fade + arrow */}
      {showArrows && canScrollRight && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: 40,
              zIndex: 5,
              pointerEvents: "none",
              background: "linear-gradient(to left, rgba(0,0,0,0.15), transparent)",
              borderRadius: "0 8px 8px 0",
            }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => scroll("right", e)}
            aria-label="Scroll right"
            style={arrowStyle("right")}
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

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: -4,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(255, 140, 0, 0.95)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "2px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 4px 20px rgba(255, 140, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
    padding: 0,
    WebkitAppearance: "none",
    appearance: "none",
  } as React.CSSProperties;
}
