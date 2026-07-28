import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { RolesClient } from './_components/RolesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'نقش‌ها | داشبورد',
};

export default function RolesPage() {
  return (
    <main className="max-w-[1440px] mx-auto flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: 'مرکز فرماندهی', href: '/dashboard' },
          { label: 'مدیریت دسترسی' },
          { label: 'نقش‌ها' },
        ]}
        eyebrow="مدیریت دسترسی"
        title="نقش‌ها"
        description="تعریف، ویرایش و کلون نقش‌های سفارشی با ماتریس مجوز granular."
        icon="shield-check"
        accent="violet"
      />

      <Section>
        <RolesClient />
      </Section>
    </main>
  );
}
