import { useSession } from 'next-auth/react';

/**
 * useCurrentUser — the current user from the client session.
 *
 * 2026-08-02 (perf): previously this wrapped `useSession` in a `useSWR` call
 * whose fetcher called `session.update()`. Every revalidation path was
 * disabled (`revalidateOnMount: false`, `revalidateOnFocus: false`,
 * `refreshInterval: 0`, `shouldRetryOnError: false`, `dedupingInterval:
 * 60000`), so the fetcher NEVER ran — SWR added bundle weight, a ref, and
 * bookkeeping for zero benefit. The returned value was always `session.user`
 * (the `fallbackData`). Simplifies to the plain session read.
 */
export function useCurrentUser() {
  const { data: session } = useSession();
  return session?.user;
}
