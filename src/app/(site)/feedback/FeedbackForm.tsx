'use client';

/**
 * FeedbackForm — فرم بازخورد (H8-fix).
 * rating + name + email + پیام → به ایمیل پشتیبانی ارسال می‌شود.
 */

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { submitFeedbackAction } from './feedback-action';
import s from './feedback.module.css';

const RATINGS = [
  { value: 5, label: 'عالی', emoji: '★' },
  { value: 4, label: 'خوب', emoji: '★' },
  { value: 3, label: 'متوسط', emoji: '★' },
  { value: 2, label: 'ضعیف', emoji: '★' },
  { value: 1, label: 'خیلی ضعیف', emoji: '★' },
];

export default function FeedbackForm() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('rating', String(rating));

    startTransition(async () => {
      const res = await submitFeedbackAction(formData);
      if (!res.success) {
        toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        return;
      }
      setDone(true);
      formRef.current?.reset();
      setRating(0);
    });
  };

  if (done) {
    return (
      <div className={s.success} role="status" aria-live="polite">
        <span className={s.successIcon} aria-hidden>
          <CheckCircle2 size={28} />
        </span>
        <h2 className={s.successTitle}>بازخورد شما ثبت شد</h2>
        <p className={s.successText}>متشکریم! پیام شما به تیم ما رسید و در اسرع وقت بررسی می‌شود.</p>
        <Button variant="outline" onClick={() => setDone(false)} className={s.successBtn}>
          ارسال بازخورد جدید
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={s.form}>
      {/* ── Rating ── */}
      <fieldset className={s.ratingGroup} aria-label="امتیاز">
        <legend className={s.legend}>تجربه شما</legend>
        <div className={s.stars} role="radiogroup" aria-label="امتیاز تجربه">
          {RATINGS.map((r) => {
            const active = rating >= r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={rating === r.value}
                aria-label={`${r.value} از ۵ — ${r.label}`}
                onClick={() => setRating(r.value)}
                className={`${s.starBtn} ${active ? s.starActive : ''}`}
                title={r.label}
              >
                <span aria-hidden>{r.emoji}</span>
              </button>
            );
          })}
        </div>
        <p className={s.ratingHint}>
          {rating ? RATINGS.find((r) => r.value === rating)?.label : 'روی ستاره‌ها کلیک کنید'}
        </p>
      </fieldset>

      {/* ── Fields ── */}
      <div className={s.fieldRow}>
        <div className={s.field}>
          <label className={s.label} htmlFor="fb-name">
            نام
          </label>
          <input
            id="fb-name"
            name="name"
            className={s.input}
            required
            placeholder="نام شما"
            autoComplete="name"
          />
        </div>
        <div className={s.field}>
          <label className={s.label} htmlFor="fb-email">
            ایمیل
          </label>
          <input
            id="fb-email"
            name="email"
            type="email"
            className={s.input}
            required
            placeholder="you@email.com"
            autoComplete="email"
            dir="ltr"
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="fb-message">
          پیام
        </label>
        <textarea
          id="fb-message"
          name="message"
          className={s.textarea}
          required
          rows={5}
          placeholder="نظر یا پیشنهاد خود را بنویسید…"
        />
      </div>

      <Button
        type="submit"
        disabled={pending || rating === 0}
        className={s.submit}
        aria-busy={pending || undefined}
      >
        {pending ? (
          <Loader2 size={15} className={s.spinner} aria-hidden />
        ) : (
          <Send size={15} aria-hidden />
        )}
        {pending ? 'در حال ارسال…' : 'ارسال بازخورد'}
      </Button>
    </form>
  );
}
