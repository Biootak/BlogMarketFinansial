export const persianMonths = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const persianWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function toPersianDate(date: Date): { year: number; month: number; day: number } {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();

  let jY;
  let jM;
  let jD;
  const gy = gregorianYear - 1600;
  const gm = gregorianMonth - 1;
  const gd = gregorianDay - 1;
  let g_day_no =
    365 * gy +
    Math.floor((gy + 3) / 4) -
    Math.floor((gy + 99) / 100) +
    Math.floor((gy + 399) / 400);
  let i;

  for (i = 0; i < gm; ++i) g_day_no += [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i];
  if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) ++g_day_no;
  g_day_no += gd;

  let j_day_no = g_day_no - 79;
  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  jY = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jY += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  for (i = 0; i < 11 && j_day_no >= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i]; ++i)
    j_day_no -= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
  jM = i + 1;
  jD = j_day_no + 1;

  return { year: jY, month: jM, day: jD };
}

export function fromPersianDate(jY: number, jM: number, jD: number): Date {
  let gY = jY + 621;
  const march = { 0: 21, 1: 20, 2: 19, 3: 18 }[jY % 4] || 20;
  const days = jM <= 6 ? jM * 31 - 31 + jD : (jM - 6) * 30 + jD + 186 - 31;

  if (days > 286) gY++;

  const gy = gY - 1;
  const gd = days + march;
  const gm = Math.floor(
    (gy % 4 !== 0
      ? [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
      : [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])[Math.floor(gd / 30.44)] +
      (gd % 30.44),
  );

  return new Date(gy + 1900, Math.floor(gm / 31), gm % 31);
}
