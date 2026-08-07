/**
 * log-sources.ts — نگاشت منبع خام لاگ به سرویس (۲۰۲۶-۰۸-۰۷)
 * ─────────────────────────────────────────────────────────────
 *  باگی که این فایل حل می‌کند:
 *  `SERVICE_DEFS` در observability با کلیدهای `api`, `db`, `cache`, … تعریف
 *  شده بود و مستقیماً `perSource.get(def.id)` صدا زده می‌شد. اما منابعی که
 *  واقعاً در `SystemLog.source` نوشته می‌شوند این‌ها هستند:
 *
 *      api/auth · api/posts · api/payment · cron/rates · middleware · cache
 *
 *  یعنی از ۹ سرویس فقط `cache` تصادفاً مچ می‌شد و ۸ تای دیگر همیشه `idle`
 *  می‌ماندند. پنل «پرخطرترین سرویس‌ها» عملاً مرده بود.
 *
 *  راه‌حل: یک نگاشت الگویی که منبع خام را به سرویس canonical می‌رساند، بدون
 *  اینکه نویسندگان لاگ مجبور شوند قرارداد نام‌گذاری‌شان را عوض کنند.
 *
 *  قواعد:
 *   1. تطبیق روی مرز واژه انجام می‌شود (`/`, `_`, `.`, `:`, `-`) تا `apiary`
 *      اشتباهاً `api` تشخیص داده نشود.
 *   2. ترتیب مهم است: قاعده‌های خاص قبل از قاعدهٔ عام `api` می‌آیند، وگرنه
 *      `api/auth` به‌جای «احراز هویت» زیر «API اصلی» می‌رفت.
 *   3. منبعِ ناشناخته `null` برمی‌گرداند — به هیچ سرویسی نسبت داده نمی‌شود.
 *      حدس زدن بدتر از ندانستن است؛ این منابع در «سهم منابع» و «نقشهٔ گرما»
 *      با نام خام خودشان دیده می‌شوند.
 *
 *  فایل خالص و ایزومورفیک است.
 */

export type ServiceKey =
  | 'api'
  | 'db'
  | 'cache'
  | 'queue'
  | 'auth'
  | 'edge'
  | 'email'
  | 'sms'
  | 'storage';

export const SERVICE_KEYS: readonly ServiceKey[] = [
  'api',
  'db',
  'cache',
  'queue',
  'auth',
  'edge',
  'email',
  'sms',
  'storage',
] as const;

interface SourceRule {
  key: ServiceKey;
  match: RegExp;
}

/** مرز واژه در نام منبع — جداکننده یا ابتدا/انتهای رشته. */
const EDGE = '(?:^|[/_.:\\- ])';
const END = '(?:[/_.:\\- ]|$)';

const rule = (key: ServiceKey, words: readonly string[]): SourceRule => ({
  key,
  match: new RegExp(`${EDGE}(?:${words.join('|')})${END}`),
});

/**
 * ترتیب = اولویت. `api` عمداً آخرین قاعده است چون عام‌ترین است و باید فقط
 * وقتی برنده شود که هیچ قاعدهٔ خاص‌تری نگرفته باشد.
 */
const RULES: readonly SourceRule[] = [
  rule('auth', [
    'auth',
    'nextauth',
    'session',
    'sessions',
    'login',
    'signin',
    'signup',
    'logout',
    '2fa',
    'totp',
    'otp',
    'password',
    'permission',
    'permissions',
    'setup',
  ]),
  rule('db', [
    'db',
    'database',
    'prisma',
    'postgres',
    'postgresql',
    'pg',
    'sql',
    'query',
    'queries',
    'migration',
    'migrations',
    'seed',
  ]),
  rule('cache', ['cache', 'caching', 'redis', 'upstash', 'revalidate', 'safe-cache', 'isr']),
  rule('queue', [
    'queue',
    'cron',
    'job',
    'jobs',
    'worker',
    'workers',
    'scheduler',
    'schedule',
    'sync',
    'task',
    'tasks',
    'backup',
  ]),
  rule('edge', [
    'edge',
    'cdn',
    'middleware',
    'proxy',
    'pageview',
    'pageviews',
    'ratelimit',
    'rate-limit',
    'rate-limiter',
    'firewall',
  ]),
  rule('email', ['email', 'e-mail', 'mail', 'mailer', 'smtp', 'resend', 'nodemailer', 'newsletter']),
  rule('sms', ['sms', 'kavenegar', 'melipayamak', 'ghasedak', 'pishgam', 'telegram']),
  rule('storage', [
    'storage',
    's3',
    'bucket',
    'upload',
    'uploads',
    'file',
    'files',
    'media',
    'sharp',
    'image',
    'images',
    'asset',
    'assets',
  ]),
  rule('api', [
    'api',
    'route',
    'routes',
    'handler',
    'handlers',
    'action',
    'actions',
    'server-action',
    'endpoint',
    'rest',
    'graphql',
    'web',
    'servicerequest',
    'service-request',
  ]),
];

const KEY_SET: ReadonlySet<string> = new Set<string>(SERVICE_KEYS);

/**
 * منبع خام → سرویس canonical، یا `null` اگر نمی‌دانیم.
 *
 *   resolveServiceKey('api/auth')    → 'auth'
 *   resolveServiceKey('api/posts')   → 'api'
 *   resolveServiceKey('cron/rates')  → 'queue'
 *   resolveServiceKey('middleware')  → 'edge'
 *   resolveServiceKey('system')      → null
 */
export function resolveServiceKey(source: string | null | undefined): ServiceKey | null {
  if (typeof source !== 'string') return null;
  const raw = source.trim().toLowerCase();
  if (raw.length === 0) return null;
  if (KEY_SET.has(raw)) return raw as ServiceKey;
  for (const item of RULES) {
    if (item.match.test(raw)) return item.key;
  }
  return null;
}
