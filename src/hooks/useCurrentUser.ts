import { useSession } from 'next-auth/react';
import useSWR from 'swr';

export function useCurrentUser() {
  const { data: session, update } = useSession();

  const { data: user } = useSWR(
    session ? '/api/user/current' : null,
    async () => {
      try {
        const updatedSession = await update();
        return updatedSession?.user;
      } catch (error) {
        console.error('Error updating session:', error);
        return session?.user;
      }
    },
    {
      fallbackData: session?.user,
      revalidateOnMount: false,
      revalidateOnFocus: false,
      refreshInterval: 0,
      shouldRetryOnError: false,
    },
  );

  return user ?? session?.user;
}
