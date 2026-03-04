import { useEffect, useRef, useState } from 'react';

interface UseMobileBarsVisibilityOptions {
  disabled?: boolean;
}

export function useMobileBarsVisibility({ disabled = false }: UseMobileBarsVisibilityOptions = {}) {
  const [mobileBarsHidden, setMobileBarsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) {
      setMobileBarsHidden(false);
      return;
    }

    const hideBars = () => setMobileBarsHidden(true);
    const showBars = () => setMobileBarsHidden(false);

    const onScroll = () => {
      if (window.innerWidth >= 1280) return;

      const currentY = window.scrollY;
      const diff = currentY - lastScrollYRef.current;

      if (currentY < 24) {
        showBars();
      } else if (diff > 6) {
        hideBars();
      } else if (diff < -6) {
        showBars();
      }

      lastScrollYRef.current = currentY;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1280) return;
      lastTouchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (window.innerWidth >= 1280) return;

      const currentY = e.touches[0]?.clientY;
      if (currentY == null || lastTouchYRef.current == null) return;

      const diff = currentY - lastTouchYRef.current;

      if (window.scrollY < 24) {
        showBars();
      } else if (diff < -4) {
        hideBars();
      } else if (diff > 4) {
        showBars();
      }

      lastTouchYRef.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [disabled]);

  return { mobileBarsHidden, setMobileBarsHidden };
}
