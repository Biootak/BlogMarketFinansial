'use client';

/**
 * NewTicketForm — فرم ساخت تیکت جدید (Sheet slide-over).
 * -----------------------------------------------------------------
 *  با PanelDrawer canonical. ۳ فیلد: موضوع + اولویت + دسته + شرح.
 *  Validation: Zod-style (سفارشی) — همان قواعد lib/tickets را اعمال می‌کنیم.
 */

import { createTicket } from '@/actions/tickets-actions';
import { PanelDrawer } from '@/components/Dashboard/primitives';
import type { TicketCategory, TicketPriority } from '@/lib/tickets';
import { AlertCircle, CheckCircle2, Loader2, Plus, Send, X } from 'lucide-react';
import { useState } from 'react';
import s from './NewTicketForm.module.css';

interface NewTicketFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  general: 'عمومی',
  billing: 'مالی',
  technical: 'فنی',
  kyc: 'احراز هویت',
  account: 'حساب کاربری',
  transfer: 'انتقال وجه',
  rate: 'نرخ ارز',
  other: 'سایر',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'کم',
  normal: 'معمولی',
  high: 'بالا',
  urgent: 'فوری',
};

const PRIORITY_TONE: Record<TicketPriority, 'neutral' | 'indigo' | 'amber' | 'rose'> = {
  low: 'neutral',
  normal: 'indigo',
  high: 'amber',
  urgent: 'rose',
};

const PRIORITY_DESCRIPTION: Record<TicketPriority, string> = {
  low: 'زمان پاسخ: ۴۸ ساعت',
  normal: 'زمان پاسخ: ۲۴ ساعت',
  high: 'زمان پاسخ: ۸ ساعت',
  urgent: 'زمان پاسخ: ۲ ساعت — فقط بحران',
};

const CATEGORY_LIST: TicketCategory[] = [
  'general',
  'billing',
  'technical',
  'kyc',
  'account',
  'transfer',
  'rate',
  'other',
];

const PRIORITY_LIST: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

function toPersianNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function NewTicketForm({ open, onClose, onCreated }: NewTicketFormProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const reset = () => {
    setSubject('');
    setDescription('');
    setPriority('normal');
    setCategory('general');
    setFeedback(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const s_trim = subject.trim();
    const d_trim = description.trim();
    if (!s_trim) {
      setFeedback({ tone: 'error', text: 'موضوع الزامی است.' });
      return;
    }
    if (!d_trim) {
      setFeedback({ tone: 'error', text: 'شرح الزامی است.' });
      return;
    }
    if (s_trim.length > 200) {
      setFeedback({ tone: 'error', text: 'موضوع نباید بیش از ۲۰۰ کاراکتر باشد.' });
      return;
    }
    if (d_trim.length > 10_000) {
      setFeedback({ tone: 'error', text: 'شرح نباید بیش از ۱۰۰۰۰ کاراکتر باشد.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const res = await createTicket({ subject: s_trim, description: d_trim, priority, category });
    setSubmitting(false);
    if (res.success) {
      setFeedback({ tone: 'success', text: 'تیکت با موفقیت ساخته شد.' });
      reset();
      onCreated();
      // بستن با تأخیر کوتاه برای دیدن feedback
      setTimeout(() => onClose(), 600);
    } else {
      setFeedback({ tone: 'error', text: res.message ?? 'خطا در ساخت تیکت' });
    }
  };

  return (
    <PanelDrawer open={open} onClose={handleClose} title="تیکت جدید" width="min(520px, 100%)">
      <div className={s.body}>
        <div className={s.field}>
          <label htmlFor="new-ticket-subject" className={s.label}>
            <span>موضوع</span>
            <span className={s.counter}>{toPersianNumber(subject.length)} / ۲۰۰</span>
          </label>
          <input
            id="new-ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="مثال: مشکل در تأیید KYC"
            maxLength={200}
            className={s.input}
            dir="rtl"
            autoComplete="off"
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>اولویت</label>
          <div className={s.priorityGrid} role="radiogroup" aria-label="اولویت">
            {PRIORITY_LIST.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priority === p}
                onClick={() => setPriority(p)}
                className={s.priorityBtn}
                data-active={priority === p}
                data-tone={PRIORITY_TONE[p]}
              >
                <span className={s.priorityName}>{PRIORITY_LABEL[p]}</span>
                <span className={s.priorityHint}>{PRIORITY_DESCRIPTION[p]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>دسته</label>
          <div className={s.categoryChips} role="radiogroup" aria-label="دسته">
            {CATEGORY_LIST.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                onClick={() => setCategory(c)}
                className={s.chip}
                data-active={category === c}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label htmlFor="new-ticket-desc" className={s.label}>
            <span>شرح کامل</span>
            <span className={s.counter}>{toPersianNumber(description.length)} / ۱۰۰۰۰</span>
          </label>
          <textarea
            id="new-ticket-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="شرح کامل مشکل یا درخواست خود را بنویسید..."
            maxLength={10_000}
            rows={8}
            className={s.textarea}
            dir="rtl"
          />
        </div>

        {feedback ? (
          <div
            className={s.feedback}
            data-tone={feedback.tone}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.tone === 'success' ? (
              <CheckCircle2 className={s.feedbackIcon} aria-hidden />
            ) : (
              <AlertCircle className={s.feedbackIcon} aria-hidden />
            )}
            <span>{feedback.text}</span>
          </div>
        ) : null}
      </div>

      <div className={s.footer}>
        <button type="button" onClick={handleClose} disabled={submitting} className={s.cancelBtn}>
          <X className={s.cancelIcon} aria-hidden /> انصراف
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !subject.trim() || !description.trim()}
          className={s.submitBtn}
        >
          {submitting ? (
            <Loader2 className={`${s.spin} ${s.submitIcon}`} aria-hidden />
          ) : (
            <Send className={s.submitIcon} aria-hidden />
          )}
          ثبت تیکت
          <Plus className={s.submitIconEnd} aria-hidden />
        </button>
      </div>
    </PanelDrawer>
  );
}
