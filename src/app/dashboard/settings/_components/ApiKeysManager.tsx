'use client';

/**
 * ApiKeysManager — مدیریت کلیدهای API.
 * ─────────────────────────────────────────────────────────────
 *  - لیست کلیدهای فعال
 *  - ساخت کلید جدید با scopes
 *  - لغو (revoke) کلید
 *  - نمایش کلید فقط یک‌بار در زمان ساخت (در modal)
 *  - copy-to-clipboard
 *
 *  امنیت:
 *  - کلید کامل فقط یک‌بار نمایش داده می‌شود
 *  - هَش کلید (sha256) در audit log ذخیره می‌شود
 *  - prefix برای شناسایی قابل نمایش است
 */

import {
  type ApiKeyRecord,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/actions/settingsActions';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useActionToast } from '@/hooks/useActionToast';
import { Check, Copy, KeyRound, Loader2, Plus, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './ApiKeysManager.module.css';

const SCOPES: Array<{
  value: 'read' | 'write' | 'admin' | 'webhook' | 'reports';
  label: string;
  hint: string;
}> = [
  { value: 'read', label: 'خواندن', hint: 'GET endpoints' },
  { value: 'write', label: 'نوشتن', hint: 'POST/PATCH/DELETE' },
  { value: 'admin', label: 'مدیریت', hint: 'کاربران و تنظیمات' },
  { value: 'webhook', label: 'وبهوک', hint: 'دریافت رویداد' },
  { value: 'reports', label: 'گزارش‌ها', hint: 'دانلود آمار' },
];

const EXPIRY_PRESETS: Array<{ value: number | null; label: string }> = [
  { value: 7, label: '۷ روز' },
  { value: 30, label: '۳۰ روز' },
  { value: 90, label: '۹۰ روز' },
  { value: 365, label: '۱ سال' },
  { value: null, label: 'بدون انقضا' },
];

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; key: string; prefix: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRecord | null>(null);
  const toast = useActionToast();

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await listApiKeys();
      if (!active) return;
      if (res.success && res.data) setKeys(res.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    const res = await listApiKeys();
    if (res.success && res.data) setKeys(res.data);
    setLoading(false);
  };

  const handleCreated = (data: {
    id: string;
    key: string;
    prefix: string;
    record: ApiKeyRecord;
  }) => {
    setNewKey({ id: data.id, key: data.key, prefix: data.prefix });
    setKeys((prev) => [data.record, ...prev]);
  };

  const handleRevoke = async (key: ApiKeyRecord) => {
    const res = await revokeApiKey({ id: key.id });
    if (res.success) {
      toast.success('کلید لغو شد');
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      setConfirmRevoke(null);
    } else {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در لغو');
    }
  };

  return (
    <div className={s.wrap}>
      <header className={s.header}>
        <div>
          <h3 className={s.title}>کلیدهای API</h3>
          <p className={s.subtitle}>
            از کلیدها برای دسترسی برنامه‌ای (server-to-server) استفاده کنید
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className={s.createBtn}>
          <Plus size={14} strokeWidth={2.2} />
          <span>ساخت کلید جدید</span>
        </button>
      </header>

      {loading ? (
        <div className={s.empty}>
          <Loader2 size={18} className={s.spin} />
          <span>در حال بارگذاری…</span>
        </div>
      ) : keys.length === 0 ? (
        <div className={s.empty}>
          <KeyRound size={28} strokeWidth={1.4} aria-hidden />
          <p>هنوز کلیدی ساخته نشده است</p>
          <p className={s.emptyHint}>با ساخت اولین کلید، یک secret یک‌بارمصرف دریافت می‌کنید</p>
        </div>
      ) : (
        <ul className={s.list}>
          {keys.map((key) => (
            <KeyRow key={key.id} record={key} onRevoke={() => setConfirmRevoke(key)} />
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateKeyDialog onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {newKey && <ShowNewKeyDialog newKey={newKey} onClose={() => setNewKey(null)} />}

      {confirmRevoke && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmRevoke(null)}
          title={`لغو کلید ${confirmRevoke.name}؟`}
          description="این عمل غیرقابل بازگشت است. هر سرویسی که از این کلید استفاده می‌کند بلافاصله قطع می‌شود."
          confirmLabel="لغو کلید"
          cancelLabel="انصراف"
          variant="danger"
          onConfirm={() => handleRevoke(confirmRevoke)}
        />
      )}

      <button type="button" onClick={refresh} className={s.refresh} disabled={loading}>
        به‌روزرسانی لیست
      </button>
    </div>
  );
}

function KeyRow({
  record,
  onRevoke,
}: {
  record: ApiKeyRecord;
  onRevoke: () => void;
}) {
  const isExpired = record.expiresAt !== null && new Date(record.expiresAt).getTime() < Date.now();
  return (
    <li className={s.row} data-expired={isExpired}>
      <div className={s.rowIcon} aria-hidden>
        <KeyRound size={14} strokeWidth={2} />
      </div>
      <div className={s.rowInfo}>
        <div className={s.rowName}>{record.name}</div>
        <div className={s.rowMeta}>
          <code className={s.rowPrefix} dir="ltr">
            {record.prefix}…
          </code>
          <span className={s.rowScopes}>
            {record.scopes.map((sc) => (
              <span key={sc} className={s.scope}>
                {sc}
              </span>
            ))}
          </span>
        </div>
        <div className={s.rowSub}>
          <span>ساخته‌شده {new Date(record.createdAt).toLocaleDateString('fa-IR')}</span>
          {record.expiresAt && (
            <span>
              {isExpired ? 'منقضی‌شده' : 'انقضا'}:{' '}
              {new Date(record.expiresAt).toLocaleDateString('fa-IR')}
            </span>
          )}
        </div>
      </div>
      <button type="button" onClick={onRevoke} className={s.revokeBtn} aria-label="لغو کلید">
        <ShieldOff size={13} strokeWidth={2.2} />
        <span>لغو</span>
      </button>
    </li>
  );
}

function CreateKeyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (data: { id: string; key: string; prefix: string; record: ApiKeyRecord }) => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<'read' | 'write' | 'admin' | 'webhook' | 'reports'>>(
    new Set(['read']),
  );
  const [expiry, setExpiry] = useState<number | null>(90);
  const [creating, setCreating] = useState(false);
  const toast = useActionToast();

  const toggleScope = (sc: 'read' | 'write' | 'admin' | 'webhook' | 'reports') => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(sc)) next.delete(sc);
      else next.add(sc);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('نام کلید را وارد کنید');
      return;
    }
    if (scopes.size === 0) {
      toast.error('حداقل یک سطح دسترسی انتخاب کنید');
      return;
    }
    setCreating(true);
    const res = await createApiKey({
      name: name.trim(),
      scopes: Array.from(scopes),
      expiresInDays: expiry,
    });
    setCreating(false);
    if (res.success && res.data) {
      onCreated(res.data);
      onClose();
    } else if (!res.success) {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در ساخت');
    }
  };

  return (
    <div className={s.dialogBackdrop} onClick={onClose}>
      <div className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={s.dialogHead}>
          <h4>ساخت کلید API جدید</h4>
          <p>کلید فقط یک‌بار نمایش داده می‌شود — بلافاصله کپی کنید.</p>
        </header>
        <div className={s.dialogBody}>
          <div className={s.formField}>
            <label htmlFor="keyName">نام</label>
            <input
              id="keyName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: سرور احراز هویت"
              maxLength={50}
              className={s.formInput}
            />
          </div>
          <div className={s.formField}>
            <label>سطح دسترسی</label>
            <div className={s.scopes}>
              {SCOPES.map((sc) => (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() => toggleScope(sc.value)}
                  className={s.scopeBtn}
                  data-on={scopes.has(sc.value)}
                >
                  <span className={s.scopeLabel}>{sc.label}</span>
                  <span className={s.scopeHint}>{sc.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={s.formField}>
            <label>انقضا</label>
            <div className={s.expiry}>
              {EXPIRY_PRESETS.map((p) => (
                <button
                  key={String(p.value)}
                  type="button"
                  onClick={() => setExpiry(p.value)}
                  className={s.expiryBtn}
                  data-on={expiry === p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <footer className={s.dialogFoot}>
          <button type="button" onClick={onClose} className={s.cancelBtn}>
            انصراف
          </button>
          <button type="button" onClick={submit} disabled={creating} className={s.confirmBtn}>
            {creating ? 'در حال ساخت…' : 'ساخت کلید'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ShowNewKeyDialog({
  newKey,
  onClose,
}: {
  newKey: { id: string; key: string; prefix: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={s.dialogBackdrop}>
      <div className={s.dialog} role="alertdialog" aria-live="assertive">
        <header className={s.dialogHead}>
          <h4>کلید شما ساخته شد</h4>
          <p className={s.alertText}>
            <strong>این کلید فقط یک‌بار نمایش داده می‌شود.</strong> لطفاً آن را در مکانی امن ذخیره
            کنید.
          </p>
        </header>
        <div className={s.dialogBody}>
          <div className={s.keyReveal}>
            <code className={s.keyText} dir="ltr">
              {newKey.key}
            </code>
            <button type="button" onClick={onCopy} className={s.copyBtn} aria-label="کپی کلید">
              {copied ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2} />}
            </button>
          </div>
        </div>
        <footer className={s.dialogFoot}>
          <button type="button" onClick={onClose} className={s.confirmBtn}>
            متوجه شدم، کلید را ذخیره کردم
          </button>
        </footer>
      </div>
    </div>
  );
}
