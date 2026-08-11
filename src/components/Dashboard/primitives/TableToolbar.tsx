'use client';

import { ExportButton } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type TableDensity = 'compact' | 'comfortable';

const STORAGE_KEY = 'dash2:density';
const DEFAULT_DENSITY: TableDensity = 'compact';

interface TableDensityContextValue {
  density: TableDensity;
  setDensity: (density: TableDensity) => void;
  hydrated: boolean;
}

const TableDensityContext = createContext<TableDensityContextValue | null>(null);

/**
 * useTableDensity — child rows / data tables read the density set by the
 * toolbar and render at the correct row height (via `.dash2-table__row`).
 */
export function useTableDensity(): TableDensityContextValue {
  const ctx = useContext(TableDensityContext);
  if (!ctx) {
    return {
      density: DEFAULT_DENSITY,
      setDensity: () => undefined,
      hydrated: true,
    };
  }
  return ctx;
}

export interface TableToolbarProps {
  /** Optional filter slot rendered on the inline-start side. */
  filters?: ReactNode;
  /** Optional search slot (rendered on the inline-end side). */
  search?: ReactNode;
  /** Optional view/actions slot rendered after the density toggle. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** Optional: CSV export config */
  exportData?: {
    data: Record<string, unknown>[];
    columns: Array<{ key: string; header: string }>;
    filename?: string;
    label?: string;
  };
}

export function TableToolbar({
  filters,
  search,
  actions,
  className,
  children,
  exportData,
}: TableToolbarProps) {
  const [density, setDensityState] = useState<TableDensity>(DEFAULT_DENSITY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'compact' || stored === 'comfortable') {
        setDensityState(stored);
      }
    } catch {
      // ignore quota / privacy errors
    }
    setHydrated(true);
  }, []);

  const setDensity = useCallback((next: TableDensity) => {
    setDensityState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
  }, []);

  const value = useMemo<TableDensityContextValue>(
    () => ({ density, setDensity, hydrated }),
    [density, setDensity, hydrated],
  );

  return (
    <TableDensityContext.Provider value={value}>
      <div className={cn('dash2-toolbar', className)}>
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {children}
          {search}
          <DensityToggle />
          {exportData && <ExportButton {...exportData} />}
          {actions}
        </div>
      </div>
    </TableDensityContext.Provider>
  );
}

function DensityToggle() {
  const { density, setDensity, hydrated } = useTableDensity();
  // Render a stable initial value to avoid hydration mismatch; once
  // mounted, swap to the persisted density.
  const current = hydrated ? density : DEFAULT_DENSITY;
  return (
    <fieldset
      aria-label="چگالی جدول"
      className="inline-flex items-center overflow-hidden rounded-md border border-[color:var(--ds-color-border-default)] bg-[color:var(--ds-color-surface)] text-xs"
    >
      <button
        type="button"
        aria-pressed={current === 'compact'}
        onClick={() => setDensity('compact')}
        className={cn(
          'px-2 py-1 transition-colors',
          current === 'compact'
            ? 'bg-[color:var(--ds-color-surface-2)] text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        فشرده
      </button>
      <button
        type="button"
        aria-pressed={current === 'comfortable'}
        onClick={() => setDensity('comfortable')}
        className={cn(
          'px-2 py-1 transition-colors',
          current === 'comfortable'
            ? 'bg-[color:var(--ds-color-surface-2)] text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        راحت
      </button>
    </fieldset>
  );
}
