'use client';

import {
  type BankRow,
  type CreditRateAggregate,
  type CreditRateRow,
  archiveCreditRate,
  createBank,
  createCreditRate,
  deleteBank,
  updateBank,
  updateCreditRate,
} from '@/actions/credit-rates';
import { PageHeader, Section, StatCard } from '@/components/Dashboard/primitives';
import { TYPE_FA } from '@/lib/credit-rate-constants';
import type { CreditRateType } from '@prisma/client';
import {
  Archive,
  Building2,
  Edit2,
  Globe,
  Percent,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import s from './CreditRates.module.css';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

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
  const [aggregates, _setAggregates] = useState<CreditRateAggregate | null>(initialAggregates);
  const [activeTab, setActiveTab] = useState<'rates' | 'banks'>('rates');

  const [isPending, startTransition] = useTransition();

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

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterBank, setFilterBank] = useState<string>('ALL');

  const filteredRates = rates.filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterBank !== 'ALL' && r.bankId !== filterBank) return false;
    return r.status !== 'ARCHIVED';
  });

  const fmtCents = (cents: number) => _faNum.format(cents / 100);

  const handleBankSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      id: bankModal.data?.id,
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      displayName: (formData.get('displayName') as string) || null,
      country: (formData.get('country') as string) || 'AF',
      city: (formData.get('city') as string) || null,
      logoUrl: (formData.get('logoUrl') as string) || null,
      website: (formData.get('website') as string) || null,
      licenseNo: (formData.get('licenseNo') as string) || null,
      status: ((formData.get('status') as string) || 'ACTIVE') as
        | 'ACTIVE'
        | 'PENDING'
        | 'SUSPENDED'
        | 'CLOSED',
      isVisible: formData.get('isVisible') === 'true',
      sortOrder: Number(formData.get('sortOrder') || 0),
      description: (formData.get('description') as string) || null,
    };

    startTransition(async () => {
      let res: Awaited<ReturnType<typeof createBank>>;
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
            setBanks((prev) => prev.map((b) => (b.id === newData.id ? newData : b)));
          }
          setBankModal({ open: false, mode: 'create' });
        }
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleBankDelete = async (id: string) => {
    if (!confirm('آیا از حذف این بانک اطمینان دارید؟ تمام نرخ‌های مربوطه نیز حذف خواهند شد.'))
      return;
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
      description: (formData.get('description') as string) || null,
      annualRate: Number(formData.get('annualRate') || 0),
      minAmountCents: Number(formData.get('minAmount') || 0) * 100,
      maxAmountCents: Number(formData.get('maxAmount') || 0) * 100,
      maxTermMonths: Number(formData.get('maxTermMonths') || 0),
      depositRatio: formData.get('depositRatio') ? Number(formData.get('depositRatio')) : null,
      currency: (formData.get('currency') as string) || 'AFN',
      status: ((formData.get('status') as string) || 'ACTIVE') as 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
      source: (formData.get('source') as string) || null,
      sortOrder: Number(formData.get('sortOrder') || 0),
      internalNote: (formData.get('internalNote') as string) || null,
    };

    startTransition(async () => {
      let res: Awaited<ReturnType<typeof createCreditRate>>;
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
            setRates((prev) => prev.map((r) => (r.id === newData.id ? newData : r)));
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
    <main className={s.workspace} dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نرخ‌های اعتباری' }]}
        title="نرخ‌های اعتباری و بانک‌ها"
        description="مدیریت نرخ‌های بهره بانکی، تسهیلات اعتباری، و حساب‌های سپرده"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBankModal({ open: true, mode: 'create' })}
              className={s.addBtn}
            >
              <Building2 size={15} />
              افزودن بانک
            </button>
            <button
              type="button"
              onClick={() => setRateModal({ open: true, mode: 'create' })}
              className={s.primaryBtn}
              disabled={banks.length === 0}
            >
              <Plus size={15} />
              ثبت نرخ جدید
            </button>
          </div>
        }
      />

      {/* KPI Strip */}
      {aggregates && (
        <div className={s.kpiStrip}>
          <StatCard
            label="کل بانک‌های تحت مدیریت"
            value={aggregates.bankCount}
            icon={<Building2 size={16} />}
            format="persian"
          />
          <StatCard
            label="کل محصولات اعتباری فعال"
            value={aggregates.rateCount}
            icon={<Percent size={16} />}
            format="persian"
          />
          {aggregates.bestDeposit ? (
            <StatCard
              label={`بهترین سپرده (${aggregates.bestDeposit.bank?.name ?? '—'})`}
              value={`${aggregates.bestDeposit.annualRate}٪`}
              icon={<TrendingUp size={16} />}
              format="latin"
              info={aggregates.bestDeposit.title}
            />
          ) : (
            <StatCard label="بهترین سپرده" value="—" icon={<TrendingUp size={16} />} />
          )}
          {aggregates.cheapestLoan ? (
            <StatCard
              label={`تسهیلات مناسب (${aggregates.cheapestLoan.bank?.name ?? '—'})`}
              value={`${aggregates.cheapestLoan.annualRate}٪`}
              icon={<Percent size={16} />}
              format="latin"
              info={aggregates.cheapestLoan.title}
            />
          ) : (
            <StatCard label="تسهیلات مناسب" value="—" icon={<Percent size={16} />} />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className={s.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rates'}
          onClick={() => setActiveTab('rates')}
          className={`${s.tabBtn} ${activeTab === 'rates' ? s.tabActive : ''}`}
        >
          مدیریت نرخ‌های بهره
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'banks'}
          onClick={() => setActiveTab('banks')}
          className={`${s.tabBtn} ${activeTab === 'banks' ? s.tabActive : ''}`}
        >
          بانک‌های همکار
          <span className={s.tabCount}>{banks.length}</span>
        </button>
      </div>

      {activeTab === 'rates' ? (
        <Section title="لیست نرخ‌های اعتباری" icon={<Percent size={18} />}>
          {/* Filter bar */}
          <div className={s.filterBar}>
            <div className={s.filterFields}>
              <div className={s.filterField}>
                <label className={s.filterLabel}>نوع محصول اعتباری</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={s.filterSelect}
                >
                  <option value="ALL">همه انواع تسهیلات</option>
                  {Object.entries(TYPE_FA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.filterField}>
                <label className={s.filterLabel}>بانک صادرکننده</label>
                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className={s.filterSelect}
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
            <p className={s.rateCount}>
              موارد یافت شده: <span className={s.rateCountNum}>{filteredRates.length}</span>
            </p>
          </div>

          {/* Table */}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  <th className={s.th}>بانک</th>
                  <th className={s.th}>نوع</th>
                  <th className={s.th}>عنوان طرح</th>
                  <th className={s.th}>نرخ سالانه</th>
                  <th className={s.th}>دامنه مبلغ</th>
                  <th className={s.th}>حداکثر مدت</th>
                  <th className={s.th}>وضعیت</th>
                  <th className={s.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.length === 0 ? (
                  <tr className={s.emptyRow}>
                    <td colSpan={8}>هیچ نرخ اعتباری منطبق با فیلترها یافت نشد.</td>
                  </tr>
                ) : (
                  filteredRates.map((r) => (
                    <tr key={r.id} className={s.tr}>
                      <td className={s.td}>
                        <div className={s.bankCell}>
                          <div className={s.bankAvatar}>
                            {r.bank?.logoUrl ? (
                              <img src={r.bank.logoUrl} alt={r.bank.name} />
                            ) : (
                              (r.bank?.name?.[0] ?? 'B')
                            )}
                          </div>
                          <div>
                            <div className={s.bankName}>{r.bank?.displayName || r.bank?.name}</div>
                            <div className={s.bankSlug}>{r.bank?.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td
                        className={s.td}
                        style={{ color: 'var(--ds-text-secondary)', fontWeight: 500 }}
                      >
                        {TYPE_FA[r.type]}
                      </td>
                      <td className={s.td}>
                        <div style={{ fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                          {r.title}
                        </div>
                        {r.description && (
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--ds-text-muted)',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              maxInlineSize: '200px',
                            }}
                          >
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className={s.td}>
                        <span className={s.rateValue}>{r.annualRate}٪</span>
                      </td>
                      <td
                        className={s.td}
                        style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                      >
                        {r.minAmountCents === 0 && r.maxAmountCents === 0 ? (
                          <span style={{ color: 'var(--ds-text-muted)' }}>بدون محدودیت</span>
                        ) : (
                          <span>
                            {fmtCents(r.minAmountCents)} — {fmtCents(r.maxAmountCents)}{' '}
                            <span style={{ fontSize: '0.7rem', color: 'var(--ds-text-muted)' }}>
                              {r.currency}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className={s.td} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {r.maxTermMonths === 0 ? (
                          <span style={{ color: 'var(--ds-text-muted)' }}>نامحدود</span>
                        ) : (
                          <>
                            {r.maxTermMonths}{' '}
                            <span style={{ fontSize: '0.7rem', color: 'var(--ds-text-muted)' }}>
                              ماه
                            </span>
                          </>
                        )}
                      </td>
                      <td className={s.td}>
                        <span
                          className={`${s.statusPill} ${r.status === 'ACTIVE' ? s.statusActive : s.statusDraft}`}
                        >
                          {r.status === 'ACTIVE' ? 'فعال' : 'پیش‌نویس'}
                        </span>
                      </td>
                      <td className={s.td}>
                        <div className={s.actionRow}>
                          <button
                            type="button"
                            onClick={() => setRateModal({ open: true, mode: 'edit', data: r })}
                            className={s.actionBtn}
                            title="ویرایش"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRateArchive(r.id)}
                            className={`${s.actionBtn} ${s.actionDanger}`}
                            title="آرشیو"
                          >
                            <Archive size={14} />
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
        <Section title="مدیریت بانک‌های همکار" icon={<Building2 size={18} />}>
          <div className={s.bankGrid}>
            {banks.map((b) => (
              <div key={b.id} className={s.bankCard}>
                <div className={s.bankCardHead}>
                  <div className={s.bankCardIdentity}>
                    <div className={s.bankCardAvatar}>
                      {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : b.name[0]}
                    </div>
                    <div>
                      <div className={s.bankCardName}>{b.displayName || b.name}</div>
                      <div className={s.bankCardCity}>{b.city || 'افغانستان'}</div>
                    </div>
                  </div>
                  <span
                    className={`${s.statusPill} ${b.status === 'ACTIVE' ? s.statusActive : s.statusDraft}`}
                  >
                    {b.status === 'ACTIVE' ? 'فعال' : b.status}
                  </span>
                </div>

                {b.description && <p className={s.bankCardDesc}>{b.description}</p>}

                <div className={s.bankCardFoot}>
                  <div className={s.bankCardActions}>
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className={s.actionBtn}
                        title="وب‌سایت"
                      >
                        <Globe size={14} />
                      </a>
                    )}
                  </div>
                  <div className={s.bankCardActions}>
                    <button
                      type="button"
                      onClick={() => setBankModal({ open: true, mode: 'edit', data: b })}
                      className={s.actionBtn}
                      title="ویرایش"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBankDelete(b.id)}
                      className={`${s.actionBtn} ${s.actionDanger}`}
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

      {/* ── BANK MODAL ── */}
      {bankModal.open && (
        <div className={s.overlay} role="dialog" aria-modal="true">
          <div className={`${s.modalBox} ${s.modalSm}`}>
            <div className={s.modalHead}>
              <h3 className={s.modalTitle}>
                <Building2 size={17} />
                {bankModal.mode === 'create' ? 'ثبت بانک جدید' : 'ویرایش بانک'}
              </h3>
              <button
                type="button"
                onClick={() => setBankModal({ open: false, mode: 'create' })}
                className={s.modalClose}
                aria-label="بستن"
              >
                <X size={16} />
              </button>
            </div>

            <form id="bank-form" onSubmit={handleBankSubmit} className={s.modalBody}>
              {error && <div className={s.errorAlert}>{error}</div>}

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>کد یکتا (Slug)</label>
                  <input
                    name="slug"
                    type="text"
                    required
                    defaultValue={bankModal.data?.slug}
                    pattern="^[a-z0-9-]+$"
                    title="فقط حروف کوچک، اعداد و خط تیره"
                    placeholder="pashtany-bank"
                    className={s.fieldInput}
                    disabled={bankModal.mode === 'edit'}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نام رسمی</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={bankModal.data?.name}
                    placeholder="Pashtany Bank"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نام نمایشی (فارسی)</label>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={bankModal.data?.displayName || ''}
                    placeholder="بانک پشتنی"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>کد کشور</label>
                  <input
                    name="country"
                    type="text"
                    maxLength={2}
                    defaultValue={bankModal.data?.country || 'AF'}
                    placeholder="AF"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>شهر</label>
                  <input
                    name="city"
                    type="text"
                    defaultValue={bankModal.data?.city || ''}
                    placeholder="کابل"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>شماره مجوز فعالیت</label>
                  <input
                    name="licenseNo"
                    type="text"
                    defaultValue={bankModal.data?.licenseNo || ''}
                    placeholder="LIC-1234"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>آدرس لوگو (URL)</label>
                  <input
                    name="logoUrl"
                    type="url"
                    defaultValue={bankModal.data?.logoUrl || ''}
                    placeholder="https://example.com/logo.png"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>وب‌سایت</label>
                  <input
                    name="website"
                    type="url"
                    defaultValue={bankModal.data?.website || ''}
                    placeholder="https://pashtanybank.com.af"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup3}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>ترتیب نمایش</label>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={bankModal.data?.sortOrder || 0}
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>وضعیت</label>
                  <select
                    name="status"
                    defaultValue={bankModal.data?.status || 'ACTIVE'}
                    className={s.fieldSelect}
                  >
                    <option value="ACTIVE">فعال</option>
                    <option value="PENDING">در انتظار تایید</option>
                    <option value="SUSPENDED">تعلیق شده</option>
                    <option value="CLOSED">غیرفعال / تعطیل</option>
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نمایش در سایت</label>
                  <select
                    name="isVisible"
                    defaultValue={bankModal.data?.isVisible === false ? 'false' : 'true'}
                    className={s.fieldSelect}
                  >
                    <option value="true">بله</option>
                    <option value="false">خیر</option>
                  </select>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>توضیحات</label>
                <textarea
                  name="description"
                  defaultValue={bankModal.data?.description || ''}
                  rows={3}
                  className={s.fieldTextarea}
                  placeholder="توضیحات کوتاه درباره خدمات و سابقه بانک"
                />
              </div>
            </form>

            {/* sticky footer — خارج از form */}
            <div className={s.modalFoot}>
              <button
                type="button"
                onClick={() => setBankModal({ open: false, mode: 'create' })}
                className={s.addBtn}
              >
                انصراف
              </button>
              <button type="submit" form="bank-form" disabled={isPending} className={s.primaryBtn}>
                {isPending ? 'در حال ثبت...' : 'تایید و ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREDIT RATE MODAL ── */}
      {rateModal.open && (
        <div className={s.overlay} role="dialog" aria-modal="true">
          <div className={`${s.modalBox} ${s.modalLg}`}>
            <div className={s.modalHead}>
              <h3 className={s.modalTitle}>
                <Percent size={17} />
                {rateModal.mode === 'create' ? 'ثبت نرخ اعتباری جدید' : 'ویرایش نرخ اعتباری'}
              </h3>
              <button
                type="button"
                onClick={() => setRateModal({ open: false, mode: 'create' })}
                className={s.modalClose}
                aria-label="بستن"
              >
                <X size={16} />
              </button>
            </div>

            <form id="rate-form" onSubmit={handleRateSubmit} className={s.modalBody}>
              {error && <div className={s.errorAlert}>{error}</div>}

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>بانک مربوطه</label>
                  <select
                    name="bankId"
                    required
                    defaultValue={rateModal.data?.bankId}
                    className={s.fieldSelect}
                  >
                    <option value="">انتخاب کنید...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.displayName || b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نوع محصول اعتباری</label>
                  <select
                    name="type"
                    required
                    defaultValue={rateModal.data?.type || 'DEPOSIT'}
                    className={s.fieldSelect}
                  >
                    {Object.entries(TYPE_FA).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>عنوان طرح اعتباری / تسهیلاتی</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={rateModal.data?.title}
                  placeholder="مثال: سپرده بلندمدت طلایی Pashtany"
                  className={s.fieldInput}
                />
              </div>

              <div className={s.fieldGroup3}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>نرخ بهره سالانه (٪)</label>
                  <input
                    name="annualRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    defaultValue={rateModal.data?.annualRate}
                    placeholder="مثال: 12.5"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>ارز مورد معامله</label>
                  <select
                    name="currency"
                    defaultValue={rateModal.data?.currency || 'AFN'}
                    className={s.fieldSelect}
                  >
                    <option value="AFN">AFN (افغانی)</option>
                    <option value="USD">USD (دلار)</option>
                    <option value="IRR">IRR (ریال)</option>
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>حداکثر مدت (ماه)</label>
                  <input
                    name="maxTermMonths"
                    type="number"
                    defaultValue={rateModal.data?.maxTermMonths || 0}
                    placeholder="مثال: 36"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>حداقل مبلغ (اسمی)</label>
                  <input
                    name="minAmount"
                    type="number"
                    defaultValue={
                      rateModal.data && rateModal.data.minAmountCents != null
                        ? rateModal.data.minAmountCents / 100
                        : 0
                    }
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>حداکثر مبلغ (اسمی)</label>
                  <input
                    name="maxAmount"
                    type="number"
                    defaultValue={
                      rateModal.data && rateModal.data.maxAmountCents != null
                        ? rateModal.data.maxAmountCents / 100
                        : 0
                    }
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup3}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>درصد سپرده قانونی (LTV)</label>
                  <input
                    name="depositRatio"
                    type="number"
                    step="0.01"
                    defaultValue={rateModal.data?.depositRatio || ''}
                    placeholder="مثال: 20"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>وضعیت</label>
                  <select
                    name="status"
                    defaultValue={rateModal.data?.status || 'ACTIVE'}
                    className={s.fieldSelect}
                  >
                    <option value="ACTIVE">فعال / عمومی</option>
                    <option value="DRAFT">پیش‌نویس</option>
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>ترتیب اولویت</label>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={rateModal.data?.sortOrder || 0}
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>منبع / آدرس مستندات</label>
                  <input
                    name="source"
                    type="text"
                    defaultValue={rateModal.data?.source || ''}
                    placeholder="سایت بانک مرکزی یا بخشنامه رسمی"
                    className={s.fieldInput}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>یادداشت داخلی (ادمین)</label>
                  <input
                    name="internalNote"
                    type="text"
                    defaultValue={rateModal.data?.internalNote ?? ''}
                    placeholder="توضیحات خصوصی یا شماره تلفن مسئول"
                    className={s.fieldInput}
                  />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>توضیحات تکمیلی (برای کلاینت)</label>
                <textarea
                  name="description"
                  defaultValue={rateModal.data?.description || ''}
                  rows={2}
                  className={s.fieldTextarea}
                  placeholder="شرایط دریافت، مدارک مورد نیاز یا تضامین..."
                />
              </div>
            </form>

            {/* sticky footer — خارج از form */}
            <div className={s.modalFoot}>
              <button
                type="button"
                onClick={() => setRateModal({ open: false, mode: 'create' })}
                className={s.addBtn}
              >
                انصراف
              </button>
              <button type="submit" form="rate-form" disabled={isPending} className={s.primaryBtn}>
                {isPending ? 'در حال ثبت...' : 'تایید و ثبت نهایی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
