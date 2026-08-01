'use client';

import { useState, useTransition } from 'react';
import {
  type BankRow,
  type CreditRateRow,
  type CreditRateAggregate,
  createBank,
  updateBank,
  deleteBank,
  createCreditRate,
  updateCreditRate,
  archiveCreditRate,
} from '@/actions/credit-rates';
import { PageHeader, Section, StatGrid, StatCard } from '@/components/Dashboard/primitives';
import { TYPE_FA } from '@/lib/credit-rate-constants';
import {
  Building2,
  Percent,
  Plus,
  Edit2,
  Trash2,
  Archive,
  X,
  ExternalLink,
  Globe,
  Coins,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CreditRateType } from '@prisma/client';

interface Props {
  initialBanks: BankRow[];
  initialRates: CreditRateRow[];
  initialAggregates: CreditRateAggregate | null;
}

export default function CreditRatesClient({
  initialBanks,
  initialRates,
  initialAggregates,
}: Props) {
  const [banks, setBanks] = useState<BankRow[]>(initialBanks);
  const [rates, setRates] = useState<CreditRateRow[]>(initialRates);
  const [aggregates, setAggregates] = useState<CreditRateAggregate | null>(initialAggregates);
  const [activeTab, setActiveTab] = useState<'rates' | 'banks'>('rates');

  const [isPending, startTransition] = useTransition();

  // Modals / Forms States
  const [bankModal, setBankModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data?: Partial<BankRow>;
  }>({ open: false, mode: 'create' });

  const [rateModal, setRateModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data?: Partial<CreditRateRow>;
  }>({ open: false, mode: 'create' });

  const [error, setError] = useState<string | null>(null);

  // Filter States for Rates
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterBank, setFilterBank] = useState<string>('ALL');

  const filteredRates = rates.filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterBank !== 'ALL' && r.bankId !== filterBank) return false;
    return r.status !== 'ARCHIVED';
  });

  // Helpers
  const fmtCents = (cents: number) => {
    return new Intl.NumberFormat('fa-IR').format(cents / 100);
  };

  const handleBankSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      id: bankModal.data?.id,
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      displayName: formData.get('displayName') as string || null,
      country: formData.get('country') as string || 'AF',
      city: formData.get('city') as string || null,
      logoUrl: formData.get('logoUrl') as string || null,
      website: formData.get('website') as string || null,
      licenseNo: formData.get('licenseNo') as string || null,
      status: formData.get('status') as any || 'ACTIVE',
      isVisible: formData.get('isVisible') === 'true',
      sortOrder: Number(formData.get('sortOrder') || 0),
      description: formData.get('description') as string || null,
    };

    startTransition(async () => {
      let res;
      if (bankModal.mode === 'create') {
        res = await createBank(data);
      } else {
        res = await updateBank(data);
      }

      if (res.success) {
        if (res.data) {
          const newData = res.data;
          if (bankModal.mode === 'create') {
            setBanks((prev) => [...prev, newData]);
          } else {
            setBanks((prev) =>
              prev.map((b) => (b.id === newData.id ? newData : b))
            );
          }
          setBankModal({ open: false, mode: 'create' });
        }
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleBankDelete = async (id: string) => {
    if (!confirm('آیا از حذف این بانک اطمینان دارید؟ تمام نرخ‌های مربوطه نیز حذف خواهند شد.')) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteBank(id);
      if (res.success) {
        setBanks((prev) => prev.filter((b) => b.id !== id));
        setRates((prev) => prev.filter((r) => r.bankId !== id));
      } else {
        alert(res.error?.message ?? 'حذف ناموفق بود');
      }
    });
  };

  const handleRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      id: rateModal.data?.id,
      bankId: formData.get('bankId') as string,
      type: formData.get('type') as CreditRateType,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      annualRate: Number(formData.get('annualRate') || 0),
      minAmountCents: Number(formData.get('minAmount') || 0) * 100,
      maxAmountCents: Number(formData.get('maxAmount') || 0) * 100,
      maxTermMonths: Number(formData.get('maxTermMonths') || 0),
      depositRatio: formData.get('depositRatio') ? Number(formData.get('depositRatio')) : null,
      currency: formData.get('currency') as string || 'AFN',
      status: formData.get('status') as any || 'ACTIVE',
      source: formData.get('source') as string || null,
      sortOrder: Number(formData.get('sortOrder') || 0),
      internalNote: formData.get('internalNote') as string || null,
    };

    startTransition(async () => {
      let res;
      if (rateModal.mode === 'create') {
        res = await createCreditRate(data);
      } else {
        res = await updateCreditRate(data);
      }

      if (res.success) {
        if (res.data) {
          const newData = res.data;
          if (rateModal.mode === 'create') {
            setRates((prev) => [...prev, newData]);
          } else {
            setRates((prev) =>
              prev.map((r) => (r.id === newData.id ? newData : r))
            );
          }
          setRateModal({ open: false, mode: 'create' });
        }
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleRateArchive = async (id: string) => {
    if (!confirm('آیا از آرشیو کردن این نرخ اطمینان دارید؟')) return;
    setError(null);
    startTransition(async () => {
      const res = await archiveCreditRate(id);
      if (res.success) {
        setRates((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.error?.message ?? 'آرشیو ناموفق بود');
      }
    });
  };

  return (
    <main className="mx-auto flex flex-col w-full max-w-7xl p-6 gap-8" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نرخ‌های اعتباری' }]}
        title="نرخ‌های اعتباری و بانک‌ها"
        description="مدیریت نرخ‌های بهره بانکی، تسهیلات اعتباری، و حساب‌های سپرده"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setBankModal({ open: true, mode: 'create' })}
              className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold transition-all hover:bg-muted/80"
            >
              <Building2 size={16} />
              افزودن بانک
            </button>
            <button
              onClick={() => setRateModal({ open: true, mode: 'create' })}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              disabled={banks.length === 0}
            >
              <Plus size={16} />
              ثبت نرخ جدید
            </button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      {aggregates && (
        <StatGrid cols={4}>
          <StatCard
            label="کل بانک‌های تحت مدیریت"
            value={aggregates.bankCount}
            icon={<Building2 className="text-blue-500" />}
            format="persian"
          />
          <StatCard
            label="کل محصولات اعتباری فعال"
            value={aggregates.rateCount}
            icon={<Percent className="text-emerald-500" />}
            format="persian"
          />
          {aggregates.bestDeposit && (
            <StatCard
              label={`بهترین سپرده (${aggregates.bestDeposit.bank?.name})`}
              value={`${aggregates.bestDeposit.annualRate}٪`}
              icon={<TrendingUp className="text-amber-500" />}
              format="latin"
              info={aggregates.bestDeposit.title}
            />
          )}
          {aggregates.cheapestLoan && (
            <StatCard
              label={`تسهیلات مناسب (${aggregates.cheapestLoan.bank?.name})`}
              value={`${aggregates.cheapestLoan.annualRate}٪`}
              icon={<Percent className="text-rose-500" />}
              format="latin"
              info={aggregates.cheapestLoan.title}
            />
          )}
        </StatGrid>
      )}

      {/* Workspace Tabs */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'rates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          مدیریت نرخ‌های بهره
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'banks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          بانک‌های همکار ({banks.length})
        </button>
      </div>

      {activeTab === 'rates' ? (
        <Section title="لیست نرخ‌های اعتباری" icon={<Percent size={20} />}>
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6 bg-muted/20 p-4 rounded-2xl border border-border/50">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">نوع محصول اعتباری</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none transition-colors"
                >
                  <option value="ALL">همه انواع تسهیلات</option>
                  {Object.entries(TYPE_FA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">بانک صادرکننده</label>
                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none transition-colors"
                >
                  <option value="ALL">همه بانک‌ها</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName || b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground font-medium">
              تعداد موارد یافت شده:{' '}
              <span className="text-foreground font-bold">{filteredRates.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-xl shadow-muted/5">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30">
                  <th className="p-4 font-bold text-muted-foreground">بانک</th>
                  <th className="p-4 font-bold text-muted-foreground">نوع</th>
                  <th className="p-4 font-bold text-muted-foreground">عنوان طرح</th>
                  <th className="p-4 font-bold text-muted-foreground">نرخ سالانه</th>
                  <th className="p-4 font-bold text-muted-foreground">دامنه مبلغ</th>
                  <th className="p-4 font-bold text-muted-foreground">حداکثر مدت زمان</th>
                  <th className="p-4 font-bold text-muted-foreground">وضعیت</th>
                  <th className="p-4 font-bold text-muted-foreground">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      هیچ نرخ اعتباری منطبق با فیلترها یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((r) => (
                    <tr key={r.id} className="transition-all hover:bg-muted/10">
                      <td className="p-4 flex items-center gap-3">
                        {r.bank?.logoUrl ? (
                          <img
                            src={r.bank.logoUrl}
                            alt={r.bank.name}
                            className="size-8 rounded-lg object-contain bg-white border p-1"
                          />
                        ) : (
                          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold border">
                            B
                          </div>
                        )}
                        <div>
                          <div className="font-bold">{r.bank?.displayName || r.bank?.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.bank?.slug}</div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-muted-foreground">
                        {TYPE_FA[r.type]}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{r.title}</div>
                        {r.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-primary text-base">
                        {r.annualRate}٪
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">
                        {r.minAmountCents === 0 && r.maxAmountCents === 0 ? (
                          <span>بدون محدودیت</span>
                        ) : (
                          <span>
                            {fmtCents(r.minAmountCents)} الی {fmtCents(r.maxAmountCents)}{' '}
                            {r.currency}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        {r.maxTermMonths === 0 ? 'نامحدود' : `${r.maxTermMonths} ماه`}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {r.status === 'ACTIVE' ? 'فعال' : 'پیش‌نویس'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRateModal({ open: true, mode: 'edit', data: r })}
                            className="p-1.5 rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                            title="ویرایش"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleRateArchive(r.id)}
                            className="p-1.5 rounded-lg text-muted-foreground transition-all hover:bg-rose-500/10 hover:text-rose-500"
                            title="آرشیو"
                          >
                            <Archive size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <Section title="مدیریت بانک‌های همکار" icon={<Building2 size={20} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map((b) => (
              <div
                key={b.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:bg-muted/5 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    {b.logoUrl ? (
                      <img
                        src={b.logoUrl}
                        alt={b.name}
                        className="size-12 rounded-xl object-contain bg-white border p-1"
                      />
                    ) : (
                      <div className="size-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center text-xl font-bold border">
                        {b.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-base">{b.displayName || b.name}</h4>
                      <p className="text-xs text-muted-foreground">{b.city || 'افغانستان'}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      b.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}
                  >
                    {b.status === 'ACTIVE' ? 'فعال' : b.status}
                  </span>
                </div>

                {b.description && (
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {b.description}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                  <div className="flex gap-2">
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Globe size={14} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBankModal({ open: true, mode: 'edit', data: b })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="ویرایش"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleBankDelete(b.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* --- BANK MODAL --- */}
      {bankModal.open && (
        <dialog
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 w-full h-full"
          open
        >
          <div className="bg-background rounded-2xl border border-border w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 size={18} />
                {bankModal.mode === 'create' ? 'ثبت بانک جدید' : 'ویرایش بانک'}
              </h3>
              <button
                onClick={() => setBankModal({ open: false, mode: 'create' })}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">کد یکتا (Slug)</label>
                  <input
                    name="slug"
                    type="text"
                    required
                    defaultValue={bankModal.data?.slug}
                    pattern="^[a-z0-9-]+$"
                    title="فقط حروف کوچک، اعداد و خط تیره"
                    placeholder="مثال: pashtany-bank"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={bankModal.mode === 'edit'}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">نام رسمی</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={bankModal.data?.name}
                    placeholder="Pashtany Bank"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">نام نمایشی (فارسی)</label>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={bankModal.data?.displayName || ''}
                    placeholder="بانک پشتنی"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">کد کشور</label>
                  <input
                    name="country"
                    type="text"
                    maxLength={2}
                    defaultValue={bankModal.data?.country || 'AF'}
                    placeholder="AF"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">شهر</label>
                  <input
                    name="city"
                    type="text"
                    defaultValue={bankModal.data?.city || ''}
                    placeholder="کابل"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">شماره مجوز فعالیت</label>
                  <input
                    name="licenseNo"
                    type="text"
                    defaultValue={bankModal.data?.licenseNo || ''}
                    placeholder="LIC-1234"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">آدرس لوگو (URL)</label>
                  <input
                    name="logoUrl"
                    type="url"
                    defaultValue={bankModal.data?.logoUrl || ''}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">وب‌سایت</label>
                  <input
                    name="website"
                    type="url"
                    defaultValue={bankModal.data?.website || ''}
                    placeholder="https://pashtanybank.com.af"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">ترتیب نمایش</label>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={bankModal.data?.sortOrder || 0}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">وضعیت</label>
                  <select
                    name="status"
                    defaultValue={bankModal.data?.status || 'ACTIVE'}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="ACTIVE">فعال</option>
                    <option value="PENDING">در انتظار تایید</option>
                    <option value="SUSPENDED">تعلیق شده</option>
                    <option value="CLOSED">غیرفعال / تعطیل</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">نمایش در سایت</label>
                  <select
                    name="isVisible"
                    defaultValue={bankModal.data?.isVisible === false ? 'false' : 'true'}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="true">بله</option>
                    <option value="false">خیر</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">توضیحات</label>
                <textarea
                  name="description"
                  defaultValue={bankModal.data?.description || ''}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                  placeholder="توضیحات کوتاه درباره خدمات و سابقه بانک"
                />
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setBankModal({ open: false, mode: 'create' })}
                  className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold transition-all hover:bg-muted/80"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  {isPending ? 'در حال ثبت...' : 'تایید و ذخیره'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* --- CREDIT RATE MODAL --- */}
      {rateModal.open && (
        <dialog
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 w-full h-full"
          open
        >
          <div className="bg-background rounded-2xl border border-border w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Percent size={18} />
                {rateModal.mode === 'create' ? 'ثبت نرخ اعتباری جدید' : 'ویرایش نرخ اعتباری'}
              </h3>
              <button
                onClick={() => setRateModal({ open: false, mode: 'create' })}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRateSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">بانک مربوطه</label>
                  <select
                    name="bankId"
                    required
                    defaultValue={rateModal.data?.bankId}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">انتخاب کنید...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.displayName || b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">نوع محصول اعتباری</label>
                  <select
                    name="type"
                    required
                    defaultValue={rateModal.data?.type || 'DEPOSIT'}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {Object.entries(TYPE_FA).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">عنوان طرح اعتباری / تسهیلاتی</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={rateModal.data?.title}
                  placeholder="مثال: سپرده بلندمدت طلایی Pashtany"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">نرخ بهره سالانه (درصد)</label>
                  <input
                    name="annualRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    defaultValue={rateModal.data?.annualRate}
                    placeholder="مثال: 12.5"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">ارز مورد معامله</label>
                  <select
                    name="currency"
                    defaultValue={rateModal.data?.currency || 'AFN'}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="AFN">AFN (افغانی)</option>
                    <option value="USD">USD (دلار)</option>
                    <option value="IRR">IRR (ریال)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">حداکثر مدت (ماه)</label>
                  <input
                    name="maxTermMonths"
                    type="number"
                    defaultValue={rateModal.data?.maxTermMonths || 0}
                    placeholder="مثال: 36 (0 برای نامحدود)"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">حداقل مبلغ (اسمی - بدون سنت)</label>
                  <input
                    name="minAmount"
                    type="number"
                    defaultValue={rateModal.data && rateModal.data.minAmountCents != null ? rateModal.data.minAmountCents / 100 : 0}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">حداکثر مبلغ (اسمی - بدون سنت)</label>
                  <input
                    name="maxAmount"
                    type="number"
                    defaultValue={rateModal.data && rateModal.data.maxAmountCents != null ? rateModal.data.maxAmountCents / 100 : 0}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">درصد سپرده قانونی (Loan-to-Value)</label>
                  <input
                    name="depositRatio"
                    type="number"
                    step="0.01"
                    defaultValue={rateModal.data?.depositRatio || ''}
                    placeholder="مثال: 20٪"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">وضعیت</label>
                  <select
                    name="status"
                    defaultValue={rateModal.data?.status || 'ACTIVE'}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="ACTIVE">فعال / عمومی</option>
                    <option value="DRAFT">پیش‌نویس</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">ترتیب اولویت</label>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={rateModal.data?.sortOrder || 0}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">منبع خبر / آدرس مستندات</label>
                  <input
                    name="source"
                    type="text"
                    defaultValue={rateModal.data?.source || ''}
                    placeholder="سایت بانک مرکزی یا بخشنامه رسمی"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">یادداشت داخلی (مخصوص ادمین)</label>
                  <input
                    name="internalNote"
                    type="text"
                    defaultValue={(rateModal.data as any)?.internalNote || ''}
                    placeholder="توضیحات خصوصی یا شماره تلفن مسئول شعبه"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">توضیحات تکمیلی طرح (برای کلاینت)</label>
                <textarea
                  name="description"
                  defaultValue={rateModal.data?.description || ''}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                  placeholder="شرایط دریافت، مدارک مورد نیاز یا تضامین مسدودی حساب..."
                />
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRateModal({ open: false, mode: 'create' })}
                  className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold transition-all hover:bg-muted/80"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  {isPending ? 'در حال ثبت...' : 'تایید و ثبت نهایی'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </main>
  );
}
