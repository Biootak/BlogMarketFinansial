# AGENTS.gotchas.md — easy-to-miss behaviors

Load when something weird happens or you're about to touch these subsystems.

## `revalidateTag`

- **Must come from `@/lib/revalidate`**, not `next/cache`. Next 16's typed signature requires a second `profile` argument; the wrapper always passes `'max'`. See `src/lib/revalidate.ts`.
- **Only invalidates `unstable_cache` from a Server Action.** Seed scripts that write to the DB directly do **not** bust the data cache — call the relevant action or `revalidatePath` afterwards.

## Prisma

- **Singleton** in `src/lib/db.ts`. Don't `new PrismaClient()` in app code. Exception: `src/actions/createSuperAdmin.ts`.

## Auth

- **Cookie name** flips with env: `__Secure-authjs.session-token` in prod, `authjs.session-token` in dev. Middleware handles this.
- **Middleware matcher is intentionally narrow**: `/dashboard/:path*`, `/api/((?!pageview|public|auth|uploads).*)`, auth pages. Don't widen without reading perf comment at `middleware.ts:213`.

## Next config

- **CSP and `images.remotePatterns` are allowlists** in `next.config.ts`. Any new external domain (scripts, frames, image hosts) must be added there or request is blocked in production.

## Uploads

- Dev writes to `public/uploads/{folder}/` (served by `rewrites()` → `/api/uploads/[...path]`); production is S3-only via `src/lib/storage.ts`.
- `/api/upload` requires auth, re-validates magic bytes, sanitizes SVG (`src/app/api/upload/route.ts`). Folders restricted to `posts | avatars | categories | tags | ads | general`.

## Rate limits

`src/lib/rate-limiter.ts` with Upstash + LRU in-memory fallback:
- `api` 100/min
- `upload` 30/min
- `auth` 10/15min
- `pageview` 200/min

If Upstash is unset or fails, requests still succeed via in-memory path.

## Build vs dev (since 2026-06-27)

- `next dev` uses Turbopack — PostCSS uses `lightningcss@1.30.2` from npm, no panic.
- `next build` with Turbopack still panics (embedded `lightningcss` alpha.70 in next@16.2.9). So `build` runs with `--webpack` until Turbopack bundles stable lightningcss.
- To test Turbopack build: `npx next build` (no flag) — will crash on `globals.css`.

## npm scripts — never use `$(...)` shell substitution (since 2026-07-06)

- `cross-env` does **not** expand `$(...)` (it intentionally avoids shelling out). When npm runs a script on Linux/macOS it uses `sh -c`, so `$(node ...)` works — but on **Windows cmd.exe** the whole expression is passed literally to `cross-env`, which then tries to spawn `scripts\next-dist-dir.cjs)` as a command and fails with `ENOENT`.
- Symptom: `Error: spawn scripts\\next-dist-dir.cjs) ENOENT` with the trailing `)` in `path`.
- Rule: **npm scripts must be platform-neutral**. Don't write `$(...)` or backticks in `package.json`. If you need a computed env var, either:
  1. Compute it inside `next.config.ts` from `process.env` (preferred — it's TS, no shell), or
  2. Have the user export it in their shell first (`export NEXT_DIST_DIR=$(node scripts/x.cjs) && npm run dev`).
- Historical context: `scripts/next-dist-dir.cjs` existed to route `.next/` off WSL2 9p mounts (`/tmp/next-dev-$USER`) where `next dev` failed with EACCES. The workaround is **WSL-only**; on native Windows + NTFS the default `.next/` in the project root works fine, so the npm scripts no longer call the helper. WSL users can still invoke it manually.

## Dashboard 2026 v2 CSS

Large (~660 lines), lives at the tail of `globals.css`. If `dash-bento2`, `dash-pane--hero/--compact/--tall`, `dash-toolbar`, `dash-hero*`, `dash-minical`, etc. render unstyled, search file for `Dashboard 2026 (June 22)` — that's the only marker. The block must be wrapped in its own `@layer utilities`.

## Disposing dev servers (Windows)

`npx next dev` keeps a `next-server` child even after parent shell exits. Use `Get-NetTCPConnection -LocalPort <port> | Stop-Process -Id $_.OwningProcess -Force`; bare `Stop-Job` leaves the port bound.

## Setup bootstrap

Visit `/setup` once after migrations to create initial `SUPER_ADMIN`. In production the server action enforces `ALLOWED_SETUP_IPS`. After a SUPER_ADMIN exists the action refuses to create another.

## Bazaar rates sync (TGJU scraping)

`/api/cron/sync-bazaar` scrapes `tgju.org` (ArvanCloud-fronted, realistic browser UA, 12s timeout) and upserts 19 currencies into `ExchangeRate` rows. Auth: `CRON_SECRET` (Bearer header or `?secret=` query). Schedule every 10 min. On scrape failure returns `502`; DB stays untouched. Disable with `TGJU_SCRAPER_ENABLED=false`.

## Debug middleware

Set `DEBUG_MODE=true`; logs to `console.log` for `/dashboard/*` requests.

## RTL — Best practices for the Persian editor (since 2026-07-05)

The site is Persian-first (`html dir="rtl" lang="fa-IR"`). All Editor1 UI must be RTL-correct out of the box. The rules below are non-negotiable.

### Source of truth: `useDirection` hook

- **Use `useDirection('rtl')`** in every Editor1 shell component that renders into a `tippy.js` portal or an isolated subtree (`src/hooks/useDirection.ts`).
- It returns the live `<html dir>` via `MutationObserver`. SSR-safe (returns the default during render).
- **Never hardcode `dir="rtl"`** on Editor1 components — defeats the future lang switcher.
- For non-hook contexts (extensions, tippy plugins), use the synchronous sibling: `getDocumentDirection('rtl')`.

### CSS logical properties — mandatory

Use **logical** properties everywhere; never `left/right` or `margin-left/right`:

| Physical (forbidden)         | Logical (use this)                       |
| ---------------------------- | ---------------------------------------- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right`               | `inset-inline-start` / `inset-inline-end` |
| `text-align: left/right`     | `text-align: start/end`                  |
| `float: left/right`          | `float: inline-start/inline-end`         |
| `border-left`                | `border-inline-start`                   |
| `border-top-left-radius`     | `border-start-start-radius`             |

Tailwind utilities follow the same rule: use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Forbidden: `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`.

**Exception**: code blocks. `pre` and `.katex-display` are intentionally `direction: ltr` with `text-align: left` so Persian-English-mixed code reads naturally.

### Escape hatch: `src/styles/__theme_rtl.scss`

The file `[dir="rtl"]` block is the only place where RTL-specific CSS belongs. Use it only when:

1. A third-party library injects physical CSS (tippy.js arrow position, Radix slide-in).
2. A legacy utility still uses `left/right` and can't be rewritten yet.
3. A data path (single-direction arrow "next") must flip in RTL.

Every rule in that file must have a comment saying **why** it exists and **which component/extension** it targets. PRs that add to it must link the change in this file.

### Bubble menus and tippy portals

`BubbleMenu` and `FloatingMenu` from `@tiptap/react` portal to `body` via tippy.js. Cascade `<html dir>` does not reach them. Always:

```tsx
const dir = useDirection('rtl');
return (
  <BubbleMenu editor={editor} tippyOptions={…}>
    <div dir={dir} data-dir={dir}>{…}</div>
  </BubbleMenu>
);
```

Same for `FloatingMenu`, `SlashCommandMenu`, `LinkBubbleMenu`, `TextBubbleMenu`, `TableToolbar`, `TableContextMenu`.

### Tiptap table column direction (RTL-specific semantics)

In Tiptap, `addColumnBefore()` always adds a column at the **DOM start**, which is the **visual right** in RTL (and visual left in LTR). Our table labels are written from the user's perspective in RTL:

- "افزودن ستون راست" (visual right) → `addColumnBefore()`
- "افزودن ستون چپ" (visual left) → `addColumnAfter()`

This is RTL-only. If the editor ever ships in LTR, the labels and the actions must be swapped together.

### Common copy-paste bugs that break RTL

- Wrong tooltip text (e.g., the italic button copy-pasted with `tooltip="Bulleted List"` and `tooltipShortcut={['Mod', 'Shift', '8']}` — both wrong; the real tooltip is "ایتالیک" with `['Mod', 'I']`).
- Tooltip declared but never rendered: `<Tooltip>{component}</Tooltip>` without `TooltipTrigger asChild` and `TooltipContent`. The fix is in `src/components/ui/toolbar.tsx`.
- Hardcoded `left/right` Tailwind classes that survive Tailwind purge.
- `text-align: right` inside an RTL element that already inherits `start` — overkill and breaks LTR fallback.

### How to audit a new component for RTL

1. Search the file for `left-`, `right-`, `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `border-l-`, `border-r-`. Any hit must be converted to logical equivalents.
2. Search for `dir="rtl"`. Should only appear in tests or true RTL-locked subtrees (code blocks). Everything else uses `useDirection`.
3. If the component renders into a tippy portal or Radix portal, verify `dir` is set on the root of the portaled content.
4. Run `npx tsc --noEmit` after changes.
5. Visually verify: place cursor in editor, select text (bubble menu must appear correctly positioned), insert table, right-click a cell (table context menu must appear).
### next/font `adjustFontFallback` shadows later fonts in the stack

If `localFont()` uses `adjustFontFallback: 'Arial'`, Next emits an extra `@font-face`
named `<family> Fallback` with **no `unicode-range`** (matches every character, rendered
from `local(Arial)`). Because it sits right after the real font in the resolved stack,
it swallows any character the real font's `unicode-range` doesn't cover — e.g. Latin
text on a Persian site never reaches the second font in the stack (`--font-latin`) and
stays plain Arial forever (the real Latin font is never even downloaded — check
`document.fonts` for `unloaded`).

- Fix: `adjustFontFallback: false` on the *first* font of the pair, so characters outside
  its `unicode-range` fall through to the next font. Verified on 2026-08-14 in
  `src/app/fonts/index.ts` (Vazirmatn Arabic + Inter Latin).
- Symptom to look for: English text looks like a system font while `document.fonts`
  shows the Latin font as `unloaded`.

### PowerShell 5.1 on Windows — file/CLI encoding & quoting hazards (learned 2026-08-22)

Two real corruptions in one session; both silently mangled Persian/UTF-8 content:

1. **Never round-trip source files via `Get-Content`/`Set-Content`** (and never redirect
   with `>`): PS 5.1 decodes UTF-8 as Windows-1252 and writes UTF-16/BOM — double-encoded
   mojibake (`â€”`, `Ø«Ø¨Øª`). Always use the agent's Edit/Write tools for file edits;
   recover corrupted files with `git checkout -- <file>`.
2. **`az` CLI + nested quotes**: inner double quotes in a `--scripts "..."` arg are eaten
   passing PS→native exe (`unrecognized arguments`). Keep remote commands quote-free
   (use `docker exec ... rm path` directly, no `sh -c "..."`) or base64 the payload.
3. **Long args**: PS 5.1 caps a single native argument near ~8k chars — gzip+base64 a
   script before sending it through `az vm run-command` (8KB .mjs → 3.3KB gz+b64).
