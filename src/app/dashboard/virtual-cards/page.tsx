import { getMyVirtualCards } from '@/actions/virtual-card';
import VirtualCardsClient from './_components/VirtualCardsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'کارت‌های مجازی | داشبورد',
};

/**
 * سربرگ این مسیر عمداً اینجا نیست.
 * مالک سربرگ `VirtualCardsClient` است چون اکشن «صدور کارت» یک دیالوگ کلاینتی
 * باز می‌کند. قبلاً هر دو لایه سربرگ می‌زدند و کاربر دو سربرگ پشت‌سرهم می‌دید.
 * قرارداد در `primitives/pageHeaders.ts` → owner: 'client'.
 */
export default async function VirtualCardsPage() {
  const initialCards = await getMyVirtualCards();

  return (
    <main className="max-w-[1440px] mx-auto">
      <VirtualCardsClient initialCards={initialCards} />
    </main>
  );
}
