// src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx
// 2026-07-29: Table row with hover-reveal actions + responsive hide for
// less-important columns.

'use client';

import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import { useEffect, useRef, useState } from 'react';
import {
  HiEllipsisHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2';
import SourceBadge from './SourceBadge';
import ValueCell from './ValueCell';

export interface RateRowData {
  id: string;
  symbol: string;
  displayNameFa: string;
  group: string | null;
  unit: MarketRateUnit | string | null;
  divisor: number;
  decimals: number;
  singleRate: string | null;
  provider: MarketRateProvider | string;
  active: boolean;
  priority: number;
  tgjuKey: string | null;
  updatedAt: Date;
}

interface RowProps {
  row: RateRowData;
  onEdit: (row: RateRowData) => void;
  onDelete: (row: RateRowData) => void;
}

export default function ExchangeRateRow({ row, onEdit, onDelete }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const rawValue =
    row.singleRate && row.divisor > 0 ? Number.parseFloat(row.singleRate) / row.divisor : null;

  return (
    <tr
      className="group transition-colors"
      style={{
        borderTop: '1px solid var(--ds-border-subtle)',
        background: hovered ? 'var(--ds-canvas-subtle)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
    >
      {/* Priority */}
      <td
        className="font-semibold tabular-nums"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          textAlign: 'start',
        }}
      >
        {row.priority.toLocaleString('fa-IR')}
      </td>

      {/* Display Name */}
      <td
        className="font-semibold"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
        }}
      >
        {row.displayNameFa}
      </td>

      {/* Symbol (monospace, LTR) — hidden on small */}
      <td
        className="font-mono sm:hidden md:table-cell"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-secondary)',
          direction: 'ltr',
          textAlign: 'start',
        }}
      >
        {row.symbol}
      </td>

      {/* Group — hidden on sm+md */}
      <td
        className="hidden md:table-cell"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
        }}
      >
        {row.group ?? '—'}
      </td>

      {/* Value */}
      <td
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          textAlign: 'start',
        }}
      >
        <ValueCell rawValue={rawValue} unit={row.unit} decimals={row.decimals} />
      </td>

      {/* Source — hidden on sm+md */}
      <td
        className="hidden md:table-cell"
        style={{ padding: 'var(--ds-space-3) var(--ds-space-4)' }}
      >
        <SourceBadge provider={row.provider} />
      </td>

      {/* Active status */}
      <td style={{ padding: 'var(--ds-space-3) var(--ds-space-4)' }}>
        <span
          aria-label={row.active ? 'فعال' : 'غیرفعال'}
          className="inline-flex items-center"
          style={{
            fontSize: 'var(--ds-text-xs)',
            fontWeight: 600,
            color: row.active ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
            gap: '0.4rem',
          }}
        >
          <span
            aria-hidden
            style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: 'var(--ds-radius-full)',
              background: row.active ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
              boxShadow: row.active
                ? '0 0 0 3px color-mix(in oklch, var(--ds-accent-emerald) 18%, transparent)'
                : 'none',
            }}
          />
          {row.active ? 'فعال' : 'غیرفعال'}
        </span>
      </td>

      {/* Actions (hover-reveal) */}
      <td
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          textAlign: 'end',
        }}
      >
        <div ref={menuRef} className="relative inline-block" style={{ minHeight: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="عملیات بیشتر"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center transition-opacity"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
              border: 'none',
              cursor: 'pointer',
              opacity: menuOpen || hovered ? 1 : 0,
            }}
            onFocus={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
            }}
            onBlur={(e) => {
              if (!menuOpen) {
                e.currentTarget.style.opacity = hovered ? '1' : '0';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <HiEllipsisHorizontal aria-hidden style={{ width: '1.1rem', height: '1.1rem' }} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label={`عملیات روی ${row.displayNameFa}`}
              className="absolute z-20 flex flex-col"
              style={{
                insetInlineEnd: 0,
                top: 'calc(100% + 0.25rem)',
                minWidth: '10rem',
                padding: '0.25rem',
                background: 'var(--ds-surface-elevated)',
                border: '1px solid var(--ds-border-default)',
                borderRadius: 'var(--ds-radius-md)',
                boxShadow: 'var(--ds-shadow-md)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(row);
                }}
                className="flex items-center w-full text-start transition-colors"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--ds-radius-sm)',
                  cursor: 'pointer',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <HiOutlinePencil aria-hidden style={{ width: '0.9rem', height: '0.9rem' }} />
                ویرایش
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(row);
                }}
                className="flex items-center w-full text-start transition-colors"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-accent-rose)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--ds-radius-sm)',
                  cursor: 'pointer',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <HiOutlineTrash aria-hidden style={{ width: '0.9rem', height: '0.9rem' }} />
                حذف
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
