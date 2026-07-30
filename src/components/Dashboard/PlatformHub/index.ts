/**
 * PlatformHub — primitives مشترک برای platform-tier hubs.
 * ─────────────────────────────────────────────────────────────────────
 *  Used by: مرکز ارتباطات، مرکز Job، تیکت‌ها، تأییدیه‌ها
 *
 *  استفاده از primitive های کانونیکال FinancialMarket (StatCard, Section,
 *  Spotlight, GeometricAccent, MillionDollarEmpty) — **نه** invention.
 *
 *  + primitives مشترک این فولدر:
 *    • PillTabs, LiveDot, FilterPills, HubShell, HubHeader
 *    • Sparkline, TimeRibbon, ThroughputBars, QueueHeatmap, ActivityStream
 *
 *  تمام components token-based، RTL-correct، mobile-first.
 */

export { HUB_PALETTES, getHubPalette, toOklch } from './HubPalette';
export type { HubId, HubPalette, HubAccent } from './HubPalette';

// Primitives
export { PillTabs } from './PillTabs';
export type { PillTabItem } from './PillTabs';

export { LiveDot } from './LiveDot';
export type { LiveDotTone, LiveDotSize } from './LiveDot';

export { Sparkline } from './Sparkline';
export type { SparklineTone } from './Sparkline';

export { MetricWall } from './MetricWall';
export type { MetricWallProps, MetricWallTile } from './MetricWall';

export { TimeRibbon } from './TimeRibbon';
export type { TimeRibbonPoint } from './TimeRibbon';

export { ActivityStream } from './ActivityStream';
export type {
  ActivityStreamItem,
  ActivityStreamTone,
  ActivityStreamProps,
} from './ActivityStream';

export { ThroughputBars } from './ThroughputBars';
export type { ThroughputBarsTone } from './ThroughputBars';

export { QueueHeatmap } from './QueueHeatmap';
export type { QueueHeatmapItem, QueueHeatmapTone } from './QueueHeatmap';

export { WorkflowBridge } from './WorkflowBridge';
export type {
  WorkflowBridgeStep,
  WorkflowBridgeProps,
} from './WorkflowBridge';

export { ChannelRing } from './ChannelRing';
export type { ChannelRingSegment, ChannelRingTone } from './ChannelRing';

export { BroadcastPulse } from './BroadcastPulse';
export type {
  BroadcastPulseProps,
  BroadcastChannel,
  BroadcastChannelId,
} from './BroadcastPulse';

export { HubShell } from './HubShell';
export type { HubShellProps, HubShellMeta } from './HubShell';

export { HubHeader } from './HubHeader';
export type { HubHeaderProps } from './HubHeader';

export { FilterPills } from './FilterPills';
export type { FilterPillItem, FilterPillsProps } from './FilterPills';
