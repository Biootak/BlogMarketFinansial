/**
 * rateItem.ts — تست‌های واحد
 *
 * این ماژول تنها جایی است که فرمت آزادِ `RateList.rates[].value` را می‌شناسد:
 *   "1234"  |  "1234|5678"  |  "خرید: 1234 | فروش: 5678"
 * تست‌ها هر سه شکل + جداکننده‌های فارسی/لاتین + dedupe بین لیست‌ها را پوشش می‌دهند.
 */

import { groupRateItems, parseRateItem } from '@/lib/rateItem';
import { describe, expect, it } from 'vitest';

// ─── parseRateItem ────────────────────────────────────────────────────────────

describe('parseRateItem', () => {
  it('مقدار تک → buy پر، sell خالی، isPair=false', () => {
    expect(parseRateItem({ title: 'دالر', value: '1234' })).toEqual({
      title: 'دالر',
      buy: '1234',
      sell: null,
      buySuffix: '',
      sellSuffix: '',
      buyNum: 1234,
      sellNum: 0,
      isPair: false,
    });
  });

  it('جفت «buy|sell» → هر دو مقدار و isPair=true', () => {
    const parsed = parseRateItem({ title: 'دالر', value: '1234|5678' });
    expect(parsed).toMatchObject({ buy: '1234', sell: '5678', buyNum: 1234, sellNum: 5678 });
    expect(parsed.isPair).toBe(true);
  });

  it('پیشوندهای فارسی «خرید:»/«فروش:» حذف می‌شوند', () => {
    const parsed = parseRateItem({ title: 'دالر', value: 'خرید: 1234 | فروش: 5678' });
    expect(parsed.buy).toBe('1234');
    expect(parsed.sell).toBe('5678');
  });

  it('پیشوند بدون دو نقطه هم پشتیبانی می‌شود', () => {
    const parsed = parseRateItem({ title: 'دالر', value: 'خرید 1234 | فروش 5678' });
    expect(parsed.buyNum).toBe(1234);
    expect(parsed.sellNum).toBe(5678);
  });

  it('واحد بعد از عدد به‌عنوان suffix استخراج می‌شود', () => {
    const parsed = parseRateItem({ title: 'دالر', value: '1234 افغانی | 5678 افغانی' });
    expect(parsed.buySuffix).toBe('افغانی');
    expect(parsed.sellSuffix).toBe('افغانی');
    expect(parsed.buyNum).toBe(1234);
  });

  it('جداکننده هزار لاتین و فارسی حذف می‌شود', () => {
    expect(parseRateItem({ title: 'x', value: '1,234' }).buyNum).toBe(1234);
    expect(parseRateItem({ title: 'x', value: '1٬234' }).buyNum).toBe(1234);
  });

  it('مقدار اعشاری parse می‌شود', () => {
    expect(parseRateItem({ title: 'x', value: '70.55 افغانی' }).buyNum).toBeCloseTo(70.55, 6);
  });

  it('مقدار خالی → همه فیلدها تهی/صفر', () => {
    expect(parseRateItem({ title: 'دالر', value: '' })).toMatchObject({
      buy: null,
      sell: null,
      buyNum: 0,
      sellNum: 0,
      isPair: false,
    });
  });

  it('فاصله‌های اضافه trim می‌شوند', () => {
    expect(parseRateItem({ title: 'x', value: '   1234   ' }).buy).toBe('1234');
  });

  it('جفت با بخش فروش خالی → sell = null ولی isPair=true', () => {
    const parsed = parseRateItem({ title: 'x', value: '1234|' });
    expect(parsed.sell).toBeNull();
    expect(parsed.sellNum).toBe(0);
    expect(parsed.isPair).toBe(true);
  });

  it('مقدار غیرعددی → num صفر و suffix همان متن', () => {
    const parsed = parseRateItem({ title: 'x', value: 'ناموجود' });
    expect(parsed.buyNum).toBe(0);
    expect(parsed.buySuffix).toBe('ناموجود');
  });

  it('title غیرموجود → رشته خالی', () => {
    expect(parseRateItem({ title: '', value: '10' }).title).toBe('');
  });
});

// ─── groupRateItems ───────────────────────────────────────────────────────────

describe('groupRateItems', () => {
  it('لیست خالی → flat و byList خالی', () => {
    expect(groupRateItems([])).toEqual({ flat: [], byList: [] });
  });

  it('لیست بدون rates نادیده گرفته می‌شود', () => {
    const grouped = groupRateItems([{ id: 'l1', title: 'خالی', rates: [] }]);
    expect(grouped.byList).toEqual([]);
    expect(grouped.flat).toEqual([]);
  });

  it('هر لیست با items خودش در byList می‌آید', () => {
    const grouped = groupRateItems([
      { id: 'l1', title: 'ارز', rates: [{ title: 'دالر', value: '70|71' }] },
      { id: 'l2', title: 'طلا', rates: [{ title: 'مثقال', value: '1000' }] },
    ]);
    expect(grouped.byList.map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(grouped.byList[0]?.items[0]?.buyNum).toBe(70);
  });

  it('flat منبع هر آیتم را نگه می‌دارد', () => {
    const grouped = groupRateItems([
      { id: 'l1', title: 'ارز', rates: [{ title: 'دالر', value: '70' }] },
    ]);
    expect(grouped.flat[0]).toMatchObject({ sourceListId: 'l1', sourceListTitle: 'ارز' });
  });

  it('عنوان تکراری بین لیست‌ها فقط یک‌بار در flat می‌آید (اولویت لیست اول)', () => {
    const grouped = groupRateItems([
      { id: 'l1', title: 'اصلی', rates: [{ title: 'دالر', value: '70' }] },
      { id: 'l2', title: 'دومی', rates: [{ title: 'دالر', value: '99' }] },
    ]);
    expect(grouped.flat).toHaveLength(1);
    expect(grouped.flat[0]?.sourceListId).toBe('l1');
    // byList همه را نگه می‌دارد — dedupe فقط روی flat است
    expect(grouped.byList).toHaveLength(2);
  });

  it('نرمال‌سازی عنوان: فاصله و نیم‌فاصله و حروف بزرگ نادیده گرفته می‌شوند', () => {
    const grouped = groupRateItems([
      { id: 'l1', title: 'a', rates: [{ title: 'US Dollar', value: '70' }] },
      { id: 'l2', title: 'b', rates: [{ title: 'usdollar', value: '71' }] },
    ]);
    expect(grouped.flat).toHaveLength(1);
  });

  it('عنوان خالی از dedupe مستثنا است', () => {
    const grouped = groupRateItems([
      { id: 'l1', title: 'a', rates: [{ title: '', value: '70' }] },
      { id: 'l2', title: 'b', rates: [{ title: '', value: '71' }] },
    ]);
    expect(grouped.flat).toHaveLength(2);
  });
});
