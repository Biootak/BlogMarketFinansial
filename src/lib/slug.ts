/**
 * slug.ts — pure slug helpers (client-safe).
 *
 * Extracted from `lib/utils.ts` so client components (e.g. the Tags manager
 * dialog) can preview the EXACT slug the server will generate — without
 * dragging DOM sanitizers / heavy modules into the client bundle.
 *
 * The server keeps using these same functions, so the preview always matches
 * what `createTag` / `updateTag` persist.
 */

import { persianToEnglishDictionary } from './persian-dictionary';

// نویسه‌گردانی فارسی به انگلیسی (Transliteration) - برای کلماتی که در دیکشنری نیستند
const persianToEnglishMap: Record<string, string> = {
  ا: 'a',
  آ: 'a',
  ب: 'b',
  پ: 'p',
  ت: 't',
  ث: 's',
  ج: 'j',
  چ: 'ch',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  ژ: 'zh',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'z',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'gh',
  ک: 'k',
  گ: 'g',
  ل: 'l',
  م: 'm',
  ن: 'n',
  و: 'o',
  ه: 'h',
  ی: 'i',
  ي: 'i',
  ئ: 'i',
  ء: '',
  ة: 'h',
  ؤ: 'o',
  إ: 'e',
  أ: 'a',
  ـ: '',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

// تبدیل یک کلمه فارسی به انگلیسی
const translateWord = (word: string): string => {
  const normalized = word.trim();
  // اول چک کن در دیکشنری هست یا نه
  if (persianToEnglishDictionary[normalized]) {
    return persianToEnglishDictionary[normalized];
  }
  // اگر نبود، نویسه‌گردانی کن
  let result = '';
  for (const char of normalized) {
    if (persianToEnglishMap[char] !== undefined) {
      result += persianToEnglishMap[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result;
};

export const generateSlug = (title: string): string => {
  // جدا کردن کلمات با فاصله و نیم‌فاصله
  const words = title.split(/[\s\u200C]+/).filter((w) => w.length > 0);

  // ترجمه هر کلمه
  const translatedWords = words.map(translateWord).filter((w) => w.length > 0);

  // اتصال کلمات با خط فاصله
  let slug = translatedWords.join('-');

  // حذف کاراکترهای غیرمجاز
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // حذف خط فاصله‌های تکراری
  slug = slug.replace(/-+/g, '-');

  // حذف خط فاصله از ابتدا و انتها
  slug = slug.replace(/^-+|-+$/g, '');

  // اطمینان از اینکه اسلاگ با عدد شروع نمی‌شود
  if (/^[0-9]/.test(slug)) {
    slug = `post-${slug}`;
  }

  // محدود کردن طول اسلاگ به 100 کاراکتر
  if (slug.length > 100) {
    slug = slug.slice(0, 100).replace(/-[^-]*$/, '');
  }

  return slug || 'untitled';
};

export function validateSlug(slug: string): boolean {
  // این الگو اجازه می‌دهد اسلاگ با حروف کوچک، اعداد، و خط فاصله شروع شود
  // و می‌تواند شامل خط فاصله در میان کلمات باشد، اما نباید با خط فاصله تمام شود
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}
