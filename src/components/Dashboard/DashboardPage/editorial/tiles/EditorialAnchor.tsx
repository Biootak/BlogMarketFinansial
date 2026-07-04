'use client';

/**
 * EditorialAnchor — companion side panel to the Hero.
 *
 * Three secondary metrics that the user cares about but that don't deserve
 * the Hero's visual weight. Compact rows with hairline dividers.
 */

import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { fmt } from '../utils';

interface EditorialAnchorProps {
  publishedTotal: number;
  draftsTotal: number;
  commentsNew: number;
}

const ROWS = [
  {
    key: 'published' as const,
    icon: HiOutlineDocumentText,
    label: 'پست‌های منتشرشده',
  },
  {
    key: 'drafts' as const,
    icon: HiOutlinePencilSquare,
    label: 'پیش‌نویس‌ها',
  },
  {
    key: 'comments' as const,
    icon: HiOutlineChatBubbleLeftRight,
    label: 'نظرات جدید',
  },
] as const;

export default function EditorialAnchor({
  publishedTotal,
  draftsTotal,
  commentsNew,
}: EditorialAnchorProps) {
  const values = { published: publishedTotal, drafts: draftsTotal, comments: commentsNew };

  return (
    <section className="ec-tile ec-anchor" aria-label="شاخص‌های ثانویه">
      <header className="ec-anchor__head">
        <span className="ec-anchor__head-text">وضعیت محتوا</span>
      </header>

      {ROWS.map(({ key, icon: Icon, label }) => (
        <div key={key} className="ec-anchor__row">
          <span className="ec-anchor__ico" aria-hidden>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="ec-anchor__label">{label}</span>
          <span className="ec-anchor__value">{fmt(values[key])}</span>
        </div>
      ))}
    </section>
  );
}
