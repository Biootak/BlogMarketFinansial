Moved `BreadcrumbProvider` from `MainContent.tsx` up to `DashboardProviders.tsx`, wrapping the `Header` + `MainContent` container so `useBreadcrumb()` in `Header` has an ancestor provider.

`tsc --noEmit` passed (exit code 0 after a 300s run; the first 120s run timed out with exit 124).

Changed files: `src/components/Dashboard/DashboardPage/DashboardProviders.tsx`, `src/components/Dashboard/DashboardPage/MainContent.tsx`.
