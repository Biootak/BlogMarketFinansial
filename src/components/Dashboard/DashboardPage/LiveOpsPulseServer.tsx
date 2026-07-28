/**
 * LiveOpsPulseServer — نسخه production با داده واقعی
 * ─────────────────────────────────────────────────────────────
 *  این Server Component (async) در page.tsx داشبورد صدا زده می‌شود.
 *  داده‌ها از AuditLog + SystemLog خوانده می‌شوند و به کلاینت پاس داده می‌شوند.
 *  در صورت خطا یا عدم دسترسی، روی نمونه (LiveOpsPulseDemo) برمی‌گردد.
 *
 *  رفتار chord: به div بیرونی `data-shortcut-target="liveops"` داده می‌شود
 *  تا میان‌بر `g l` بتواند بدون تغییر در ساختار داخلی، ویجت را scroll کند.
 */

import { getLiveOpsData } from '@/actions/liveOpsActions';
import { LiveOpsPulse } from './LiveOpsPulse';
import { LiveOpsPulseDemo } from './LiveOpsPulseDemo';

export interface LiveOpsPulseServerProps {
  className?: string;
}

export async function LiveOpsPulseServer({ className }: LiveOpsPulseServerProps) {
  const result = await getLiveOpsData();

  // اگر داده واقعی موجود نیست → fallback به دمو
  if (!result.success || !result.data) {
    return (
      <div data-shortcut-target="liveops" className={className}>
        <LiveOpsPulseDemo />
      </div>
    );
  }

  const { services, events, activityBars } = result.data;

  // اگر همه فیلدها خالی هستند (DB خالی) → دمو
  if (services.length === 0 && events.length === 0) {
    return (
      <div data-shortcut-target="liveops" className={className}>
        <LiveOpsPulseDemo />
      </div>
    );
  }

  return (
    <div data-shortcut-target="liveops" className={className}>
      <LiveOpsPulse
        services={services}
        events={events}
        activityBars={activityBars}
        pollIntervalMs={0}
      />
    </div>
  );
}

export default LiveOpsPulseServer;
