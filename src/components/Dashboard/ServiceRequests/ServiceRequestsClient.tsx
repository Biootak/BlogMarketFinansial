'use client';

/**
 * ServiceRequestsClient — 2026-07-04 redesign
 *
 * Orchestrator for /dashboard/service-requests. Owns the filter state
 * that wires the Command Bar's segmented filter to the Table, and the
 * refresh key that re-fetches stats + table + activity feed in
 * lockstep. Composition mirrors the at-grid dashboard pattern:
 * Hero → Stats → Workspace (table + activity rail).
 */

import { useCallback, useState } from 'react';
import ServiceRequestsActivityFeed from './ServiceRequestsActivityFeed';
import ServiceRequestsCommandBar from './ServiceRequestsCommandBar';
import ServiceRequestsStats from './ServiceRequestsStats';
import ServiceRequestsTable from './ServiceRequestsTable';

export type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export default function ServiceRequestsClient() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

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

      {/* 3. Two-column workspace: table (main) + activity (rail) */}
      <div className="at-srq-workspace">
        <ServiceRequestsTable
          externalFilter={filter}
          refreshKey={refreshKey}
          onDataChanged={triggerRefresh}
        />
        <div className="hidden xl:block">
          <ServiceRequestsActivityFeed refreshKey={refreshKey} />
        </div>
      </div>

      {/* On smaller screens, activity rail moves below the table */}
      <div className="xl:hidden">
        <ServiceRequestsActivityFeed refreshKey={refreshKey} />
      </div>
    </div>
  );
}
