import type { ToneKey } from './format';
import { cssVars, faNum, faPercent } from './format';
import d from './deck.module.css';

interface HealthRingProps {
  score: number;
  tone: ToneKey;
  label: string;
  availability: number;
  silent: boolean;
}

/**
 * مُهرِ سلامت — نسخهٔ عملیاتیِ مهر روی جلد سالنامه.
 *
 * دو کمان دارد و هر دو معنا دارند:
 *   بیرونی (نازک) = میانگین در دسترس بودن سرویس‌های دیده‌شده
 *   درونی (ضخیم) = شاخص ترکیبی سلامت
 * یک کمان سوم فقط «نفس» است: نوسان ۰٫۵ هرتزی روی opacity که می‌گوید رابط
 * زنده است. نه glow، نه سایهٔ رنگی — فقط یک خط مویی خودروشن.
 *
 * وقتی هیچ لاگی نداریم عدد نشان نمی‌دهیم. «نمی‌دانم» جواب صادقانه‌تری از
 * یک صفرِ گمراه‌کننده است.
 */
export function HealthRing({ score, tone, label, availability, silent }: HealthRingProps) {
  const RADIUS = 42;
  const OUTER = 48;
  const circumference = 2 * Math.PI * RADIUS;
  const outerCircumference = 2 * Math.PI * OUTER;

  const scoreArc = silent ? 0 : (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const availabilityArc = silent
    ? 0
    : (Math.max(0, Math.min(100, availability)) / 100) * outerCircumference;

  return (
    <figure className={d.seal} data-tone={tone} data-silent={silent ? 'true' : undefined}>
      <svg viewBox="0 0 100 100" className={d.sealArt} aria-hidden="true" focusable="false">
        <circle className={d.sealBreath} cx="50" cy="50" r={OUTER} />
        <circle className={d.sealTrack} cx="50" cy="50" r={RADIUS} />
        {silent ? null : (
          <>
            <circle
              className={d.sealAvailability}
              cx="50"
              cy="50"
              r={OUTER}
              style={cssVars({
                '--arc': `${availabilityArc.toFixed(2)}`,
                '--gap': `${(outerCircumference - availabilityArc).toFixed(2)}`,
              })}
            />
            <circle
              className={d.sealScore}
              cx="50"
              cy="50"
              r={RADIUS}
              style={cssVars({
                '--arc': `${scoreArc.toFixed(2)}`,
                '--gap': `${(circumference - scoreArc).toFixed(2)}`,
              })}
            />
          </>
        )}
      </svg>

      <figcaption className={d.sealCaption}>
        <strong className={d.sealScoreText}>{silent ? '—' : faNum(score)}</strong>
        <span className={d.sealLabel}>{label}</span>
      </figcaption>

      <p className={d.sealFoot}>
        {silent ? 'بدون خوانش در پنجرهٔ جاری' : `در دسترس بودن ${faPercent(availability, 2)}`}
      </p>
    </figure>
  );
}
