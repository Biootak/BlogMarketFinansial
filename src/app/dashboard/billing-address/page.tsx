import { PageHeader } from '@/components/Dashboard/primitives';
import {
  HiOutlineMapPin,
  HiOutlineHome,
  HiOutlineBuildingOffice2,
  HiOutlineEnvelope,
  HiOutlineCheck,
} from 'react-icons/hi2';

const countries = [
  { value: 'ir', label: 'ایران' },
  { value: 'tr', label: 'ترکیه' },
  { value: 'ae', label: 'امارات متحده‌ی عربی' },
  { value: 'gb', label: 'بریتانیا' },
  { value: 'de', label: 'آلمان' },
];

const provinces = [
  { value: 'teh', label: 'تهران' },
  { value: 'isb', label: 'اصفهان' },
  { value: 'fars', label: 'فارس' },
  { value: 'khz', label: 'خوزستان' },
  { value: 'maz', label: 'مازندران' },
];

const BillingAddressPage = () => {
  return (
    <div className="at-form" dir="rtl">
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'آدرس صورتحساب' },
        ]}
        eyebrow="صورتحساب"
        title="آدرس صورتحساب"
        description="آدرسی که فاکتورها و صورتحساب‌های دوره‌ای به آن ارسال می‌شود"
      />

      <form action="#" method="post">
        <div className="at-form-section">
          <div className="at-form-section__head">
            <div className="at-form-section__title">
              <span className="at-form-section__ico">
                <HiOutlineMapPin className="size-4" />
              </span>
              <div>
                <div className="at-form-section__title-text">آدرس</div>
                <div className="at-form-section__sub">
                  اطلاعات برای صدور فاکتور رسمی استفاده می‌شود
                </div>
              </div>
            </div>
          </div>

          <div className="at-form-section__body">
            <div className="at-form-grid">
              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineMapPin className="at-field__ico at-field__ico--emerald size-4" />
                  کشور
                </span>
                <select className="at-select" defaultValue="ir">
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineBuildingOffice2 className="at-field__ico at-field__ico--blue size-4" />
                  استان
                </span>
                <select className="at-select" defaultValue="teh">
                  {provinces.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineHome className="at-field__ico size-4" />
                  آدرس (خط ۱)
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="خیابان، کوچه، پلاک"
                  defaultValue="خیابان ولیعصر، کوچه‌ی گلستان، پلاک ۲۴"
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineHome className="at-field__ico size-4" />
                  آدرس (خط ۲)
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="واحد، طبقه (اختیاری)"
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineBuildingOffice2 className="at-field__ico size-4" />
                  شهر
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="مثلاً: تهران"
                  defaultValue="تهران"
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineEnvelope className="at-field__ico size-4" />
                  کد پستی
                </span>
                <input
                  type="text"
                  dir="ltr"
                  className="at-input font-mono text-left"
                  placeholder="۱۰ رقم"
                  defaultValue="1411713114"
                />
              </label>
            </div>
          </div>
        </div>

        <div
          className="at-form-section"
          style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px' }}
        >
          <button type="button" className="at-btn at-btn--ghost">
            انصراف
          </button>
          <button type="submit" className="at-btn at-btn--primary">
            <HiOutlineCheck className="size-4" />
            ذخیره‌ی آدرس
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillingAddressPage;