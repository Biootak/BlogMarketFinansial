/**
 * /customer/developer — Developer Portal (API Keys & Webhooks)
 *
 * 2026-07-29 v2: server-side data fetching برای keys/webhooks/audits
 *  - audit log از Prisma در سمت سرور لود می‌شود
 *  - secret 30s در client-side auto-hide می‌شود
 *  - scopes در dialog انتخاب می‌شوند و در DB ذخیره می‌گردند
 */
import { getMyApiKeyAudits, getMyApiKeys, getMyWebhooks } from '@/actions/developer-portal';
import { WEBHOOK_EVENTS } from '@/lib/developer-portal-constants';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import type { Metadata } from 'next';
import DeveloperPortalClient from './_components/DeveloperPortalClient';

export const metadata: Metadata = {
  title: 'پنل توسعه‌دهندگان',
  description: 'مدیریت کلیدهای API، وب‌هوک‌ها و مستندات فنی اتصال به پلتفرم',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const keys: ApiKeyRow[] = (rawKeys as Array<Record<string, unknown>>).map((k) => ({
    id: String(k.id),
    name: String(k.name),
    key: String(k.key),
    secret: String(k.secret),
    isActive: Boolean(k.isActive),
    lastUsed: k.lastUsed ? new Date(k.lastUsed as string).toISOString() : null,
    lastIp: k.lastIp ? String(k.lastIp) : null,
    expiresAt: k.expiresAt ? new Date(k.expiresAt as string).toISOString() : null,
    scopes: Array.isArray(k.scopes) ? k.scopes.map((s) => String(s)) : [],
    createdAt: new Date(k.createdAt as string).toISOString(),
  }));

  const webhooks: WebhookRow[] = (rawWebhooks as Array<Record<string, unknown>>).map((w) => ({
    id: String(w.id),
    url: String(w.url),
    events: Array.isArray(w.events) ? w.events.map((e) => String(e)) : [],
    isActive: Boolean(w.isActive),
    createdAt: new Date(w.createdAt as string).toISOString(),
  }));

  const audits: AuditRow[] = (rawAudits as Array<Record<string, unknown>>).map((a) => ({
    id: String(a.id),
    action: String(a.action),
    ip: a.ip ? String(a.ip) : null,
    userAgent: a.userAgent ? String(a.userAgent) : null,
    createdAt: new Date(a.createdAt as string).toISOString(),
    ApiKey: a.ApiKey && typeof a.ApiKey === 'object' ? { name: String((a.ApiKey as { name: unknown }).name) } : null,
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
        breadcrumb={[{ href: '/customer/dashboard', label: 'پنل مشتری' }, { label: 'توسعه‌دهندگان' }]}
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
