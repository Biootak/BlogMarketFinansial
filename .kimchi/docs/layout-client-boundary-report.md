Fixed the `createContext` runtime error in `src/app/dashboard/layout.tsx` by extracting the dashboard chrome into a new `'use client'` component at `src/components/Dashboard/DashboardPage/DashboardProviders.tsx`.
The server layout now delegates the RTL direction provider, sidebar, header, main content, keyboard shortcuts, and toaster to the client boundary.
`npx tsc --noEmit` completed with exit code 0, confirming no TypeScript errors.
