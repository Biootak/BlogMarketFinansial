'use client';

/**
 * SecuritySettings — تنظیمات امنیتی.
 * ─────────────────────────────────────────────────────────────
 *  شامل:
 *    1. session timeout
 *    2. IP allowlist (textarea — یک IP در هر خط)
 *    3. اجبار 2FA برای ادمین‌ها
 *    4. تأیید ایمیل برای IP جدید
 *    5. تعداد session همزمان
 *    6. نگهداری audit log (روز)
 *    7. وضعیت فعلی 2FA ادمین‌ها (read-only)
 *
 *  UX:
 *    - dirty state نمایش داده می‌شود
 *    - Sticky save bar در پایین
 *    - ولی چون StickySaveBar قبلاً در page.tsx هست، اینجا فقط فرم است
 */

import { useEffect, useState } from 'react';
import {
  get2faStatus,
  getSecuritySettings,
  updateSecuritySettings,
} from '@/actions/settingsActions';
import { useActionToast } from '@/hooks/useActionToast';
import s from './SecuritySettings.module.css';

interface FormState {
  sessionTimeoutMin: number;
  ipAllowlist: string;
  force2faForAdmins: boolean;
  requireEmailForNewIp: boolean;
  maxConcurrentSessions: number;
  auditRetentionDays: number;
}

const DEFAULT_FORM: FormState = {
  sessionTimeoutMin: 60,
  ipAllowlist: '',
  force2faForAdmins: true,
  requireEmailForNewIp: true,
  maxConcurrentSessions: 5,
  auditRetentionDays: 180,
};

export function SecuritySettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [original, setOriginal] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [twoFA, setTwoFA] = useState<{
    totalAdmins: number;
    adminsWith2fa: number;
    adminsWithout2fa: Array<{ id: string; name: string; email: string }>;
  } | null>(null);
  const toast = useActionToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sec, two] = await Promise.all([getSecuritySettings(), get2faStatus()]);
        if (!active) return;
        if (sec.success && sec.data) {
          setForm(sec.data);
          setOriginal(sec.data);
        }
        if (two.success && two.data) setTwoFA(two.data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // dirty detection
  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(original);
    onDirtyChange?.(dirty);
  }, [form, original, onDirtyChange]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    const res = await updateSecuritySettings(form);
    setSaving(false);
    if (res.success) {
      setOriginal(form);
      toast.success('تنظیمات امنیتی ذخیره شد');
    } else {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در ذخیره');
    }
  };

  if (loading) {
    return <div className={s.loading}>در حال بارگذاری…</div>;
  }

  const ipCount = form.ipAllowlist
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className={s.wrap}>
      <section className={s.section}>
        <header className={s.sectionHead}>
          <h3>نشست‌ها و احراز هویت</h3>
          <p>تنظیم رفتار session و سطح حفاظت حساب‌های ادمین</p>
        </header>

        <div className={s.grid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="sessionTimeoutMin">
              مدت نشست (دقیقه)
            </label>
            <input
              id="sessionTimeoutMin"
              type="number"
              min={5}
              max={10080}
              value={form.sessionTimeoutMin}
              onChange={(e) => update('sessionTimeoutMin', Number(e.target.value))}
              className={s.input}
            />
            <p className={s.hint}>بین ۵ دقیقه تا ۷ روز (۱۰۰۸۰ دقیقه)</p>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="maxConcurrentSessions">
              تعداد نشست همزمان
            </label>
            <input
              id="maxConcurrentSessions"
              type="number"
              min={1}
              max={20}
              value={form.maxConcurrentSessions}
              onChange={(e) => update('maxConcurrentSessions', Number(e.target.value))}
              className={s.input}
            />
            <p className={s.hint}>هر کاربر حداکثر چند دستگاه/مرورگر به‌طور همزمان</p>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="auditRetentionDays">
              نگهداری Audit Log (روز)
            </label>
            <input
              id="auditRetentionDays"
              type="number"
              min={30}
              max={3650}
              value={form.auditRetentionDays}
              onChange={(e) => update('auditRetentionDays', Number(e.target.value))}
              className={s.input}
            />
            <p className={s.hint}>لاگ‌های قدیمی‌تر به‌طور خودکار حذف می‌شوند</p>
          </div>
        </div>

        <div className={s.toggleRow}>
          <Toggle
            id="force2fa"
            label="اجبار ۲FA برای ادمین‌ها"
            description="ادمین‌ها بدون ۲FA نمی‌توانند وارد داشبورد شوند"
            checked={form.force2faForAdmins}
            onChange={(v) => update('force2faForAdmins', v)}
          />
          <Toggle
            id="requireEmail"
            label="تأیید ایمیل برای IP جدید"
            description="وقتی کاربر از IP جدید وارد می‌شود، ایمیل تأیید ارسال می‌شود"
            checked={form.requireEmailForNewIp}
            onChange={(v) => update('requireEmailForNewIp', v)}
          />
        </div>
      </section>

      <section className={s.section}>
        <header className={s.sectionHead}>
          <h3>IP Allowlist</h3>
          <p>فقط IP های مشخص‌شده می‌توانند وارد داشبورد شوند (هر خط یک IP یا CIDR)</p>
        </header>

        <textarea
          id="ipAllowlist"
          value={form.ipAllowlist}
          onChange={(e) => update('ipAllowlist', e.target.value)}
          className={s.textarea}
          rows={5}
          placeholder={'۱۹۲٫۱۶۸٫۱٫۱\n۱۰٫۰٫۰٫۰/۸\n۲۰۰۱:db8::/32'}
          dir="ltr"
          spellCheck={false}
        />
        <div className={s.textareaFoot}>
          <span className={s.metric}>
            <span className={s.metricLabel}>تعداد IP</span>
            <span className={s.metricVal}>{ipCount}</span>
          </span>
          {ipCount > 0 && (
            <button
              type="button"
              onClick={() => update('ipAllowlist', '')}
              className={s.linkBtn}
            >
              پاک کردن
            </button>
          )}
        </div>
      </section>

      {twoFA && (
        <section className={s.section}>
          <header className={s.sectionHead}>
            <h3>وضعیت ۲FA ادمین‌ها</h3>
            <p>از {twoFA.totalAdmins} ادمین، {twoFA.adminsWith2fa} مورد ۲FA فعال دارند</p>
          </header>
          {twoFA.adminsWithout2fa.length > 0 ? (
            <ul className={s.adminList}>
              {twoFA.adminsWithout2fa.map((a) => (
                <li key={a.id} className={s.adminItem}>
                  <span className={s.adminName}>{a.name}</span>
                  <span className={s.adminEmail} dir="ltr">
                    {a.email}
                  </span>
                  <span className={s.adminWarn}>۲FA غیرفعال</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.allOk}>همه ادمین‌ها ۲FA فعال دارند ✓</div>
          )}
        </section>
      )}

      <div className={s.actionRow}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || JSON.stringify(form) === JSON.stringify(original)}
          className={s.saveBtn}
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات امنیتی'}
        </button>
        <button
          type="button"
          onClick={() => setForm(original)}
          disabled={saving || JSON.stringify(form) === JSON.stringify(original)}
          className={s.resetBtn}
        >
          بازنشانی
        </button>
      </div>
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={s.toggle}>
      <div className={s.toggleInfo}>
        <label htmlFor={id} className={s.toggleLabel}>
          {label}
        </label>
        <p className={s.toggleDesc}>{description}</p>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={s.toggleSwitch}
        data-on={checked}
      >
        <span className={s.toggleKnob} />
      </button>
    </div>
  );
}
