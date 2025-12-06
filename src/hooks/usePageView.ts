import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function usePageView() {
  const pathname = usePathname();

  useEffect(() => {
    const recordPageView = async () => {
      try {
        await fetch('/api/pageview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: pathname }),
        });
      } catch (error) {
        console.error('Failed to record page view:', error);
      }
    };

    recordPageView();
  }, [pathname]);
}
