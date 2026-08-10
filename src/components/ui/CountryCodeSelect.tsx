'use client';

/**
 * CountryCodeSelect — shared premium dial-code dropdown.
 *
 * Same pattern as CurrencySelect (RTL-first rows, keyboard navigation,
 * spring micro-interactions, viewport-safe panel) but lighter: a flat list
 * with no search. The wrapper is `dir="ltr"` so it can sit at the physical
 * left edge of an RTL phone field, exactly like a native dial-code prefix.
 *
 * Usage:
 *   <CountryCodeSelect
 *     value={country}
 *     onChange={setCountry}
 *     options={[
 *       { code: 'AF', name: 'افغانستان', dial: '+93' },
 *       ...
 *     ]}
 *     ariaLabel="پیش‌شماره کشور"
 *   />
 */

import { Check, ChevronDown } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import s from './CountryCodeSelect.module.css';

export interface CountryOption {
  /** ISO 3166-1 alpha-2 — also the select value. */
  code: string;
  /** Persian country name. */
  name: string;
  /** International dial code, e.g. "+93". */
  dial: string;
}

export interface CountryCodeSelectProps {
  /** Currently selected country code. */
  value: string;
  /** Change handler — receives the new country code. */
  onChange: (code: string) => void;
  options: readonly CountryOption[];
  /** aria-label for the trigger button. */
  ariaLabel?: string;
  disabled?: boolean;
  /** Extra class on the wrapper — for external styling. */
  className?: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  className,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optId = (code: string) => `${listId}-opt-${code}`;

  const selected = options.find((o) => o.code === value);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus the selected (or first) option when the panel opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const opts = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      const target = opts
        ? ([...opts].find((o) => o.getAttribute('aria-selected') === 'true') ?? opts[0])
        : null;
      if (target) {
        setActiveId(target.id);
        target.focus();
      }
    }, 20);
    return () => clearTimeout(t);
  }, [open]);

  // Keep the panel inside the viewport: open upward when there is no room
  // below, and clamp width/height to the available space.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const panel = panelRef.current;
      const trigger = wrapRef.current?.querySelector('button');
      if (!panel || !trigger) return;

      // Reset any previously applied inline styles so measurements are clean.
      panel.style.removeProperty('inset-block-start');
      panel.style.removeProperty('inset-block-end');
      panel.style.removeProperty('max-block-size');
      panel.style.removeProperty('max-inline-size');

      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const pad = 8;
      const style: CSSProperties = {};

      // Measure available space relative to the trigger's edges.
      const spaceBelow = window.innerHeight - pad - triggerRect.bottom;
      const spaceAbove = triggerRect.top - pad;
      const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;

      if (openUp) {
        style.insetBlockStart = 'auto';
        style.insetBlockEnd = 'calc(100% + 6px)';
      }
      const available = Math.max(0, openUp ? spaceAbove : spaceBelow);
      if (available > 0) style.maxBlockSize = `${Math.min(320, available)}px`;
      if (panelRect.right > window.innerWidth - pad) {
        style.maxInlineSize = `${Math.max(160, window.innerWidth - pad - panelRect.left)}px`;
      }
      Object.assign(panel.style, style);
    }, 20);
    return () => clearTimeout(t);
  }, [open]);

  /**
   * Close the dropdown. When `refocus` is true, focus returns to the trigger
   * (Escape, picking an option, toggling closed) so focus never falls back to
   * <body> when the panel unmounts. Outside-click close passes false — the
   * user clicked somewhere else and that target owns focus.
   */
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pick = useCallback(
    (code: string) => {
      onChange(code);
      close(true);
    },
    [close, onChange],
  );

  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Escape') {
        close(true);
        return;
      }
      if (
        !open &&
        (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')
      ) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [close, open],
  );

  const handleListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      if (e.key === 'Escape') {
        close(true);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const opts = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
        const active = document.activeElement as HTMLElement;
        const idx = opts.indexOf(active);
        const next =
          e.key === 'ArrowDown' ? Math.min(idx + 1, opts.length - 1) : Math.max(idx - 1, 0);
        const target = opts[next];
        if (target) {
          setActiveId(target.id);
          target.focus();
        }
      }
    },
    [close],
  );

  const handleOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLLIElement>, code: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(code);
      }
    },
    [pick],
  );

  return (
    <div ref={wrapRef} className={`${s.wrap}${className ? ` ${className}` : ''}`} dir="ltr">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? `پیش‌شماره: ${selected?.dial ?? ''}`}
        data-open={open ? 'true' : undefined}
        className={s.trigger}
        // The dropdown owns focus management: keep the trigger from taking
        // native focus on click (it would linger as a visible "focus ring"
        // for the 20ms before the panel focuses the selected option).
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (disabled) return;
          if (open) {
            close(true);
          } else {
            setOpen(true);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
      >
        <span className={s.dial}>{selected?.dial ?? '•••'}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`${s.chevron} ${open ? s.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <div ref={panelRef} className={s.panel}>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel ?? 'انتخاب کشور'}
            aria-activedescendant={activeId}
            className={s.list}
            onKeyDown={handleListKeyDown}
          >
            <li role="presentation">
              <ul role="group" aria-label={ariaLabel ?? 'انتخاب کشور'} className={s.group}>
                {options.map((opt) => {
                  const isSelected = opt.code === value;
                  return (
                    <li
                      key={opt.code}
                      id={optId(opt.code)}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      className={`${s.option} ${isSelected ? s.optionSelected : ''}`}
                      onClick={() => pick(opt.code)}
                      onFocus={() => setActiveId(optId(opt.code))}
                      onKeyDown={(e) => handleOptionKeyDown(e, opt.code)}
                    >
                      <span className={s.dialBadge} dir="ltr">
                        {opt.dial}
                      </span>
                      <span className={s.name} dir="rtl">
                        {opt.name}
                      </span>
                      {isSelected && <Check size={14} aria-hidden="true" className={s.check} />}
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
