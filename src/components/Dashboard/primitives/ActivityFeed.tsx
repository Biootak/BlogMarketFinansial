'use client';

/**
 * ActivityFeed — server-backed activity timeline for any dashboard.
 *
 * Fetches recent activity from the API, renders via StatusTimeline.
 * Supports polling, loading states, and "view all" link.
 *
 * Usage:
 *   <ActivityFeed
 *     portal="admin"
 *     maxItems={10}
 *     moreHref="/dashboard/audit-log"
 *   />
 */

import { StatusTimeline, type TimelineItem } from '@/components/Dashboard/primitives';
import { Skeleton } from '@/components/Dashboard/primitives';
import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { useEffect, useState } from 'react';

interface ActivityFeedProps {
  /** Which portal */
  portal: 'admin' | 'exchange' | 'customer';
  /** Max items to show */
  maxItems?: number;
  /** "View all" link */
  moreHref?: string;
  /** Poll interval in ms (0 = no polling) */
  pollInterval?: number;
  /** Optional: pre-loaded items (SSR) */
  initialItems?: TimelineItem[];
}

/**
 * Fetch activity from the appropriate endpoint per portal.
 * In production, this would call a real API.
 */
async function fetchActivity(portal: string, limit: number): Promise<TimelineItem[]> {
  try {
    const endpoint =
      portal === 'admin'
        ? '/api/dashboard/activity'
        : portal === 'exchange'
          ? '/api/exchange/activity'
          : '/api/customer/activity';

    const resp = await fetch(`${endpoint}?limit=${limit}`);
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export function ActivityFeed({
  portal,
  maxItems = 8,
  moreHref,
  pollInterval = 60_000,
  initialItems = [],
}: ActivityFeedProps) {
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [loading, setLoading] = useState(!initialItems.length);

  const refresh = async () => {
    const data = await fetchActivity(portal, maxItems);
    if (data.length > 0) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (initialItems.length) return;
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useVisibilityAwareInterval(refresh, pollInterval);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <StatusTimeline
      items={items}
      maxItems={maxItems}
      moreHref={moreHref}
      emptyMessage="فعالیتی ثبت نشده"
    />
  );
}
