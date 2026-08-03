'use client';

import { type ComponentType, type ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';

/**
 * LazyLoad - کامپوننت برای lazy loading محتوای fold پایین
 * Native IntersectionObserver — بدون dependency خارجی
 */

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
}

function useInView({
  rootMargin = '50px',
  threshold = 0.01,
  triggerOnce = true,
}: {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (triggerOnce) obs.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, threshold, triggerOnce]);

  return { ref, inView };
}

export function LazyLoad({
  children,
  fallback = <LazyLoadSkeleton />,
  rootMargin = '50px',
  threshold = 0.01,
  triggerOnce = true,
  className = '',
}: LazyLoadProps) {
  const { ref, inView } = useInView({ rootMargin, threshold, triggerOnce });

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {inView ? children : fallback}
    </div>
  );
}

function LazyLoadSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
    </div>
  );
}

export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  options?: { fallback?: ReactNode; rootMargin?: string; threshold?: number },
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoad fallback={options?.fallback} rootMargin={options?.rootMargin} threshold={options?.threshold}>
        <Component {...props} />
      </LazyLoad>
    );
  };
}

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: string;
  className?: string;
}

export function LazySection({ children, fallback, minHeight = '200px', className = '' }: LazySectionProps) {
  const { ref, inView } = useInView({ rootMargin: '100px', threshold: 0, triggerOnce: true });

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={className} style={{ minHeight: inView ? 'auto' : minHeight }}>
      {inView ? children : fallback || <LazyLoadSkeleton />}
    </section>
  );
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: number;
}

export function LazyImage({ src, alt, className = '', aspectRatio }: LazyImageProps) {
  const { ref, inView } = useInView({ rootMargin: '50px', threshold: 0.01, triggerOnce: true });
  const paddingBottom = aspectRatio ? `${(1 / aspectRatio) * 100}%` : '56.25%';

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={`relative overflow-hidden ${className}`} style={{ paddingBottom }}>
      {inView ? (
        <img src={src} alt={alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      )}
    </div>
  );
}

interface LazyComponentProps<T> {
  loader: () => Promise<{ default: ComponentType<T> }>;
  props: T;
  fallback?: ReactNode;
}

export function LazyComponent<T extends object>({ loader, props, fallback = <LazyLoadSkeleton /> }: LazyComponentProps<T>) {
  const Component = lazy(loader);
  return <Suspense fallback={fallback}><Component {...props} /></Suspense>;
}

export function LazySidebar({ children }: { children: ReactNode }) {
  return <LazyLoad rootMargin="200px" threshold={0}>{children}</LazyLoad>;
}

export function LazyFooter({ children }: { children: ReactNode }) {
  return <LazyLoad rootMargin="300px" threshold={0} triggerOnce>{children}</LazyLoad>;
}

export function LazyComments({ children }: { children: ReactNode }) {
  return <LazySection minHeight="400px" className="mt-8">{children}</LazySection>;
}

export function LazyRelatedPosts({ children }: { children: ReactNode }) {
  return <LazySection minHeight="300px" className="mt-12">{children}</LazySection>;
}

export function usePreloadOnHover(href: string) {
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  };
  return { onMouseEnter: handleMouseEnter };
}

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function PrefetchLink({ href, children, className = '' }: PrefetchLinkProps) {
  const preloadProps = usePreloadOnHover(href);
  return <a href={href} className={className} {...preloadProps}>{children}</a>;
}
