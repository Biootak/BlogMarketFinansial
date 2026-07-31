'use client';

/**
 * /dashboard/users/[id]/not-found — کاربر یافت نشد
 *
 * صرفاً از DashboardNotFound صفحه‌ی parent استفاده می‌کند.
 * اما چون DashboardNotFound از usePathname استفاده می‌کند، باید client باشد.
 */

import DashboardNotFound from '@/app/dashboard/not-found';

export default DashboardNotFound;
