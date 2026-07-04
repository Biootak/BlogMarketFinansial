import { PageHeader } from "@/components/Dashboard/primitives";
import {
  HiOutlineSparkles,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
} from "react-icons/hi2";

const subscription = {
  plan: "اشتراک حرفه‌ای",
  planSub: "دسترسی کامل به همه‌ی ابزارهای تحلیل و انتشار نامحدود",
  price: "۲٬۹۰۰٬۰۰۰ تومان / ماه",
  postsRemaining: "۱۸",
  postsTotal: "نامحدود در پلن فعلی",
  renewDate: "۲۸ مهر ۱۴۰۵",
  status: "فعال",
  autoRenew: true,
};

const DashboardSubscription = () => {
  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "اشتراک" },
        ]}
        eyebrow="حساب کاربری"
        title="اشتراک و پلن"
        description="مدیریت پلن فعلی، تمدید و صورتحساب"
        actions={
          <button className="at-btn at-btn--primary">
            <HiOutlineSparkles className="size-4" />
            ارتقای پلن
          </button>
        }
      />

      {/* KPI strip */}
      <div className="at-stats">
        <div className="at-stat">
          <div className="at-stat__ico">
            <HiOutlineSparkles className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">{subscription.plan}</div>
            <div className="at-stat__label">پلن فعلی</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--blue">
            <HiOutlineCreditCard className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value" style={{ fontSize: '15px' }}>
              {subscription.price}
            </div>
            <div className="at-stat__label">هزینه‌ی دوره</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--amber">
            <HiOutlineDocumentText className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">
              {subscription.postsRemaining}{" "}
              <span className="text-[color:var(--at-fg-subtle)] text-sm font-medium">
                از {subscription.postsTotal}
              </span>
            </div>
            <div className="at-stat__label">پست‌های باقی‌مانده</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--blue">
            <HiOutlineCalendarDays className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value" style={{ fontSize: '15px' }}>
              {subscription.renewDate}
            </div>
            <div className="at-stat__label">تمدید خودکار</div>
          </div>
        </div>
      </div>

      {/* Details section */}
      <div className="at-form-section">
        <div className="at-form-section__head">
          <div className="at-form-section__title">
            <span className="at-form-section__ico">
              <HiOutlineCreditCard className="size-4" />
            </span>
            <div>
              <div className="at-form-section__title-text">جزئیات پلن</div>
              <div className="at-form-section__sub">اطلاعات کامل اشتراک فعال شما</div>
            </div>
          </div>
          <span className="at-badge at-badge--published">{subscription.status}</span>
        </div>

        <div className="at-form-section__body">
          <dl className="grid gap-0 divide-y divide-[color:var(--at-line)]">
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">نام پلن</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">
                {subscription.plan}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">شرح پلن</dt>
              <dd className="text-sm text-[color:var(--at-fg-muted)] text-end max-w-[60%]">
                {subscription.planSub}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">هزینه و صورتحساب</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)] font-mono" dir="ltr">
                {subscription.price}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">سهمیه پست‌ها</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">
                {subscription.postsRemaining} پست باقی‌مانده
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">تاریخ تمدید</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">
                {subscription.renewDate}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default DashboardSubscription;