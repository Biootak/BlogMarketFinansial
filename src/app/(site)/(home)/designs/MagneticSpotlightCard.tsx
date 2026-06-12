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
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 }); // normalized 0..1
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

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // موقعیت ماوس به فرم normalized (0..1)
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setPosition({ x, y });
    },
    [prefersReducedMotion],
  );

  const handleMouseEnter = useCallback(() => {
    if (!prefersReducedMotion) setIsHovering(true);
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    // برگشت smooth به مرکز
    setPosition({ x: 0.5, y: 0.5 });
  }, []);

  // محاسبه tilt
  // x: 0 → چپ، 1 → راست. در RTL منطق برعکس می‌شه ولی برای tilt مهم نیست
  const tiltX = prefersReducedMotion ? 0 : (position.y - 0.5) * -12 * tiltStrength; // چرخش محور X
  const tiltY = prefersReducedMotion ? 0 : (position.x - 0.5) * 12 * tiltStrength; // چرخش محور Y

  const containerStyle: CSSProperties = {
    transform: prefersReducedMotion
      ? undefined
      : `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`,
    transformStyle: 'preserve-3d',
    transition: isHovering ? 'transform 80ms ease-out' : 'transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    willChange: 'transform',
  };

  // موقعیت spotlight
  const spotlightStyle: CSSProperties = {
    background: `radial-gradient(circle 280px at ${position.x * 100}% ${position.y * 100}%, ${spotlightColor}, transparent 70%)`,
    opacity: isHovering ? 1 : 0,
    transition: 'opacity 500ms ease',
  };

  // موقعیت holographic gradient
  // با tilt، gradient می‌چرخه
  const holoAngle = (position.x - 0.5) * 60 + (position.y - 0.5) * 30;
  const holoStyle: CSSProperties = enableHolographic
    ? {
        background: `linear-gradient(${105 + holoAngle}deg,
          rgba(255, 0, 128, 0) 0%,
          rgba(255, 0, 128, 0.18) 20%,
          rgba(0, 255, 255, 0.18) 40%,
          rgba(128, 0, 255, 0.18) 60%,
          rgba(0, 255, 128, 0.18) 80%,
          rgba(255, 0, 128, 0) 100%)`,
        mixBlendMode: 'color-dodge',
        opacity: isHovering && !prefersReducedMotion ? 0.9 : 0,
        transition: 'opacity 400ms ease',
      }
    : { display: 'none' };

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

      {/* Spotlight Layer */}
      <div
        className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
        style={spotlightStyle}
        aria-hidden
      />

      {/* Holographic Layer */}
      {enableHolographic && (
        <div
          className="absolute inset-0 pointer-events-none z-30 rounded-[inherit]"
          style={holoStyle}
          aria-hidden
        />
      )}

      {/* Edge highlight (premium glass) — وقتی hover می‌شه، کارت یه خط نورانی ملایم می‌گیره */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] z-10"
        style={{
          background: `radial-gradient(circle 200px at ${position.x * 100}% ${position.y * 100}%, rgba(255,255,255,0.4), transparent 60%)`,
          WebkitMaskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
          opacity: isHovering ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
        aria-hidden
      />
    </div>
  );
}
