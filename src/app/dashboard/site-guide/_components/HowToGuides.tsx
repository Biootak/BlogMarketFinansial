'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import s from './HowToGuides.module.css';
import { HOW_TO_GUIDES, type Tone } from './data/site-guide-routes';

const TONE_ICON_CLASS: Record<Tone, string> = {
  primary: s.tonePrimary,
  emerald: s.toneEmerald,
  amber: s.toneAmber,
  rose: s.toneRose,
  violet: s.toneViolet,
  cyan: s.toneCyan,
  slate: s.toneSlate,
};

function GuideCard({
  guide,
  expanded,
  onToggle,
}: {
  guide: (typeof HOW_TO_GUIDES)[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={s.card} data-expanded={expanded}>
      <button className={s.cardHeader} onClick={onToggle} aria-expanded={expanded}>
        <span className={`${s.cardIcon} ${TONE_ICON_CLASS[guide.tone]}`}>
          {guide.icon as ReactNode}
        </span>
        <span className={s.cardTitle}>{guide.title}</span>
        <span className={s.stepCount}>{guide.steps.length} مرحله</span>
        <ChevronRight size={16} className={s.chevron} data-expanded={expanded} />
      </button>

      {expanded && (
        <div className={s.steps}>
          {guide.steps.map((step, i) => (
            <div key={i} className={s.step}>
              <span className={s.stepNum}>{i + 1}</span>
              <div>
                <p className={s.stepLabel}>{step.label}</p>
                <p className={s.stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
          <Link href={guide.firstLink.href} className={s.goLink}>
            <ArrowLeft size={14} />
            {guide.firstLink.label}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * HowToGuides — expandable step-by-step workflow guides.
 * Helps users reach their goal faster without navigating.
 */
export function HowToGuides() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className={s.section} aria-label="راهنمای گام‌به‌گام">
      <h2 className={s.title}>راهنمای گام‌به‌گام</h2>
      <p className={s.sub}>مهم‌ترین کارها — از صفر تا انجام</p>
      <div className={s.list}>
        {HOW_TO_GUIDES.map((guide) => (
          <GuideCard
            key={guide.id}
            guide={guide}
            expanded={expandedId === guide.id}
            onToggle={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
          />
        ))}
      </div>
    </section>
  );
}
