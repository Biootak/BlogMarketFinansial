'use server';

import prisma from "@/lib/db";

export type PatternType = 'currency' | 'format' | 'prefix' | 'suffix' | 'separator' | 'multiplier';

// تعداد تلاش‌های مجدد
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // میلی‌ثانیه

// تاخیر بین تلاش‌ها
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      multipliers: new Map<string, number>()
    };

    patterns.forEach(pattern => {
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
      } catch (error) {
        console.error('خطا در پردازش الگو:', pattern, error);
      }
    });

    return result;
  } catch (error) {
    console.error(`تلاش ${retryCount + 1} برای بارگذاری الگوها با خطا مواجه شد:`, error);
    
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
        ['میلیون', 1000000]
      ])
    };
  }
}

// ذخیره الگوی جدید در دیتابیس با تلاش مجدد
export async function savePatternToDB(type: PatternType, pattern: string, value?: number, retryCount = 0) {
  try {
    await prisma.currencyPattern.upsert({
      where: {
        type_pattern: {
          type,
          pattern
        }
      },
      update: value ? { value } : {},
      create: {
        type,
        pattern,
        value
      }
    });
    return true;
  } catch (error) {
    console.error(`تلاش ${retryCount + 1} برای ذخیره الگو با خطا مواجه شد:`, error);
    
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return savePatternToDB(type, pattern, value, retryCount + 1);
    }
    
    return false;
  }
}

// ذخیره مجموعه‌ای از الگوها با مدیریت خطا
export async function savePatternsGroupToDB(patterns: {
  currencies?: Set<string>;
  formats?: Set<string>;
  prefixes?: Set<string>;
  suffixes?: Set<string>;
  separators?: Set<string>;
  multipliers?: Map<string, number>;
}, retryCount = 0) {
  try {
    let successCount = 0;
    let failureCount = 0;

    const addPromise = async (type: PatternType, pattern: string, value?: number) => {
      try {
        const result = await savePatternToDB(type, pattern, value);
        if (result) successCount++;
        else failureCount++;
      } catch (error) {
        failureCount++;
        console.error('خطا در ذخیره الگو:', { type, pattern, value }, error);
      }
    };

    // پردازش هر دسته از الگوها به صورت جداگانه
    if (patterns.currencies) {
      for (const pattern of patterns.currencies) {
        await addPromise('currency', pattern);
      }
    }

    if (patterns.formats) {
      for (const pattern of patterns.formats) {
        await addPromise('format', pattern);
      }
    }

    if (patterns.prefixes) {
      for (const pattern of patterns.prefixes) {
        await addPromise('prefix', pattern);
      }
    }

    if (patterns.suffixes) {
      for (const pattern of patterns.suffixes) {
        await addPromise('suffix', pattern);
      }
    }

    if (patterns.separators) {
      for (const pattern of patterns.separators) {
        await addPromise('separator', pattern);
      }
    }

    if (patterns.multipliers) {
      for (const [pattern, value] of patterns.multipliers.entries()) {
        await addPromise('multiplier', pattern, value);
      }
    }

    return failureCount === 0;

  } catch (error) {
    console.error(`تلاش ${retryCount + 1} برای ذخیره گروهی الگوها با خطا مواجه شد:`, error);
    
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return savePatternsGroupToDB(patterns, retryCount + 1);
    }
    
    return false;
  }
}
