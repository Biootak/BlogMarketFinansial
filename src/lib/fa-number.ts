// 2026-06-23: Persian numerals helper.
export function formatFaNumber(input: number | string): string {
  const s = typeof input === 'number' ? String(input) : input;
  try {
    // Use locale, but fa-IR isn't always present. Type coercion is safe.
    return (Number(s) === Number(s) ? Number(s) : s).toLocaleString('fa-IR');
  } catch {
    const map = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return s.replace(/[0-9]/g, (d) => map[Number(d)]);
  }
}

export function localTimeShortFa(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return formatFaNumber(d.getHours()) + ':' + formatFaNumber(d.getMinutes());
  }
}
