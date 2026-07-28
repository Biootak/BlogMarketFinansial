'use client';

/**
 * CustomerBeneficiaryManager — 2026 Million-Dollar Customer Portal
 *
 * مدیریت مخاطبان (گیرندگان مکرر) برای Customer portal.
 * این نسخه از Beneficiary model (customer-scoped) استفاده می‌کند
 * و tenant-isolated است.
 *
 * Design language: Linear × Attio — Bento + glass
 *   - 3-column bento در حالت خالی (Stats / Quick Add / Recent)
 *   - هر row: avatar monogram + meta + actions
 *   - empty state با SVG illustration
 *   - edit modal با form inline + validation feedback
 *   - delete confirmation با inline reveal (نه popup)
 */

import {
  type CustomerBeneficiary,
  createCustomerBeneficiary,
  deleteCustomerBeneficiary,
  updateCustomerBeneficiary,
} from '@/actions/customer-beneficiaries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import s from './CustomerBeneficiaryManager.module.css';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; row: CustomerBeneficiary }
  | { type: 'delete'; row: CustomerBeneficiary };

interface Props {
  initialBeneficiaries: CustomerBeneficiary[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '؟';
}

function hueFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function CustomerBeneficiaryManager({ initialBeneficiaries }: Props) {
  const [rows, setRows] = useState<CustomerBeneficiary[]>(initialBeneficiaries);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const closeModal = useCallback(() => {
    setModal({ type: 'none' });
    setError(null);
    setSaved(false);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.identifier.toLowerCase().includes(q),
    );
  }, [rows, search]);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get('name') as string).trim(),
      identifier: (fd.get('identifier') as string).trim(),
      note: ((fd.get('note') as string) || '').trim() || undefined,
    };
    setError(null);

    startTransition(async () => {
      const res = await createCustomerBeneficiary(data);
      if (res.success) {
        setRows((prev) => [res.data, ...prev]);
        setSaved(true);
        setTimeout(closeModal, 1200);
      } else {
        setError(res.error.message);
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (modal.type !== 'edit') return;
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const note = (fd.get('note') as string).trim();
    setError(null);

    startTransition(async () => {
      const res = await updateCustomerBeneficiary({
        id: modal.row.id,
        name: name || undefined,
        note: note || null,
      });
      if (res.success) {
        setRows((prev) =>
          prev.map((r) => (r.id === modal.row.id ? { ...r, name, note: note || null } : r)),
        );
        setSaved(true);
        setTimeout(closeModal, 1200);
      } else {
        setError(res.error.message);
      }
    });
  }

  function handleDelete() {
    if (modal.type !== 'delete') return;
    const target = modal.row;
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    closeModal();
    startTransition(async () => {
      const res = await deleteCustomerBeneficiary(target.id);
      if (!res.success) {
        // rollback
        setRows((prev) => [target, ...prev]);
      }
    });
  }

  return (
    <div className={s.root}>
      {/* ── Bento Stats (shown when empty) ──────────────────────────────── */}
      {rows.length === 0 ? (
        <div className={s.bentoEmpty}>
          <div className={s.emptyVisual}>
            <div className={s.emptyVisualBg} aria-hidden />
            <Users className={s.emptyVisualIcon} size={48} strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className={s.emptyTitle}>هنوز مخاطبی ندارید</h2>
          <p className={s.emptyDescription}>
            گیرندگان مکرر خود را اینجا ذخیره کنید تا در حین انتقال وجه، فقط با یک کلیک انتخاب شوند.
            هر مخاطب با یک شناسه یکتا شناسایی می‌شود.
          </p>
          <Button onClick={() => setModal({ type: 'create' })} className={s.emptyCta}>
            <UserPlus size={16} aria-hidden />
            افزودن اولین مخاطب
          </Button>
        </div>
      ) : (
        <>
          {/* ── Toolbar ────────────────────────────────────────────────── */}
          <div className={s.toolbar}>
            <div className={s.searchBox}>
              <Search size={14} aria-hidden className={s.searchIcon} />
              <input
                type="search"
                inputMode="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در نام یا شناسه…"
                className={s.searchInput}
                aria-label="جستجوی مخاطب"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className={s.searchClear}
                  aria-label="پاک کردن جستجو"
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </div>
            <Button onClick={() => setModal({ type: 'create' })} className={s.addBtn}>
              <Plus size={14} aria-hidden />
              مخاطب جدید
            </Button>
          </div>

          {/* ── Stats strip ──────────────────────────────────────────── */}
          <div className={s.statsStrip}>
            <div className={s.statChip}>
              <Users size={12} aria-hidden />
              <span>{new Intl.NumberFormat('fa-IR').format(rows.length)} مخاطب</span>
            </div>
            {search && filtered.length !== rows.length && (
              <div className={s.statChipStat}>
                <span>
                  {new Intl.NumberFormat('fa-IR').format(filtered.length)} نتیجه از{' '}
                  {new Intl.NumberFormat('fa-IR').format(rows.length)}
                </span>
              </div>
            )}
          </div>

          {/* ── List ─────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className={s.noResults}>
              <Search size={28} aria-hidden className="opacity-50" />
              <p>نتیجه‌ای برای «{search}» یافت نشد</p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className={s.noResultsLink}
              >
                پاک کردن جستجو
              </button>
            </div>
          ) : (
            <ul className={s.list} aria-label="مخاطبان">
              {filtered.map((row, i) => {
                const hue = hueFromString(row.identifier);
                return (
                  <li
                    key={row.id}
                    className={s.row}
                    style={{ '--row-i': i } as React.CSSProperties}
                  >
                    <div
                      className={s.avatar}
                      aria-hidden
                      style={{
                        background: `oklch(92% 0.04 ${hue})`,
                        color: `oklch(38% 0.12 ${hue})`,
                      }}
                    >
                      {initials(row.name)}
                    </div>
                    <div className={s.rowMain}>
                      <div className={s.rowHeader}>
                        <span className={s.rowName}>{row.name}</span>
                        <code className={s.rowIdentifier} dir="ltr">
                          {row.identifier}
                        </code>
                      </div>
                      {row.note && <p className={s.rowNote}>{row.note}</p>}
                    </div>
                    <div className={s.rowActions}>
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'edit', row })}
                        className={s.rowBtn}
                        aria-label={`ویرایش ${row.name}`}
                        title="ویرایش"
                      >
                        <Edit2 size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'delete', row })}
                        className={cn(s.rowBtn, s.rowBtnDanger)}
                        aria-label={`حذف ${row.name}`}
                        title="حذف"
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ── Create/Edit Dialog ────────────────────────────────────────── */}
      <Dialog
        open={modal.type === 'create' || modal.type === 'edit'}
        onOpenChange={(o) => !o && closeModal()}
      >
        <DialogContent dir="rtl" className={s.dialog}>
          <DialogHeader>
            <DialogTitle>
              {modal.type === 'edit' ? 'ویرایش مخاطب' : 'افزودن مخاطب جدید'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={modal.type === 'edit' ? handleEdit : handleCreate}
            className={s.form}
            noValidate
          >
            <div className={s.field}>
              <label htmlFor="name" className={s.label}>
                نام <span className={s.required}>*</span>
              </label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={modal.type === 'edit' ? modal.row.name : ''}
                placeholder="مثلاً: علی محمدی"
                className={s.input}
                autoFocus
                dir="rtl"
              />
            </div>
            <div className={s.field}>
              <label htmlFor="identifier" className={s.label}>
                شناسه / شماره حساب <span className={s.required}>*</span>
              </label>
              <Input
                id="identifier"
                name="identifier"
                required
                disabled={modal.type === 'edit'}
                defaultValue={modal.type === 'edit' ? modal.row.identifier : ''}
                placeholder="مثلاً: شماره شبا یا شماره کارت"
                className={s.input}
                dir="ltr"
                inputMode="text"
                autoComplete="off"
              />
              {modal.type === 'edit' && (
                <span className={s.fieldHint}>شناسه بعد از ثبت قابل تغییر نیست</span>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="note" className={s.label}>
                یادداشت (اختیاری)
              </label>
              <Textarea
                id="note"
                name="note"
                rows={2}
                maxLength={200}
                defaultValue={modal.type === 'edit' ? (modal.row.note ?? '') : ''}
                placeholder="مثلاً: دایی، همسایه، تأمین‌کننده…"
                className={s.textarea}
                dir="rtl"
              />
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={14} aria-hidden />
                {error}
              </div>
            )}
            {saved && (
              <div className={s.successBox} role="status">
                <Check size={14} aria-hidden />
                ذخیره شد
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isPending}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                    در حال ذخیره…
                  </>
                ) : modal.type === 'edit' ? (
                  'ذخیره تغییرات'
                ) : (
                  'افزودن'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <Dialog
        open={modal.type === 'delete'}
        onOpenChange={(o) => !o && closeModal()}
      >
        <DialogContent dir="rtl" className={s.dialog}>
          <DialogHeader>
            <DialogTitle>حذف مخاطب</DialogTitle>
          </DialogHeader>
          <div className={s.deleteBody}>
            <div className={s.deleteIcon} aria-hidden>
              <Trash2 size={22} />
            </div>
            <p>
              آیا از حذف <strong>{modal.type === 'delete' ? modal.row.name : ''}</strong> مطمئن
              هستید؟ این عملیات قابل بازگشت نیست.
            </p>
            <p className={s.deleteMeta} dir="ltr">
              {modal.type === 'delete' ? modal.row.identifier : ''}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isPending}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'در حال حذف…' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
