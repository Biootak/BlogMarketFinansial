Old key: `dashboard:density`
New key: `dash2:density`
Migration logic: on mount, if `dash2:density` is absent and `dashboard:density` exists, the legacy value is copied to `dash2:density` and the old key is removed; hydration then calls `onDensityChange` when the stored value differs from the prop.
File modified: `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/WorkspaceToolbar.tsx`
TypeScript check: `timeout 60 npx tsc --noEmit` exited with code 124 (timed out before completion)
