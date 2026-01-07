import { useState, useEffect } from 'react';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>('mobile');

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= DESKTOP_BREAKPOINT) {
        setSize('desktop');
      } else if (width >= TABLET_BREAKPOINT) {
        setSize('tablet');
      } else {
        setSize('mobile');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}
