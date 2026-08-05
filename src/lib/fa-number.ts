// 2026-06-23: Persian numerals helper.

// Module-level singletons — created once, never per call
const _faNum = new Intl.NumberFormat('fa-IR');
const _faTimeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });

export function formatFaNumber(input: number | string): string {
  const s = typeof input === 'number' ? String(input) : input;
  try {
    const n = Number(s);
    if (!Number.isNaN(n)) return _faNum.format(n);
    // Non-numeric string: just swap digits
    const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return s.replace(/[0-9]/g, (digit) => map[Number(digit)]);
  } catch {
    const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return s.replace(/[0-9]/g, (d) => map[Number(d)]);
  }
}

export function localTimeShortFa(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return _faTimeFmt.format(d);
  } catch {
    return `${formatFaNumber(d.getHours())}:${formatFaNumber(d.getMinutes())}`;
  }
}
