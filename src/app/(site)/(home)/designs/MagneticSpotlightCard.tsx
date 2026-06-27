'use client';

/**
 * MagneticSpotlightCard
 * ----------------------------------------------------------------------------
 * ترکیب سه افکت حرفه‌ای روی یک کارت:
 *
 *   1. Magnetic Spotlight — یه نور radial که دقیقاً دنبال ماوس می‌ره
 *   2. 3D Tilt — کارت با حرکت ماوس کج می‌شه (perspective transform)
 *   3. Holographic Rainbow — یه رنگین‌کمان gradient که با tilt می‌چرخه
 *
 * این سه تا با هم حس "premium glass card" می‌دن که توی وبلاگ‌های فارسی
 * خیلی کم دیده می‌شه.
 *
 * نکات:
 *  - rAF-based برای ۶۰fps
 *  - prefers-reduced-motion رعایت می‌شه
 *  - GPU-accelerated با transform: translate3d
 *  - در موبایل (touch) فقط holographic فعاله
 * ----------------------------------------------------------------------------
 */

import {
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';

interface MagneticSpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** شدت tilt (۰ تا ۱). پیش‌فرض ۰.۵ */
  tiltStrength?: number;
  /** آیا holographic shimmer فعال باشه؟ پیش‌فرض true */
  enableHolographic?: boolean;
  /** رنگ spotlight. پیش‌فرض سفید */
  spotlightColor?: string;
  /** Inner className */
  innerClassName?: string;
}

export default function MagneticSpotlightCard({
  children,
  className = '',
  tiltStrength = 0.5,
  enableHolographic = true,
  spotlightColor = 'rgba(255, 255, 255, 0.18)',
  innerClassName = '',
}: MagneticSpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);

  // position به صورت ref ذخیره می‌شه تا re-render نشه
  const positionRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const pendingMouseEvent = useRef<MouseEvent<HTMLDivElement> | null>(null);

  // فقط isHovering و prefersReducedMotion به صورت state (re-render ارزش داره)
  const [isHovering, setIsHovering] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // rAF-driven update — مستقیم DOM رو update می‌کنه، نه state
  const applyStyles = useCallback(() => {
    rafRef.current = null;
    const { x, y } = positionRef.current;

    if (containerRef.current) {
      const tiltX = prefersReducedMotion ? 0 : (y - 0.5) * -12 * tiltStrength;
      const tiltY = prefersReducedMotion ? 0 : (x - 0.5) * 12 * tiltStrength;
      containerRef.current.style.transform = prefersReducedMotion
        ? ''
        : `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
    }

    const spotlightBg = `radial-gradient(circle 280px at ${x * 100}% ${y * 100}%, ${spotlightColor}, transparent 70%)`;
    if (spotlightRef.current) spotlightRef.current.style.background = spotlightBg;

    if (enableHolographic && holoRef.current) {
      const holoAngle = (x - 0.5) * 60 + (y - 0.5) * 30;
      holoRef.current.style.background = `linear-gradient(${105 + holoAngle}deg,
        rgba(255, 0, 128, 0) 0%,
        rgba(255, 0, 128, 0.18) 20%,
        rgba(0, 255, 255, 0.18) 40%,
        rgba(128, 0, 255, 0.18) 60%,
        rgba(0, 255, 128, 0.18) 80%,
        rgba(255, 0, 128, 0) 100%)`;
    }

    if (edgeRef.current) {
      edgeRef.current.style.background = `radial-gradient(circle 200px at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.4), transparent 60%)`;
    }
  }, [prefersReducedMotion, tiltStrength, spotlightColor, enableHolographic]);

  // schedule rAF
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(applyStyles);
  }, [applyStyles]);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      positionRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
      scheduleUpdate();
    },
    [prefersReducedMotion, scheduleUpdate],
  );

  const handleMouseEnter = useCallback(() => {
    if (!prefersReducedMotion) setIsHovering(true);
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    positionRef.current = { x: 0.5, y: 0.5 };
    scheduleUpdate();
  }, [scheduleUpdate]);

  // cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // محاسبه tilt — فقط برای اولین رندر، بعدش rAF مستقیم DOM رو update می‌کنه
  const containerStyle: CSSProperties = {
    transformStyle: 'preserve-3d',
    transition: isHovering
      ? 'transform 80ms ease-out'
      : 'transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    willChange: 'transform',
  };

  // opacity ها فقط با isHovering تغییر می‌کنن (re-render مجاز)
  const spotlightStyle: CSSProperties = {
    opacity: isHovering ? 1 : 0,
    transition: 'opacity 500ms ease',
  };

  const holoStyle: CSSProperties = enableHolographic
    ? {
        mixBlendMode: 'color-dodge' as const,
        opacity: isHovering && !prefersReducedMotion ? 0.9 : 0,
        transition: 'opacity 400ms ease',
      }
    : { display: 'none' };

  const edgeStyle: CSSProperties = {
    WebkitMaskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
    WebkitMaskComposite: 'xor' as const,
    maskComposite: 'exclude' as const,
    padding: '1px',
    opacity: isHovering ? 1 : 0,
    transition: 'opacity 400ms ease',
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={containerStyle}
      className={`relative ${className}`}
    >
      {/* Original content (با translateZ برای لایه بالاتر) */}
      <div className={`relative ${innerClassName}`} style={{ transform: 'translateZ(0)' }}>
        {children}
      </div>

      {/* Spotlight Layer — background توسط rAF مستقیم set می‌شه */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
        style={spotlightStyle}
        aria-hidden
      />

      {/* Holographic Layer */}
      {enableHolographic && (
        <div
          ref={holoRef}
          className="absolute inset-0 pointer-events-none z-30 rounded-[inherit]"
          style={holoStyle}
          aria-hidden
        />
      )}

      {/* Edge highlight — background توسط rAF مستقیم set می‌شه */}
      <div
        ref={edgeRef}
        className="absolute inset-0 pointer-events-none rounded-[inherit] z-10"
        style={edgeStyle}
        aria-hidden
      />
    </div>
  );
}
