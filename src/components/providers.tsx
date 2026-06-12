'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  // Avoid hydration mismatch — only mount next-themes on the client.
  // We also accept a manual theme override via the `data-theme` attribute
  // to keep the layout's default `class="dark"` in sync.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="bmf-theme"
        disableTransitionOnChange
      >
        {/*
          Inline script that runs *before* paint on the client to set the
          `class` attribute on <html> in sync with the user's stored choice.
          This prevents the dark→light flash.
        */}
        {mounted ? null : (
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional theme bootstrap
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var t = localStorage.getItem('bmf-theme');
                  if (t === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              `,
            }}
          />
        )}
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
