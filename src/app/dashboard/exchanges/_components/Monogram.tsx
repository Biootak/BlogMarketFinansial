'use client';

/**
 * Monogram — square/circle badge for exchange name.
 *   • 4 tones: emerald | gold | slate | rose
 *   • 4 sizes: sm | md | lg | xl
 *   • 2 shapes: square | circle
 *   • isLead: shows gold "crown" mark in top-right corner.
 */

import s from './ExchangesWorkspace.module.css';

type Tone = 'emerald' | 'gold' | 'slate' | 'rose';
type Size = 'sm' | 'md' | 'lg' | 'xl';
type Shape = 'square' | 'circle';

interface Props {
  name: string;
  size?: Size;
  shape?: Shape;
  tone?: Tone;
  isLead?: boolean;
}

function pickInitials(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}\s]+/gu, '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2);
  }
  return (parts[0]?.[0]! + parts[1]?.[0]!).toUpperCase();
}

const TONE_CLASS: Record<Tone, string> = {
  emerald: s.monoEmerald!,
  gold: s.monoGold!,
  slate: s.monoSlate!,
  rose: s.monoRose!,
};

const SIZE_CLASS: Record<Size, string> = {
  sm: s.monoSm!,
  md: s.monoMd!,
  lg: s.monoLg!,
  xl: s.monoXl!,
};

export default function Monogram({
  name,
  size = 'md',
  shape = 'square',
  tone = 'slate',
  isLead = false,
}: Props) {
  const initials = pickInitials(name);
  return (
    <span
      className={[
        s.mono,
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        shape === 'circle' ? s.monoCircle : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <span className={s.monoChar}>{initials}</span>
      {isLead && <span className={s.monoCrown} aria-hidden />}
    </span>
  );
}
