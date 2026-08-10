'use client';

/**
 * BackupManager — تنظیمات backup و لیست backup ها.
 * ─────────────────────────────────────────────────────────────
 *  1. فرم تنظیمات (interval, retention, include options, notify)
 *  2. لیست backup های موجود با delete action
 *  3. دکمه backup دستی
 *  4. نمایش اندازه، تعداد rows، و زمان
 *
 *  نکته امنیتی: filename هرگز از سمت client نمی‌آید — server تصمیم می‌گیرد.
 */

import {
  deleteBackup,
  getBackupStatus,
  triggerBackup,
  updateBackupSettings,
} from '@/actions/settingsActions';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useActionToast } from '@/hooks/useActionToast';
import type { BackupConfig, BackupFileInfo } from '@/lib/backup';
import {
  Archive,
  Clock,
  Cloud,
  Database,
  Download,
  Loader2,
  Play,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './BackupManager.module.css';

const DEFAULT_CFG: BackupConfig = {
  enabled: true,
  intervalHours: 24,
  retentionCount: 7,
  includeAuditLog: true,
  includeSocialLinks: true,
  includeSystemSettings: true,
  notifyOnSuccess: false,
  notifyOnFailure: true,
  notifyEmail: null,
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatRelative = (iso: string): string => {
  try {
    const d = new Date(iso);
    const diff = d.getTime() - Date.now();
    const abs = Math.abs(diff);
    const m = Math.round(abs / 60_000);
    const h = Math.round(abs / 3_600_000);
    const day = Math.round(abs / 86_400_000);
    const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
    if (m < 60) return rtf.format(Math.sign(diff) * m, 'minute');
    if (h < 24) return rtf.format(Math.sign(diff) * h, 'hour');
    return rtf.format(Math.sign(diff) * day, 'day');
  } catch {
    return '—';
  }
};

/** هاست endpoint — بدون پروتکل برای نمایش فشرده (همان منطق LiveOps). */
const endpointHost = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};

interface StorageStatusInfo {
  configured: boolean;
  provider: 's3-compatible' | 's3-compatible-r2' | 's3-compatible-pool' | 'none';
  bucket: string;
  buckets: number;
  /** جزئیات هر باکت پول S3 — bucket name + endpoint. */
  poolBuckets: Array<{ bucket: string; endpoint: string }>;
  publicUrl: string;
  circuitBreakerActive: boolean;
}

export function BackupManager() {
  const [config, setConfig] = useState<BackupConfig>(DEFAULT_CFG);
  const [original, setOriginal] = useState<BackupConfig>(DEFAULT_CFG);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BackupFileInfo | null>(null);
  const [reason, setReason] = useState('');
  const toast = useActionToast();

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getBackupStatus();
      if (!active) return;
      if (res.success && res.data) {
        setConfig(res.data.config);
        setOriginal(res.data.config);
        setBackups(res.data.backups);
        setLastAt(res.data.lastBackupAt);
        setNextAt(res.data.nextScheduledAt);
        setStorage(res.data.storage ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    const res = await getBackupStatus();
    if (res.success && res.data) {
      setConfig(res.data.config);
      setBackups(res.data.backups);
      setLastAt(res.data.lastBackupAt);
      setNextAt(res.data.nextScheduledAt);
      setStorage(res.data.storage ?? null);
    }
  };

  const update = <K extends keyof BackupConfig>(key: K, value: BackupConfig[K]) => {
    setConfig((prev: BackupConfig) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    const res = await updateBackupSettings(config);
    setSaving(false);
    if (res.success) {
      setOriginal(config);
      toast.success('تنظیمات backup ذخیره شد');
    } else {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در ذخیره');
    }
  };

  const onTrigger = async () => {
    setTriggering(true);
    const res = await triggerBackup({ reason: reason.trim() || 'manual' });
    setTriggering(false);
    if (res.success) {
      toast.success('backup ایجاد شد');
      setReason('');
      await refresh();
    } else {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در backup');
    }
  };

  const onDelete = async (b: BackupFileInfo) => {
    const res = await deleteBackup(b.filename);
    if (res.success) {
      toast.success('backup حذف شد');
      setBackups((prev) => prev.filter((x) => x.filename !== b.filename));
      setConfirmDelete(null);
    } else {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در حذف');
    }
  };

  if (loading) {
    return (
      <div className={s.empty}>
        <Loader2 size={18} className={s.spin} />
        <span>در حال بارگذاری…</span>
      </div>
    );
  }

  const dirty = JSON.stringify(config) !== JSON.stringify(original);

  return (
    <div className={s.wrap}>
      {/* Status bar */}
      <section className={s.statusBar}>
        <div className={s.statusItem}>
          <div className={s.statusIcon} data-on={config.enabled}>
            <ShieldAlert size={14} strokeWidth={2} />
          </div>
          <div>
            <div className={s.statusLabel}>backup خودکار</div>
            <div className={s.statusVal}>{config.enabled ? 'فعال' : 'غیرفعال'}</div>
          </div>
        </div>
        <div className={s.statusItem}>
          <div className={s.statusIcon}>
            <Clock size={14} strokeWidth={2} />
          </div>
          <div>
            <div className={s.statusLabel}>آخرین</div>
            <div className={s.statusVal}>{lastAt ? formatRelative(lastAt) : '—'}</div>
          </div>
        </div>
        <div className={s.statusItem}>
          <div className={s.statusIcon}>
            <Database size={14} strokeWidth={2} />
          </div>
          <div>
            <div className={s.statusLabel}>بعدی</div>
            <div className={s.statusVal}>
              {config.enabled && nextAt ? formatRelative(nextAt) : '—'}
            </div>
          </div>
        </div>
        <div className={s.statusItem}>
          <div className={s.statusIcon}>
            <Archive size={14} strokeWidth={2} />
          </div>
          <div>
            <div className={s.statusLabel}>نگهداری</div>
            <div className={s.statusVal}>{backups.length} نسخه</div>
          </div>
        </div>
        <div
          className={
            storage?.configured && (storage.poolBuckets?.length ?? 0) > 0
              ? `${s.statusItem} ${s.cloudTile}`
              : s.statusItem
          }
          title={
            storage
              ? storage.configured
                ? `باکت: ${storage.bucket}`
                : 'S3_* تنظیم نشده — backup روی دیسک لوکال می‌ماند'
              : undefined
          }
        >
          <div className={s.cloudHead}>
            <div
              className={s.statusIcon}
              data-on={storage?.configured ?? false}
              data-breaker={storage?.circuitBreakerActive ? 'on' : undefined}
            >
              <Cloud size={14} strokeWidth={2} />
            </div>
            <div>
              <div className={s.statusLabel}>آینه ابری</div>
              <div className={s.statusVal}>
                {!storage
                  ? '—'
                  : storage.configured
                    ? storage.circuitBreakerActive
                      ? 'قطع موقت'
                      : storage.provider === 's3-compatible-r2'
                        ? 'R2 فعال'
                        : storage.buckets && storage.buckets > 1
                          ? `${storage.buckets} باکت فعال`
                          : 'S3 فعال'
                    : 'تنظیم نشده'}
              </div>
            </div>
          </div>

          {storage?.configured && (storage.poolBuckets?.length ?? 0) > 0 && (
            <div className={s.poolDetails}>
              {storage.poolBuckets.length > 1 && (
                <div className={s.poolListHead}>باکت‌های پول S3</div>
              )}
              <ul className={s.poolList}>
                {storage.poolBuckets.map((b, i) => (
                  <li key={`${b.bucket}-${i}`} className={s.poolRow}>
                    <span className={s.poolBucket}>{b.bucket}</span>
                    <span className={s.poolEndpoint} dir="ltr">
                      {endpointHost(b.endpoint)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={s.breakerRow}>
                <span
                  className={s.breakerDot}
                  data-on={!storage.circuitBreakerActive}
                  aria-hidden
                />
                <span>
                  {storage.circuitBreakerActive
                    ? 'قطع موقت — circuit breaker فعال است؛ تا ۶۰ ثانیه همهٔ باکت‌ها نادیده گرفته می‌شوند'
                    : 'اتصال S3 فعال'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Settings */}
      <section className={s.section}>
        <h3 className={s.sectionTitle}>تنظیمات</h3>
        <div className={s.grid}>
          <FieldToggle
            id="bEnabled"
            label="backup خودکار"
            description="طبق بازه زمانی زیر backup گرفته می‌شود"
            checked={config.enabled}
            onChange={(v) => update('enabled', v)}
          />

          <div className={s.field}>
            <label htmlFor="intervalHours">بازه (ساعت)</label>
            <input
              id="intervalHours"
              type="number"
              min={1}
              max={168}
              value={config.intervalHours}
              onChange={(e) => update('intervalHours', Number(e.target.value))}
              className={s.input}
              disabled={!config.enabled}
            />
            <p className={s.hint}>هر چند ساعت یک‌بار (۱ تا ۱۶۸ ساعت)</p>
          </div>

          <div className={s.field}>
            <label htmlFor="retentionCount">تعداد نگهداری</label>
            <input
              id="retentionCount"
              type="number"
              min={1}
              max={100}
              value={config.retentionCount}
              onChange={(e) => update('retentionCount', Number(e.target.value))}
              className={s.input}
            />
            <p className={s.hint}>backup های قدیمی‌تر خودکار حذف می‌شوند (۱ تا ۱۰۰)</p>
          </div>

          <div className={s.field}>
            <label htmlFor="notifyEmail">ایمیل اعلان (اختیاری)</label>
            <input
              id="notifyEmail"
              type="email"
              dir="ltr"
              value={config.notifyEmail ?? ''}
              onChange={(e) => update('notifyEmail', e.target.value || null)}
              placeholder="ops@example.com"
              className={s.input}
            />
            <p className={s.hint}>برای اعلان موفق/ناموفق بودن backup</p>
          </div>
        </div>

        <div className={s.subSection}>
          <h4 className={s.subTitle}>شامل</h4>
          <div className={s.checkRow}>
            <CheckField
              id="incSystem"
              label="System Settings"
              checked={config.includeSystemSettings}
              onChange={(v) => update('includeSystemSettings', v)}
            />
            <CheckField
              id="incSocial"
              label="Social Links"
              checked={config.includeSocialLinks}
              onChange={(v) => update('includeSocialLinks', v)}
            />
            <CheckField
              id="incAudit"
              label="Audit Log (آخرین ۱۰۰۰ رکورد)"
              checked={config.includeAuditLog}
              onChange={(v) => update('includeAuditLog', v)}
            />
          </div>
        </div>

        <div className={s.subSection}>
          <h4 className={s.subTitle}>اعلان</h4>
          <div className={s.checkRow}>
            <CheckField
              id="notifyOk"
              label="موفقیت"
              checked={config.notifyOnSuccess}
              onChange={(v) => update('notifyOnSuccess', v)}
            />
            <CheckField
              id="notifyFail"
              label="خطا"
              checked={config.notifyOnFailure}
              onChange={(v) => update('notifyOnFailure', v)}
            />
          </div>
        </div>

        <div className={s.actionRow}>
          <button type="button" onClick={onSave} disabled={saving || !dirty} className={s.saveBtn}>
            {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
          </button>
          <button
            type="button"
            onClick={() => setConfig(original)}
            disabled={saving || !dirty}
            className={s.resetBtn}
          >
            بازنشانی
          </button>
        </div>
      </section>

      {/* Manual trigger */}
      <section className={s.section}>
        <h3 className={s.sectionTitle}>backup دستی</h3>
        <p className={s.sectionDesc}>
          در هر زمان می‌توانید یک backup فوری ایجاد کنید. فایل در مسیر{' '}
          <code className={s.path}>/backups</code> ذخیره می‌شود و{' '}
          {storage?.configured
            ? 'روی ذخیره‌سازی ابری نیز آینه می‌شود.'
            : 'در صورت تنظیم ذخیره‌سازی ابری (S3_*) روی آن هم آینه می‌شود.'}
        </p>
        <div className={s.triggerRow}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل (مثلاً: قبل از به‌روزرسانی)"
            className={s.triggerInput}
            maxLength={200}
          />
          <button type="button" onClick={onTrigger} disabled={triggering} className={s.triggerBtn}>
            {triggering ? (
              <Loader2 size={14} className={s.spin} />
            ) : (
              <Play size={14} strokeWidth={2.2} />
            )}
            <span>{triggering ? 'در حال ساخت…' : 'ایجاد backup'}</span>
          </button>
        </div>
      </section>

      {/* Backup list */}
      <section className={s.section}>
        <header className={s.listHead}>
          <h3 className={s.sectionTitle}>backup های موجود</h3>
          <button type="button" onClick={refresh} className={s.refreshBtn}>
            به‌روزرسانی
          </button>
        </header>
        {backups.length === 0 ? (
          <div className={s.emptyList}>هنوز backup ای ایجاد نشده است.</div>
        ) : (
          <ul className={s.list}>
            {backups.map((b) => (
              <li key={b.filename} className={s.row}>
                <div className={s.rowIcon} aria-hidden>
                  <Archive size={14} strokeWidth={2} />
                </div>
                <div className={s.rowInfo}>
                  <div className={s.rowFile} dir="ltr">
                    {b.filename}
                  </div>
                  <div className={s.rowMeta}>
                    <span>{formatSize(b.sizeBytes)}</span>
                    <span>•</span>
                    <span>{b.totalRows.toLocaleString('fa-IR')} ردیف</span>
                    <span>•</span>
                    <span>{b.sections.length} بخش</span>
                    <span>•</span>
                    <span title={b.createdAt}>{formatRelative(b.createdAt)}</span>
                  </div>
                </div>
                <a
                  href={`/api/backup/download?filename=${encodeURIComponent(b.filename)}`}
                  download={b.filename}
                  className={s.downloadBtn}
                  aria-label="دانلود backup"
                  title="دانلود"
                >
                  <Download size={13} strokeWidth={2.2} />
                </a>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(b)}
                  className={s.deleteBtn}
                  aria-label="حذف backup"
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDelete(null)}
          title={`حذف ${confirmDelete.filename}؟`}
          description="این عمل غیرقابل بازگشت است."
          confirmLabel="حذف"
          cancelLabel="انصراف"
          variant="danger"
          onConfirm={() => onDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function FieldToggle({
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
    <div className={s.field}>
      <div className={s.toggleLabel}>
        <span>{label}</span>
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
      <p className={s.hint}>{description}</p>
    </div>
  );
}

function CheckField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={s.checkLabel} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={s.checkBox}
      />
      <span className={s.checkBoxView} data-on={checked} aria-hidden>
        {checked && (
          <svg
            viewBox="0 0 16 16"
            width="11"
            height="11"
            strokeWidth="2.5"
            stroke="currentColor"
            fill="none"
          >
            <polyline points="3,8 7,12 13,4" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </label>
  );
}
