import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

interface EdgeSwipeNavParams {
  navHistoryRef: MutableRefObject<string[]>;
  navFutureRef: MutableRefObject<string[]>;
  navMuteRef: MutableRefObject<boolean>;
}

export function useEdgeSwipeNav({ navHistoryRef, navFutureRef, navMuteRef }: EdgeSwipeNavParams) {
  const gestureRef = useRef({
    x: 0,
    y: 0,
    active: false,
    fromTop: false,
    blocked: false,
    edge: 'none' as 'left' | 'right' | 'none',
  });

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 1279px)').matches;

    const playNavMotion = (dir: 'back' | 'forward') => {
      const el = document.getElementById('root');
      if (!el) return;
      el.classList.remove('dg-nav-back', 'dg-nav-forward');
      void el.getBoundingClientRect();
      el.classList.add(dir === 'back' ? 'dg-nav-back' : 'dg-nav-forward');
      window.setTimeout(() => el.classList.remove('dg-nav-back', 'dg-nav-forward'), 240);
    };

    const onStart = (e: TouchEvent) => {
      if (!isMobile()) return;
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement | null;
      const blocked = !!target?.closest('input, textarea, [contenteditable="true"], [data-no-gesture="true"], [data-mobile-nav]');
      const edge = t.clientX <= 80 ? 'left' : (t.clientX >= window.innerWidth - 80 ? 'right' : 'none');
      gestureRef.current = { x: t.clientX, y: t.clientY, active: true, fromTop: window.scrollY <= 2, blocked, edge };
    };

    const onMove = (e: TouchEvent) => {
      const state = gestureRef.current;
      if (!state.active || state.blocked || !isMobile()) return;
      const t = e.touches[0];
      if (!t) return;
    };

    const onEnd = (e: TouchEvent) => {
      const state = gestureRef.current;
      if (!state.active || state.blocked || !isMobile()) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - state.x;
      const dy = t.clientY - state.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > 90 && absX > absY * 1.25) {
        if (dx > 0 && state.edge === 'left') {
          const h = navHistoryRef.current;
          if (h.length > 1) {
            const current = h.pop();
            if (current) navFutureRef.current.push(current);
            const prev = h[h.length - 1];
            if (prev) {
              playNavMotion('back');
              navMuteRef.current = true;
              window.history.pushState({}, '', prev);
              window.dispatchEvent(new PopStateEvent('popstate'));
              window.setTimeout(() => { navMuteRef.current = false; }, 60);
            }
          }
        } else if (dx < 0 && state.edge === 'right') {
          const f = navFutureRef.current;
          const next = f.pop();
          if (next) {
            playNavMotion('forward');
            navHistoryRef.current.push(next);
            navMuteRef.current = true;
            window.history.pushState({}, '', next);
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.setTimeout(() => { navMuteRef.current = false; }, 60);
          }
        }
      } else if (state.fromTop && dy > 120 && absY > absX * 1.25) {
        window.location.reload();
      }

      gestureRef.current.active = false;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onStart as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd as any);
    };
  }, [navFutureRef, navHistoryRef, navMuteRef]);
}
