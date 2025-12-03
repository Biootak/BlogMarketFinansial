import { useSession } from 'next-auth/react';
import useSWR from 'swr';

export function useCurrentUser() {
  const { data: session, status, update } = useSession();

  const { data: user } = useSWR(
    // فقط وقتی session آماده هست fetch کن
    session && status === 'authenticated' ? '/api/user/current' : null,
    async () => {
      try {
        const updatedSession = await update();
        return updatedSession?.user;
      } catch {
        // خطا رو نادیده بگیر و از session فعلی استفاده کن
        return session?.user;
      }
    },
    {
      fallbackData: session?.user,
      revalidateOnMount: false,
      revalidateOnFocus: false,
      refreshInterval: 0,
      shouldRetryOnError: false,
      errorRetryCount: 0,
      dedupingInterval: 60000, // 1 minute
      onError: () => {
        // خطاها رو suppress کن
      },
    },
  );

  return user ?? session?.user;
}
