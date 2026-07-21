/**
 * AdStripsDeferred — async server component that fetches ad data.
 * Wrapped in <Suspense> in page.tsx for true streaming.
 * Renders both ad strips (LARGE + MEDIUM) from a single fetch boundary.
 */
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import DeferredAdStrip from './DeferredAdStrip';

export default async function AdStripsDeferred() {
  const [firstResult, secondResult] = await Promise.all([
    getActiveAdvertisements({
      limit: 4,
      size: 'LARGE',
      position: 'CUSTOM',
      orderBy: 'order',
      orderDirection: 'asc',
    }),
    getActiveAdvertisements({
      limit: 3,
      size: 'MEDIUM',
      position: 'CUSTOM',
      orderBy: 'order',
      orderDirection: 'asc',
      page: 2,
    }),
  ]);

  const firstStrip = firstResult.success && firstResult.data ? firstResult.data : [];
  const secondStrip = secondResult.success && secondResult.data ? secondResult.data : [];

  return (
    <>
      {firstStrip.length > 0 && (
        <div className="container relative mt-4 lg:mt-6" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={firstStrip} accentColor="#5b6cff" />
        </div>
      )}
      {secondStrip.length > 0 && (
        <div className="container relative mt-4 lg:mt-6" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={secondStrip} accentColor="#22d3ee" eyebrow="تازه‌های پیشنهادی" />
        </div>
      )}
    </>
  );
}
