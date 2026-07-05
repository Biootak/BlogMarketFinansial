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