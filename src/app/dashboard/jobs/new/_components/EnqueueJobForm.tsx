'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { FormField } from '@/components/Dashboard/primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PersianDateTimePicker } from '@/components/ui/PersianDateTimePicker';
import { enqueueJobAction, type EnqueueActionResult } from '@/actions/jobs-actions';
import { toPersianDigits } from '@/lib/setup/format';
import s from '../../jobs.module.css';

interface EnqueueJobFormProps {
  queues: string[];
  recentTypes: string[];
}

const initialState: EnqueueActionResult | null = null;

export function EnqueueJobForm({ queues, recentTypes }: EnqueueJobFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(enqueueJobAction, initialState);
  const [pending, startTransition] = useTransition();
  const [payloadOpen, setPayloadOpen] = useState(false);
  const redirectedRef = useRef<string | null>(null);

  // controlled state برای المان‌های شمسی (قانون NO NATIVE FORM CONTROLS)
  const [queue, setQueue] = useState<string>(queues[0] ?? 'default');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // navigate to detail page on success (only once per created id)
  useEffect(() => {
    if (state && 'success' in state && state.success && state.id) {
      if (redirectedRef.current === state.id) return;
      redirectedRef.current = state.id;
      startTransition(() => {
        router.push(`/dashboard/jobs/${state.id}`);
      });
    }
  }, [state, router, startTransition]);

  const fieldError = (name: string) =>
    state && !state.success && state.field === name ? state.error : undefined;

  return (
    <article className={s.newForm}>
      <nav className={s.inspectorBack}>
        <Link href="/dashboard/jobs" className={s.inspectorBackLink}>
          <ArrowLeft size={14} aria-hidden />
          بازگشت به مرکز Job
        </Link>
      </nav>

      <header className={s.newHeader}>
        <div className={s.newHeaderMain}>
          <span className={s.newEyebrow}>عملیات</span>
          <h1 className={s.newTitle}>ساخت Job جدید</h1>
          <p className={s.newLead}>
            job را در صف مورد نظر قرار بده. در صورت انتخاب زمان، در آن زمان اجرا می‌شود؛
            در غیر این صورت، در اولین فرصت توسط worker پردازش می‌شود.
          </p>
        </div>
        <div className={s.newHeaderSide}>
          {recentTypes.length > 0 ? (
            <div className={s.newRecentTypes}>
              <span className={s.newRecentTypesLabel}>
                <Sparkles size={11} aria-hidden />
                نوع‌های اخیر
              </span>
              <div className={s.newRecentTypesList}>
                {recentTypes.map((t) => (
                  <span key={t} className={s.newRecentTypeChip}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <form action={formAction} className={s.newFormBody}>
        {/* hidden inputs — خارج از FormField تا ساختار canonical (هر FormField فقط یک interactive control)
            باقی بماند و ID/aria wiring به hidden input داده نشود. */}
        <input type="hidden" name="queue" value={queue} />
        <input
          type="hidden"
          name="scheduledAt"
          value={scheduledAt ? scheduledAt.toISOString() : ''}
        />

        <div className={s.newGrid}>
          <FormField
            label="نوع job"
            required
            hint="نام type که handler آن در worker ثبت شده است"
            error={fieldError('type')}
          >
            <input
              name="type"
              type="text"
              required
              placeholder="مثلاً: email.send, market-rates.refresh"
              autoComplete="off"
              dir="ltr"
              className={s.newInput}
            />
          </FormField>

          <FormField
            label="صف"
            required
            hint="صف job — نوع‌های مشابه در یک صف قرار می‌گیرند"
            error={fieldError('queue')}
          >
            <Select value={queue} onValueChange={setQueue}>
              <SelectTrigger
                className={s.newSelectTrigger}
                aria-label="انتخاب صف"
              >
                <SelectValue placeholder="انتخاب صف" />
              </SelectTrigger>
              <SelectContent className={s.newSelectContent}>
                {queues.map((q) => (
                  <SelectItem key={q} value={q} className={s.newSelectItem}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="اولویت"
            hint="عدد صحیح بین -۱۰۰ تا +۱۰۰ — بالاتر زودتر پردازش می‌شود"
            error={fieldError('priority')}
          >
            <input
              name="priority"
              type="number"
              min="-100"
              max="100"
              defaultValue={0}
              className={s.newInput}
              dir="ltr"
            />
          </FormField>

          <FormField
            label="حداکثر تلاش"
            hint="پس از این تعداد، job به صف مرده منتقل می‌شود"
            error={fieldError('maxAttempts')}
          >
            <input
              name="maxAttempts"
              type="number"
              min="1"
              max="20"
              defaultValue={3}
              className={s.newInput}
              dir="ltr"
            />
          </FormField>

          <FormField
            label="زمان‌بندی (اختیاری)"
            hint="در صورت تنظیم، job در این زمان اجرا می‌شود"
            error={fieldError('scheduledAt')}
            className={s.newFieldFull}
          >
            <div className={s.newDatePickerWrap}>
              <PersianDateTimePicker
                value={scheduledAt}
                onChange={setScheduledAt}
                placeholder="روی کلیک کنید تا تقویم باز شود"
                showPresets
              />
            </div>
          </FormField>

          <div className={s.newFieldFull}>
            <button
              type="button"
              onClick={() => setPayloadOpen((v) => !v)}
              className={s.newPayloadToggle}
              aria-expanded={payloadOpen}
            >
              <Plus
                size={14}
                aria-hidden
                className={`${s.newPayloadIcon} ${payloadOpen ? s.newPayloadIconOpen : ''}`}
              />
              {payloadOpen ? 'بستن payload' : 'افزودن payload (JSON اختیاری)'}
            </button>
            {payloadOpen ? (
              <FormField
                label="payload"
                hint="یک object معتبر به فرمت JSON"
                error={fieldError('payloadJson')}
                className={s.newPayloadField}
              >
                <textarea
                  name="payloadJson"
                  rows={6}
                  dir="ltr"
                  placeholder='{ "userId": "...", "amount": 1000 }'
                  className={`${s.newInput} ${s.newTextarea}`}
                />
              </FormField>
            ) : null}
          </div>
        </div>

        {state && !state.success ? (
          <div className={s.newFormError} role="alert">
            {state.error}
          </div>
        ) : null}

        <div className={s.newFormActions}>
          <Link href="/dashboard/jobs" className={`${s.inspectorBtn} ${s['inspectorBtn--ghost']}`}>
            انصراف
          </Link>
          <button
            type="submit"
            disabled={pending}
            className={`${s.inspectorBtn} ${s['inspectorBtn--primary']}`}
          >
            {pending ? 'در حال ثبت…' : 'ثبت job'}
          </button>
        </div>

        {state && state.success ? (
          <p className={s.newFormSuccess} role="status">
            job ساخته شد — در حال انتقال به صفحه جزئیات (شناسه: {toPersianDigits(state.id.slice(0, 12))})
          </p>
        ) : null}
      </form>
    </article>
  );
}

export default EnqueueJobForm;
