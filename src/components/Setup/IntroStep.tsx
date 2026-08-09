'use client';

import { toPersianDigits } from '@/lib/setup/format';
import { STEPS, totalEtaSeconds } from '@/lib/setup/steps';
import type * as React from 'react';
import {
  ArrowLeftGlyph,
  BuildingGlyph,
  MailGlyph,
  PhoneGlyph,
  ShieldCheckGlyph,
  SparklesGlyph,
  UserGlyph,
} from './WizardIcons';

/**
 * IntroStep — the no-field welcome screen shown as the first step.
 *
 * Communicates:
 *   1. What the user is about to do (set up the OWNER account)
 *   2. What they will need (email, phone, ~3 minutes)
 *   3. What happens behind the scenes (encryption, audit log)
 *   4. A single primary CTA to advance into the form
 *
 * The list of micro-steps on the right is clickable as a read-only roadmap;
 * clicking one does NOT jump — the user must press "شروع پیکربندی".
 */

export interface IntroStepProps {
  onStart: () => void;
  /** Whether the user has a partially-saved draft from a previous visit. */
  hasResume: boolean;
}

const PERKS: ReadonlyArray<{
  glyph: React.ReactNode;
  title: string;
  body: string;
}> = [
  {
    glyph: <ShieldCheckGlyph />,
    title: 'رمزنگاری سرتاسری',
    body: 'اطلاعات شما فقط روی سرور شما ذخیره می‌شود. رمز عبور با bcrypt(12) هش می‌شود.',
  },
  {
    glyph: <UserGlyph />,
    title: 'کنترل کامل',
    body: 'این حساب به‌عنوان مالک ساخته می‌شود؛ یعنی دسترسی کامل به همه‌ی بخش‌ها.',
  },
  {
    glyph: <SparklesGlyph />,
    title: 'شروع حرفه‌ای',
    body: 'پروفایلی که الان می‌سازید، بعداً در گزارش‌ها، ایمیل‌ها و اعلان‌های سامانه دیده می‌شود.',
  },
];

export function IntroStep({ onStart, hasResume }: IntroStepProps) {
  const totalSeconds = totalEtaSeconds();
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

  return (
    <div className="setup-intro" aria-labelledby="intro-heading">
      <div className="setup-intro__hero">
        <span className="setup-intro__seal" aria-hidden="true">
          <span className="setup-intro__seal-ring" />
          <ShieldCheckGlyph className="setup-intro__seal-glyph" />
        </span>

        <span className="setup-intro__eyebrow">
          <SparklesGlyph className="setup-intro__eyebrow-glyph" />
          <span>پیکربندی اولیه · {toPersianDigits(totalMinutes)} دقیقه</span>
        </span>

        <h1 id="intro-heading" className="setup-intro__title">
          به <span className="setup-intro__title-accent">{'\u00A0'}مدیریت سامانه</span> خوش آمدید
        </h1>

        <p className="setup-intro__lead">
          در چهار مرحله‌ی کوتاه، حساب مالک را ایجاد می‌کنیم. این حساب فقط یک‌بار ساخته می‌شود و تمام
          دسترسی‌های سامانه را کنترل می‌کند.
        </p>

        <div className="setup-intro__cta">
          <button
            type="button"
            onClick={onStart}
            className="setup-intro__btn setup-intro__btn--primary"
          >
            <span>{hasResume ? 'ادامه از مرحله‌ی قبل' : 'شروع پیکربندی'}</span>
            <ArrowLeftGlyph className="setup-intro__btn-glyph" />
          </button>

          {hasResume ? (
            <p className="setup-intro__resume-note" aria-live="polite">
              یک پیش‌نویس ذخیره‌شده از جلسه‌ی قبل پیدا شد.
            </p>
          ) : null}
        </div>
      </div>

      <div className="setup-intro__perks">
        {PERKS.map((perk, idx) => (
          <article
            key={perk.title}
            className="setup-intro__perk"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <span className="setup-intro__perk-glyph" aria-hidden="true">
              {perk.glyph}
            </span>
            <div className="setup-intro__perk-copy">
              <h3 className="setup-intro__perk-title">{perk.title}</h3>
              <p className="setup-intro__perk-body">{perk.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="setup-intro__roadmap" aria-label="نقشه‌ی راه">
        <div className="setup-intro__roadmap-head">
          <span className="setup-intro__roadmap-eyebrow">نقشه‌ی راه</span>
          <span className="setup-intro__roadmap-meta">{toPersianDigits(STEPS.length)} مرحله</span>
        </div>
        <ol className="setup-intro__roadmap-list">
          {STEPS.map((step, idx) => (
            <li
              key={step.id}
              className="setup-intro__roadmap-item"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <span className="setup-intro__roadmap-num" aria-hidden="true">
                {toPersianDigits(idx + 1)}
              </span>
              <div className="setup-intro__roadmap-copy">
                <span className="setup-intro__roadmap-title">{step.title}</span>
                <span className="setup-intro__roadmap-sub">{step.summary}</span>
              </div>
              <span className="setup-intro__roadmap-eta" aria-hidden="true">
                {step.etaSeconds >= 60
                  ? `${toPersianDigits(Math.round(step.etaSeconds / 60))} دقیقه`
                  : `${toPersianDigits(step.etaSeconds)} ثانیه`}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="setup-intro__needs" aria-label="چه چیزی نیاز دارید">
        <span className="setup-intro__needs-label">قبل از شروع آماده داشته باشید:</span>
        <ul className="setup-intro__needs-list">
          <li>
            <MailGlyph className="setup-intro__needs-ico" />
            <span>یک ایمیل معتبر</span>
          </li>
          <li>
            <PhoneGlyph className="setup-intro__needs-ico" />
            <span>شماره موبایل فعال</span>
          </li>
          <li>
            <UserGlyph className="setup-intro__needs-ico" />
            <span>عنوان شغلی و نام شرکت</span>
          </li>
          <li>
            <BuildingGlyph className="setup-intro__needs-ico" />
            <span>۲ دقیقه برای ساخت رمز قوی</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
