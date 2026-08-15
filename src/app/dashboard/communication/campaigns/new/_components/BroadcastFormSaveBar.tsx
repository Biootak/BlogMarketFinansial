'use client';

/**
 * BroadcastFormSaveBar — sticky bottom action bar.
 *  Page-specific (form action bar).
 */

import { Button } from '@/components/ui/button';
import { ChevronRight, Save, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import s from './NewCampaign.module.css';

interface BroadcastFormSaveBarProps {
  pending: boolean;
  campaignMode: boolean;
  backHref: string;
  onSubmit: (mode: 'draft' | 'publish') => void;
}

export function BroadcastFormSaveBar({
  pending,
  campaignMode,
  backHref,
  onSubmit,
}: BroadcastFormSaveBarProps) {
  const router = useRouter();

  return (
    <div className={s.saveBar}>
      <div className={s.saveBarInfo}>
        <ChevronRight size={14} aria-hidden />
        <a href={backHref} className={s.saveBarLink}>
          بازگشت به فهرست
        </a>
      </div>
      <div className={s.saveBarActions}>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          <X size={14} aria-hidden />
          انصراف
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => onSubmit('draft')}
        >
          <Save size={14} aria-hidden />
          {pending ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
        </Button>
        <Button type="button" disabled={pending} onClick={() => onSubmit('publish')}>
          {pending ? 'در حال ارسال…' : campaignMode ? 'ارسال کمپین' : 'انتشار فوری'}
          <Send size={14} aria-hidden style={{ transform: 'scaleX(-1)' }} />
        </Button>
      </div>
    </div>
  );
}
