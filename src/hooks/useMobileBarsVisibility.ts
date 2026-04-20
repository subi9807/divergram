import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMobileBarsVisibilityOptions {
  disabled?: boolean;
  hideOffset?: number;
  minDelta?: number;
}

export function useMobileBarsVisibility({
  disabled = false,
  hideOffset = 80,
  minDelta = 14,
}: UseMobileBarsVisibilityOptions = {}) {
  const [mobileBarsHidden, setMobileBarsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const navTouchActiveRef = useRef(false);
  const pointerLockUntilRef = useRef(0);

  const isMobile = () => window.innerWidth < 1280;

  const showBars = useCallback(() => {
    setMobileBarsHidden(false);
  }, []);

  const hideBars = useCallback(() => {
    setMobileBarsHidden(true);
  }, []);

  const lockForInteraction = useCallback((ms = 420) => {
    pointerLockUntilRef.current = Date.now() + ms;
    showBars();
  }, [showBars]);

  useEffect(() => {
    if (disabled) {
      setMobileBarsHidden(false);
      return;
    }

    const isLocked = () => Date.now() < pointerLockUntilRef.current;

    const onScroll = () => {
      if (!isMobile()) return;
      if (navTouchActiveRef.current || isLocked()) {
        lastScrollYRef.current = window.scrollY;
        showBars();
        return;
      }

      const currentY = window.scrollY;
      const prevY = lastScrollYRef.current;
      const diff = currentY - prevY;

      if (currentY <= hideOffset) {
        showBars();
      } else if (diff >= minDelta) {
        hideBars();
      } else if (diff <= -minDelta) {
        showBars();
      }

      lastScrollYRef.current = currentY;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isMobile()) return;
      const target = e.target as HTMLElement | null;
      const inMobileNav = !!target?.closest('[data-mobile-nav]');
      navTouchActiveRef.current = inMobileNav;
      if (inMobileNav) {
        lockForInteraction();
      }
    };

    const onPointerUp = () => {
      navTouchActiveRef.current = false;
    };

    const onTouchEnd = () => {
      navTouchActiveRef.current = false;
    };

    lastScrollYRef.current = window.scrollY;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, hideOffset, minDelta, hideBars, lockForInteraction, showBars]);

  return {
    mobileBarsHidden,
    setMobileBarsHidden,
    showMobileBars: showBars,
    lockMobileBars: lockForInteraction,
  };
}
