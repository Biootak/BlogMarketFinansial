'use client';

/**
 * DevInspector — ابزار بازرسی ظاهری (فقط در development)
 * ----------------------------------------------------------------------------
 * در root layout مونت می‌شود (فقط NODE_ENV=development) → روی همهٔ صفحاتی که
 * سرور dev بالا باشد خودکار حاضر است.
 *
 * طراحی (هماهنگ با DS پروژه — tokens.css):
 *   - داک شیشه‌ای در بالای وسط: بررسی + QA + تنظیمات — آیکون‌های lucide،
 *     فونت Estedad، رنگ‌های OKLCH — به‌صورت پیش‌فرض جمع (فقط دکمهٔ شناور)
 *   - شبیه‌ساز دستگاه حذف شده است؛ پیش‌نمایش با عرض دلخواه مستقیم از پنل
 *     باز می‌شود (بدون iframe و scale سنگین)
 *
 * بررسی المان:
 *   - هاور → قاب همان لحظه دور المان (حتی وقتی چیزی انتخاب شده)
 *   - کلیک → انتخاب + ارسال خودکار به چت (window.__devInspectLast +
 *     sessionStorage + console marker) همراه با viewport
 *   - میانبر Ctrl+Shift+I روشن/خاموش · Esc خروج
 *
 * QA خودکار (بدون نیاز به vision):
 *   - دکمهٔ QA → بررسی عددی صفحهٔ جاری: سرریز افقی، بیرون‌زدگی از لبه،
 *     متن بریده‌شده و کنتراست ضعیف (WCAG)
 *   - هر ایراد با عدد دقیق + سلکتور + دکمهٔ «پین» برای نشان‌دادن همان المان
 *   - نتیجه به‌صورت خودکار به چت ارسال می‌شود (window.__devQaLast + console marker)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import s from './DevInspector.module.css';
import { runVisualQa } from './visualQa';
import type { QaIssue, VisualQaResult } from './visualQa';

// انتخاب‌ها و گزارش‌های بازرس در window والد ذخیره می‌شوند تا ایجنت بتواند بخواند
declare global {
  interface Window {
    __devInspectLast?: unknown;
    __devQaLast?: unknown;
  }
}

interface Settings {
  color: string;
  showMargin: boolean;
  hoverInspect: boolean;
}

interface PinnedInfo {
  selector: string;
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  path: string;
  rect: { x: number; y: number; w: number; h: number };
  styles: Record<string, string>;
}

interface SelectionContext {
  ts: number;
  url: string;
  viewport: { w: number; h: number };
  scrollY: number;
}

const DEFAULT_SETTINGS: Settings = {
  color: '#10b981',
  // جعبهٔ margin پیش‌فرض خاموش — بزرگ‌ترین عامل «لرزش» هنگام هاور (پرش روی محتوا)
  showMargin: false,
  hoverInspect: true,
};

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'];

const clampNum = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

const STYLE_KEYS = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'display',
  'position',
  'padding',
  'margin',
  'border-radius',
  'width',
  'height',
  'line-height',
  'text-align',
  'gap',
] as const;

const HISTORY_KEY = 'dev-inspect-history';
const QA_HISTORY_KEY = 'dev-qa-history';
const FAB_POS_KEY = 'dev-inspector-fab-pos';

/* ── آیکون‌های SVG (lucide-style, stroke) — بدون ایموجی ─────────────────── */
const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

const IconSearch = () => (
  <svg {...ICON_PROPS}>
    <title>جستجو</title>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IconActivity = () => (
  <svg {...ICON_PROPS}>
    <title>QA</title>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
const IconSettings = () => (
  <svg {...ICON_PROPS}>
    <title>تنظیمات</title>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconX = () => (
  <svg {...ICON_PROPS}>
    <title>بستن</title>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const IconMinus = () => (
  <svg {...ICON_PROPS}>
    <title>جمع‌کردن</title>
    <path d="M5 12h14" />
  </svg>
);
const IconPin = () => (
  <svg {...ICON_PROPS}>
    <title>پین</title>
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
  </svg>
);
const IconChart = () => (
  <svg {...ICON_PROPS}>
    <title>گزارش</title>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);
const IconCopy = () => (
  <svg {...ICON_PROPS}>
    <title>کپی</title>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

/** نسخهٔ قابل‌سریال‌سازی گزارش QA (بدون ارجاع DOM) برای ذخیره/ارسال به چت */
type SerializedQa = Omit<VisualQaResult, 'issues'> & {
  issues: Omit<QaIssue, 'el'>[];
};

function serializeQa(r: VisualQaResult): SerializedQa {
  return {
    viewport: r.viewport,
    pageScrollWidth: r.pageScrollWidth,
    issues: r.issues.map((iss) => ({
      type: iss.type,
      severity: iss.severity,
      message: iss.message,
      meta: iss.meta,
      selector: iss.selector,
    })),
  };
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem('dev-inspector-settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

/** موقعیت ذخیره‌شدهٔ دکمهٔ شناور (پس از جابه‌جایی) */
function loadFabPos(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { x: number; y: number };
      if (typeof p.x === 'number' && typeof p.y === 'number') return p;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function DevInspector() {
  // با ?dev=0 بازرس کاملاً غیرفعال می‌شود — برای دمو/اسکرین‌شات تمیز
  // (hook ها همیشه اجرا می‌شوند؛ فقط رندر null می‌شود تا rules-of-hooks رعایت شود)
  const disabled =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '0';

  // پیش‌فرض: جمع‌شده — فقط دکمهٔ شناور دیده می‌شود
  const [open, setOpen] = useState(false);
  const [inspect, setInspect] = useState(false);
  // موقعیت شناور — null تا بعد از mount (جلوگیری از hydration mismatch با SSR)
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [selected, setSelected] = useState<PinnedInfo | null>(null);
  const [selCtx, setSelCtx] = useState<SelectionContext | null>(null);
  const [copied, setCopied] = useState(false);
  const [qaResult, setQaResult] = useState<VisualQaResult | null>(null);
  const [qaOpen, setQaOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const selectedBoxRef = useRef<HTMLDivElement | null>(null);
  const marginRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const selectedElRef = useRef<HTMLElement | null>(null);
  // همگام‌سازی هاور با rAF — حداکثر یک به‌روزرسانی قاب در هر فریم
  const hoverPendingRef = useRef<HTMLElement | null>(null);
  const hoverRaf = useRef(0);
  // عرض برچسب هاور — فقط هنگام تغییر متن اندازه گرفته می‌شود (بدون layout اجباری)
  const labelWidthRef = useRef(0);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  // حالت کشیدن دکمهٔ شناور — تا کلیکِ بعد از درگ، داک را باز نکند
  const fabDrag = useRef<{
    id: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const suppressOpen = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // persist settings
  useEffect(() => {
    try {
      localStorage.setItem('dev-inspector-settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // موقعیت ذخیره‌شدهٔ شناور را بعد از mount اعمال کن (سرور/کلاینت یکی رندر می‌شوند)
  useEffect(() => {
    setFabPos(loadFabPos());
  }, []);

  // overlay elements — یک‌بار ساخته می‌شوند
  useEffect(() => {
    const box = document.createElement('div');
    box.className = s.overlay;
    const selectedBox = document.createElement('div');
    selectedBox.className = s.selectedOverlay;
    const margin = document.createElement('div');
    margin.className = s.marginOverlay;
    const label = document.createElement('div');
    label.className = s.tagLabel;
    document.body.appendChild(box);
    document.body.appendChild(selectedBox);
    document.body.appendChild(margin);
    document.body.appendChild(label);
    boxRef.current = box;
    selectedBoxRef.current = selectedBox;
    marginRef.current = margin;
    labelRef.current = label;
    return () => {
      box.remove();
      selectedBox.remove();
      margin.remove();
      label.remove();
    };
  }, []);

  const isUiElement = useCallback((el: Element | null): boolean => {
    if (!el) return true;
    return Boolean(
      el.closest(
        `.${s.dock}, .${s.fab}, .${s.details}, .${s.qaCard}, .${s.overlay}, .${s.selectedOverlay}, .${s.marginOverlay}, .${s.tagLabel}`,
      ),
    );
  }, []);

  const hideOverlays = useCallback(() => {
    if (boxRef.current) boxRef.current.style.display = 'none';
    if (selectedBoxRef.current) selectedBoxRef.current.style.display = 'none';
    if (marginRef.current) marginRef.current.style.display = 'none';
    if (labelRef.current) labelRef.current.style.display = 'none';
  }, []);

  /** قاب هاور — همان لحظه دنبال موس (بدون خواندن layout اضافی) */
  const placeHover = useCallback((el: HTMLElement) => {
    const box = boxRef.current;
    const margin = marginRef.current;
    const label = labelRef.current;
    if (!box || !label) return;

    const r = el.getBoundingClientRect();
    const color = settingsRef.current.color;

    box.style.display = 'block';
    box.style.borderColor = color;
    box.style.boxShadow = `0 0 0 1px ${color}66, 0 8px 24px rgba(0,0,0,.35)`;
    box.style.left = `${r.left}px`;
    box.style.top = `${r.top}px`;
    box.style.width = `${Math.max(0, r.width)}px`;
    box.style.height = `${Math.max(0, r.height)}px`;

    if (settingsRef.current.showMargin && margin) {
      // getComputedStyle فقط وقتی لازم است که جعبهٔ margin نمایش داده شود
      const cs = getComputedStyle(el);
      const ml = Number.parseFloat(cs.marginLeft) || 0;
      const mr = Number.parseFloat(cs.marginRight) || 0;
      const mt = Number.parseFloat(cs.marginTop) || 0;
      const mb = Number.parseFloat(cs.marginBottom) || 0;
      margin.style.display = 'block';
      margin.style.left = `${r.left - ml}px`;
      margin.style.top = `${r.top - mt}px`;
      margin.style.width = `${Math.max(0, r.width + ml + mr)}px`;
      margin.style.height = `${Math.max(0, r.height + mt + mb)}px`;
    } else if (margin) {
      margin.style.display = 'none';
    }

    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    const text = el.childElementCount === 0 ? (el.textContent || '').trim().slice(0, 45) : '';
    const labelText = `🔎 ${el.tagName.toLowerCase()}${cls}${text ? ` [${text}]` : ''}`;
    if (label.textContent !== labelText) {
      label.textContent = labelText;
      // فقط هنگام تغییر متن، عرض اندازه گرفته می‌شود
      labelWidthRef.current = label.offsetWidth;
    }
    label.style.display = 'block';
    label.style.left = `${Math.min(
      Math.max(4, r.left),
      Math.max(4, innerWidth - labelWidthRef.current - 4),
    )}px`;
    label.style.top = `${Math.max(4, r.top - 26)}px`;
    label.style.background = color;
  }, []);

  /** فقط قاب/لیبل هاور را جمع کن — قاب انتخاب‌شده می‌ماند */
  const hideHoverVisuals = useCallback(() => {
    if (boxRef.current) boxRef.current.style.display = 'none';
    if (marginRef.current) marginRef.current.style.display = 'none';
    if (labelRef.current) labelRef.current.style.display = 'none';
  }, []);

  /** به‌روزرسانی هاور را با rAF یکپارچه کن — حداکثر یک بار در هر فریم */
  const scheduleHover = useCallback(
    (el: HTMLElement | null) => {
      hoverPendingRef.current = el;
      if (hoverRaf.current) return;
      hoverRaf.current = requestAnimationFrame(() => {
        hoverRaf.current = 0;
        const t = hoverPendingRef.current;
        hoverPendingRef.current = null;
        if (!t) {
          if (!selectedElRef.current) hideOverlays();
          else hideHoverVisuals();
          return;
        }
        placeHover(t);
      });
    },
    [hideOverlays, hideHoverVisuals, placeHover],
  );

  /** قاب انتخاب‌شده — خط‌چین نارنجی، مستقل از هاور */
  const placeSelected = useCallback((el: HTMLElement) => {
    const box = selectedBoxRef.current;
    if (!box) return;
    const r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = `${r.left}px`;
    box.style.top = `${r.top}px`;
    box.style.width = `${Math.max(0, r.width)}px`;
    box.style.height = `${Math.max(0, r.height)}px`;
  }, []);

  const buildInfo = useCallback((el: HTMLElement): PinnedInfo => {
    const cs = getComputedStyle(el);
    const classes =
      typeof el.className === 'string' && el.className.trim()
        ? el.className.trim().split(/\s+/)
        : [];
    const path: string[] = [];
    let n: HTMLElement | null = el;
    while (n && n !== document.body && path.length < 8) {
      const cls =
        typeof n.className === 'string' && n.className.trim()
          ? `.${n.className.trim().split(/\s+/).slice(0, 2).join('.')}`
          : '';
      path.unshift(`${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}${cls}`);
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    const styles: Record<string, string> = {};
    for (const k of STYLE_KEYS) styles[k] = cs.getPropertyValue(k);
    return {
      selector: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes.length ? `.${classes.slice(0, 3).join('.')}` : ''}`,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes,
      text: (el.textContent || '').trim().slice(0, 120),
      path: path.join(' > ') || 'body',
      rect: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      styles,
    };
  }, []);

  /** بافت انتخاب: viewport + URL */
  const buildContext = useCallback((): SelectionContext => {
    return {
      ts: Date.now(),
      url: location.href,
      viewport: { w: innerWidth, h: innerHeight },
      scrollY: Math.round(scrollY),
    };
  }, []);

  /** ارسال خودکار انتخاب به چت */
  const emitSelection = useCallback(
    (info: PinnedInfo) => {
      const payload: PinnedInfo & SelectionContext = { ...info, ...buildContext() };
      window.__devInspectLast = payload;
      try {
        const arr = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]');
        arr.push(payload);
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-10)));
      } catch {
        // ignore
      }
      // biome-ignore lint/suspicious/noConsole: deliberate — marker خوانده‌شده توسط ایجنت
      console.info('[DevInspector] selected:', JSON.stringify(payload));
    },
    [buildContext],
  );

  /** ارسال خودکار گزارش QA به چت */
  const emitQa = useCallback(
    (result: SerializedQa) => {
      const payload = { ...result, ...buildContext() };
      window.__devQaLast = payload;
      try {
        const arr = JSON.parse(sessionStorage.getItem(QA_HISTORY_KEY) ?? '[]');
        arr.push(payload);
        sessionStorage.setItem(QA_HISTORY_KEY, JSON.stringify(arr.slice(-10)));
      } catch {
        // ignore
      }
      // biome-ignore lint/suspicious/noConsole: deliberate — marker خوانده‌شده توسط ایجنت
      console.info('[DevInspector] qa:', JSON.stringify(payload));
    },
    [buildContext],
  );

  const selectElement = useCallback(
    (el: HTMLElement) => {
      selectedElRef.current = el;
      placeHover(el);
      placeSelected(el);
      const info = buildInfo(el);
      setSelected(info);
      setSelCtx(buildContext());
      emitSelection(info);
    },
    [buildInfo, buildContext, emitSelection, placeHover, placeSelected],
  );

  // لیسنرهای بررسی المان
  useEffect(() => {
    if (!inspect) {
      hideOverlays();
      selectedElRef.current = null;
      return;
    }

    const onMove = (e: MouseEvent) => {
      if (!settingsRef.current.hoverInspect) return;
      const t = e.target as HTMLElement | null;
      if (!t || isUiElement(t)) return;
      scheduleHover(t);
    };
    const onLeave = () => {
      scheduleHover(null);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || isUiElement(t)) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(t);
    };
    const onScroll = () => {
      if (selectedElRef.current) placeSelected(selectedElRef.current);
      if (boxRef.current) boxRef.current.style.display = 'none';
      if (labelRef.current) labelRef.current.style.display = 'none';
      if (marginRef.current) marginRef.current.style.display = 'none';
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectedElRef.current = null;
        hideOverlays();
        setSelected(null);
        setSelCtx(null);
        setInspect(false);
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'ی')) {
        e.preventDefault();
        setInspect((v) => !v);
      }
    };

    document.addEventListener('mouseover', onMove, true);
    document.addEventListener('mouseout', onLeave, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('keydown', onKey);
    return () => {
      if (hoverRaf.current) {
        cancelAnimationFrame(hoverRaf.current);
        hoverRaf.current = 0;
      }
      hoverPendingRef.current = null;
      document.removeEventListener('mouseover', onMove, true);
      document.removeEventListener('mouseout', onLeave, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, [inspect, scheduleHover, hideOverlays, isUiElement, selectElement, placeSelected]);

  const toggleInspect = useCallback(() => {
    setInspect((v) => !v);
  }, []);

  /** اجرای QA خودکار روی همین صفحه */
  const runQa = useCallback(() => {
    const result = runVisualQa();
    setQaResult(result);
    setQaOpen(true);
    emitQa(serializeQa(result));
  }, [emitQa]);

  /** پین‌کردن یک ایراد — انتخاب و نمایش همان المان */
  const pinIssue = useCallback(
    (issue: QaIssue) => {
      if (issue.el) {
        selectedElRef.current = issue.el;
        placeHover(issue.el);
        placeSelected(issue.el);
        setSelected(buildInfo(issue.el));
        setSelCtx(buildContext());
      }
    },
    [buildInfo, buildContext, placeHover, placeSelected],
  );

  const copySelector = useCallback(async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.selector);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [selected]);

  /** گزارش کامل المان — همهٔ اطلاعات لازم برای کپی/اعمال تغییر */
  const buildFullReport = useCallback((): string => {
    if (!selected) return '';
    const lines: string[] = [];
    lines.push('المان انتخاب‌شده');
    lines.push(`سلکتور: ${selected.selector}`);
    lines.push(`تگ: ${selected.tag}`);
    lines.push(`id: ${selected.id ?? '—'}`);
    lines.push(`کلاس‌ها: ${selected.classes.join(' ') || '—'}`);
    lines.push(`مسیر: ${selected.path}`);
    lines.push(
      `ابعاد: ${selected.rect.w} × ${selected.rect.h}px @ (${selected.rect.x}, ${selected.rect.y})`,
    );
    if (selected.text) lines.push(`متن: «${selected.text}»`);
    if (selCtx) {
      lines.push(`viewport: ${selCtx.viewport.w} × ${selCtx.viewport.h}`);
      lines.push(`URL: ${selCtx.url}`);
    }
    lines.push('استایل‌های محاسبه‌شده:');
    for (const [k, v] of Object.entries(selected.styles)) {
      if (v) lines.push(`  ${k}: ${v}`);
    }
    return lines.join('\n');
  }, [selected, selCtx]);

  const copyAll = useCallback(async () => {
    const report = buildFullReport();
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [buildFullReport]);

  // ── کشیدن دکمهٔ شناور (listener روی window تا خارج از دکمه هم ادامه یابد) ──
  const onFabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const fab = fabRef.current;
    if (!fab) return;
    e.preventDefault();
    const r = fab.getBoundingClientRect();
    fabDrag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: r.left,
      oy: r.top,
      moved: false,
    };

    const onMove = (ev: PointerEvent) => {
      const d = fabDrag.current;
      if (!d || ev.pointerId !== d.id) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      setFabPos({
        x: clampNum(d.ox + dx, 0, Math.max(0, innerWidth - 48)),
        y: clampNum(d.oy + dy, 0, Math.max(0, innerHeight - 48)),
      });
    };
    const onUp = (ev: PointerEvent) => {
      const d = fabDrag.current;
      if (!d || ev.pointerId !== d.id) return;
      fabDrag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (d.moved) {
        suppressOpen.current = true;
        const pos = {
          x: clampNum(d.ox + (ev.clientX - d.sx), 0, Math.max(0, innerWidth - 48)),
          y: clampNum(d.oy + (ev.clientY - d.sy), 0, Math.max(0, innerHeight - 48)),
        };
        setFabPos(pos);
        try {
          localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const onClickFab = useCallback(() => {
    if (suppressOpen.current) {
      suppressOpen.current = false;
      return;
    }
    setOpen(true);
  }, []);

  // ── جزئیات المان انتخاب‌شده ─────────────────────────────────────────────
  const detailsPanel = selected ? (
    <div className={s.details} dir="rtl">
      <div className={s.detailsHead}>
        <span className={s.detailsTitle}>
          <IconSearch />
          المان انتخاب‌شده
        </span>
        <div className={s.detailsHeadActions}>
          <button type="button" className={s.copyAllBtn} onClick={copyAll} title="کپی همهٔ اطلاعات">
            <IconCopy />
            {copied ? 'کپی شد' : 'کپی همه'}
          </button>
          <button
            type="button"
            className={s.closeBtn}
            onClick={() => {
              selectedElRef.current = null;
              hideOverlays();
              setSelected(null);
              setSelCtx(null);
            }}
          >
            <IconX />
          </button>
        </div>
      </div>
      <div className={s.detailsRow}>
        <code className={s.selector}>{selected.selector}</code>
        <button type="button" className={s.copyBtn} onClick={copySelector}>
          <IconCopy />
          {copied ? 'کپی شد' : 'کپی'}
        </button>
      </div>
      {selCtx && (
        <div className={s.ctxRow}>
          <span className={s.k}>انتخاب در</span>
          <code>
            viewport {selCtx.viewport.w}×{selCtx.viewport.h} · {selCtx.url}
          </code>
        </div>
      )}
      {selected.id && (
        <div className={s.detailsRow}>
          <span className={s.k}>id</span>
          <code>{selected.id}</code>
        </div>
      )}
      {selected.classes.length > 0 && (
        <div className={s.chips}>
          {selected.classes.slice(0, 6).map((c) => (
            <span key={c} className={s.chip}>
              {c}
            </span>
          ))}
        </div>
      )}
      {selected.text && (
        <div className={s.textPreview} dir="auto">
          «{selected.text}»
        </div>
      )}
      <div className={s.detailsRow}>
        <span className={s.k}>ابعاد</span>
        <code>
          {selected.rect.w} × {selected.rect.h}px @ ({selected.rect.x}, {selected.rect.y})
        </code>
      </div>
      <div className={s.pathRow}>
        <span className={s.k}>مسیر</span>
        <code className={s.path}>{selected.path}</code>
      </div>
      <div className={s.styles}>
        {Object.entries(selected.styles).map(([k, v]) =>
          v ? (
            <div key={k} className={s.styleRow}>
              <span className={s.k}>{k}</span>
              <code>{v}</code>
            </div>
          ) : null,
        )}
      </div>
    </div>
  ) : null;

  if (disabled) return null;

  return (
    <>
      {/* ── داک کنترل — پایین وسط ── */}
      {open ? (
        <div className={s.dock} dir="rtl">
          <div className={s.actions}>
            <button
              type="button"
              className={`${s.toggle} ${inspect ? s.toggleOn : ''}`}
              onClick={toggleInspect}
            >
              <span className={s.toggleDot} />
              {inspect ? 'بررسی: روشن' : 'بررسی'}
            </button>
            <button
              type="button"
              className={`${s.qaBtn} ${qaResult && qaResult.issues.length > 0 ? s.qaBtnWarn : ''}`}
              onClick={runQa}
            >
              <IconActivity />
              QA
            </button>
            <div className={s.gearWrap}>
              <button
                type="button"
                className={`${s.iconBtn} ${settingsOpen ? s.iconBtnOn : ''}`}
                onClick={() => setSettingsOpen((v) => !v)}
                title="تنظیمات"
              >
                <IconSettings />
              </button>
              {settingsOpen && (
                <div className={s.settingsPanel}>
                  <div className={s.settingsTitle}>رنگ هایلایت</div>
                  <div className={s.swatches}>
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={`${s.swatch} ${settings.color === c ? s.swatchActive : ''}`}
                        style={{ background: c }}
                        onClick={() => setSettings((x) => ({ ...x, color: c }))}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      checked={settings.showMargin}
                      onChange={(e) => setSettings((x) => ({ ...x, showMargin: e.target.checked }))}
                    />
                    نمایش جعبهٔ margin
                  </label>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      checked={settings.hoverInspect}
                      onChange={(e) =>
                        setSettings((x) => ({ ...x, hoverInspect: e.target.checked }))
                      }
                    />
                    بررسی هنگام هاور
                  </label>
                  <div className={s.settingsHint}>
                    هاور = قاب · کلیک = انتخاب + ارسال به چت · Ctrl+Shift+I = روشن/خاموش · Esc =
                    خروج
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => setOpen(false)}
              title="جمع‌کردن داک"
            >
              <IconMinus />
            </button>
          </div>

          <div className={s.sep} />

          <span className={s.kbd}>⌘ ⇧ I</span>
        </div>
      ) : (
        <button
          type="button"
          ref={fabRef}
          className={`${s.fab} ${inspect ? s.fabActive : ''} ${fabPos ? s.fabDragged : ''}`}
          style={fabPos ? { left: fabPos.x, top: fabPos.y } : undefined}
          onClick={onClickFab}
          onPointerDown={onFabPointerDown}
          title="باز کردن بازرس UI — بکشید تا جابه‌جا شود"
        >
          <IconSearch />
        </button>
      )}

      {/* ── کارت QA — کنار راست ── */}
      {qaOpen && qaResult && (
        <div className={s.qaCard} dir="rtl">
          <div className={s.qaHead}>
            <div className={s.qaTitle}>
              <IconChart />
              گزارش QA
              <span className={s.qaCount}>{qaResult.issues.length} ایراد</span>
            </div>
            <button type="button" className={s.closeBtn} onClick={() => setQaOpen(false)}>
              <IconX />
            </button>
          </div>
          <div className={s.qaSummary}>
            viewport {qaResult.viewport.w}×{qaResult.viewport.h} · عرض صفحه{' '}
            {qaResult.pageScrollWidth}px
          </div>
          {qaResult.issues.length === 0 ? (
            <div className={s.qaEmpty}>هیچ ایرادی پیدا نشد</div>
          ) : (
            <div className={s.qaList}>
              {qaResult.issues.map((iss) => (
                <div key={`${iss.type}:${iss.selector}:${iss.meta}`} className={s.qaItem}>
                  <span className={`${s.qaBadge} ${iss.severity === 'error' ? s.qaErr : s.qaWarn}`}>
                    {iss.severity === 'error' ? 'خطا' : 'هشدار'}
                  </span>
                  <div className={s.qaBody}>
                    <div className={s.qaMsg}>{iss.message}</div>
                    <div className={s.qaMeta}>{iss.meta}</div>
                    <div className={s.qaRow}>
                      <code className={s.qaSel}>{iss.selector}</code>
                      <button type="button" className={s.qaPin} onClick={() => pinIssue(iss)}>
                        <IconPin />
                        پین
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detailsPanel}
    </>
  );
}
