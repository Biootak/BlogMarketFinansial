import { checkSuperAdmin } from '@/lib/auth';

export default async function Settings() {
  // Only SUPER_ADMIN can access settings
  await checkSuperAdmin();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">تنظیمات سیستم</h1>
      {/* Add your settings components here */}
    </div>
  );
}
