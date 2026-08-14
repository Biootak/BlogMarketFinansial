// src/app/dashboard/exchange-rates/_components/RateListsWorkspace.tsx
// 2026-07-29: Rate-list builder — clean cards, inline add/list management.
// RateList schema: { id, title, rates: RateItem[], isActive, createdAt, updatedAt }.

'use client';

import { createRateList, deleteRateList, updateRateList } from '@/actions/rate-lists';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import type { RateItem, RateListData } from '@/types/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineListBullet,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXCircle,
  HiPlus,
} from 'react-icons/hi2';

interface Props {
  initialLists: RateListData[];
}

interface FormState {
  title: string;
  rates: RateItem[];
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  rates: [{ title: '', value: '' }],
  isActive: true,
};

function dateLabel(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(dt);
}

export default function RateListsWorkspace({ initialLists }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RateListData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RateListData | null>(null);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--ds-space-4)' }}>
      {/* Header row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        style={{ gap: 'var(--ds-space-3)' }}
      >
        <div className="flex flex-col" style={{ gap: '0.2rem' }}>
          <h2
            className="font-bold"
            style={{
              fontSize: 'var(--ds-text-lg)',
              color: 'var(--ds-text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            فهرست‌های نرخ تیکر
          </h2>
          <p
            style={{
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-text-muted)',
              margin: 0,
            }}
          >
            گروه‌بندی نرخ‌ها برای نمایش در تیکر سایت یا اپ
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center"
          style={{ gap: '0.4rem' }}
        >
          <HiOutlinePlus aria-hidden style={{ width: '1rem', height: '1rem' }} />
          فهرست جدید
        </Button>
      </div>

      {/* Lists grid */}
      {initialLists.length === 0 ? (
        <EmptyListsState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 22rem), 1fr))',
            gap: 'var(--ds-space-4)',
          }}
        >
          {initialLists.map((list) => (
            <RateListCard
              key={list.id}
              list={list}
              onEdit={() => setEditTarget(list)}
              onDelete={() => setDeleteTarget(list)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <RateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={() => router.refresh()}
      />
      <RateListDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        mode="edit"
        initial={editTarget}
        onSaved={() => router.refresh()}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="حذف فهرست"
        description={`فهرست «${deleteTarget?.title ?? ''}» حذف شود؟`}
        confirmLabel="بله، حذف شود"
        cancelLabel="انصراف"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          const result = await deleteRateList(deleteTarget.id);
          setDeleting(false);
          setDeleteTarget(null);
          if (result.success) {
            toast({
              title: 'فهرست حذف شد',
              description: deleteTarget.title,
              variant: 'success',
            });
            router.refresh();
          } else {
            toast({
              variant: 'destructive',
              title: 'خطا',
              description: result.error?.message ?? 'خطای ناشناس',
            });
          }
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Card — one RateList
   ────────────────────────────────────────────────────────────────────── */

function RateListCard({
  list,
  onEdit,
  onDelete,
}: {
  list: RateListData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="group flex flex-col transition-shadow"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        padding: 'var(--ds-space-4) var(--ds-space-5)',
        gap: 'var(--ds-space-3)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <header className="flex items-start justify-between" style={{ gap: '0.5rem' }}>
        <div className="flex flex-col" style={{ gap: '0.2rem', minWidth: 0 }}>
          <h3
            className="font-bold truncate"
            title={list.title}
            style={{
              fontSize: 'var(--ds-text-base)',
              color: 'var(--ds-text-primary)',
              margin: 0,
            }}
          >
            {list.title}
          </h3>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--ds-text-muted)',
            }}
          >
            به‌روزرسانی: {dateLabel(list.updatedAt)}
          </span>
        </div>
        <span
          className="inline-flex items-center"
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            paddingInline: '0.55rem',
            height: '1.3rem',
            borderRadius: 'var(--ds-radius-full)',
            color: list.isActive ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
            background: list.isActive
              ? 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)'
              : 'var(--ds-canvas-subtle)',
            border: `1px solid ${list.isActive ? 'color-mix(in oklch, var(--ds-accent-emerald) 28%, transparent)' : 'var(--ds-border-subtle)'}`,
            gap: '0.3rem',
            flexShrink: 0,
          }}
        >
          {list.isActive ? (
            <HiOutlineCheckCircle style={{ width: '0.8rem', height: '0.8rem' }} />
          ) : (
            <HiOutlineXCircle style={{ width: '0.8rem', height: '0.8rem' }} />
          )}
          {list.isActive ? 'فعال' : 'غیرفعال'}
        </span>
      </header>

      {list.rates.length > 0 && (
        <div
          className="flex flex-col"
          style={{
            gap: '0.25rem',
            fontSize: 'var(--ds-text-sm)',
          }}
        >
          {list.rates.slice(0, 3).map((rate, idx) => (
            <div
              key={`${rate.title}-${idx}`}
              className="flex items-center justify-between"
              style={{ gap: '0.5rem' }}
            >
              <span
                className="truncate"
                style={{ color: 'var(--ds-text-secondary)' }}
                title={rate.title}
              >
                {rate.title}
              </span>
              <span
                className="font-mono tabular-nums truncate"
                dir="ltr"
                style={{ color: 'var(--ds-text-primary)', maxWidth: '8rem' }}
                title={rate.value}
              >
                {rate.value}
              </span>
            </div>
          ))}
          {list.rates.length > 3 && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--ds-text-muted)',
                fontWeight: 500,
              }}
            >
              +{(list.rates.length - 3).toLocaleString('fa-IR')} مورد دیگر
            </span>
          )}
        </div>
      )}

      <footer
        className="flex items-center justify-between"
        style={{
          paddingTop: 'var(--ds-space-3)',
          borderTop: '1px solid var(--ds-border-subtle)',
        }}
      >
        <span
          className="font-semibold"
          style={{ fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)' }}
        >
          {list.rates.length.toLocaleString('fa-IR')} نرخ
        </span>
        <div className="flex items-center" style={{ gap: '0.4rem' }}>
          <button
            type="button"
            onClick={onEdit}
            aria-label="ویرایش فهرست"
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-text-secondary)',
              border: '1px solid var(--ds-border-subtle)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <HiOutlinePencil aria-hidden style={{ width: '0.9rem', height: '0.9rem' }} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="حذف فهرست"
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-accent-rose)',
              border: '1px solid var(--ds-border-subtle)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <HiOutlineTrash aria-hidden style={{ width: '0.9rem', height: '0.9rem' }} />
          </button>
        </div>
      </footer>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Dialog — create/edit RateList
   ────────────────────────────────────────────────────────────────────── */

function RateListDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  initial?: RateListData | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm({
        title: initial.title,
        rates:
          initial.rates.length > 0
            ? initial.rates.map((r) => ({ ...r }))
            : [{ title: '', value: '' }],
        isActive: initial.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [mode, initial, open]);

  const submit = async () => {
    if (!form.title.trim()) {
      setError('عنوان فهرست الزامی است');
      return;
    }
    const cleanRates = form.rates
      .map((r) => ({ title: r.title.trim(), value: r.value.trim() }))
      .filter((r) => r.title && r.value);

    if (cleanRates.length === 0) {
      setError('حداقل یک نرخ با عنوان و مقدار معتبر وارد کنید');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      rates: cleanRates,
      isActive: form.isActive,
    };

    const result =
      mode === 'create'
        ? await createRateList(payload)
        : initial
          ? await updateRateList(initial.id, payload)
          : null;

    setSubmitting(false);
    if (!result) {
      setError('خطای ناشناس');
      return;
    }
    if (result.success) {
      toast({
        title: mode === 'create' ? 'فهرست ساخته شد' : 'فهرست به‌روزرسانی شد',
        description: form.title,
        variant: 'success',
      });
      onSaved();
      onOpenChange(false);
    } else {
      setError(result.error?.message ?? 'خطای ناشناس');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'فهرست جدید' : 'ویرایش فهرست'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col" style={{ gap: 'var(--ds-space-3)' }}>
          <Field label="عنوان" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="نرخ‌های اصلی"
              style={inputStyle}
            />
          </Field>

          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <div className="flex items-center justify-between" style={{ gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: 'var(--ds-text-xs)',
                  fontWeight: 600,
                  color: 'var(--ds-text-secondary)',
                }}
              >
                نرخ‌ها
                <span style={{ color: 'var(--ds-accent-rose)' }}> *</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    rates: [...form.rates, { title: '', value: '' }],
                  })
                }
                className="inline-flex items-center font-semibold transition-colors"
                style={{
                  height: '1.75rem',
                  paddingInline: '0.6rem',
                  fontSize: '0.7rem',
                  color: 'var(--ds-brand-500)',
                  background: 'color-mix(in oklch, var(--ds-brand-500) 8%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--ds-brand-500) 24%, transparent)',
                  borderRadius: 'var(--ds-radius-sm)',
                  cursor: 'pointer',
                  gap: '0.3rem',
                }}
              >
                <HiPlus aria-hidden style={{ width: '0.8rem', height: '0.8rem' }} />
                افزودن ردیف
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: '0.5rem' }}>
              {form.rates.map((rate, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto]" style={{ gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={rate.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rates: form.rates.map((r, i) =>
                          i === idx ? { ...r, title: e.target.value } : r,
                        ),
                      })
                    }
                    placeholder="عنوان (مثلاً دلار)"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={rate.value}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rates: form.rates.map((r, i) =>
                          i === idx ? { ...r, value: e.target.value } : r,
                        ),
                      })
                    }
                    placeholder="مقدار (مثلاً ۷۲,۰۰۰)"
                    dir="ltr"
                    className="font-mono"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        rates:
                          form.rates.length > 1
                            ? form.rates.filter((_, i) => i !== idx)
                            : form.rates,
                      })
                    }
                    aria-label="حذف ردیف"
                    className="inline-flex items-center justify-center transition-colors"
                    style={{
                      width: '2.4rem',
                      height: '2.4rem',
                      borderRadius: 'var(--ds-radius-md)',
                      background: 'transparent',
                      color: 'var(--ds-accent-rose)',
                      border: '1px solid var(--ds-border-subtle)',
                      cursor: form.rates.length > 1 ? 'pointer' : 'not-allowed',
                      opacity: form.rates.length > 1 ? 1 : 0.4,
                    }}
                    disabled={form.rates.length <= 1}
                  >
                    <HiOutlineTrash aria-hidden style={{ width: '0.95rem', height: '0.95rem' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label
            className="inline-flex items-center"
            htmlFor="rate-list-active"
            style={{ gap: '0.5rem', cursor: 'pointer' }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              setForm({ ...form, isActive: !form.isActive });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setForm({ ...form, isActive: !form.isActive });
              }
            }}
          >
            <Checkbox
              id="rate-list-active"
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c === true })}
            />
            <span style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-primary)' }}>
              فعال و نمایش در تیکر
            </span>
          </label>
          {error && (
            <p
              role="alert"
              style={{
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-accent-rose)',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'در حال ذخیره…' : mode === 'create' ? 'ساخت فهرست' : 'ذخیره تغییرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '2.4rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--ds-text-primary)',
  background: 'var(--ds-canvas-subtle)',
  border: '1px solid var(--ds-border-subtle)',
  borderRadius: 'var(--ds-radius-md)',
  outline: 'none',
  fontFamily: 'inherit',
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col" style={{ gap: '0.3rem' }}>
      <span
        style={{
          fontSize: 'var(--ds-text-xs)',
          fontWeight: 600,
          color: 'var(--ds-text-secondary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--ds-accent-rose)' }}> *</span>}
      </span>
      {children}
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Empty state
   ────────────────────────────────────────────────────────────────────── */

function EmptyListsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        padding: 'var(--ds-space-10) var(--ds-space-6)',
        gap: 'var(--ds-space-3)',
        background: 'var(--ds-surface)',
        border: '1px dashed var(--ds-border-default)',
        borderRadius: 'var(--ds-radius-lg)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)',
          color: 'var(--ds-brand-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HiOutlineListBullet style={{ width: '1.5rem', height: '1.5rem' }} />
      </div>
      <h3
        className="font-bold"
        style={{
          fontSize: 'var(--ds-text-base)',
          color: 'var(--ds-text-primary)',
          margin: 0,
        }}
      >
        هنوز فهرستی ساخته نشده
      </h3>
      <p
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          margin: 0,
          maxWidth: '24rem',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        فهرست‌ها به شما کمک می‌کنند تا نرخ‌ها را گروه‌بندی کنید و در تیکر سایت یا اپ به شکل دلخواه نمایش
        دهید.
      </p>
      <Button type="button" onClick={onCreate} className="mt-2" style={{ gap: '0.4rem' }}>
        <HiOutlinePlus aria-hidden style={{ width: '1rem', height: '1rem' }} />
        اولین فهرست را بساز
      </Button>
    </div>
  );
}
