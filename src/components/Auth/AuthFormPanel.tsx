'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import AuthFlow from './AuthFlow';

type TabKey = 'register' | 'login' | 'recover';
const TABS: ReadonlyArray<{ key: TabKey; labelFa: string }> = [
  { key: 'register', labelFa: 'ایجاد حساب' },
  { key: 'login',    labelFa: 'ورود' },
  { key: 'recover',  labelFa: 'بازیابی رمز' },
];

export default function AuthFormPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const initialIntent = (params.get('intent') as TabKey | null) ?? null;
  const initialTab: TabKey =
    initialIntent === 'login' || initialIntent === 'recover'
      ? initialIntent
      : 'register';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [tabFocus, setTabFocus] = useState<TabKey>(tab);
  const tabId = useId();
  const panelId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    register: null,
    login: null,
    recover: null,
  });

  // Animated sliding pill: position it over the selected trigger.
  const [pill, setPill] = useState<{ start: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = triggerRefs.current[tab];
    const list = listRef.current;
    if (!el || !list) return;
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    setPill({ start: elRect.left - listRect.left, width: elRect.width });
  }, [tab]);

  // Recompute on resize so the pill tracks the container.
  useEffect(() => {
    const onResize = () => {
      const el = triggerRefs.current[tab];
      const list = listRef.current;
      if (!el || !list) return;
      const elRect = el.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      setPill({ start: elRect.left - listRect.left, width: elRect.width });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [tab]);

  const select = useCallback(
    (next: TabKey) => {
      setTab(next);
      const sp = new URLSearchParams(Array.from(params.entries()));
      if (next === 'register') sp.delete('intent');
      else sp.set('intent', next);
      router.replace('/auth?' + sp.toString(), { scroll: false });
    },
    [params, router],
  );

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.findIndex((t) => t.key === tabFocus);
    if (idx < 0) return;
    let nextIdx = idx;
    switch (e.key) {
      case 'ArrowLeft': // RTL: left moves to next tab
      case 'ArrowUp':
        nextIdx = (idx + 1) % TABS.length;
        break;
      case 'ArrowRight': // RTL: right moves to previous tab
      case 'ArrowDown':
        nextIdx = (idx - 1 + TABS.length) % TABS.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = TABS[nextIdx].key;
    setTabFocus(next);
    triggerRefs.current[next]?.focus();
  };

  return (
    <div className="auth-tabs-card">
      <div
        ref={listRef}
        className="auth-tabs"
        role="tablist"
        aria-label="حالت‌های احراز هویت"
        aria-orientation="horizontal"
        onKeyDown={onKey}
      >
        {pill && (
          <span
            className="auth-tab-pill"
            aria-hidden="true"
            style={{
              insetInlineStart: pill.start,
              inlineSize: pill.width,
            }}
          />
        )}
        {TABS.map((t) => {
          const selected = t.key === tab;
          const focused = t.key === tabFocus;
          return (
            <button
              key={t.key}
              ref={(el) => {
                triggerRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`${tabId}-${t.key}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={focused ? 0 : -1}
              onClick={() => select(t.key)}
              onFocus={() => setTabFocus(t.key)}
              className={selected ? 'auth-tab auth-tab--selected' : 'auth-tab'}
            >
              {t.labelFa}
            </button>
          );
        })}
      </div>

      <div
        className="auth-tabpanel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${tabId}-${tab}`}
      >
        <Suspense
          fallback={
            <div className="auth-tabpanel-fallback" aria-busy="true" />
          }
        >
          <AuthFormStage intent={tab} />
        </Suspense>
      </div>
    </div>
  );
}

function AuthFormStage({ intent }: { intent: TabKey }) {
  // AuthFlow reads `?step=` and `?intent=` on its own; the URL is the
  // single source of truth for the OTP lane. We forward the tab so the
  // context API stays consistent for any future consumer.
  void intent;
  return <AuthFlow />;
}