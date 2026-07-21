'use server';

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';

export type PatternType = 'currency' | 'format' | 'prefix' | 'suffix' | 'separator' | 'multiplier';

// تعداد تلاش‌های مجدد
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // میلی‌ثانیه

// تاخیر بین تلاش‌ها
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// بارگذاری همه الگوها از دیتابیس با تلاش مجدد
export async function loadPatternsFromDB(retryCount = 0) {
  try {
    const patterns = await prisma.currencyPattern.findMany();

    const result = {
      currencies: new Set<string>(),
      formats: new Set<string>(),
      prefixes: new Set<string>(),
      suffixes: new Set<string>(),
      separators: new Set<string>(),
      multipliers: new Map<string, number>(),
    };

    for (const pattern of patterns) {
      try {
        switch (pattern.type) {
          case 'currency':
            result.currencies.add(pattern.pattern);
            break;
          case 'format':
            result.formats.add(pattern.pattern);
            break;
          case 'prefix':
            result.prefixes.add(pattern.pattern);
            break;
          case 'suffix':
            result.suffixes.add(pattern.pattern);
            break;
          case 'separator':
            result.separators.add(pattern.pattern);
            break;
          case 'multiplier':
            if (pattern.value) {
              result.multipliers.set(pattern.pattern, pattern.value);
            }
            break;
        }
      } catch {
        // individual pattern parse errors are non-fatal — skip and continue
      }
    }

    return result;
  } catch {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return loadPatternsFromDB(retryCount + 1);
    }

    // در صورت شکست همه تلاش‌ها، مقادیر پیش‌فرض را برمی‌گردانیم
    return {
      currencies: new Set<string>(['دلار', 'یورو', 'پوند']),
      formats: new Set<string>(),
      prefixes: new Set<string>(),
      suffixes: new Set<string>(),
      separators: new Set<string>(['/', '|', '-']),
      multipliers: new Map<string, number>([
        ['هزار', 1000],
        ['میلیون', 1000000],
      ]),
    };
  }
}

// ذخیره الگوی جدید در دیتابیس با تلاش مجدد
export async function savePatternToDB(
  type: PatternType,
  pattern: string,
  value?: number,
  retryCount = 0,
) {
  try {
    // 2026-07-08 (H8): these are DB writes exposed as server actions — gate
    // them behind ADMIN. Without this, any caller could overwrite patterns.
    const auth = await requireAdmin();
    if (!auth.success) return false;

    await prisma.currencyPattern.upsert({
      where: {
        type_pattern: {
          type,
          pattern,
        },
      },
      update: value ? { value } : {},
      create: {
        type,
        pattern,
        value,
      },
    });
    return true;
  } catch {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return savePatternToDB(type, pattern, value, retryCount + 1);
    }

    return false;
  }
}

// ذخیره مجموعه‌ای از الگوها با مدیریت خطا
export async function savePatternsGroupToDB(
  patterns: {
    currencies?: Set<string>;
    formats?: Set<string>;
    prefixes?: Set<string>;
    suffixes?: Set<string>;
    separators?: Set<string>;
    multipliers?: Map<string, number>;
  },
  retryCount = 0,
) {
  try {
    // 2026-07-08 (H8): gate the bulk write behind ADMIN.
    const auth = await requireAdmin();
    if (!auth.success) return false;

    let _successCount = 0;
    let failureCount = 0;

    const addPromise = async (type: PatternType, ptn: string, val?: number) => {
      try {
        const result = await savePatternToDB(type, ptn, val);
        if (result) _successCount++;
        else failureCount++;
      } catch {
        failureCount++;
      }
    };

    // پردازش هر دسته از الگوها به صورت جداگانه
    if (patterns.currencies) {
      for (const ptn of patterns.currencies) {
        await addPromise('currency', ptn);
      }
    }

    if (patterns.formats) {
      for (const ptn of patterns.formats) {
        await addPromise('format', ptn);
      }
    }

    if (patterns.prefixes) {
      for (const ptn of patterns.prefixes) {
        await addPromise('prefix', ptn);
      }
    }

    if (patterns.suffixes) {
      for (const ptn of patterns.suffixes) {
        await addPromise('suffix', ptn);
      }
    }

    if (patterns.separators) {
      for (const ptn of patterns.separators) {
        await addPromise('separator', ptn);
      }
    }

    if (patterns.multipliers) {
      for (const [ptn, val] of patterns.multipliers.entries()) {
        await addPromise('multiplier', ptn, val);
      }
    }

    return failureCount === 0;
  } catch {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return savePatternsGroupToDB(patterns, retryCount + 1);
    }

    return false;
  }
}
