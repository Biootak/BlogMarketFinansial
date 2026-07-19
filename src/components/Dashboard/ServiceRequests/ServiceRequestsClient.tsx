'use client';

/**
 * ServiceRequestsClient — 2026-07-04 redesign
 *
 * Orchestrator for /dashboard/service-requests. Owns the filter state
 * that wires the Command Bar's segmented filter to the Table, and the
 * refresh key that re-fetches stats + table + activity feed in
 * lockstep. Composition mirrors the at-grid dashboard pattern:
 * Hero → Stats → Workspace (table + activity rail).
 *
 * C-4 fix (2026-07-26): ActivityFeed was rendered twice (once inside the
 * workspace grid hidden on mobile, once below it hidden on desktop),
 * causing two concurrent API calls. Now a single instance is rendered;
 * its position is controlled via the `at-srq-workspace` CSS grid order
 * through an `is-below` modifier class applied below xl breakpoint.
 */

import { useMediaQuery } from '@/hooks/use-media-query';
import { useCallback, useState } from 'react';
import ServiceRequestsActivityFeed from './ServiceRequestsActivityFeed';
import ServiceRequestsCommandBar from './ServiceRequestsCommandBar';
import ServiceRequestsStats from './ServiceRequestsStats';
import ServiceRequestsTable from './ServiceRequestsTable';

export type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export default function ServiceRequestsClient() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const isXl = useMediaQuery('(min-width: 1280px)');

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-4">
      {/* 1. Command Bar (focal element, mirror of at-hero) */}
      <ServiceRequestsCommandBar
        activeFilter={filter}
        onFilterChange={setFilter}
        onRefresh={triggerRefresh}
        refreshKey={refreshKey}
      />

      {/* 2. Secondary KPI grid (mirror of at-kpi row) */}
      <ServiceRequestsStats refreshKey={refreshKey} />

      {/* 3. Two-column workspace: table (main) + activity (rail).
          Single ActivityFeed instance — position toggled via class to
          avoid double API calls (C-4). */}
      <div className={`at-srq-workspace${isXl ? '' : ' at-srq-workspace--stacked'}`}>
        <ServiceRequestsTable
          externalFilter={filter}
          refreshKey={refreshKey}
          onDataChanged={triggerRefresh}
        />
        <ServiceRequestsActivityFeed refreshKey={refreshKey} />
      </div>
    </div>
  );
}
