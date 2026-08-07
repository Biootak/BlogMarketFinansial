/**
 * /customer/developer — Developer Portal (API Keys & Webhooks)
 *
 * 2026-07-29 v2: server-side data fetching برای keys/webhooks/audits
 *  - audit log از Prisma در سمت سرور لود می‌شود
 *  - secret 30s در client-side auto-hide می‌شود
 *  - scopes در dialog انتخاب می‌شوند و در DB ذخیره می‌گردند
 */
import { getMyApiKeyAudits, getMyApiKeys, getMyWebhooks } from '@/actions/developer-portal';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { WEBHOOK_EVENTS } from '@/lib/developer-portal-constants';
import type { Metadata } from 'next';
import DeveloperPortalClient from './_components/DeveloperPortalClient';

export const metadata: Metadata = {
  title: 'پنل توسعه‌دهندگان',
  description: 'مدیریت کلیدهای API، وب‌هوک‌ها و مستندات فنی اتصال به پلتفرم',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Defensive ISO conversion — `new Date(undefined).toISOString()` throws
 * `RangeError: Invalid time value` at runtime and kills the whole page if a
 * DB row ever carries a null/odd timestamp. Fall back to epoch instead.
 */
function toIso(value: unknown): string {
  const d = value == null ? null : new Date(value as string);
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
}

type ApiKeyRow = {
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

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
};

type AuditRow = {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  ApiKey: { name: string } | null;
};

export default async function DeveloperPortalPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const [rawKeys, rawWebhooks, rawAudits] = await Promise.all([
    getMyApiKeys(),
    getMyWebhooks(),
    getMyApiKeyAudits(20),
  ]);

  const keys: ApiKeyRow[] = (rawKeys as Record<string, unknown>[]).map((k) => ({
    id: String(k.id),
    name: String(k.name),
    key: String(k.key),
    secret: String(k.secret),
    isActive: Boolean(k.isActive),
    lastUsed: k.lastUsed ? toIso(k.lastUsed) : null,
    lastIp: k.lastIp ? String(k.lastIp) : null,
    expiresAt: k.expiresAt ? toIso(k.expiresAt) : null,
    scopes: Array.isArray(k.scopes) ? k.scopes.map((s) => String(s)) : [],
    createdAt: toIso(k.createdAt),
  }));

  const webhooks: WebhookRow[] = (rawWebhooks as Record<string, unknown>[]).map((w) => ({
    id: String(w.id),
    url: String(w.url),
    events: Array.isArray(w.events) ? w.events.map((e) => String(e)) : [],
    isActive: Boolean(w.isActive),
    createdAt: toIso(w.createdAt),
  }));

  const audits: AuditRow[] = (rawAudits as Record<string, unknown>[]).map((a) => ({
    id: String(a.id),
    action: String(a.action),
    ip: a.ip ? String(a.ip) : null,
    userAgent: a.userAgent ? String(a.userAgent) : null,
    createdAt: toIso(a.createdAt),
    ApiKey:
      a.ApiKey && typeof a.ApiKey === 'object'
        ? { name: String((a.ApiKey as { name: unknown }).name) }
        : null,
  }));

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <PageHeader
        title="پنل توسعه‌دهندگان"
        description="ابزارهای اتصال پلتفرم به سیستم‌های شما — کلید API، وب‌هوک و مستندات"
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'توسعه‌دهندگان' },
        ]}
        icon="settings"
        accent="violet"
      />
      <DeveloperPortalClient
        initialKeys={keys}
        initialWebhooks={webhooks}
        initialAudits={audits}
        webhookEvents={WEBHOOK_EVENTS.map((e) => ({ value: e.value, label: e.label }))}
      />
    </div>
  );
}
