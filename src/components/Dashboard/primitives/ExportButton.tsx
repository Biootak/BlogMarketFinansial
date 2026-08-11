'use client';

/**
 * ExportButton — CSV export for any data table.
 *
 * Takes rows data + column headers, generates CSV blob, triggers download.
 * RTL-safe (handles Persian text). Uses --nova-* tokens.
 *
 * Usage:
 *   <ExportButton
 *     data={rows}
 *     columns={[{ key: 'name', header: 'نام' }, { key: 'amount', header: 'مبلغ' }]}
 *     filename="transactions"
 *   />
 */

import { Download } from 'lucide-react';
import { type MouseEventHandler, useCallback } from 'react';
import s from './ExportButton.module.css';

interface ExportColumn {
  /** Key in data object */
  key: string;
  /** CSV header label (Persian) */
  header: string;
}

interface ExportButtonProps {
  /** Array of data objects */
  data: Record<string, unknown>[];
  /** Column definitions */
  columns: ExportColumn[];
  /** Download filename (without extension) */
  filename?: string;
  /** Button label */
  label?: string;
}

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  // If contains comma, quote, or newline → wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ExportButton({
  data,
  columns,
  filename = 'export',
  label = 'خروجی CSV',
}: ExportButtonProps) {
  const handleExport: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();

      // BOM for Excel UTF-8 compatibility
      let csv = '\uFEFF';

      // Header row
      csv += `${columns.map((c) => escapeCsv(c.header)).join(',')}\n`;

      // Data rows
      for (const row of data) {
        csv += `${columns.map((c) => escapeCsv(row[c.key] ?? '')).join(',')}\n`;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [data, columns, filename],
  );

  return (
    <button type="button" className={s.root} onClick={handleExport} aria-label={label}>
      <Download size={14} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
