'use client';

/**
 * DeveloperPortalClient — «کنسول توسعه» ۲۰۲۶
 * ----------------------------------------------------------------------------
 *   §1. Recently-Created Banner: بعد از ساخت کلید، banner بالای صفحه با secret + auto-hide 30s
 *   §2. API Keys:    ساخت/حذف/تغییر وضعیت، scopes، نمایش key+secret، کپی با toast
 *   §3. Webhooks:    ساخت/تغییر وضعیت/حذف endpoint با انتخاب چند رویداد
 *   §4. Audit Log:   نمایش ۲۰ رویداد اخیر (CREATE/VIEW/DELETE/TOGGLE) با IP/UA
 *   §5. Documentation: ۴ کارت مستندسازی سریع
 *
 * Design DNA (هم‌خوان با customer-ui):
 *  - Token-only (var(--ds-*), var(--nova-*)) — no hex, no rgb
 *  - RTL-first · logical properties
 *  - Bento asymmetric
 *  - Animation با `cubic-bezier(0.2, 0.7, 0.2, 1)` — fast-in slow-out
 *  - a11y: aria-label, focus management, ESC closes dialog
 *
 * 2026-07-29 v2: scopes, 30s secret timeout, audit log, banner، rate-limit error UX
 */

import {
  type ApiKeyActionResult,
  API_SCOPES,
  createApiKey,
  createWebhook,
  deleteApiKey,
  deleteWebhook,
  getMyApiKeyAudits,
  toggleApiKey,
  toggleWebhook,
} from '@/actions/developer-portal';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  Clock,
  Code2,
  Copy,
  Eye,
  History,
  Key,
  Loader2,
  Plus,
  Power,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Trash2,
  Webhook,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import s from './DeveloperPortalClient.module.css';

// ─── Types ──────────────────────────────────────────────────────────────── //

type ApiKey = {
  id: string;
  name: string;
  key: string;
  secret: string;
  isActive: boolean;
  lastUsed: string | null;
  lastIp: string | null;
  expiresAt: string | null;
  scopes: string[];
  createdAt: string;
};

type Webhook = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
};

type WebhookEventOpt = { value: string; label: string };

type AuditRow = {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  ApiKey: { name: string } | null;
};

interface Props {
  initialKeys: ApiKey[];
  initialWebhooks: Webhook[];
  initialAudits: AuditRow[];
  webhookEvents: WebhookEventOpt[];
}

// ─── Constants ──────────────────────────────────────────────────────────── //

const SECRET_REVEAL_TIMEOUT = 30; // seconds

// ─── helpers ────────────────────────────────────────────────────────────── //

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

function maskKey(secret: string): string {
  if (secret.length <= 12) return secret;
  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'لحظاتی پیش';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} روز پیش`;
  return fmtDate(iso);
}

const AUDIT_LABEL: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'ساخت', color: 'success' },
  VIEW: { label: 'مشاهده', color: 'neutral' },
  DELETE: { label: 'حذف', color: 'danger' },
  TOGGLE: { label: 'تغییر وضعیت', color: 'warning' },
  USED: { label: 'استفاده', color: 'cyan' },
};

// ─── Main component ─────────────────────────────────────────────────────── //

export default function DeveloperPortalClient({
  initialKeys,
  initialWebhooks,
  initialAudits,
  webhookEvents,
}: Props) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [audits, setAudits] = useState<AuditRow[]>(initialAudits);

  // ── Secret reveal state — auto-hide after 30s ──
  const [revealedSecret, setRevealedSecret] = useState<Record<string, { value: string; expiresAt: number }>>({});

  // ── Newly created key banner (shows secret + auto-hide 30s) ──
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [bannerCountdown, setBannerCountdown] = useState(SECRET_REVEAL_TIMEOUT);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingWh, setPendingWh] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const activeKeys = useMemo(() => keys.filter((k) => k.isActive), [keys]);
  const activeWebhooks = useMemo(() => webhooks.filter((w) => w.isActive), [webhooks]);

  // ── Banner countdown ──
  useEffect(() => {
    if (!newKey) {
      setBannerCountdown(SECRET_REVEAL_TIMEOUT);
      if (bannerTimer.current) {
        clearInterval(bannerTimer.current);
        bannerTimer.current = null;
      }
      return;
    }
    setBannerCountdown(SECRET_REVEAL_TIMEOUT);
    bannerTimer.current = setInterval(() => {
      setBannerCountdown((c) => {
        if (c <= 1) {
          if (bannerTimer.current) clearInterval(bannerTimer.current);
          setNewKey(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (bannerTimer.current) clearInterval(bannerTimer.current);
    };
  }, [newKey]);

  // ── Secret reveal timeout cleanup ──
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRevealedSecret((prev) => {
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.expiresAt > now) next[k] = v;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteKey = useCallback(
    (id: string, name: string) => {
      if (!window.confirm(`کلید «${name}» حذف شود؟ این عملیات برگشت‌ناپذیر است.`)) return;
      setPendingKey(id);
      startTransition(async () => {
        const res: ApiKeyActionResult = await deleteApiKey(id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        } else {
          setKeys((prev) => prev.filter((k) => k.id !== id));
          toast({ title: 'کلید حذف شد', variant: 'success' });
          refreshAudits();
        }
        setPendingKey(null);
      });
    },
    [toast],
  );

  const handleToggleKey = useCallback(
    (id: string) => {
      setPendingKey(id);
      startTransition(async () => {
        const res = await toggleApiKey(id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        } else {
          setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k)));
          refreshAudits();
        }
        setPendingKey(null);
      });
    },
    [toast],
  );

  const handleDeleteWebhook = useCallback(
    (id: string) => {
      if (!window.confirm('این وب‌هوک حذف شود؟')) return;
      setPendingWh(id);
      startTransition(async () => {
        const res = await deleteWebhook(id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        } else {
          setWebhooks((prev) => prev.filter((w) => w.id !== id));
          toast({ title: 'وب‌هوک حذف شد', variant: 'success' });
        }
        setPendingWh(null);
      });
    },
    [toast],
  );

  const handleToggleWebhook = useCallback(
    (id: string) => {
      setPendingWh(id);
      startTransition(async () => {
        const res = await toggleWebhook(id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        } else {
          setWebhooks((prev) =>
            prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)),
          );
        }
        setPendingWh(null);
      });
    },
    [toast],
  );

  const refreshAudits = useCallback(async () => {
    const fresh = await getMyApiKeyAudits(20);
    setAudits(fresh as AuditRow[]);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: `${label} کپی شد`, variant: 'success' });
      } catch {
        toast({ title: 'کپی ناموفق', description: 'دسترسی به کلیپ‌بورد مسدود است', variant: 'destructive' });
      }
    },
    [toast],
  );

  const revealSecret = useCallback((id: string, secret: string) => {
    setRevealedSecret((prev) => ({
      ...prev,
      [id]: { value: secret, expiresAt: Date.now() + SECRET_REVEAL_TIMEOUT * 1000 },
    }));
    toast({
      title: `سکرت ${SECRET_REVEAL_TIMEOUT} ثانیه نمایش داده می‌شود`,
      description: 'پس از پایان زمان، خودکار پنهان می‌شود',
    });
  }, [toast]);

  return (
    <div className={s.root} dir="rtl">
      {/* ═══ §0. New-Key Banner (30s auto-hide) ═══════════════════════ */}
      {newKey && (
        <aside className={s.newKeyBanner} role="alert" aria-live="polite">
          <div className={s.newKeyBannerHead}>
            <span className={s.newKeyBannerIcon} aria-hidden>
              <Sparkles size={14} />
            </span>
            <div>
              <h3 className={s.newKeyBannerTitle}>کلید API ساخته شد</h3>
              <p className={s.newKeyBannerSub}>
                سکرت فقط {SECRET_REVEAL_TIMEOUT} ثانیه نمایش داده می‌شود. کپی کنید و در جای امن ذخیره کنید.
              </p>
            </div>
            <span className={s.newKeyBannerCountdown} aria-live="off">
              <Timer size={11} aria-hidden />
              {faNum(bannerCountdown)}s
            </span>
          </div>
          <div className={s.newKeyBannerKv}>
            <span className={s.keyKvLabel}>نام</span>
            <span className={s.newKeyBannerName}>{newKey.name}</span>
          </div>
          <div className={s.newKeyBannerKv}>
            <span className={s.keyKvLabel}>کلید عمومی</span>
            <div className={s.keyValueRow}>
              <code className={s.keyValue} dir="ltr">
                {newKey.key}
              </code>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => copyToClipboard(newKey.key, 'کلید عمومی')}
                aria-label="کپی کلید عمومی"
              >
                <Clipboard size={11} />
              </button>
            </div>
          </div>
          <div className={s.newKeyBannerKv}>
            <span className={s.keyKvLabel}>سکرت (فقط اکنون)</span>
            <div className={s.keyValueRow} data-sensitive>
              <code className={s.keyValue} dir="ltr">
                {newKey.secret}
              </code>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => copyToClipboard(newKey.secret, 'سکرت')}
                aria-label="کپی سکرت"
              >
                <Copy size={11} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ═══ §1. API Keys ═════════════════════════════════════════════ */}
      <section className={s.section} aria-labelledby="api-keys-title">
        <div className={s.sectionHead}>
          <div className={s.sectionHeadMain}>
            <span className={s.sectionIcon} aria-hidden>
              <Key size={14} />
            </span>
            <div>
              <h2 id="api-keys-title" className={s.sectionTitle}>
                کلیدهای API
              </h2>
              <p className={s.sectionSub}>
                برای اتصال سیستمی، یک کلید با نام و scopeهای دلخواه بسازید. سکرت فقط یک‌بار نمایش داده می‌شود.
              </p>
            </div>
          </div>
          <CreateKeyDialog
            onCreated={(res) => {
              if (res.success && res.data) {
                const data = res.data as ApiKey;
                setKeys((prev) => [data, ...prev]);
                setNewKey(data);
                toast({ title: 'کلید ساخته شد', description: 'سکرت در بالای صفحه ۳۰ ثانیه نمایش داده می‌شود.', variant: 'success' });
                refreshAudits();
              } else if (!res.success) {
                toast({ title: 'خطا', description: res.error, variant: 'destructive' });
              }
            }}
          />
        </div>

        {keys.length === 0 ? (
          <EmptyHint
            icon={Key}
            title="کلید API ندارید"
            description="برای شروع اتصال سیستمی، یک کلید بسازید"
          />
        ) : (
          <div className={s.keyGrid}>
            {keys.map((k) => {
              const revealed = revealedSecret[k.id];
              const isExpiringSoon =
                k.expiresAt && new Date(k.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
              return (
                <article key={k.id} className={s.keyCard} data-active={k.isActive}>
                  <header className={s.keyHead}>
                    <span className={s.keyName}>{k.name}</span>
                    <span className={s.keyStatus} data-on={k.isActive}>
                      {k.isActive ? (
                        <>
                          <CheckCircle2 size={10} /> فعال
                        </>
                      ) : (
                        <>
                          <Power size={10} /> غیرفعال
                        </>
                      )}
                    </span>
                  </header>

                  {k.scopes.length > 0 && (
                    <div className={s.keyScopes}>
                      {k.scopes.map((sc) => {
                        const opt = API_SCOPES.find((o) => o.value === sc);
                        return (
                          <span key={sc} className={s.scopeChip} data-cat={opt?.category}>
                            {opt?.label ?? sc}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className={s.keyKv}>
                    <span className={s.keyKvLabel}>کلید عمومی</span>
                    <div className={s.keyValueRow}>
                      <code className={s.keyValue} dir="ltr">
                        {maskKey(k.key)}
                      </code>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() => copyToClipboard(k.key, 'کلید عمومی')}
                        aria-label="کپی کلید عمومی"
                      >
                        <Clipboard size={11} />
                      </button>
                    </div>
                  </div>

                  <div className={s.keyKv}>
                    <span className={s.keyKvLabel}>سکرت</span>
                    <div className={s.keyValueRow} data-sensitive>
                      <code className={s.keyValue} dir="ltr">
                        {revealed ? revealed.value : '••••••••••••••••••••'}
                      </code>
                      {revealed ? (
                        <>
                          <button
                            type="button"
                            className={s.iconBtn}
                            onClick={() => copyToClipboard(revealed.value, 'سکرت')}
                            aria-label="کپی سکرت"
                          >
                            <Copy size={11} />
                          </button>
                          <span className={s.timerChip} aria-live="polite">
                            <Timer size={9} /> {Math.max(0, Math.ceil((revealed.expiresAt - Date.now()) / 1000))}s
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={s.iconBtn}
                          onClick={() => revealSecret(k.id, k.secret)}
                          aria-label="نمایش سکرت"
                        >
                          <Eye size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpiringSoon && (
                    <div className={s.expireWarning}>
                      <AlertTriangle size={10} aria-hidden />
                      انقضا: {fmtDate(k.expiresAt)}
                    </div>
                  )}

                  <footer className={s.keyFoot}>
                    <span className={s.keyMeta}>
                      <span>ایجاد: {fmtDate(k.createdAt)}</span>
                      {k.lastUsed && <span>آخرین استفاده: {relativeTime(k.lastUsed)}</span>}
                      {k.lastIp && <span className={s.ipChip} dir="ltr">IP: {k.lastIp}</span>}
                    </span>
                    <div className={s.keyActions}>
                      <button
                        type="button"
                        className={s.ghostBtn}
                        onClick={() => handleToggleKey(k.id)}
                        disabled={pendingKey === k.id}
                        aria-label={k.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                      >
                        {pendingKey === k.id ? (
                          <Loader2 size={10} className={s.spin} />
                        ) : (
                          <Power size={10} />
                        )}
                        {k.isActive ? 'غیرفعال' : 'فعال'}
                      </button>
                      <button
                        type="button"
                        className={s.dangerBtn}
                        onClick={() => handleDeleteKey(k.id, k.name)}
                        disabled={pendingKey === k.id}
                        aria-label={`حذف کلید ${k.name}`}
                      >
                        {pendingKey === k.id ? (
                          <Loader2 size={10} className={s.spin} />
                        ) : (
                          <Trash2 size={10} />
                        )}
                        حذف
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ §2. Webhooks ════════════════════════════════════════════ */}
      <section className={s.section} aria-labelledby="webhooks-title">
        <div className={s.sectionHead}>
          <div className={s.sectionHeadMain}>
            <span className={s.sectionIcon} aria-hidden>
              <Webhook size={14} />
            </span>
            <div>
              <h2 id="webhooks-title" className={s.sectionTitle}>
                وب‌هوک‌ها
              </h2>
              <p className={s.sectionSub}>
                برای دریافت اعلان‌های لحظه‌ای، آدرس endpoint خود را با رویدادهای مورد نظر ثبت کنید
              </p>
            </div>
          </div>
          <CreateWebhookDialog
            events={webhookEvents}
            onCreated={(res) => {
              if (res.success) {
                window.location.reload();
                toast({ title: 'وب‌هوک ساخته شد', variant: 'success' });
              } else {
                toast({ title: 'خطا', description: res.error, variant: 'destructive' });
              }
            }}
          />
        </div>

        {webhooks.length === 0 ? (
          <EmptyHint
            icon={Webhook}
            title="وب‌هوکی تعریف نشده"
            description="برای دریافت رویدادها در سیستم خود، یک endpoint اضافه کنید"
          />
        ) : (
          <div className={s.webhookList}>
            {webhooks.map((w) => (
              <article key={w.id} className={s.webhookCard} data-active={w.isActive}>
                <header className={s.webhookHead}>
                  <code className={s.webhookUrl} dir="ltr">
                    {w.url}
                  </code>
                  <span className={s.keyStatus} data-on={w.isActive}>
                    {w.isActive ? (
                      <>
                        <CheckCircle2 size={10} /> فعال
                      </>
                    ) : (
                      <>
                        <Power size={10} /> غیرفعال
                      </>
                    )}
                  </span>
                </header>

                <div className={s.webhookEvents}>
                  {w.events.map((e) => {
                    const opt = webhookEvents.find((o) => o.value === e);
                    return (
                      <span key={e} className={s.eventChip}>
                        {opt?.label ?? e}
                      </span>
                    );
                  })}
                </div>

                <footer className={s.webhookFoot}>
                  <span className={s.keyMeta}>ایجاد: {fmtDate(w.createdAt)}</span>
                  <div className={s.webhookActions}>
                    <button
                      type="button"
                      className={s.ghostBtn}
                      onClick={() => handleToggleWebhook(w.id)}
                      disabled={pendingWh === w.id}
                    >
                      {pendingWh === w.id ? (
                        <Loader2 size={10} className={s.spin} />
                      ) : (
                        <Power size={10} />
                      )}
                      {w.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    </button>
                    <button
                      type="button"
                      className={s.dangerBtn}
                      onClick={() => handleDeleteWebhook(w.id)}
                      disabled={pendingWh === w.id}
                      aria-label="حذف وب‌هوک"
                    >
                      <Trash2 size={10} />
                      حذف
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ═══ §3. Audit Log ══════════════════════════════════════════ */}
      <section className={s.section} aria-labelledby="audit-title">
        <div className={s.sectionHead}>
          <div className={s.sectionHeadMain}>
            <span className={s.sectionIcon} aria-hidden>
              <Activity size={14} />
            </span>
            <div>
              <h2 id="audit-title" className={s.sectionTitle}>
                گزارش تغییرات
              </h2>
              <p className={s.sectionSub}>
                ۲۰ رویداد اخیر روی کلیدهای API شما — برای امنیت و رهگیری تغییرات
              </p>
            </div>
          </div>
        </div>
        {audits.length === 0 ? (
          <EmptyHint
            icon={History}
            title="هنوز رویدادی ثبت نشده"
            description="پس از اولین تغییر روی کلیدها، اینجا نمایش داده می‌شود"
          />
        ) : (
          <ul className={s.auditList}>
            {audits.map((a) => {
              const meta = AUDIT_LABEL[a.action] ?? { label: a.action, color: 'neutral' };
              return (
                <li key={a.id} className={s.auditItem}>
                  <span className={s.auditAction} data-color={meta.color}>
                    {meta.label}
                  </span>
                  <span className={s.auditKey}>{a.ApiKey?.name ?? '—'}</span>
                  <span className={s.auditMeta}>
                    {a.ip && (
                      <span className={s.ipChip} dir="ltr">
                        {a.ip}
                      </span>
                    )}
                    <span className={s.auditTime}>
                      <Clock size={9} aria-hidden />
                      {fmtTime(a.createdAt)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ═══ §4. Documentation ═══════════════════════════════════════ */}
      <section className={s.section} aria-labelledby="docs-title">
        <div className={s.sectionHead}>
          <div className={s.sectionHeadMain}>
            <span className={s.sectionIcon} aria-hidden>
              <Code2 size={14} />
            </span>
            <div>
              <h2 id="docs-title" className={s.sectionTitle}>
                مستندات فنی
              </h2>
              <p className={s.sectionSub}>راهنمای سریع برای اتصال به API پلتفرم</p>
            </div>
          </div>
        </div>
        <div className={s.docGrid}>
          {DOC_CARDS.map((d) => {
            const Icon = d.icon;
            return (
              <a key={d.title} href={d.href} className={s.docCard} target="_blank" rel="noopener">
                <span className={s.docIcon} aria-hidden>
                  <Icon size={16} />
                </span>
                <h3 className={s.docTitle}>{d.title}</h3>
                <p className={s.docDesc}>{d.desc}</p>
                <span className={s.docCta}>
                  مشاهده
                  <ChevronLeft size={10} />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Status strip ─────────────────────────────────────────────── */}
      <aside className={s.statusStrip} aria-label="خلاصه وضعیت">
        <span className={s.statusItem}>
          <span className={s.statusDot} data-on />
          <span>
            {faNum(activeKeys.length)} کلید فعال از {faNum(keys.length)}
          </span>
        </span>
        <span className={s.statusItem}>
          <span className={s.statusDot} data-on={activeWebhooks.length > 0} />
          <span>
            {faNum(activeWebhooks.length)} وب‌هوک فعال از {faNum(webhooks.length)}
          </span>
        </span>
        <span className={s.statusItem}>
          <ShieldCheck size={11} aria-hidden />
          <span>ارتباط از طریق HTTPS — secret هرگز در URL ارسال نمی‌شود</span>
        </span>
      </aside>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────── //

function faNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function EmptyHint({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon} aria-hidden>
        <Icon size={20} />
      </span>
      <h3 className={s.emptyTitle}>{title}</h3>
      <p className={s.emptyDesc}>{description}</p>
    </div>
  );
}

function CreateKeyDialog({
  onCreated,
}: {
  onCreated: (res: ApiKeyActionResult) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [expiry, setExpiry] = useState<string>('never');
  const [pending, startTransition] = useTransition();

  function toggleScope(value: string) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleCreate() {
    if (name.trim().length < 3) {
      toast({ title: 'نام کلید کوتاه است', description: 'حداقل ۳ کاراکتر وارد کنید', variant: 'destructive' });
      return;
    }
    const expiresInDays = expiry === 'never' ? undefined : parseInt(expiry, 10);
    startTransition(async () => {
      const res = await createApiKey({
        name: name.trim(),
        scopes: Array.from(scopes),
        expiresInDays,
      });
      if (!res.success) {
        toast({ title: 'خطا', description: res.error, variant: 'destructive' });
        onCreated(res);
        return;
      }
      setOpen(false);
      setName('');
      setScopes(new Set());
      setExpiry('never');
      onCreated(res);
    });
  }

  // Group scopes by category
  const grouped = useMemo(() => {
    const map: Record<string, typeof API_SCOPES[number][]> = { read: [], write: [] };
    for (const sc of API_SCOPES) {
      map[sc.category]?.push(sc);
    }
    return map;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={s.primaryBtn} aria-label="ساخت کلید جدید">
          <Plus size={12} />
          کلید جدید
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl" className={s.dialogLg}>
        <DialogHeader>
          <DialogTitle>ساخت کلید API جدید</DialogTitle>
          <DialogDescription>
            یک نام قابل تشخیص، scopeهای مورد نیاز، و انقضای اختیاری انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <div className={s.formRow}>
          <label htmlFor="apikey-name" className={s.formLabel}>
            نام کلید
          </label>
          <input
            id="apikey-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: سرور تولید"
            className={s.formInput}
            maxLength={50}
            autoFocus
          />
        </div>

        <div className={s.formRow}>
          <span className={s.formLabel}>انقضا</span>
          <div className={s.expiryRow}>
            {(['never', '30', '90', '365'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setExpiry(d)}
                className={s.expiryBtn}
                data-on={expiry === d}
                aria-pressed={expiry === d}
              >
                {d === 'never' ? 'بدون انقضا' : `${d} روز`}
              </button>
            ))}
          </div>
        </div>

        <div className={s.formRow}>
          <span className={s.formLabel}>
            Scopeها <span className={s.formHint}>خالی = دسترسی کامل</span>
          </span>
          {(['read', 'write'] as const).map((cat) => (
            <div key={cat} className={s.scopeGroup}>
              <h4 className={s.scopeGroupTitle}>
                {cat === 'read' ? 'خواندن' : 'نوشتن'}
              </h4>
              <div className={s.scopeGrid}>
                {grouped[cat]?.map((sc) => {
                  const isOn = scopes.has(sc.value);
                  return (
                    <button
                      key={sc.value}
                      type="button"
                      onClick={() => toggleScope(sc.value)}
                      className={s.scopeToggle}
                      data-on={isOn}
                      aria-pressed={isOn}
                    >
                      <span className={s.eventToggleDot} aria-hidden />
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={s.formNote}>
          <AlertTriangle size={11} aria-hidden />
          کلید ساخته‌شده فقط اکنون قابل مشاهده است. آن را در جای امن ذخیره کنید.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className={s.ghostBtn}>
              انصراف
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className={s.primaryBtn}
          >
            {pending ? <Loader2 size={12} className={s.spin} /> : <Key size={12} />}
            ساخت کلید
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateWebhookDialog({
  events,
  onCreated,
}: {
  events: WebhookEventOpt[];
  onCreated: (res: ApiKeyActionResult) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggleEvent(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleCreate() {
    if (!url.trim()) {
      toast({ title: 'آدرس را وارد کنید', variant: 'destructive' });
      return;
    }
    if (selected.size === 0) {
      toast({ title: 'حداقل یک رویداد انتخاب کنید', variant: 'destructive' });
      return;
    }
    startTransition(async () => {
      const res = await createWebhook({ url: url.trim(), events: Array.from(selected) });
      onCreated(res);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={s.primaryBtn} aria-label="افزودن وب‌هوک">
          <Plus size={12} />
          افزودن وب‌هوک
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl" className={s.dialogLg}>
        <DialogHeader>
          <DialogTitle>افزودن وب‌هوک جدید</DialogTitle>
          <DialogDescription>
            آدرس endpoint خود را وارد کنید و رویدادهایی که می‌خواهید دریافت کنید را انتخاب کنید
          </DialogDescription>
        </DialogHeader>
        <div className={s.formRow}>
          <label htmlFor="wh-url" className={s.formLabel}>
            URL
          </label>
          <input
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/payments"
            className={s.formInput}
            dir="ltr"
            autoFocus
          />
        </div>
        <div className={s.formRow}>
          <span className={s.formLabel}>رویدادها</span>
          <div className={s.eventGrid}>
            {events.map((e) => {
              const isOn = selected.has(e.value);
              return (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => toggleEvent(e.value)}
                  className={s.eventToggle}
                  data-on={isOn}
                  aria-pressed={isOn}
                >
                  <span className={s.eventToggleDot} aria-hidden />
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className={s.ghostBtn}>
              انصراف
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className={s.primaryBtn}
          >
            {pending ? <Loader2 size={12} className={s.spin} /> : <Webhook size={12} />}
            ثبت وب‌هوک
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────── //

const DOC_CARDS = [
  {
    title: 'شروع کار',
    desc: 'اولین درخواست و احراز هویت API',
    icon: Zap,
    href: '/docs/getting-started',
  },
  {
    title: 'پرداخت',
    desc: 'ساخت درگاه پرداخت و تأیید',
    icon: Send,
    href: '/docs/payments',
  },
  {
    title: 'وب‌هوک‌ها',
    desc: 'تأیید امضا و بازپخش رویداد',
    icon: Webhook,
    href: '/docs/webhooks',
  },
  {
    title: 'محدودیت‌ها',
    desc: 'سقف نرخ درخواست و quota',
    icon: Terminal,
    href: '/docs/rate-limits',
  },
] as const;
