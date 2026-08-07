'use client';

import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';

import { readHealth } from './obsHealth';
import { bucketLabel, faNum, fullDayLabel } from './format';
import { HealthRing } from './HealthRing';
import { RidgeChart } from './RidgeChart';
import { SystemVitals } from './SystemVitals';
import { useObs } from './ObsProvider';
import d from './deck.module.css';

/**
 * سرصفحهٔ سالنامه.
 * ─────────────────────────────────────────────────────────────
 *  اینجا عمداً «عدد قهرمان» نداریم. تحقیق طراحی داشبوردهای SRE یک نکتهٔ ساده
 *  دارد: اپراتور در پنج ثانیهٔ اول دنبال عدد نیست، دنبال **جمله** است —
 *  «چیزی خراب است یا نه، و قدم بعدی چیست». پس تیتر یک جملهٔ واقعی است که از
 *  verdict می‌آید و عدد سلامت به یک مُهر کوچک تنزل پیدا می‌کند.
 *
 *  در layout قرار دارد نه در page: «حال سامانه» زمینهٔ همهٔ تب‌هاست و نباید
 *  با هر ناوبری unmount و دوباره رسم شود.
 */
export function ObsPulseDeck() {
  const { data, verdict, hour, windowHours, isLiveHour, stepHour, resetHour } = useObs();
  const health = data ? readHealth(data) : null;
  const range = data ? bucketLabel(data.generatedAt, hour, windowHours) : '—';

  return (
    <section className={d.deck} data-tone={verdict.tone} aria-labelledby="obs-verdict">
      <div className={d.slug}>
        <p className={d.masthead}>
          <Radio size={13} strokeWidth={1.8} aria-hidden="true" />
          <span className={d.mastheadName}>سالنامهٔ عملیات</span>
          <span className={d.mastheadDate}>{data ? fullDayLabel(data.generatedAt) : '—'}</span>
          <span className={d.mastheadWindow}>پنجرهٔ {faNum(windowHours)} ساعته</span>
        </p>

        <h2 id="obs-verdict" className={d.verdict}>
          {verdict.headline}
        </h2>
        <p className={d.action}>{verdict.action}</p>
      </div>

      <div className={d.sealRow}>
        <HealthRing
          score={health?.score ?? 0}
          tone={verdict.tone === 'idle' ? 'idle' : verdict.tone}
          label={verdict.label}
          availability={health?.availability ?? 0}
          silent={health?.silent ?? true}
        />

        <ul className={d.tally}>
          <li data-tone="bad">
            <span>{faNum(verdict.down)}</span>
            قطع
          </li>
          <li data-tone="warn">
            <span>{faNum(verdict.degraded)}</span>
            کند
          </li>
          <li data-tone="ok">
            <span>{faNum(verdict.active)}</span>
            فعال
          </li>
        </ul>
      </div>

      <div className={d.band}>
        <RidgeChart />

        {/*
          مکان‌نمای ساعت درست زیر نوار سیگنال است، نه در نوار ابزار.
          کنترل باید کنار چیزی باشد که تغییرش می‌دهد. آیکون‌ها هم برای RTL
          درست‌اند: «عقب‌تر در زمان» یعنی راست، «جلوتر» یعنی چپ.
        */}
        <div className={d.cursorBar} role="group" aria-label="انتخاب ساعت">
          <button
            type="button"
            className={d.cursorStep}
            onClick={() => stepHour(-1)}
            disabled={hour <= 0}
            aria-label="ساعت قبل"
          >
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <p className={d.cursorLabel}>
            <span>{range}</span>
            <small>{isLiveHour ? 'ساعت جاری' : `سطل ${faNum(hour + 1)} از ${faNum(windowHours)}`}</small>
          </p>

          <button
            type="button"
            className={d.cursorStep}
            onClick={() => stepHour(1)}
            disabled={isLiveHour}
            aria-label="ساعت بعد"
          >
            <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={d.cursorReset}
            onClick={resetHour}
            disabled={isLiveHour}
          >
            بازگشت به ساعت جاری
          </button>
        </div>
      </div>

      <SystemVitals />
    </section>
  );
}
