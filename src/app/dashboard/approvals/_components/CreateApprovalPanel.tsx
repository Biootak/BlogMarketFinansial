'use client';

import { createApproval } from '@/actions/approvals-actions';
import type { ApprovalType } from '@/lib/approvals';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './CreateApprovalPanel.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TYPE_OPTIONS: {
  id: ApprovalType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  tone: string;
}[] = [
  {
    id: 'settlement',
    label: 'تسویه',
    desc: 'تأیید تسویه حساب معامله یا درخواست مالی',
    icon: <Send className="h-5 w-5" />,
    tone: 'indigo',
  },
  {
    id: 'kyc',
    label: 'احراز هویت',
    desc: 'بررسی مدارک هویتی مشتری یا صراف',
    icon: <ShieldCheck className="h-5 w-5" />,
    tone: 'cyan',
  },
  {
    id: 'refund',
    label: 'استرداد',
    desc: 'بازگشت وجه به مشتری یا حساب',
    icon: <Wallet className="h-5 w-5" />,
    tone: 'amber',
  },
  {
    id: 'withdrawal',
    label: 'برداشت',
    desc: 'درخواست برداشت وجه توسط کاربر',
    icon: <Wallet className="h-5 w-5" />,
    tone: 'rose',
  },
  {
    id: 'custom',
    label: 'سفارشی',
    desc: 'ساخت یک جریان تأیید دلخواه',
    icon: <FileText className="h-5 w-5" />,
    tone: 'violet',
  },
];

const ROLE_OPTIONS = ['OWNER', 'SUPERADMIN', 'ADMIN', 'COMPLIANCE', 'FINANCE', 'SUPPORT'];

type Step = 'type' | 'details' | 'steps';

const STEP_ORDER: Step[] = ['type', 'details', 'steps'];

const STEP_LABEL: Record<Step, string> = {
  type: 'نوع درخواست',
  details: 'جزئیات',
  steps: 'مراحل تأیید',
};

export function CreateApprovalPanel({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<ApprovalType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [stepsList, setStepsList] = useState<Array<{ approverRole: string; approverId?: string }>>([
    { approverRole: 'ADMIN' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // portal mount + body scroll lock
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  const stepIndex = STEP_ORDER.indexOf(step);

  const canNext = () => {
    if (step === 'type') return type !== null;
    if (step === 'details') return title.trim().length > 0 && entityType.trim().length > 0;
    if (step === 'steps') return stepsList.length > 0;
    return false;
  };

  const next = () => {
    if (!canNext()) return;
    const i = STEP_ORDER.indexOf(step);
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
  };

  const back = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  };

  const handleSubmit = async () => {
    if (!type || !title.trim() || !entityType.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await createApproval({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      entityType: entityType.trim(),
      entityId: entityId.trim() || crypto.randomUUID(),
      steps: stepsList.map((st) => ({
        approverRole: st.approverRole,
        approverId: st.approverId?.trim() || null,
      })),
    });
    setSubmitting(false);
    if (res.success) {
      reset();
      onCreated();
    } else {
      setError(res.message ?? 'خطا در ساخت درخواست');
    }
  };

  const reset = () => {
    setStep('type');
    setType(null);
    setTitle('');
    setDescription('');
    setEntityType('');
    setEntityId('');
    setStepsList([{ approverRole: 'ADMIN' }]);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  return createPortal(
    <div
      className={s.overlay}
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={s.panel} role="dialog" aria-label="ساخت درخواست تأیید">
        <header className={s.header}>
          <div className={s.headerLeft}>
            <span className={s.headerTitle}>ساخت درخواست تأیید</span>
            <span className={s.headerSubtitle}>یک جریان تأیید چندمرحله‌ای جدید ایجاد کنید</span>
          </div>
          <button type="button" onClick={close} className={s.closeBtn} aria-label="بستن">
            <ChevronRight className="h-5 w-5" />
          </button>
        </header>

        {/* Stepper */}
        <div className={s.stepper}>
          {STEP_ORDER.map((st, i) => (
            <div
              key={st}
              className={s.stepperItem}
              data-state={i === stepIndex ? 'active' : i < stepIndex ? 'done' : 'idle'}
            >
              <div className={s.stepperDot}>
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              </div>
              <span className={s.stepperLabel}>{STEP_LABEL[st]}</span>
              {i < STEP_ORDER.length - 1 ? <div className={s.stepperLine} /> : null}
            </div>
          ))}
        </div>

        <div className={s.body}>
          {/* Step 1: Type */}
          {step === 'type' ? (
            <div className={s.stepContent}>
              <div className={s.stepTitle}>نوع درخواست تأیید را انتخاب کنید</div>
              <div className={s.typeGrid}>
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={s.typeCard}
                    data-tone={opt.tone}
                    data-active={type === opt.id}
                  >
                    <div className={s.typeIcon}>{opt.icon}</div>
                    <div className={s.typeBody}>
                      <div className={s.typeLabel}>{opt.label}</div>
                      <div className={s.typeDesc}>{opt.desc}</div>
                    </div>
                    {type === opt.id ? (
                      <div className={s.typeCheck}>
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Step 2: Details */}
          {step === 'details' ? (
            <div className={s.stepContent}>
              <div className={s.stepTitle}>جزئیات درخواست را وارد کنید</div>
              <div className={s.field}>
                <label className={s.fieldLabel}>عنوان</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: تأیید تسویه معامله #۱۰۲۳۴"
                  className={s.input}
                  maxLength={120}
                  dir="rtl"
                />
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>توضیحات (اختیاری)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیح بیشتر درباره این درخواست…"
                  rows={3}
                  className={s.textarea}
                  maxLength={500}
                  dir="rtl"
                />
              </div>
              <div className={s.fieldRow}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نوع موجودیت</label>
                  <input
                    type="text"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    placeholder="مثلاً: Deal / Customer / Tx"
                    className={s.input}
                    maxLength={40}
                    dir="ltr"
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>شناسه موجودیت</label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="خالی باشد = خودکار"
                    className={s.input}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 3: Steps */}
          {step === 'steps' ? (
            <div className={s.stepContent}>
              <div className={s.stepTitle}>مراحل تأیید را تعریف کنید</div>
              <p className={s.stepHint}>
                مراحل به ترتیب از بالا به پایین اجرا می‌شوند. برای هر مرحله یک نقش تأییدکننده انتخاب
                کنید.
              </p>
              <div className={s.stepsList}>
                {stepsList.map((st, i) => (
                  <div key={i} className={s.stepRow}>
                    <div className={s.stepRowNum}>{i + 1}</div>
                    <div className={s.stepRowBody}>
                      <span className={s.stepRowLabel}>مرحله {i + 1}</span>
                      <select
                        value={st.approverRole}
                        onChange={(e) => {
                          const next = [...stepsList];
                          next[i] = { ...next[i]!, approverRole: e.target.value };
                          setStepsList(next);
                        }}
                        className={s.select}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStepsList(stepsList.filter((_, idx) => idx !== i))}
                      className={s.stepRemove}
                      disabled={stepsList.length <= 1}
                      aria-label="حذف مرحله"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStepsList([...stepsList, { approverRole: 'ADMIN' }])}
                className={s.addStepBtn}
              >
                <Plus className="h-4 w-4" />
                افزودن مرحله
              </button>
            </div>
          ) : null}

          {error ? (
            <div className={s.error}>
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </div>

        <footer className={s.footer}>
          <button type="button" onClick={back} className={s.backBtn} disabled={stepIndex === 0}>
            <ArrowRight className="h-4 w-4" />
            قبلی
          </button>
          <div className={s.footerRight}>
            {stepIndex === STEP_ORDER.length - 1 ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className={s.submitBtn}
                disabled={!canNext() || submitting}
              >
                {submitting ? (
                  <Loader2 className={`h-4 w-4 ${s.spin}`} />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                ساخت درخواست
              </button>
            ) : (
              <button type="button" onClick={next} className={s.nextBtn} disabled={!canNext()}>
                مرحله بعد
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
