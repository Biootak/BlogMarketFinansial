// src/app/dashboard/exchange-rates/_components/DiscoveryCommand.tsx
// 2026-06-20: Command Palette (Cmd+K) — جایگزین DiscoveryDropdown

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Command } from 'cmdk';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (s: TgjuSymbol) => void;
}

export default function DiscoveryCommand({ open, onOpenChange, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<TgjuSymbol[]>([]);
  const [loading, setLoading] = useState(false);

  // Cmd/Ctrl+K shortcut + Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Fetch symbols when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/market-rates/tgju-symbols')
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: TgjuSymbol[] }) => {
        if (j.success && j.data) setSymbols(j.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = useCallback(
    (s: TgjuSymbol) => {
      onSelect(s);
      onOpenChange(false);
      setQuery('');
    },
    [onSelect, onOpenChange],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جست‌وجوی نرخ‌های TGJU"
      className="fixed inset-0 z-[60] flex items-start justify-center"
      style={{
        paddingTop: 'min(20vh, 8rem)',
        paddingInline: '1rem',
        background:
          'color-mix(in oklch, var(--ds-canvas) 60%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          background: 'var(--ds-surface-elevated)',
          border: '1px solid var(--ds-border-default)',
          borderRadius: 'var(--ds-radius-lg)',
          boxShadow: 'var(--ds-shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <Command
          className="flex flex-col"
          label="جست‌وجوی نرخ"
          shouldFilter
          loop
        >
          <div
            className="flex items-center gap-2"
            style={{
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              borderBottom: '1px solid var(--ds-border-subtle)',
            }}
          >
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="جست‌وجو در نرخ‌های TGJU…"
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 'var(--ds-text-base)',
                color: 'var(--ds-text-primary)',
                fontFamily: 'inherit',
              }}
            />
            <kbd
              aria-hidden
              style={{
                fontSize: 'var(--ds-text-xs)',
                padding: '0.125rem 0.375rem',
                color: 'var(--ds-text-muted)',
                background: 'var(--ds-canvas-subtle)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--ds-radius-sm)',
                fontFamily: 'inherit',
              }}
            >
              Esc
            </kbd>
          </div>

          <Command.List
            style={{
              maxHeight: 'min(60vh, 24rem)',
              overflowY: 'auto',
              padding: '0.25rem',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: 'var(--ds-space-6)',
                  textAlign: 'center',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-muted)',
                }}
              >
                در حال بارگذاری…
              </div>
            ) : (
              <>
                <Command.Empty
                  style={{
                    padding: 'var(--ds-space-6)',
                    textAlign: 'center',
                    fontSize: 'var(--ds-text-sm)',
                    color: 'var(--ds-text-muted)',
                  }}
                >
                  نتیجه‌ای یافت نشد
                </Command.Empty>
                <Command.Group heading="نرخ‌های موجود">
                  {symbols.map((s) => (
                    <Command.Item
                      key={s.tgjuKey}
                      value={`${s.tgjuKey} ${s.displayNameFa}`}
                      onSelect={() => handleSelect(s)}
                      className="flex items-center justify-between gap-3 cursor-pointer"
                      style={{
                        padding: 'var(--ds-space-3) var(--ds-space-4)',
                        borderRadius: 'var(--ds-radius-md)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--ds-text-sm)',
                          color: 'var(--ds-text-primary)',
                        }}
                      >
                        {s.displayNameFa || s.tgjuKey}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 'var(--ds-text-xs)',
                          color: 'var(--ds-text-muted)',
                        }}
                      >
                        {s.tgjuKey}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>

          <div
            className="flex items-center justify-between"
            style={{
              padding: 'var(--ds-space-2) var(--ds-space-4)',
              borderTop: '1px solid var(--ds-border-subtle)',
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-text-muted)',
            }}
          >
            <span>↑↓ انتخاب</span>
            <span>↵ تأیید</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
