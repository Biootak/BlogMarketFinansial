import { useSession } from 'next-auth/react';
import useSWR from 'swr';

export function useCurrentUser() {
  const { data: session, update } = useSession();
  const { data: user } = useSWR(
    session ? '/api/user/current' : null,
    async () => {
      const updatedSession = await update();
      return updatedSession?.user;
    },
    {
      fallbackData: session?.user,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      refreshInterval: 0
    }
  );

  return user;
}
