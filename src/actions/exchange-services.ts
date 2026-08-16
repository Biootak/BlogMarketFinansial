'use server';

/**
 * exchange-services — Server Actions برای سرویس‌های آنلاین صرافی.
 *
 * سه سطح دسترسی:
 *   1. Public (site): getPublicExchangeServices(slug) — بدون auth
 *   2. Public marketplace: getMarketplaceServices() — همه صرافی‌ها × همه سرویس‌ها
 *   3. Exchange dashboard: getMyExchangeServices / updateMyExchangeServices
 *      — فقط OWNER/MANAGER صرافی، enforced توسط requireExchangeAccess
 *
 * serviceKey با ServiceType enum یکسان است — canonical، سازگار با ServiceRequest.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import {
  EXCHANGE_SERVICE_CATALOG,
  type ExchangeServiceKey,
  type ExchangeServiceMeta,
  type SerializableServiceMeta,
  getServiceMeta,
} from '@/lib/exchange-services';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import type { FintechActionResult } from '@/types/types';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExchangeServiceItem = {
  id: string;
  serviceKey: ExchangeServiceKey;
  isActive: boolean;
  description: string | null;
  ctaHref: string | null;
  order: number;
  leadTimeMin: number | null;
  /** بدون icon — LucideIcon serialize نمی‌شود. client آن را از catalog دریافت می‌کند. */
  meta: SerializableServiceMeta;
};

export type PublicExchangeService = {
  serviceKey: ExchangeServiceKey;
  name: string;
  description: string;
  ctaHref: string | null;
  isActive: boolean;
  /** 2026-07-28: SLA — null = صرافی تعیین نکرده */
  leadTimeMin: number | null;
};

export type MarketplaceRow = {
  serviceKey: ExchangeServiceKey;
  serviceName: string;
  serviceGroup: ExchangeServiceMeta['group'];
  exchanges: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    city: string | null;
    customDescription: string | null;
    ctaHref: string | null;
  }>;
  count: number;
};

// ─── READ — Public site (exchange profile) ────────────────────────────────────

/**
 * سرویس‌های فعال یک صرافی برای صفحه عمومی /exchanges/[slug].
 * فقط سرویس‌های active برمی‌گردد.
 * slug فقط برای صرافی‌های ACTIVE قابل مشاهده است.
 */
export const getPublicExchangeServices = safeCache(
  async (slug: string): Promise<PublicExchangeService[]> => {
    if (!slug) return [];
    const exchange = await prisma.exchange.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!exchange) return [];

    const rows = await prisma.exchangeService.findMany({
      where: { exchangeId: exchange.id, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return rows
      .map((row) => {
        const meta = getServiceMeta(row.serviceKey);
        if (!meta) return null;
        return {
          serviceKey: meta.key,
          name: meta.name,
          description: row.description?.trim() || meta.description,
          ctaHref: row.ctaHref,
          isActive: row.isActive,
          leadTimeMin: row.leadTimeMin,
        } satisfies PublicExchangeService;
      })
      .filter((x): x is PublicExchangeService => x !== null);
  },
  [],
  { key: 'exchange-services:public:v1', ttl: 120, tags: ['exchange-services', 'exchanges'] },
);

// ─── READ — Public marketplace (بازارچه مرکزی) ───────────────────────────────

/**
 * بازارچه مرکزی /services — همه سرویس‌ها × همه صرافی‌های فعال.
 * برای هر سرویس، صرافی‌هایی که آن را ارائه می‌دهند برمی‌گردد.
 * فقط صرافی‌های ACTIVE و سرویس‌های isActive=true.
 */
export const getMarketplaceData = safeCache(
  async (): Promise<MarketplaceRow[]> => {
    const services = await prisma.exchangeService.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        Exchange: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            city: true,
            status: true,
          },
        },
      },
    });

    // group by serviceKey
    const grouped = new Map<ExchangeServiceKey, MarketplaceRow>();
    for (const row of services) {
      const meta = getServiceMeta(row.serviceKey);
      if (!meta) continue;
      if (row.Exchange.status !== 'ACTIVE') continue;

      const existing = grouped.get(meta.key);
      const entry = {
        id: row.Exchange.id,
        name: row.Exchange.name,
        slug: row.Exchange.slug,
        logoUrl: row.Exchange.logoUrl,
        city: row.Exchange.city,
        customDescription: row.description,
        ctaHref: row.ctaHref,
      };

      if (existing) {
        existing.exchanges.push(entry);
        existing.count = existing.exchanges.length;
      } else {
        grouped.set(meta.key, {
          serviceKey: meta.key,
          serviceName: meta.name,
          serviceGroup: meta.group,
          exchanges: [entry],
          count: 1,
        });
      }
    }

    // ترتیب بر اساس group label
    const groupOrder: Record<ExchangeServiceMeta['group'], number> = {
      currency: 1,
      transfer: 2,
      payment: 3,
      crypto: 4,
      specialty: 5,
    };
    return [...grouped.values()].sort((a, b) => {
      const ga = groupOrder[a.serviceGroup];
      const gb = groupOrder[b.serviceGroup];
      if (ga !== gb) return ga - gb;
      return a.serviceName.localeCompare(b.serviceName, 'fa');
    });
  },
  [],
  { key: 'exchange-services:marketplace:v1', ttl: 180, tags: ['exchange-services', 'exchanges'] },
);

/**
 * کاتالوگ کامل سرویس‌ها برای بازارچه — 2026-08-16.
 *
 * هر سرویس در EXCHANGE_SERVICE_CATALOG همیشه نمایش داده می‌شود (منبع حقیقت =
 * کاتالوگ)، حتی اگر هنوز هیچ صرافی فعالی آن را ارائه ندهد. برای سرویس‌های
 * پوشش‌داده‌نشده count=0 و exchanges=[] برمی‌گردد تا UI حالت «به‌زودی» نشان دهد
 * (شارژ موبایل، پرداخت قبض، بلیط سفر و… بدون نیاز به دیتای DB دیده شوند).
 */
export const getMarketplaceCatalog = safeCache(
  async (): Promise<MarketplaceRow[]> => {
    const covered = await getMarketplaceData();
    const coveredKeys = new Set(covered.map((r) => r.serviceKey));
    const uncovered: MarketplaceRow[] = EXCHANGE_SERVICE_CATALOG.filter(
      (m) => !coveredKeys.has(m.key),
    ).map((m) => ({
      serviceKey: m.key,
      serviceName: m.name,
      serviceGroup: m.group,
      exchanges: [],
      count: 0,
    }));
    const groupOrder: Record<ExchangeServiceMeta['group'], number> = {
      currency: 1,
      transfer: 2,
      payment: 3,
      crypto: 4,
      specialty: 5,
    };
    return [...covered, ...uncovered].sort((a, b) => {
      const ga = groupOrder[a.serviceGroup];
      const gb = groupOrder[b.serviceGroup];
      if (ga !== gb) return ga - gb;
      return a.serviceName.localeCompare(b.serviceName, 'fa');
    });
  },
  [],
  { key: 'exchange-services:catalog:v1', ttl: 180, tags: ['exchange-services', 'exchanges'] },
);

// ─── READ — Exchange dashboard (همه سرویس‌ها، شامل inactive) ─────────────────

/**
 * همه سرویس‌های catalog، با وضعیت فعال/غیرفعال فعلی برای صرافی کاربر.
 * اگر هیچ رکوردی برای سرویسی وجود نداشته باشد، با isActive=false نمایش داده می‌شود.
 * فقط OWNER/MANAGER صرافی.
 */
export async function getMyExchangeServices(): Promise<FintechActionResult<ExchangeServiceItem[]>> {
  const membership = await getExchangeForUser();
  if (!membership) {
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'دسترسی ندارید' },
    };
  }

  if (membership.staffRole !== 'OWNER' && membership.staffRole !== 'MANAGER') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'فقط مالک یا مدیر صرافی به این بخش دسترسی دارد' },
    };
  }

  const exchangeId = membership.exchange.id;

  // requireExchangeAccess به عنوان دفاع مضاعف
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

  const existing = await prisma.exchangeService.findMany({
    where: { exchangeId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const existingMap = new Map(existing.map((r) => [r.serviceKey, r]));

  return {
    success: true,
    data: EXCHANGE_SERVICE_CATALOG.map((meta) => {
      // strip icon — LucideIcon (function) نمی‌تواند از Server→Client serialize شود
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { icon: _icon, ...serializableMeta } = meta;
      const row = existingMap.get(meta.key);
      if (row) {
        return {
          id: row.id,
          serviceKey: meta.key,
          isActive: row.isActive,
          description: row.description,
          ctaHref: row.ctaHref,
          order: row.order,
          leadTimeMin: row.leadTimeMin,
          meta: serializableMeta,
        };
      }
      return {
        id: `virtual-${meta.key}`,
        serviceKey: meta.key,
        isActive: false,
        description: null,
        ctaHref: null,
        order: meta.defaultOrder,
        leadTimeMin: null,
        meta: serializableMeta,
      };
    }),
  };
}

// ─── WRITE — به‌روزرسانی سرویس‌های صرافی ─────────────────────────────────────

const ServiceItemSchema = z.object({
  serviceKey: z.string().min(2).max(40),
  isActive: z.boolean(),
  description: z.string().max(400).nullable().optional(),
  ctaHref: z
    .string()
    .max(300)
    .refine(
      (v) => !v || /^https?:\/\//i.test(v) || v.startsWith('/'),
      'لینک CTA باید با http/https شروع شود یا مسیر داخلی باشد',
    )
    .nullable()
    .optional(),
  order: z.number().int().min(0).max(999).default(0),
  /// 2026-07-28: SLA — متوسط زمان پاسخ به دقیقه. null = نامشخص
  leadTimeMin: z.number().int().min(0).max(10080).nullable().optional(),
});

const UpdateServicesSchema = z.object({
  services: z.array(ServiceItemSchema).max(50),
});

export type UpdateExchangeServicesInput = {
  services: Array<{
    serviceKey: string;
    isActive: boolean;
    description?: string | null;
    ctaHref?: string | null;
    order?: number;
    leadTimeMin?: number | null;
  }>;
};

/**
 * به‌روزرسانی همه سرویس‌های صرافی در یک تراکنش.
 * idempotent — اگر سرویسی در لیست نباشد، deactivate می‌شود.
 */
export async function updateMyExchangeServices(
  input: UpdateExchangeServicesInput,
): Promise<FintechActionResult<{ count: number }>> {
  const membership = await getExchangeForUser();
  if (!membership) {
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'دسترسی ندارید' },
    };
  }

  if (membership.staffRole !== 'OWNER' && membership.staffRole !== 'MANAGER') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'فقط مالک یا مدیر صرافی به این بخش دسترسی دارد' },
    };
  }

  const access = await requireExchangeAccess(membership.exchange.id, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

  const parsed = UpdateServicesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION',
        message: parsed.error.issues[0]?.message ?? 'داده‌های ورودی نامعتبر است',
      },
    };
  }

  // بررسی: فقط serviceKey های معتبر catalog قبول شود
  const validKeys = new Set<string>(EXCHANGE_SERVICE_CATALOG.map((s) => s.key));
  for (const s of parsed.data.services) {
    if (!validKeys.has(s.serviceKey)) {
      return {
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: `سرویس "${s.serviceKey}" در کاتالوگ وجود ندارد`,
        },
      };
    }
  }

  const exchangeId = membership.exchange.id;

  try {
    await prisma.$transaction(async (tx) => {
      // رکوردهای فعلی
      const current = await tx.exchangeService.findMany({
        where: { exchangeId },
        select: { id: true, serviceKey: true },
      });
      const currentMap = new Map<string, string>(
        current.map((r: { id: string; serviceKey: string }) => [r.serviceKey, r.id]),
      );

      // upsert برای آیتم‌های ورودی
      for (const item of parsed.data.services) {
        const existingId = currentMap.get(item.serviceKey);
        if (existingId) {
          await tx.exchangeService.update({
            where: { id: existingId },
            data: {
              isActive: item.isActive,
              description: item.description ?? null,
              ctaHref: item.ctaHref ?? null,
              order: item.order ?? 0,
              leadTimeMin: item.leadTimeMin ?? null,
            },
          });
        } else {
          await tx.exchangeService.create({
            data: {
              exchangeId,
              serviceKey: item.serviceKey,
              isActive: item.isActive,
              description: item.description ?? null,
              ctaHref: item.ctaHref ?? null,
              order: item.order ?? 0,
              leadTimeMin: item.leadTimeMin ?? null,
            },
          });
        }
      }
    });

    revalidateTag('exchange-services');
    revalidateTag('exchanges');
    revalidateTag('service-requests');

    return { success: true, data: { count: parsed.data.services.length } };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'خطا در ذخیره‌سازی',
      },
    };
  }
}

// ─── ANALYTICS — ثبت کلیک روی کارت سرویس ────────────────────────────────────

/**
 * ثبت کلیک روی کارت سرویس — best-effort، اگر fail شود request اصلی مختل نمی‌شود.
 * 2026-07-28: این برای ranking سرویس‌های پرطرفدار + heatmap رفتار مشتری است.
 *
 * source values: 'profile' | 'marketplace' | 'compare'
 */
export async function logServiceClick(input: {
  serviceKey: string;
  exchangeId?: string | null;
  source: 'profile' | 'marketplace' | 'compare' | 'other';
  referer?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // اعتبارسنجی serviceKey در catalog
    if (!getServiceMeta(input.serviceKey)) {
      return { success: false, error: 'INVALID_SERVICE_KEY' };
    }
    if (input.exchangeId) {
      // ensure exchange exists (otherwise FK error)
      const exists = await prisma.exchange.findUnique({
        where: { id: input.exchangeId },
        select: { id: true },
      });
      if (!exists) input.exchangeId = null;
    }

    await prisma.serviceClick.create({
      data: {
        serviceKey: input.serviceKey,
        exchangeId: input.exchangeId ?? null,
        source: input.source,
        referer: input.referer?.substring(0, 500) ?? null,
        // userAgent, ipAddress, userId توسط middleware در آینده پر می‌شود
      },
    });
    return { success: true };
  } catch (err) {
    // نباید کاربر را بشکند — best-effort
    return {
      success: false,
      error: err instanceof Error ? err.message : 'ANALYTICS_ERROR',
    };
  }
}

/**
 * خلاصه analytics برای یک صرافی (در داشبورد).
 * ۳۰ روز اخیر. داشبورد: چند کلیک روی هر سرویس؟ کدام سرویس محبوب‌ترین است؟
 */
export async function getExchangeAnalyticsSummary(): Promise<
  FintechActionResult<{
    totalClicks: number;
    byService: Array<{ serviceKey: string; serviceName: string; count: number }>;
    bySource: Array<{ source: string; count: number }>;
    byDay: Array<{ date: string; count: number }>;
  }>
> {
  const membership = await getExchangeForUser();
  if (!membership) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'دسترسی ندارید' } };
  }

  const exchangeId = membership.exchange.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, byServiceRaw, bySourceRaw, byDayRaw] = await Promise.all([
    prisma.serviceClick.count({ where: { exchangeId, createdAt: { gte: since } } }),
    prisma.serviceClick.groupBy({
      by: ['serviceKey'],
      where: { exchangeId, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.serviceClick.groupBy({
      by: ['source'],
      where: { exchangeId, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        DATE("createdAt") AS date,
        COUNT(*)::bigint AS count
      FROM "ServiceClick"
      WHERE "exchangeId" = ${exchangeId}
        AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  return {
    success: true,
    data: {
      totalClicks: total,
      byService: byServiceRaw.map((r) => ({
        serviceKey: r.serviceKey,
        serviceName: getServiceMeta(r.serviceKey)?.name ?? r.serviceKey,
        count: r._count._all,
      })),
      bySource: bySourceRaw.map((r) => ({
        source: r.source,
        count: r._count._all,
      })),
      byDay: byDayRaw.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    },
  };
}

// ─── LAYER 4 — Comparison Matrix ─────────────────────────────────────────────

export type ComparisonCell = {
  exchangeId: string;
  exchangeName: string;
  exchangeSlug: string;
  logoUrl: string | null;
  city: string | null;
  serviceCount: number;
  cells: Record<ExchangeServiceKey, boolean>;
  leadTimes: Partial<Record<ExchangeServiceKey, number>>;
};

export type ComparisonMatrix = {
  services: Array<{
    key: ExchangeServiceKey;
    name: string;
    group: ExchangeServiceMeta['group'];
  }>;
  exchanges: ComparisonCell[];
};

export const getComparisonMatrix = safeCache(
  async (): Promise<ComparisonMatrix> => {
    const rows = await prisma.exchangeService.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }],
      include: {
        Exchange: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            city: true,
            status: true,
          },
        },
      },
    });

    // group by exchange
    const byExchange = new Map<string, ComparisonCell>();
    for (const row of rows) {
      if (row.Exchange.status !== 'ACTIVE') continue;
      const meta = getServiceMeta(row.serviceKey);
      if (!meta) continue;

      const existing = byExchange.get(row.Exchange.id);
      const cellInit: ComparisonCell = existing ?? {
        exchangeId: row.Exchange.id,
        exchangeName: row.Exchange.name,
        exchangeSlug: row.Exchange.slug,
        logoUrl: row.Exchange.logoUrl,
        city: row.Exchange.city,
        serviceCount: 0,
        cells: {} as Record<ExchangeServiceKey, boolean>,
        leadTimes: {},
      };

      cellInit.cells[meta.key] = true;
      cellInit.serviceCount = Object.values(cellInit.cells).filter(Boolean).length;
      if (row.leadTimeMin != null) {
        cellInit.leadTimes[meta.key] = row.leadTimeMin;
      }
      byExchange.set(row.Exchange.id, cellInit);
    }

    // sort by service count desc
    const exchanges = [...byExchange.values()].sort((a, b) => b.serviceCount - a.serviceCount);

    return {
      services: EXCHANGE_SERVICE_CATALOG.map((m) => ({
        key: m.key,
        name: m.name,
        group: m.group,
      })),
      exchanges,
    };
  },
  { services: [], exchanges: [] },
  { key: 'exchange-services:compare:v1', ttl: 180, tags: ['exchange-services', 'exchanges'] },
);
