export function formatDate(date: Date | string | number | undefined): string {
  if (!date) return 'تاریخ نامشخص';

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'تاریخ نامعتبر';

  const now = new Date();
  const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return new Intl.RelativeTimeFormat('fa', { numeric: 'auto' }).format(
      -Math.round(diffInHours),
      'hour',
    );
  }
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(d);
}

