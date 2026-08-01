/**
 * /customer/beneficiaries — Customer Portal Beneficiary Management
 *
 * صفحه‌ای برای ذخیره گیرندگان مکرر در سطح Customer (نه User).
 * در حین wizard انتقال وجه، کاربر فقط یک کلیک می‌کند تا شناسه وارد شود.
 *
 * Tenant: customerId از requireCustomerAccess گرفته می‌شود.
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT + platform admins
 * (platform admins برای پشتیبانی).
 */
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { listCustomerBeneficiaries } from '@/actions/customer-beneficiaries';
import { CustomerBeneficiaryManager } from './_components/CustomerBeneficiaryManager';

export const metadata = {
  title: 'مخاطبان من | پنل مشتری',
};

export default async function CustomerBeneficiariesPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const result = await listCustomerBeneficiaries();
  const initial = result.success ? result.data : [];

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        title="مخاطبان من"
        description="گیرندگان مکرر برای انتقال وجه — فقط با یک کلیک در حین تراکنش"
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'مخاطبان' },
        ]}
        eyebrow="مدیریت"
        icon="users"
        accent="violet"
      />
      <CustomerBeneficiaryManager initialBeneficiaries={initial} />
    </div>
  );
}
