# AGENTS.style.md — Style & tooling conventions

Load when writing or editing any code.

## Core

- **TypeScript strict**; `noExplicitAny` and `dangerouslySetInnerHTML` are **errors** in Biome, `useHookAtTopLevel` is an error. Biome is the formatter/linter of record but invoked ad-hoc; CI uses `npm run lint` (ESLint).
- **Tailwind v4** (`@tailwindcss/postcss`), **Radix UI** primitives, **Tiptap** for the editor, **date-fns** + **date-fns-jalali** for Persian dates.
- **RTL is global** (`html dir="rtl" lang="fa-IR"`). Use logical properties — **never** hardcode `left/right`. Use `useDirection('rtl')` from `@/hooks/useDirection` in Editor1 shell/portal components. Full playbook in `AGENTS.gotchas.md` ("RTL — Best practices").
- **Vazirmatn** font via `next/font/google` with subset `arabic`, weights `[400, 500, 600, 700]`.
- **English** in code, commands, paths, file names. **Persian** only in user-facing copy.

## API response shape

```ts
{ success: true, data } | { success: false, error: { code, message } }
```

## Cache tag conventions

`unstable_cache` wrappers and `cacheActions.ts` use: `posts`, `archive`, `featured-posts`, `latest-posts`, `popular-posts`, `post-{id}`, `post-slug`, `post-by-slug`, `comments`, `categories`, `tags`, `sidebar-data`, `dashboard-stats`, `ticker`, `exchange-rates`, `header-ad`, `advertisements`, `rate-lists`, `dashboard-{section}`. New write paths must invalidate the matching tag(s).

## Component CSS Standard (2026)

Load when authoring any component or route UI. This is the enforceable "right path" — follow it so we never regress into the 14k-line global `dashboard.css` mess.

- **Scoping:** Every component/route gets a co-located **CSS Module** (`Component.module.css`). The ONLY global CSS is `globals.css` (token `@theme` + `@import tokens.css` + app-wide `anim-*` utilities). **Never** add component styles to `globals.css`. Existing global route files (`dashboard.css`, `setup.css`, `auth.css`, `atelier-archive.css`, `money-transfer/styles.css`) MUST be migrated to modules — do not extend them.
- **Tokens:** Use ONLY `--ds-*` from `src/components/ds/styles/tokens.css`. No hardcoded color/spacing/radius. The legacy shadcn channels (`--background/--card/--border/...`) and `--color-*` are dead/duplicate — never reference them.
- **Shared effects:** Reuse the global `anim-*` utilities (`anim-fade-in-up`, `anim-ping-soft`, `stagger-children`, …) from `globals.css`. Do NOT define per-component duplicates (`.reveal`, local `@keyframes`, etc.). New shared effects go in `globals.css` once, named `anim-*`/`fx-*` — not per page.
- **Tailwind v4 (CSS-first):** `globals.css` uses `@import "tailwindcss"` + `@theme`. There is **no `tailwind.config.js`** (deleted — v4 ignores it, container-queries & aspect-ratio are built-in). Do NOT recreate a config file; add utilities/tokens in CSS.
- **Inline style:** Only for genuinely dynamic values (e.g. a CSS var driven from JS). Never for static appearance — use a class.
- **RTL:** Logical properties only; no `left/right`. Use `useDirection('rtl')` in Editor1 shells/portals.
- **Motion:** Animate `opacity`/`transform` only. Every animation is auto-clamped by the global `prefers-reduced-motion` rule in `tokens.css:221` — do NOT add a per-component reduced-motion block.
- **Dead code:** Remove unused tokens/keyframes; never duplicate the token source of truth.