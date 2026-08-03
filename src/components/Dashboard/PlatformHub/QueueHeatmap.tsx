'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type QueueHeatmapTone = 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';

export type QueueHeatmapItem = {
  /** Unique key (queue name) */
  name: string;
  /** Total weight (0-100) */
  weight: number;
  /** Cell tint based on load (0-1) */
  load: number;
  /** Optional sub-stats */
  pending?: number;
  running?: number;
  failed?: number;
};

interface QueueHeatmapProps {
  items: QueueHeatmapItem[];
  tone?: QueueHeatmapTone;
  className?: string;
  emptyLabel?: string;
}

/**
 * QueueHeatmap — color-graded workload map.
 * Each queue is a horizontal bar whose width = weight, fill = load.
 * Visual: a "thermal" picture of where work is concentrated.
 */
export function QueueHeatmap({
  items,
  tone = 'emerald',
  className,
  emptyLabel = 'صف فعالی نیست.',
}: QueueHeatmapProps) {
  if (items.length === 0) {
    return <div className={cn(s.queueHeatmapEmpty, className)}>{emptyLabel}</div>;
  }
  return (
    <ul className={cn(s.queueHeatmap, className)} data-tone={tone}>
      {items.map((q) => (
        <li key={q.name} className={s.queueHeatmapRow}>
          <div className={s.queueHeatmapHead}>
            <span className={s.queueHeatmapName}>{q.name}</span>
            <span className={s.queueHeatmapMeta}>
              {q.pending !== undefined ? <span>+{q.pending}</span> : null}
              {q.running !== undefined ? <span>·{q.running}◉</span> : null}
              {q.failed !== undefined && q.failed > 0 ? (
                <span className={s.queueHeatmapFailed}>!{q.failed}</span>
              ) : null}
            </span>
          </div>
          <div className={s.queueHeatmapTrack}>
            <div
              className={s.queueHeatmapFill}
              data-load={q.load > 0.66 ? 'hot' : q.load > 0.33 ? 'warm' : 'cool'}
              style={{ width: `${Math.min(Math.max(q.weight, 2), 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
