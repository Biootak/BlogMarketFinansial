'use client';

/**
 * BeneficiaryManager — مدیریت دریافت‌کنندگان مکرر
 *
 * لیست مخاطبان، فرم ایجاد inline، ویرایش/حذف با confirmation.
 * طراحی premium: dark glass cards، spring micro-interactions، ambient gradient.
 */

import {
  createBeneficiary,
  deleteBeneficiary,
  type BeneficiaryRow,
  updateBeneficiary,
} from '@/actions/beneficiaries';
import {
  Check,
  ChevronDown,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState, useTransition } from 'react';
import s from './beneficiaries.module.css';

interface Props {
  initialBeneficiaries: BeneficiaryRow[];
}

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; row: BeneficiaryRow }
  | { type: 'delete'; row: BeneficiaryRow };

export default function BeneficiaryManager({ initialBeneficiaries }: Props) {
  const [rows, setRows] = useState<BeneficiaryRow[]>(initialBeneficiaries);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const closeModal = useCallback(() => {
    setModal({ type: 'none' });
    setError(null);
    setSaved(false);
  }, []);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get('name') as string).trim(),
      identifier: (fd.get('identifier') as string).trim(),
      note: (fd.get('note') as string).trim() || undefined,
    };
    setError(null);

    startTransition(async () => {
      const res = await createBeneficiary(data);
      if (res.success) {
        setRows((prev) => [res.data, ...prev]);
        setSaved(true);
        formRef.current?.reset();
        setTimeout(closeModal, 1400);
      } else {
        setError(res.error.message);
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (modal.type !== 'edit') return;
    const fd = new FormData(e.currentTarget);
    const data = {
      id: modal.row.id,
      name: (fd.get('name') as string).trim() || undefined,
      note: (fd.get('note') as string).trim() || null,
    };
    setError(null);

    startTransition(async () => {
      const res = await updateBeneficiary(data);
      if (res.success) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === modal.row.id
              ? { ...r, name: data.name ?? r.name, note: data.note ?? null }
              : r,
          ),
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
    const id = modal.row.id;

    startTransition(async () => {
      const res = await deleteBeneficiary(id);
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        closeModal();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <main className={s.root}>
      {/* ── Ambient glow ─────────────────────────────────── */}
      <div className={s.ambient} aria-hidden />

      {/* ── Header ───────────────────────────────────────── */}
      <header className={s.pageHeader}>
        <div className={s.headerIcon} aria-hidden>
          <Users size={20} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className={s.pageTitle}>مخاطبان انتقال</h1>
          <p className={s.pageSubtitle}>
            {rows.length > 0
              ? `${new Intl.NumberFormat('fa-IR').format(rows.length)} دریافت‌کننده ذخیره‌شده`
              : 'اولین مخاطب خود را اضافه کنید'}
          </p>
        </div>
        <button
          type="button"
          className={s.addBtn}
          onClick={() => setModal({ type: 'create' })}
          aria-label="افزودن مخاطب جدید"
        >
          <UserPlus size={15} strokeWidth={2} aria-hidden />
          <span>افزودن مخاطب</span>
        </button>
      </header>

      {/* ── Empty ────────────────────────────────────────── */}
      {rows.length === 0 && (
        <div className={s.empty}>
          <div className={s.emptyIconWrap} aria-hidden>
            <Users size={28} strokeWidth={1} />
          </div>
          <h2 className={s.emptyTitle}>هیچ مخاطبی ذخیره نشده</h2>
          <p className={s.emptyDesc}>
            دریافت‌کنندگان مکرر را ذخیره کنید تا در انتقال‌های بعدی سریع‌تر عمل کنید.
          </p>
          <button
            type="button"
            className={s.addBtn}
            onClick={() => setModal({ type: 'create' })}
          >
            <Plus size={15} aria-hidden />
            افزودن اولین مخاطب
          </button>
        </div>
      )}

      {/* ── List ─────────────────────────────────────────── */}
      {rows.length > 0 && (
        <ul className={s.list} aria-label="مخاطبان انتقال">
          {rows.map((row, i) => {
            const isExpanded = expandedId === row.id;
            return (
              <li
                key={row.id}
                className={s.card}
                style={{ '--i': i } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={s.cardMain}
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  aria-expanded={isExpanded}
                >
                  <span className={s.cardAvatar} aria-hidden>
                    <User size={16} strokeWidth={1.5} />
                  </span>
                  <span className={s.cardInfo}>
                    <span className={s.cardName}>{row.name}</span>
                    <span className={s.cardIdentifier} dir="ltr">
                      {row.identifier}
                    </span>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`${s.chevron} ${isExpanded ? s.chevronOpen : ''}`}
                    aria-hidden
                  />
                </button>

                {isExpanded && (
                  <div className={s.cardExpanded}>
                    {row.note && <p className={s.cardNote}>{row.note}</p>}
                    <div className={s.cardActions}>
                      <button
                        type="button"
                        className={s.editBtn}
                        onClick={() => {
                          setModal({ type: 'edit', row });
                          setError(null);
                          setSaved(false);
                        }}
                      >
                        <Edit2 size={13} aria-hidden />
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className={s.deleteBtn}
                        onClick={() => setModal({ type: 'delete', row })}
                      >
                        <Trash2 size={13} aria-hidden />
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Modal Backdrop ───────────────────────────────── */}
      {modal.type !== 'none' && (
        <div
          className={s.backdrop}
          onClick={closeModal}
          onKeyDown={(e) => e.key === 'Escape' && closeModal()}
          role="presentation"
          aria-hidden
        />
      )}

      {/* ── Create Modal ─────────────────────────────────── */}
      {modal.type === 'create' && (
        <div className={s.modal} role="dialog" aria-modal aria-label="افزودن مخاطب جدید">
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>مخاطب جدید</h2>
            <button type="button" onClick={closeModal} className={s.closeBtn} aria-label="بستن">
              <X size={16} aria-hidden />
            </button>
          </div>
          <form ref={formRef} onSubmit={handleCreate} className={s.form}>
            <div className={s.field}>
              <label htmlFor="b-name" className={s.label}>
                نام دریافت‌کننده
              </label>
              <input
                id="b-name"
                name="name"
                className={s.input}
                required
                minLength={2}
                placeholder="مثال: علی احمدی"
              />
            </div>
            <div className={s.field}>
              <label htmlFor="b-identifier" className={s.label}>
                شماره تلفن یا آدرس
              </label>
              <input
                id="b-identifier"
                name="identifier"
                className={s.input}
                required
                dir="ltr"
                placeholder="+93 700 000 000"
              />
              <span className={s.fieldHint}>
                شماره تلفن، IBAN، یا هر شناسه‌ای که برای انتقال استفاده می‌کنید
              </span>
            </div>
            <div className={s.field}>
              <label htmlFor="b-note" className={s.label}>
                یادداشت <span className={s.optional}>(اختیاری)</span>
              </label>
              <input
                id="b-note"
                name="note"
                className={s.input}
                placeholder="مثال: حساب بانک افغانستان"
              />
            </div>

            {error && (
              <div className={s.errorMsg} role="alert">
                {error}
              </div>
            )}
            {saved && (
              <div className={s.successMsg} role="status">
                <Check size={14} aria-hidden /> ذخیره شد
              </div>
            )}

            <div className={s.formFooter}>
              <button type="submit" className={s.submitBtn} disabled={isPending}>
                {isPending ? (
                  <Loader2 size={14} className={s.spin} aria-hidden />
                ) : (
                  <Plus size={14} aria-hidden />
                )}
                {isPending ? 'در حال ذخیره…' : 'ذخیره مخاطب'}
              </button>
              <button type="button" onClick={closeModal} className={s.cancelBtn}>
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {modal.type === 'edit' && (
        <div className={s.modal} role="dialog" aria-modal aria-label="ویرایش مخاطب">
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>ویرایش مخاطب</h2>
            <button type="button" onClick={closeModal} className={s.closeBtn} aria-label="بستن">
              <X size={16} aria-hidden />
            </button>
          </div>
          <form onSubmit={handleEdit} className={s.form}>
            <div className={s.field}>
              <label htmlFor="eb-name" className={s.label}>
                نام
              </label>
              <input
                id="eb-name"
                name="name"
                className={s.input}
                defaultValue={modal.row.name}
                required
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>شناسه (قابل ویرایش نیست)</label>
              <input
                className={s.input}
                value={modal.row.identifier}
                readOnly
                dir="ltr"
                style={{ opacity: 0.6 }}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="eb-note" className={s.label}>
                یادداشت
              </label>
              <input
                id="eb-note"
                name="note"
                className={s.input}
                defaultValue={modal.row.note ?? ''}
              />
            </div>

            {error && (
              <div className={s.errorMsg} role="alert">
                {error}
              </div>
            )}
            {saved && (
              <div className={s.successMsg} role="status">
                <Check size={14} aria-hidden /> بروزرسانی شد
              </div>
            )}

            <div className={s.formFooter}>
              <button type="submit" className={s.submitBtn} disabled={isPending}>
                {isPending ? <Loader2 size={14} className={s.spin} aria-hidden /> : null}
                ذخیره تغییرات
              </button>
              <button type="button" onClick={closeModal} className={s.cancelBtn}>
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────────── */}
      {modal.type === 'delete' && (
        <div className={s.modal} role="dialog" aria-modal aria-label="تأیید حذف">
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>حذف مخاطب</h2>
            <button type="button" onClick={closeModal} className={s.closeBtn} aria-label="بستن">
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className={s.deleteBody}>
            <div className={s.deleteIcon} aria-hidden>
              <Trash2 size={22} strokeWidth={1.5} />
            </div>
            <p className={s.deleteMsg}>
              آیا می‌خواهید{' '}
              <strong>{modal.row.name}</strong>{' '}
              را از لیست مخاطبان حذف کنید؟
            </p>
            {error && (
              <div className={s.errorMsg} role="alert">
                {error}
              </div>
            )}
          </div>
          <div className={s.formFooter}>
            <button
              type="button"
              className={s.dangerBtn}
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 size={14} className={s.spin} aria-hidden /> : <Trash2 size={14} aria-hidden />}
              حذف کن
            </button>
            <button type="button" onClick={closeModal} className={s.cancelBtn}>
              انصراف
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
