'use client';

/**
 * SettingsSearch — command palette برای تنظیمات.
 * ─────────────────────────────────────────────────────────────
 *  جست‌وجوی میان‌بُر: Ctrl+K / Cmd+K
 *  جست‌وجو در:
 *    - نام تب‌ها
 *    - نام فیلدها
 *    - توضیحات
 *  وقتی آیتمی انتخاب می‌شود:
 *    - اگر تب باشد → onChangeTab
 *    - اگر فیلد باشد → اسکرول به فیلد و highlight آن
 *
 *  هیچ پنجره modal جدید نمی‌سازد؛ از یک popover-like استفاده می‌کند.
 */

import { ChevronLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Archive,
  Database,
  KeyRound,
  Mail,
  type LucideIcon,
  Power,
  Settings as SettingsIcon,
  ShieldCheck,
  Share2,
  Wrench,
} from 'lucide-react';
import s from './SettingsSearch.module.css';

export type SearchIconName =
  | 'activity'
  | 'archive'
  | 'database'
  | 'key'
  | 'mail'
  | 'power'
  | 'settings'
  | 'shield'
  | 'share'
  | 'wrench';

const SEARCH_ICON_MAP: Record<SearchIconName, LucideIcon> = {
  activity: Activity,
  archive: Archive,
  database: Database,
  key: KeyRound,
  mail: Mail,
  power: Power,
  settings: SettingsIcon,
  shield: ShieldCheck,
  share: Share2,
  wrench: Wrench,
};

export interface SearchableField {
  tab: string;
  fieldId: string;
  label: string;
  hint?: string;
}

export interface SearchableTab {
  id: string;
  label: string;
  iconName: SearchIconName;
}

export interface SettingsSearchProps {
  tabs: SearchableTab[];
  fields: SearchableField[];
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onFocusField: (fieldId: string) => void;
}

export function SettingsSearch({
  tabs,
  fields,
  activeTab,
  onChangeTab,
  onFocusField,
}: SettingsSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // auto-focus on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open]);

  const tabMap = useMemo(() => {
    const m = new Map<string, SearchableTab>();
    for (const t of tabs) m.set(t.id, t);
    return m;
  }, [tabs]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...tabs.map((t) => ({
          kind: 'tab' as const,
          id: t.id,
          label: t.label,
          icon: SEARCH_ICON_MAP[t.iconName],
          tabId: t.id,
        })),
        ...fields
          .filter((f) => f.tab === activeTab)
          .slice(0, 4)
          .map((f) => ({
            kind: 'field' as const,
            id: `${f.tab}::${f.fieldId}`,
            label: f.label,
            hint: f.hint,
            icon: SEARCH_ICON_MAP[tabMap.get(f.tab)?.iconName ?? 'settings'],
            tabId: f.tab,
            fieldId: f.fieldId,
          })),
      ];
    }
    const tabMatches = tabs
      .filter((t) => t.label.toLowerCase().includes(q))
      .map((t) => ({
        kind: 'tab' as const,
        id: t.id,
        label: t.label,
        icon: SEARCH_ICON_MAP[t.iconName],
        tabId: t.id,
      }));
    const fieldMatches = fields
      .filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.hint?.toLowerCase().includes(q) ||
          f.fieldId.toLowerCase().includes(q),
      )
      .slice(0, 12)
      .map((f) => ({
        kind: 'field' as const,
        id: `${f.tab}::${f.fieldId}`,
        label: f.label,
        hint: f.hint,
        icon: SEARCH_ICON_MAP[tabMap.get(f.tab)?.iconName ?? 'settings'],
        tabId: f.tab,
        fieldId: f.fieldId,
      }));
    return [...tabMatches, ...fieldMatches];
  }, [query, tabs, fields, activeTab, tabMap]);

  // keep highlighted in range
  useEffect(() => {
    if (highlighted >= results.length) setHighlighted(Math.max(0, results.length - 1));
  }, [results, highlighted]);

  const handleSelect = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    if (r.kind === 'tab') {
      onChangeTab(r.tabId);
    } else {
      onChangeTab(r.tabId);
      // wait a tick for tab change to mount the field
      setTimeout(() => onFocusField(r.fieldId), 50);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(highlighted);
    }
  };

  return (
    <div className={s.wrap}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={s.trigger}
        aria-label="جست‌وجو در تنظیمات"
      >
        <Search size={14} strokeWidth={2} aria-hidden />
        <span className={s.triggerText}>جست‌وجو…</span>
        <span className={s.kbd}>
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className={s.backdrop} onClick={() => setOpen(false)} aria-hidden />
          <div className={s.popover} role="dialog" aria-label="جست‌وجو">
            <div className={s.searchBar}>
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                ref={inputRef}
                type="text"
                dir="rtl"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="جست‌وجو در تب‌ها و فیلدها…"
                className={s.input}
                autoComplete="off"
                spellCheck={false}
              />
              <span className={s.kbdInline}>
                <kbd>Esc</kbd>
              </span>
            </div>
            <ul className={s.results} role="listbox">
              {results.length === 0 ? (
                <li className={s.empty}>نتیجه‌ای یافت نشد</li>
              ) : (
                results.map((r, idx) => {
                  const Icon = r.icon;
                  return (
                    <li
                      key={r.id}
                      role="option"
                      aria-selected={highlighted === idx}
                      className={s.item}
                      data-active={highlighted === idx}
                      onMouseEnter={() => setHighlighted(idx)}
                      onClick={() => handleSelect(idx)}
                    >
                      <span className={s.itemIcon} aria-hidden>
                        {Icon ? <Icon size={14} strokeWidth={2} /> : null}
                      </span>
                      <span className={s.itemBody}>
                        <span className={s.itemLabel}>{r.label}</span>
                        {r.kind === 'field' && r.hint && (
                          <span className={s.itemHint}>{r.hint}</span>
                        )}
                        {r.kind === 'tab' && (
                          <span className={s.itemKind}>تب</span>
                        )}
                        {r.kind === 'field' && (
                          <span className={s.itemKind}>فیلد</span>
                        )}
                      </span>
                      <span className={s.itemArrow} aria-hidden>
                        <ChevronLeft size={14} strokeWidth={2} />
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
            <div className={s.footer}>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                <span>حرکت</span>
              </span>
              <span>
                <kbd>↵</kbd>
                <span>انتخاب</span>
              </span>
              <span>
                <kbd>Esc</kbd>
                <span>بستن</span>
              </span>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
