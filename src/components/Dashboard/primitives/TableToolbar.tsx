'use client';

import { ExportButton } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import { Maximize2, Rows3 } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import s from './TableToolbar.module.css';

export type TableDensity = 'compact' | 'comfortable';

const STORAGE_KEY = 'dash2:density';
const DEFAULT_DENSITY: TableDensity = 'compact';

interface TableDensityContextValue {
  density: TableDensity;
  setDensity: (density: TableDensity) => void;
  hydrated: boolean;
  /** True when a TableToolbar above already renders the density toggle —
      DataTable uses this to avoid duplicating the control. */
  toggleRendered: boolean;
  setToggleRendered: (rendered: boolean) => void;
}

const TableDensityContext = createContext<TableDensityContextValue | null>(null);

const FALLBACK: TableDensityContextValue = {
  density: DEFAULT_DENSITY,
  setDensity: () => undefined,
  hydrated: true,
  toggleRendered: false,
  setToggleRendered: () => undefined,
};

/**
 * useTableDensity — global dashboard-wide density preference. Reads the
 * single DensityProvider mounted in the shell, so EVERY table (DataTable or
 * custom <table>) reacts to the same toggle. Falls back to 'compact' outside
 * a provider.
 */
export function useTableDensity(): TableDensityContextValue {
  const ctx = useContext(TableDensityContext);
  return ctx ?? FALLBACK;
}

/**
 * DensityProvider — owns the shared «فشرده / راحت» preference (persisted in
 * localStorage under `dash2:density`). Mount once at the shell level so every
 * page and every table reads the same value.
 */
export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>(DEFAULT_DENSITY);
  const [hydrated, setHydrated] = useState(false);
  const [toggleRendered, setToggleRendered] = useState(false);

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
    () => ({ density, setDensity, hydrated, toggleRendered, setToggleRendered }),
    [density, setDensity, hydrated, toggleRendered],
  );

  return <TableDensityContext.Provider value={value}>{children}</TableDensityContext.Provider>;
}

/** The «فشرده / راحت» toggle — render anywhere (toolbar, header, table). */
export function DensityToggle({ className }: { className?: string }) {
  const { density, setDensity, hydrated } = useTableDensity();
  // Render a stable initial value to avoid hydration mismatch; once
  // mounted, swap to the persisted density.
  const current = hydrated ? density : DEFAULT_DENSITY;
  return (
    <fieldset aria-label="چگالی جدول" className={cn(s.densityToggle, className)}>
      <button
        type="button"
        aria-pressed={current === 'compact'}
        onClick={() => setDensity('compact')}
        className={s.densityButton}
      >
        <span className={s.densityIcon} aria-hidden>
          <Rows3 size={13} strokeWidth={1.75} />
        </span>
        فشرده
      </button>
      <button
        type="button"
        aria-pressed={current === 'comfortable'}
        onClick={() => setDensity('comfortable')}
        className={s.densityButton}
      >
        <span className={s.densityIcon} aria-hidden>
          <Maximize2 size={13} strokeWidth={1.75} />
        </span>
        راحت
      </button>
    </fieldset>
  );
}

export interface TableToolbarProps {
  /** Optional filter slot rendered on the inline-start side. */
  filters?: ReactNode;
  /** Optional search slot (rendered on the inline-end side). */
  search?: ReactNode;
  /** Optional view/actions slot rendered after the density toggle. */
  actions?: ReactNode;
  className?: string;
  /** Optional toolbar-level items rendered next to the density toggle. */
  children?: ReactNode;
  /**
   * Optional table slot rendered BELOW the toolbar but INSIDE the density
   * provider — pass the DataTable here so its rows react to the density
   * toggle. (The provider must wrap the table for `useTableDensity`.)
   */
  content?: ReactNode;
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
  content,
  exportData,
}: TableToolbarProps) {
  // The density state lives in the shell-level DensityProvider. If this
  // toolbar is used outside one (defensive), wrap itself so the toggle works.
  const hasProvider = useContext(TableDensityContext) !== null;
  if (!hasProvider) {
    return (
      <DensityProvider>
        <TableToolbarInner
          filters={filters}
          search={search}
          actions={actions}
          className={className}
          content={content}
          exportData={exportData}
        >
          {children}
        </TableToolbarInner>
      </DensityProvider>
    );
  }
  return (
    <TableToolbarInner
      filters={filters}
      search={search}
      actions={actions}
      className={className}
      content={content}
      exportData={exportData}
    >
      {children}
    </TableToolbarInner>
  );
}

function TableToolbarInner({
  filters,
  search,
  actions,
  className,
  children,
  content,
  exportData,
}: TableToolbarProps) {
  const { setToggleRendered } = useTableDensity();

  // Announce to DataTable that a density toggle is already shown above it.
  useEffect(() => {
    setToggleRendered(true);
    return () => setToggleRendered(false);
  }, [setToggleRendered]);

  return (
    <>
      <div className={cn(s.root, 'dash2-toolbar', className)}>
        {filters && <div className={s.filters}>{filters}</div>}
        <div className={s.actions}>
          {children && <div className={s.childrenSlot}>{children}</div>}
          {search}
          <DensityToggle />
          {exportData && <ExportButton {...exportData} />}
          {actions && <div className={s.extraActions}>{actions}</div>}
        </div>
      </div>
      {content}
    </>
  );
}
