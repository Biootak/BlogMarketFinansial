'use client';

/**
 * BroadcastFormHero — editorial cover با BroadcastWave SVG.
 *  Page-specific (hero unique در فرم) — co-located، نه primitive.
 */

import { LiveDot } from '@/components/Dashboard/PlatformHub';
import { CountUp } from '@/components/Dashboard/primitives';
import { Megaphone } from 'lucide-react';
import s from './NewCampaign.module.css';

const toPersianDigits = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

interface BroadcastFormHeroProps {
  campaignMode: boolean;
  editId: string | undefined;
  entityLabel: string;
  reachCount: number;
  channelCount: number;
  bodyLength: number;
}

export function BroadcastFormHero({
  campaignMode,
  editId,
  entityLabel,
  reachCount,
  channelCount,
  bodyLength,
}: BroadcastFormHeroProps) {
  return (
    <header className={s.cover} data-mode={campaignMode ? 'campaign' : 'announcement'}>
      <div className={s.coverGrid}>
        <div className={s.coverGridLeft}>
          <nav className={s.crumbs} aria-label="مسیر">
            <a href="/dashboard" className={s.crumbLink}>
              داشبورد
            </a>
            <span className={s.crumbSep}>/</span>
            <a href="/dashboard/communication" className={s.crumbLink}>
              مرکز ارتباطات
            </a>
            <span className={s.crumbSep}>/</span>
            <span className={s.crumbCurrent} aria-current="page">
              {editId ? `ویرایش ${entityLabel}` : `${entityLabel} جدید`}
            </span>
          </nav>

          <div className={s.coverEyebrow}>
            <LiveDot tone="emerald" size="sm" />
            <span>استودیوی پخش</span>
            <span className={s.coverEyebrowSep}>·</span>
            <span className={s.coverEyebrowLive}>
              {toPersianDigits(
                new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
              )}
            </span>
          </div>

          <h1 className={s.coverTitle}>
            {editId
              ? `${entityLabel} را ویرایش کنید`
              : campaignMode
                ? 'یک کمپین تازه بسازید.'
                : 'یک اعلان تازه منتشر کنید.'}
          </h1>
          <p className={s.coverLead}>
            {campaignMode
              ? 'کمپین‌های ایمیلی، پیامکی و Push را اینجا می‌نویسید. موضوع، متن، کانال و زمان‌بندی.'
              : 'پیامی کوتاه برای همه یا گروهی خاص — با کانال‌های مختلف. اینجا بنویسید و زمان‌بندی کنید.'}
          </p>

          <div className={s.coverStats}>
            <div className={s.coverStat}>
              <span className={s.coverStatKey}>تخمین دسترسی</span>
              <span className={s.coverStatVal}>
                <CountUp value={reachCount} duration={0.6} />
              </span>
            </div>
            <div className={s.coverStat}>
              <span className={s.coverStatKey}>کانال فعال</span>
              <span className={s.coverStatVal}>
                <CountUp value={channelCount} duration={0.6} />
              </span>
            </div>
            <div className={s.coverStat}>
              <span className={s.coverStatKey}>طول پیام</span>
              <span className={s.coverStatVal}>
                <CountUp value={bodyLength} duration={0.4} />
              </span>
            </div>
          </div>
        </div>

        <div className={s.coverGridRight}>
          {/* SVG signature: BroadcastWave */}
          <svg className={s.wave} viewBox="0 0 220 220" fill="none" aria-hidden="true" role="img">
            <defs>
              <radialGradient id="bwGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(82% 0.14 165)" stopOpacity="0.55" />
                <stop offset="60%" stopColor="oklch(60% 0.12 165)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="oklch(60% 0.12 165)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="bwRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(82% 0.14 165)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="oklch(55% 0.14 265)" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <circle cx="110" cy="110" r="100" fill="url(#bwGlow)" />
            <circle cx="110" cy="110" r="92" stroke="oklch(50% 0.01 245 / 0.15)" strokeWidth="1" />
            <circle
              cx="110"
              cy="110"
              r="74"
              stroke="url(#bwRing)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <circle cx="110" cy="110" r="56" stroke="oklch(60% 0.12 165 / 0.6)" strokeWidth="1.5" />
            <circle
              cx="110"
              cy="110"
              r="38"
              stroke="oklch(60% 0.12 165 / 0.85)"
              strokeWidth="1.5"
            />
            <circle cx="110" cy="110" r="20" stroke="oklch(82% 0.14 165)" strokeWidth="2" />
            <circle cx="110" cy="110" r="6" fill="oklch(82% 0.14 165)" />
            <path
              d="M 110 30 Q 130 60, 110 90"
              stroke="oklch(82% 0.14 165 / 0.7)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 190 110 Q 160 130, 130 110"
              stroke="oklch(60% 0.14 265 / 0.7)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 110 190 Q 90 160, 110 130"
              stroke="oklch(70% 0.14 70 / 0.7)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 30 110 Q 60 90, 90 110"
              stroke="oklch(82% 0.14 165 / 0.5)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div className={s.coverRightBadge}>
            <Megaphone size={14} aria-hidden />
            <span>{campaignMode ? 'کمپین' : 'اعلان'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
