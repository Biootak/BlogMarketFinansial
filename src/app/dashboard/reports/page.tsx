import { checkSuperAdmin } from '@/lib/auth';

export default async function Reports() {
  // Only SUPER_ADMIN can access reports
  await checkSuperAdmin();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">گزارش‌های سیستم</h1>
      {/* Add your reports components here */}
    </div>
  );
}
