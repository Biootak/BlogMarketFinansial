'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: unknown;
}) {
  // Avoid hydration mismatch — only mount next-themes on the client.
  // The default theme is `light`/white; the inline script below keeps
  // <html>'s class attribute in sync with the user's stored choice so
  // we never flash the wrong palette.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SessionProvider
      {...(session ? { session: session as never } : {})}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="bmf-theme"
        disableTransitionOnChange
      >
        {/*
          Inline script that runs *before* paint on the client to set the
          `class` attribute on <html> in sync with the user's stored choice.
          Default is light/white; dark is only applied when the user explicitly
          chose it. This prevents the light→dark flash.
        */}
        {mounted ? null : (
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional theme bootstrap
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var t = localStorage.getItem('bmf-theme');
                  if (t === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
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
