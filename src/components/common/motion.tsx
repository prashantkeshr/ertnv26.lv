/**
 * Small motion primitives. All of them render their final state immediately when
 * IntersectionObserver is missing or the user prefers reduced motion.
 */
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type PointerEvent, type ReactNode } from 'react';
import { cn } from './primitives';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(rootMargin = '0px 0px -8% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window) || prefersReducedMotion());
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen] as const;
}

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  /** Stagger in milliseconds. */
  delay?: number;
  from?: 'up' | 'left' | 'scale';
  className?: string;
}
export function Reveal({ children, as: Tag = 'div', delay = 0, from = 'up', className }: RevealProps) {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={cn('reveal', className)} data-reveal={seen ? 'in' : 'out'} data-from={from} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Counts up to `value` once visible. Screen readers get the final figure immediately. */
export function CountUp({ value, format, duration = 1400 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (!seen || prefersReducedMotion()) {
      if (seen) setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - t, 4)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration]);
  return (
    <span ref={ref}>
      <span aria-hidden="true">{format(seen ? Math.round(shown) : 0)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/** Tracks the pointer over a card so its CSS glow follows the cursor. */
export function spotlightHandlers() {
  return {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
  };
}
