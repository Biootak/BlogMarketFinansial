/**
 * Barrel for the TIDE 2026 (July 1) dashboard layout.
 *
 * TideShell is the entry point used by /dashboard/page.tsx. Sub-components
 * are exported individually so callers can compose their own dashboards
 * without pulling the full layout.
 */

export { default as TideShell } from './TideShell';
export { default as LiveTicker } from './LiveTicker';
export type { TickerItem } from './LiveTicker';
export { default as TideCover } from './TideCover';
export { default as DataRoom } from './DataRoom';
export { default as QuickStage } from './QuickStage';
export { default as ConstellationGrid } from './ConstellationGrid';
export { default as PostsRail } from './PostsRail';
export { default as StatusFloor } from './StatusFloor';
