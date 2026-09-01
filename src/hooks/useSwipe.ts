import { useRef, type TouchEvent } from 'react';

interface SwipeInput {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  minSwipeDistance?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, minSwipeDistance = 60 }: SwipeInput) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const endRef = useRef<{ x: number; y: number } | null>(null);
  const blockedRef = useRef(false);

  const shouldIgnore = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;

    // Swipe é reservado para a navegação principal. Elementos interativos,
    // formulários e qualquer área explicitamente protegida nunca iniciam
    // uma troca de aba acidental.
    if (target.closest('[data-swipe-ignore="true"]')) return true;
    if (target.closest('[data-swipe-lock="true"]')) return true;
    if (target.closest('input, textarea, select, button, [contenteditable="true"]')) return true;

    return false;
  };

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.targetTouches[0];
    if (!touch) return;
    blockedRef.current = shouldIgnore(e.target);
    if (blockedRef.current) {
      startRef.current = null;
      endRef.current = null;
      return;
    }
    startRef.current = { x: touch.clientX, y: touch.clientY };
    endRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchMove = (e: TouchEvent) => {
    if (blockedRef.current || !startRef.current) return;
    const touch = e.targetTouches[0];
    if (!touch) return;
    endRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = () => {
    if (blockedRef.current || !startRef.current || !endRef.current) {
      startRef.current = null;
      endRef.current = null;
      blockedRef.current = false;
      return;
    }

    const dx = startRef.current.x - endRef.current.x;
    const dy = startRef.current.y - endRef.current.y;
    const horizontalDistance = Math.abs(dx);
    const verticalDistance = Math.abs(dy);

    // O gesto precisa ser claramente horizontal. Scroll vertical nunca troca de aba.
    const isHorizontal = horizontalDistance > minSwipeDistance && horizontalDistance > verticalDistance * 1.5;

    if (isHorizontal) {
      if (dx > 0) onSwipeLeft();
      else onSwipeRight();
    }

    startRef.current = null;
    endRef.current = null;
    blockedRef.current = false;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
