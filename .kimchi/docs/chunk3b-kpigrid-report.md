KpiGrid.tsx already wraps the hero and all four compact KPI values with `<CountUp value={...} duration={600} />`, using the local component's existing `value` prop API.
Sparkline paths use `pathLength={1}` with `strokeDasharray/offset: 1` and a `useEffect` that animates offset 1→0 over 800 ms via `easeOutExpo`, honoring `prefers-reduced-motion` and re-running on `range` change.
Trend pills pair `ArrowUpRight` / `ArrowDownRight` / `Minus` from `lucide-react` with semantic color + text for a11y.
`cd /mnt/c/Users/Biotak/Desktop/FinancialMarket && timeout 90 npx tsc --noEmit 2>&1 | tail -5` completed with exit code 0 and no TypeScript errors.
No further edits were required; the component passes strict type-checking, remains RTL-safe, and respects reduced-motion preferences.
