import { getMyVirtualCards } from '@/actions/virtual-card';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import VirtualCardsClient from './_components/VirtualCardsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'کارت‌های مجازی | داشبورد',
};

export default async function VirtualCardsPage() {
  const initialCards = await getMyVirtualCards();

  return (
    <div className="route-frame">
      <PageHeader
        variant="compact"
        breadcrumb={[
          { label: 'مرکز فرماندهی', href: '/dashboard' },
          { label: 'حساب من' },
          { label: 'کارت‌های مجازی' },
        ]}
        eyebrow="حساب من"
        title="کارت‌های مجازی"
        description="مدیریت کارت‌های مجازی، صدور کارت جدید، فریز و پیگیری تراکنش‌ها."
        icon="credit-card"
        accent="cyan"
      />

      <Section>
        <VirtualCardsClient initialCards={initialCards} />
      </Section>
    </div>
  );
}
