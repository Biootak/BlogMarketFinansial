'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  // Initialize to false to avoid hydration mismatch (server renders false,
  // client corrects after mount).
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
