'use client';

/**
 * StaffAddPanel — فرم افزودن عضو جدید به صرافی.
 *
 * شامل: ورودی ایمیل، انتخاب نقش، دکمه submit. خطا inline.
 * کنترل optimistic: پس از موفقیت، فرم reset می‌شود.
 */

import { Send, UserPlus } from 'lucide-react';
import { type ChangeEvent, useCallback, useState } from 'react';
import {
  addExchangeStaff,
  type ExchangeStaffRow,
} from '@/actions/exchanges';
import s from './StaffCockpit.module.css';

const ROLES: ReadonlyArray<{ value: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'; label: string }> = [
  { value: 'OWNER', label: 'مالک — دسترسی کامل' },
  { value: 'MANAGER', label: 'مدیر — بدون تنظیمات صرافی' },
  { value: 'STAFF', label: 'کارمند — ثبت تراکنش و ویرایش مشتری' },
  { value: 'VIEWER', label: 'مشاهده‌گر — فقط خواندن' },
];

interface Props {
  exchangeId: string;
  onAdded: (member: ExchangeStaffRow) => void;
}

export function StaffAddPanel({ exchangeId, onAdded }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'>('STAFF');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = useCallback(async () => {
    if (!email.trim()) {
      setError('ایمیل الزامی است');
      return;
    }
    setAdding(true);
    setError('');
    const result = await addExchangeStaff(exchangeId, email.trim(), role);
    setAdding(false);
    if (result.success) {
      onAdded(result.data);
      setEmail('');
      setRole('STAFF');
    } else {
      setError(result.error.message);
    }
  }, [email, role, exchangeId, onAdded]);

  return (
    <div className={s.addCard}>
      <div className={s.addCardHead}>
        <h3 className={s.addCardTitle}>
          <UserPlus size={15} aria-hidden style={{ color: 'var(--at-accent)' }} />
          افزودن عضو جدید
        </h3>
        <span className={s.addCardHint}>
          کاربر باید از قبل در پلتفرم ثبت‌نام کرده باشد
        </span>
      </div>

      <div className={s.addForm}>
        <div className={s.field}>
          <label className={s.fieldLabel} htmlFor="staff-email">
            ایمیل کاربر
          </label>
          <input
            id="staff-email"
            type="email"
            className={s.input}
            placeholder="name@example.com"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
            disabled={adding}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel} htmlFor="staff-role">
            نقش
          </label>
          <select
            id="staff-role"
            className={s.select}
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            disabled={adding}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={s.submit}
          onClick={() => void handleAdd()}
          disabled={adding}
          aria-busy={adding || undefined}
        >
          {adding ? (
            <>
              <span className={s.spinner} aria-hidden />
              در حال افزودن…
            </>
          ) : (
            <>
              <span className={s.submitIcon}>
                <Send size={14} strokeWidth={2} />
              </span>
              افزودن به تیم
            </>
          )}
        </button>
      </div>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
