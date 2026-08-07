'use client';

import { ScrollText } from 'lucide-react';

<<<<<<< HEAD
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { relative, stamp } from './format';
import s from './obs.module.css';
=======
import { hhmm, relative, stamp } from './format';
import { ObsEmpty } from './ObsSection';
import { useObs } from './ObsProvider';
import l from './ledger.module.css';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f

const MAX_ROWS = 24;

/**
 * رد ممیزی.
 *
 * نام اکشن و نوع موجودیت مستقیم از دیتابیس می‌آیند و لاتین‌اند، پس هر کدام
 * داخل `bdi` بسته می‌شوند: بدون آن، الگوریتم bidi زیرخط و نقطه را در جملهٔ
 * فارسی به سمت اشتباه پرت می‌کند و متن به‌هم می‌ریزد. اینجا حدس نمی‌زنیم و
 * ترجمه نمی‌کنیم؛ کلید خام همان چیزی است که در DB جست‌وجو می‌شود.
 */
export function AuditTrail() {
  const { data } = useObs();
  const events = data?.audit ?? [];

  if (!data || events.length === 0) {
    return (
      <ObsEmpty
        icon={ScrollText}
        title="رد ممیزی در این بازه خالی است"
        hint="هیچ تغییر قابل‌ممیزی‌ای در بیست‌وچهار ساعت گذشته ثبت نشده است."
      />
    );
  }

  return (
    <ol className={l.trail}>
      {events.slice(0, MAX_ROWS).map((event) => (
        <li key={event.id}>
          <div className={l.event}>
            <span className={l.eventAction}>
              <bdi>{event.action}</bdi>
            </span>
            <time className={l.eventTime} dateTime={event.createdAt} title={stamp(event.createdAt)}>
              {hhmm(event.createdAt)}
            </time>
            <span className={l.eventMeta}>
              <span>
                نقش عامل: <bdi>{event.actorRole}</bdi>
              </span>
              <span>
                موجودیت: <bdi>{event.entityType}</bdi>
              </span>
              <span>{relative(event.createdAt, data.generatedAt)}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
