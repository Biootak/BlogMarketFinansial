// scripts/smoke-market-rates.mjs
// اجرا: node scripts/smoke-market-rates.mjs

import { SYMBOL_REGISTRY, TGJU_KEY_TO_SYMBOL, ALL_SYMBOLS } from '../src/lib/market-rates/registry.ts';
import { formatWithUnit, formatChangePercent } from '../src/lib/market-rates/format.ts';

let pass = 0, fail = 0;

function test(name, actual, expected) {
  if (actual === expected) {
    console.log('  ✓', name, '→', JSON.stringify(actual));
    pass++;
  } else {
    console.log('  ✗', name, '→ got', JSON.stringify(actual), 'expected', JSON.stringify(expected));
    fail++;
  }
}

console.log('=== Registry ===');
test('22 symbols', ALL_SYMBOLS.length, 22);
test('IRAN_USD priority', SYMBOL_REGISTRY.find((s) => s.symbol === 'IRAN_USD')?.priority, 1);
test('GLOBAL_OUNCE_GOLD unit', SYMBOL_REGISTRY.find((s) => s.symbol === 'GLOBAL_OUNCE_GOLD')?.unit, 'usd');
test('GLOBAL_OUNCE_GOLD divisor', SYMBOL_REGISTRY.find((s) => s.symbol === 'GLOBAL_OUNCE_GOLD')?.divisor, 1);
test('IRAN_USD divisor (rial/10)', SYMBOL_REGISTRY.find((s) => s.symbol === 'IRAN_USD')?.divisor, 10);
test('TGJU key lookup', TGJU_KEY_TO_SYMBOL.get('price_dollar_rl'), 'IRAN_USD');
test('TGJU key ons', TGJU_KEY_TO_SYMBOL.get('ons'), 'GLOBAL_OUNCE_GOLD');

console.log('=== formatWithUnit (probe values from 2026-06-20) ===');
// Intl fa-IR از ٬ (U+066C) برای هزارگان و ٫ (U+066B) برای اعشار استفاده می‌کند
test('USD 161,500 toman', formatWithUnit(161500, 'toman', 0), '۱۶۱٬۵۰۰ تومان');
test('SEKKEH 167,990,000 toman', formatWithUnit(167990000, 'toman', 0), '۱۶۷٬۹۹۰٬۰۰۰ تومان');
test('GOLD18K 16,221,000 toman', formatWithUnit(16221000, 'toman', 0), '۱۶٬۲۲۱٬۰۰۰ تومان');
test('OUNCE 4,160.26 usd', formatWithUnit(4160.26, 'usd', 2), '۴٬۱۶۰٫۲۶ دلار');
test('EUR toman', formatWithUnit(1852300, 'toman', 0), '۱٬۸۵۲٬۳۰۰ تومان');
test('zero', formatWithUnit(0, 'toman', 0), '—');
test('NaN', formatWithUnit(NaN, 'toman', 0), '—');

console.log('=== formatChangePercent ===');
test('+3.19', formatChangePercent(3.19), '+۳.۱۹%');
test('-1.20', formatChangePercent(-1.2), '−۱.۲۰%');
test('0', formatChangePercent(0), '۰.۰۰%');
test('NaN', formatChangePercent(NaN), '۰.۰۰%');

console.log('');
console.log('Total:', pass, 'pass,', fail, 'fail');
process.exit(fail > 0 ? 1 : 0);
