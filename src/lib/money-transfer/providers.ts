/**
 * money-transfer/providers
 * ----------------------------------------------------------------------------
 * لیست provider های صرافی/انتقال پول که برای مقایسه نرخ استفاده می‌شوند.
 *
 * هر provider یک `spreadPercent` (کارمزد ضمنی روی نرخ بازار) دارد. این مقدار
 * روی نرخ بازار آزاد (TGJU) اعمال می‌شود تا نرخ فروش/خرید آن صرافی شبیه‌سازی
 * شود. در آینده می‌توان از API واقعی هر provider استفاده کرد.
 *
 * 2026-07-05: Initial scaffold برای صفحه‌ی money-transfer.
 * ----------------------------------------------------------------------------
 */

export type TransferKind = 'صرافی' | 'سرویس آنلاین' | 'بانک' | 'رمزارز';

export interface TransferProvider {
  /** slug یکتا برای routing/keys */
  id: string;
  /** نام نمایشی فارسی */
  name: string;
  /** نوع سرویس */
  kind: TransferKind;
  /** درصد markup روی نرخ بازار (مثلاً 1.5 یعنی ۱.۵٪ بالاتر از بازار) */
  spreadPercent: number;
  /** کارمزد ثابت به تومان (برای مبالغ بالای صفر) */
  flatFeeToman: number;
  /** سرعت انتقال (دقیقه) */
  speedMinutes: number;
  /** پرچم feature ها */
  features: ReadonlyArray<'live-rate' | 'fee-transparent' | 'cash-pickup' | 'bank-transfer'>;
  /** وضعیت فعال بودن */
  active: boolean;
}

export const TRANSFER_PROVIDERS: ReadonlyArray<TransferProvider> = [
  {
    id: 'market-mid',
    name: 'نرخ میانگین بازار',
    kind: 'صرافی',
    spreadPercent: 0,
    flatFeeToman: 0,
    speedMinutes: 0,
    features: ['live-rate', 'fee-transparent'],
    active: true,
  },
  {
    id: 'tgju',
    name: 'TGJU (مرجع)',
    kind: 'صرافی',
    spreadPercent: 0.2,
    flatFeeToman: 0,
    speedMinutes: 5,
    features: ['live-rate', 'fee-transparent'],
    active: true,
  },
  {
    id: 'sarafi-online',
    name: 'صرافی آنلاین آریا',
    kind: 'صرافی',
    spreadPercent: 0.9,
    flatFeeToman: 15_000,
    speedMinutes: 15,
    features: ['live-rate', 'bank-transfer'],
    active: true,
  },
  {
    id: 'bit-24',
    name: 'بیت ۲۴',
    kind: 'رمزارز',
    spreadPercent: 1.4,
    flatFeeToman: 25_000,
    speedMinutes: 30,
    features: ['live-rate', 'fee-transparent', 'bank-transfer'],
    active: true,
  },
  {
    id: 'remitly-class',
    name: 'ریمیتلی (Economy)',
    kind: 'سرویس آنلاین',
    spreadPercent: 2.1,
    flatFeeToman: 45_000,
    speedMinutes: 60 * 24, // 1 روز کاری
    features: ['fee-transparent', 'bank-transfer', 'cash-pickup'],
    active: true,
  },
  {
    id: 'wise',
    name: 'Wise',
    kind: 'سرویس آنلاین',
    spreadPercent: 0.7,
    flatFeeToman: 35_000,
    speedMinutes: 60 * 4,
    features: ['live-rate', 'fee-transparent', 'bank-transfer'],
    active: true,
  },
  {
    id: 'melli-bank',
    name: 'بانک ملی (حواله بانکی)',
    kind: 'بانک',
    spreadPercent: 1.8,
    flatFeeToman: 80_000,
    speedMinutes: 60 * 48,
    features: ['bank-transfer'],
    active: true,
  },
] as const;
