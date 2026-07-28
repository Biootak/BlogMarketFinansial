'use client';

import { type ExchangeStaffRow, addExchangeStaff, revokeExchangeStaff } from '@/actions/exchanges';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Trash2, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { type CSSProperties, useCallback, useState } from 'react';
import s from './StaffWorkspace.module.css';

const ROLE_FA: Record<string, string> = {
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
};

const ROLE_COLORS: Record<string, CSSProperties> = {
  OWNER: { background: 'oklch(93% 0.06 270)', color: 'oklch(40% 0.14 270)' },
  MANAGER: { background: 'oklch(93% 0.08 145)', color: 'oklch(38% 0.14 145)' },
  STAFF: { background: 'oklch(95% 0.04 220)', color: 'oklch(40% 0.1 220)' },
  VIEWER: { background: 'oklch(93% 0 0)', color: 'oklch(45% 0 0)' },
};

interface Props {
  exchangeId: string;
  initialStaff: ExchangeStaffRow[];
  currentUserId: string;
}

export default function StaffWorkspace({ exchangeId, initialStaff, currentUserId }: Props) {
  const [staff, setStaff] = useState(initialStaff);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'>('STAFF');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<ExchangeStaffRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!email.trim()) {
      setAddError('ایمیل الزامی است');
      return;
    }
    setAdding(true);
    setAddError('');
    const result = await addExchangeStaff(exchangeId, email.trim(), role);
    setAdding(false);
    if (result.success) {
      setStaff((prev) => [...prev, result.data]);
      setEmail('');
    } else {
      setAddError(result.error.message);
    }
  }, [email, role, exchangeId]);

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const result = await revokeExchangeStaff(revokeTarget.id, exchangeId);
    setRevoking(false);
    if (result.success) {
      setStaff((prev) => prev.filter((s) => s.id !== revokeTarget.id));
      setRevokeTarget(null);
    }
  }, [revokeTarget, exchangeId]);

  const inp: CSSProperties = {
    height: '2.4rem',
    padding: '0 0.75rem',
    fontSize: 'var(--ds-text-sm)',
    fontFamily: 'inherit',
    color: 'var(--at-fg)',
    background: 'var(--at-surface)',
    border: '1px solid var(--at-line)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 120ms ease',
  };

  return (
    <>
      {/* Add form */}
      <div className={s.addCard}>
        <div className={s.addCardHeader}>
          <UserPlus className="w-4 h-4" style={{ color: 'var(--at-accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-sm)' }}>افزودن کارمند</span>
        </div>
        <div className={s.addForm}>
          <div style={{ flex: 1 }}>
            <input
              style={{ ...inp, width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ایمیل کاربر در پلتفرم"
              type="email"
              dir="ltr"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            {addError && (
              <p style={{ fontSize: '12px', color: 'oklch(50% 0.15 25)', marginTop: '4px' }}>
                {addError}
              </p>
            )}
          </div>
          <select
            style={{ ...inp, width: '160px', cursor: 'pointer' }}
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            {Object.entries(ROLE_FA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={{
              height: '2.4rem',
              padding: '0 1.25rem',
              fontSize: 'var(--ds-text-sm)',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: 'var(--at-fg-inverse, #fff)',
              background: 'var(--at-accent)',
              border: 'none',
              borderRadius: '8px',
              cursor: adding ? 'wait' : 'pointer',
              opacity: adding ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? 'در حال افزودن…' : 'افزودن'}
          </button>
        </div>
      </div>

      {/* Staff list */}
      <div className={s.staffList}>
        {staff.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--at-fg-subtle)',
              fontSize: 'var(--ds-text-sm)',
            }}
          >
            هنوز کارمندی اضافه نشده است.
          </div>
        ) : (
          staff.map((member) => (
            <div key={member.id} className={s.staffRow}>
              <div className={s.staffAvatar}>
                {member.user.image ? (
                  <Image
                    src={member.user.image}
                    alt={member.user.name ?? ''}
                    width={36}
                    height={36}
                    style={{ objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--at-accent)' }}>
                    {(member.user.name ?? member.user.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={s.staffInfo}>
                <span className={s.staffName}>{member.user.name ?? member.user.email}</span>
                <span className={s.staffEmail}>{member.user.email}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginInlineStart: 'auto',
                }}
              >
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    ...(ROLE_COLORS[member.role] ?? {}),
                  }}
                >
                  {ROLE_FA[member.role] ?? member.role}
                </span>
                {member.userId !== currentUserId && (
                  <button
                    type="button"
                    className={s.revokeBtn}
                    title="حذف دسترسی"
                    onClick={() => setRevokeTarget(member)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="حذف دسترسی کارمند"
        description={`دسترسی «${revokeTarget?.user.name ?? revokeTarget?.user.email ?? ''}» به این صرافی لغو می‌شود.`}
        confirmLabel="بله، لغو کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleRevoke}
        loading={revoking}
      />
    </>
  );
}
