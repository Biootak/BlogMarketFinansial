'use client';

/**
 * RightRailPreview — Signature moment of the Settings page.
 * ─────────────────────────────────────────────────────────────
 *  یک پنل سمت راست که تغییرات فرم را real-time نمایش می‌دهد.
 *  سه live preview دارد که بر اساس tab فعلی تغییر می‌کنند:
 *    1. Brand Card — preview لوگو + نام سایت (همیشه)
 *    2. Email Flow — مسیر SMTP وقتی ایمیل ارسال می‌شود (tab=email)
 *    3. Maintenance Banner — همان چیزی که کاربر می‌بیند (tab=maintenance)
 *    4. Security Posture — نمای بصری امنیت (tab=security)
 *    5. API Key Card — کارت کلید API (tab=api-keys)
 *    6. Backup Pulse — نوار پیشرفت backup (tab=backup)
 *    7. Audit Timeline — timeline لاگ‌ها (tab=audit)
 *
 *  الگو از Linear: یک "what you'll see" panel که ادمین بتواند قبل از ذخیره
 *  نتیجه را ببیند.
 *
 *  هیچ state سرور-ساید ندارد — همه چیز از props می‌آید.
 */

import {
  Activity,
  AlertOctagon,
  Archive,
  Building2,
  CheckCircle2,
  CircleDot,
  Database,
  Fingerprint,
  KeyRound,
  type LucideIcon,
  Mail,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './RightRailPreview.module.css';

export type PreviewTab =
  | 'general'
  | 'email'
  | 'maintenance'
  | 'security'
  | 'social'
  | 'advanced'
  | 'api-keys'
  | 'backup'
  | 'audit';

export interface RightRailPreviewProps {
  activeTab: PreviewTab;
  // General
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  siteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  // Email
  smtpServer?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpHasPassword?: boolean;
  // Maintenance
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  // Security
  sessionTimeoutMin?: number;
  force2faForAdmins?: boolean;
  requireEmailForNewIp?: boolean;
  maxConcurrentSessions?: number;
  ipAllowlist?: string;
  // API
  apiKeyCount?: number;
  // Backup
  backupEnabled?: boolean;
  lastBackupAt?: string | null;
  nextBackupAt?: string | null;
  backupCount?: number;
  // Audit
  totalAuditEvents?: number;
}

const formatRelative = (iso: string | null | undefined, locale = 'fa-IR'): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diffMs = d.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    const minutes = Math.round(absDiff / 60000);
    const hours = Math.round(absDiff / 3_600_000);
    const days = Math.round(absDiff / 86_400_000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (minutes < 60) return rtf.format(Math.sign(diffMs) * minutes, 'minute');
    if (hours < 24) return rtf.format(Math.sign(diffMs) * hours, 'hour');
    return rtf.format(Math.sign(diffMs) * days, 'day');
  } catch {
    return '—';
  }
};

const truncate = (str: string | undefined, max: number): string => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

export function RightRailPreview(props: RightRailPreviewProps) {
  const { activeTab } = props;
  const [tick, setTick] = useState(0);

  // refresh "now" every 30s برای relative time ها
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className={s.rail} aria-label="پیش‌نمایش زنده تنظیمات">
      <header className={s.header}>
        <span className={s.headerIcon} aria-hidden>
          <Activity size={12} strokeWidth={2} />
        </span>
        <h3 className={s.headerTitle}>پیش‌نمایش زنده</h3>
        <span className={s.tick} aria-hidden data-tick={tick}>
          <span className={s.tickPulse} />
        </span>
      </header>

      <div className={s.body}>
        {/* Brand Card — همیشه */}
        <BrandCard
          siteName={props.siteName}
          siteDescription={props.siteDescription}
          logoUrl={props.logoUrl}
          siteUrl={props.siteUrl}
        />

        {/* conditional based on tab */}
        {activeTab === 'email' && (
          <EmailFlowCard
            server={props.smtpServer}
            port={props.smtpPort}
            username={props.smtpUsername}
            hasPassword={props.smtpHasPassword}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenancePreviewCard
            active={Boolean(props.maintenanceMode)}
            message={props.maintenanceMessage}
          />
        )}

        {activeTab === 'security' && (
          <SecurityPostureCard
            sessionMin={props.sessionTimeoutMin ?? 60}
            force2fa={Boolean(props.force2faForAdmins)}
            requireEmail={Boolean(props.requireEmailForNewIp)}
            maxSessions={props.maxConcurrentSessions ?? 5}
            ipAllowlist={props.ipAllowlist}
          />
        )}

        {activeTab === 'api-keys' && <ApiKeyHealthCard count={props.apiKeyCount ?? 0} />}

        {activeTab === 'backup' && (
          <BackupPulseCard
            enabled={Boolean(props.backupEnabled)}
            lastAt={props.lastBackupAt}
            nextAt={props.nextBackupAt}
            count={props.backupCount ?? 0}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTimelineCard total={props.totalAuditEvents ?? 0} />
        )}

        {activeTab === 'social' && <SocialCard />}

        {activeTab === 'advanced' && <AdvancedCard />}

        {activeTab === 'general' && (
          <ContactCard
            email={props.contactEmail}
            phone={props.contactPhone}
            address={props.contactAddress}
          />
        )}
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-cards
// ═══════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, label, badge }: { icon: LucideIcon; label: string; badge?: string }) {
  return (
    <div className={s.sectionHead}>
      <span className={s.sectionIcon} aria-hidden>
        <Icon size={12} strokeWidth={2} />
      </span>
      <span className={s.sectionLabel}>{label}</span>
      {badge && <span className={s.sectionBadge}>{badge}</span>}
    </div>
  );
}

function BrandCard({
  siteName,
  siteDescription,
  logoUrl,
  siteUrl,
}: {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  siteUrl?: string;
}) {
  const name = siteName?.trim() || 'financialmarket.page';
  const desc = siteDescription?.trim() || 'بازار صرافی‌های افغانستان — نرخ لحظه‌ای افغانی';
  const url = siteUrl?.trim() || 'https://financialmarket.page';
  const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <section className={s.card}>
      <SectionHeader icon={Building2} label="هویت برند" />
      <div className={s.brandPreview}>
        <div className={s.brandLogo}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="لوگو" className={s.brandLogoImg} />
          ) : (
            <span className={s.brandLogoFallback} aria-hidden>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className={s.brandInfo}>
          <div className={s.brandName}>{truncate(name, 28)}</div>
          <div className={s.brandDesc}>{truncate(desc, 60)}</div>
          <div className={s.brandUrl} dir="ltr">
            {truncate(domain, 32)}
          </div>
        </div>
      </div>
      <div className={s.brandMicro} aria-hidden>
        <span>OG</span>
        <span>SCHEMA</span>
        <span>JSON-LD</span>
      </div>
    </section>
  );
}

function ContactCard({
  email,
  phone,
  address,
}: {
  email?: string;
  phone?: string;
  address?: string;
}) {
  const rows = [
    { label: 'ایمیل', value: email, dir: 'ltr' as const },
    { label: 'تلفن', value: phone, dir: 'ltr' as const },
    { label: 'آدرس', value: address, dir: 'rtl' as const },
  ];
  return (
    <section className={s.card}>
      <SectionHeader icon={Mail} label="اطلاعات تماس" />
      <ul className={s.contactList}>
        {rows.map((r) => (
          <li key={r.label} className={s.contactRow}>
            <span className={s.contactLabel}>{r.label}</span>
            <span className={s.contactValue} dir={r.dir}>
              {r.value ? truncate(r.value, 36) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmailFlowCard({
  server,
  port,
  username,
  hasPassword,
}: {
  server?: string;
  port?: string;
  username?: string;
  hasPassword?: boolean;
}) {
  const stages = [
    { id: 'compose', label: 'ساخت پیام', icon: Mail },
    { id: 'smtp', label: server || 'smtp.example.com', icon: Database },
    { id: 'auth', label: username || 'no-user', icon: Fingerprint },
    { id: 'deliver', label: 'تحویل', icon: CheckCircle2 },
  ];
  const ready = Boolean(server && port && username && hasPassword);
  return (
    <section className={s.card}>
      <SectionHeader icon={Mail} label="مسیر ارسال" badge={ready ? 'آماده' : 'ناقص'} />
      <ol className={s.flowList}>
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <li key={stage.id} className={s.flowItem} data-ready={ready}>
              <span className={s.flowNode} aria-hidden>
                <Icon size={11} strokeWidth={2.2} />
              </span>
              <span className={s.flowLabel}>{stage.label}</span>
              {idx < stages.length - 1 && <span className={s.flowLine} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <div className={s.flowFoot}>
        <span className={s.flowPort} dir="ltr">
          :{port || '—'}
        </span>
        <span className={s.flowHint}>
          {ready ? 'تنظیمات SMTP کامل است' : 'برای ارسال، فیلدها را کامل کنید'}
        </span>
      </div>
    </section>
  );
}

function MaintenancePreviewCard({
  active,
  message,
}: {
  active: boolean;
  message?: string;
}) {
  const previewMsg = message?.trim() || 'سایت در حال به‌روزرسانی است، لطفاً بعداً مراجعه کنید.';
  return (
    <section className={s.card} data-tone={active ? 'warn' : 'ok'}>
      <SectionHeader
        icon={active ? Power : CheckCircle2}
        label="پیش‌نمایش صفحه"
        badge={active ? 'تعمیرات' : 'فعال'}
      />
      <div className={s.maintPreview}>
        <div className={s.maintDot} aria-hidden>
          <CircleDot size={20} strokeWidth={1.5} />
        </div>
        <div className={s.maintTitle}>{active ? 'سایت در حال به‌روزرسانی' : 'سایت فعال است'}</div>
        <p className={s.maintText}>{truncate(previewMsg, 110)}</p>
        {active && (
          <div className={s.maintRibbon}>
            <AlertOctagon size={11} strokeWidth={2.2} />
            <span>فقط نقش «مدیر ارشد» می‌تواند وارد داشبورد شود</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SecurityPostureCard({
  sessionMin,
  force2fa,
  requireEmail,
  maxSessions,
  ipAllowlist,
}: {
  sessionMin: number;
  force2fa: boolean;
  requireEmail: boolean;
  maxSessions: number;
  ipAllowlist?: string;
}) {
  const score =
    (force2fa ? 30 : 0) +
    (requireEmail ? 25 : 0) +
    (sessionMin > 0 && sessionMin <= 240 ? 20 : 10) +
    (maxSessions > 0 && maxSessions <= 5 ? 15 : 5) +
    (ipAllowlist && ipAllowlist.trim() ? 10 : 0);
  const tone = score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'danger';
  return (
    <section className={s.card}>
      <SectionHeader icon={ShieldCheck} label="امنیت" badge={`${score}/100`} />
      <div className={s.scoreRow}>
        <div className={s.scoreBar} aria-hidden>
          <span className={s.scoreFill} data-tone={tone} style={{ width: `${score}%` }} />
        </div>
        <span className={s.scoreLabel} data-tone={tone}>
          {tone === 'ok' ? 'مستحکم' : tone === 'warn' ? 'قابل قبول' : 'ضعیف'}
        </span>
      </div>
      <ul className={s.securityList}>
        <SecurityItem label="اجبار 2FA برای ادمین‌ها" ok={force2fa} />
        <SecurityItem label="تأیید ایمیل برای IP جدید" ok={requireEmail} />
        <SecurityItem label={`Session ≤ ${maxSessions} همزمان`} ok={maxSessions <= 5} />
        <SecurityItem
          label={`Timeout ${sessionMin} دقیقه`}
          ok={sessionMin > 0 && sessionMin <= 240}
        />
        <SecurityItem
          label="IP allowlist فعال"
          ok={Boolean(ipAllowlist && ipAllowlist.trim())}
        />
      </ul>
    </section>
  );
}

function SecurityItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={s.securityItem} data-ok={String(ok)}>
      <span className={s.securityDot} aria-hidden />
      <span>{label}</span>
    </li>
  );
}

function ApiKeyHealthCard({ count }: { count: number }) {
  return (
    <section className={s.card}>
      <SectionHeader icon={KeyRound} label="کلیدهای API" badge={`${count} فعال`} />
      <div className={s.apiCount}>
        <span className={s.apiCountNum}>{count}</span>
        <span className={s.apiCountLabel}>کلید معتبر</span>
      </div>
      <p className={s.apiHint}>
        کلیدهای منقضی‌شده و لغو‌شده به‌طور خودکار از این شمارش حذف می‌شوند.
      </p>
    </section>
  );
}

function BackupPulseCard({
  enabled,
  lastAt,
  nextAt,
  count,
}: {
  enabled: boolean;
  lastAt?: string | null;
  nextAt?: string | null;
  count: number;
}) {
  return (
    <section className={s.card}>
      <SectionHeader
        icon={Archive}
        label="پشتیبان‌گیری"
        badge={enabled ? 'فعال' : 'غیرفعال'}
      />
      <div className={s.backupRow}>
        <div className={s.backupCell}>
          <div className={s.backupLabel}>آخرین</div>
          <div className={s.backupVal}>{formatRelative(lastAt)}</div>
        </div>
        <div className={s.backupCell}>
          <div className={s.backupLabel}>بعدی</div>
          <div className={s.backupVal}>{enabled ? formatRelative(nextAt) : '—'}</div>
        </div>
        <div className={s.backupCell}>
          <div className={s.backupLabel}>نگهداری</div>
          <div className={s.backupVal}>{count} نسخه</div>
        </div>
      </div>
    </section>
  );
}

function AuditTimelineCard({ total }: { total: number }) {
  // 12 bins — 24h ago to now
  const bins = Array.from({ length: 12 }, (_, i) => {
    const height = 6 + Math.round(Math.abs(Math.sin(i * 0.7 + total * 0.001)) * 28);
    return { h: height, i };
  });
  return (
    <section className={s.card}>
      <SectionHeader icon={Activity} label="۲۴ ساعت اخیر" badge={`${total} رویداد`} />
      <div className={s.auditBars} aria-hidden>
        {bins.map((b) => (
          <span key={b.i} className={s.auditBar} style={{ blockSize: `${b.h}px` }} />
        ))}
      </div>
      <p className={s.apiHint}>تعداد رویدادهای ثبت‌شده در ۲۴ ساعت گذشته (نمونه)</p>
    </section>
  );
}

function SocialCard() {
  const items: Array<{ id: string; label: string }> = [
    { id: 'telegram', label: 'Telegram' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'twitter', label: 'X / Twitter' },
  ];
  return (
    <section className={s.card}>
      <SectionHeader icon={Activity} label="کانال‌ها" />
      <ul className={s.socialList}>
        {items.map((it) => (
          <li key={it.id} className={s.socialItem}>
            <span className={s.socialDot} aria-hidden />
            <span>{it.label}</span>
            <span className={s.socialHint}>پیکربندی در فرم</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdvancedCard() {
  return (
    <section className={s.card}>
      <SectionHeader icon={Database} label="عملکرد" />
      <ul className={s.socialList}>
        <li className={s.socialItem}>
          <span className={s.socialDot} aria-hidden />
          <span>cache</span>
          <span className={s.socialHint}>in-memory + tags</span>
        </li>
        <li className={s.socialItem}>
          <span className={s.socialDot} aria-hidden />
          <span>rate limit</span>
          <span className={s.socialHint}>Upstash / fallback</span>
        </li>
      </ul>
    </section>
  );
}
