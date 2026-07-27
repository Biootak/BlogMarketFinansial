import type { Metadata } from 'next';
import DeveloperPortalClient from './_components/DeveloperPortalClient';

export const metadata: Metadata = {
  title: 'پنل توسعه‌دهندگان',
  description: 'مدیریت کلیدهای API، وب‌هوک‌ها و مستندات فنی اتصال به پلتفرم',
};

export default function DeveloperPortalPage() {
  return <DeveloperPortalClient />;
}
