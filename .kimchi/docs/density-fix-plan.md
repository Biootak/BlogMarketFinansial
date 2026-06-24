# Site Density Reduction — Spec

**Goal:** All public `(site)` pages currently look "zoomed in" / oversized. Reduce overall scale so they read like a professional, dense site — smaller fonts, tighter rhythm, narrower content line length.

**Out of scope:** Dashboard pages (own v2 design), backend/data/auth, copy changes, content.

---

## Chunk A — Foundation + page rhythm

### A.1 `src/app/globals.css`

**Tighten `.container` max-widths + padding (lines ~778–806):**

Change:
```css
@media (min-width: 1024px) { .container { max-width: 1200px; padding-inline: 2rem; } }
@media (min-width: 1280px) { .container { max-width: 1400px; } }
@media (min-width: 1536px) { .container { max-width: 1600px; } }
```
To:
```css
@media (min-width: 1024px) { .container { max-width: 1140px; padding-inline: 1.5rem; } }
@media (min-width: 1280px) { .container { max-width: 1280px; } }
@media (min-width: 1536px) { .container { max-width: 1440px; } }
```

**Reduce `--fs-*` scale (lines ~287–300):** drop each by ~2px so the whole text scale shrinks ~13%.

| Token | Before | After |
|---|---|---|
| `--fs-base` | 14px | 13px |
| `--fs-sm` | 12px | 11px |
| `--fs-xs` | 11px | 10px |
| `--fs-lg` | 15px | 14px |
| `--fs-xl` | 16px | 15px |
| `--fs-2xl` | 18px | 16px |
| `--fs-3xl` | 22px | 19px |
| `--fs-4xl` | 26px | 22px |
| `--fs-5xl` | 30px | 26px |

**Tighten body line-height:** change `body { line-height: var(--leading-normal); }` to `body { line-height: 1.45; }` for denser paragraphs.

### A.2 `src/app/layout.tsx`

Pass `adjustFontFallback: true` to `Vazirmatn({...})` so Persian glyphs render visually more compact (next/font adds a `size-adjust` to the fallback font for CLS — keep this for stability, but pair with the smaller `--fs-base` for net effect).

### A.3 Section rhythm across `(site)`

Find and tighten the following patterns. Use `edit` with each unique occurrence (do NOT do a project-wide `sed`-style replace — verify each context is a section gap, not unrelated usage):

| Pattern | New value |
|---|---|
| `mt-8 lg:mt-12` | `mt-6 lg:mt-8` |
| `mb-10 lg:mb-16` | `mb-8 lg:mb-12` |
| `py-8 sm:py-16 lg:py-24` | `py-6 sm:py-10 lg:py-14` |
| `py-8 sm:py-12 lg:py-16` | `py-6 sm:py-10 lg:py-12` |
| `space-y-10`, `space-y-12`, `space-y-16` | `space-y-8`, `space-y-10`, `space-y-12` (drop one step) |

Apply in: `src/app/(site)/(home)/page.tsx`, `src/app/(site)/(singles)/...`, `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx`, `src/app/(site)/(others)/...`. Use `grep` first to count occurrences and confirm scope.

### A.4 Card grid gaps

`src/components/Sections/SectionMagazine7.tsx` and other `Section*.tsx`:

| Pattern | New value |
|---|---|
| `gap-4 sm:gap-5 md:gap-6` | `gap-3 sm:gap-4 md:gap-5` |
| `gap-5 sm:gap-7 md:gap-8` | `gap-4 sm:gap-5 md:gap-6` |
| `gap-6 lg:gap-8` | `gap-5 lg:gap-6` |

### A.5 Sidebar / two-column gap

- `src/app/(site)/(singles)/(has-sidebar)/layout.tsx`: `gap-10 @xl/has-sidebar:gap-12 @xl/has-sidebar:pe-12` → `gap-6 @xl/has-sidebar:gap-8 @xl/has-sidebar:pe-8`
- `src/app/(site)/(singles)/(default)/single/[[...slug]]/page.tsx`: `gap-8 lg:gap-12` → `gap-6 lg:gap-8`

### A.6 Archive

- `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx`: tighten the inline `style={{ marginTop: 'var(--ds-space-6)' }}` to `'var(--ds-space-4)'` if present.

### Verification
```bash
cd /mnt/c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit
npm run build    # optional — slower; run if tsc is clean
```
Both must exit 0.

---

## Chunk B — Typography + prose width + card padding

### B.1 Single post title
`src/app/(site)/(singles)/SingleTitle.tsx` (or whatever the heading component is):

If `text-2xl sm:text-3xl md:text-4xl lg:text-4xl` (or similar), reduce to `text-xl sm:text-2xl md:text-3xl lg:text-3xl`.

If the file uses design tokens from `src/lib/design-tokens.ts`, also tighten the `h1` token from `'text-lg sm:text-xl font-bold tracking-tight'` to `'text-base sm:text-lg font-bold tracking-tight'` (18/20 → 16/18). Match the pattern of h2/h3/h4 — drop one step each.

### B.2 Prose width cap
`src/app/(site)/(singles)/SingleContentClient.tsx`:

The article body currently uses `max-w-full`. Find the main `<article>` or its content wrapper and apply `max-w-3xl` (≈768px) so reading width is comfortable. Likely add `max-w-3xl` to the existing wrapper className, or wrap the content in `<div className="mx-auto max-w-3xl">`.

### B.3 Card padding reduction

Look at these components and reduce padding by one step:

- `src/components/Card7/` (and variants Card7V2, Card10V3, etc.)
- `src/components/Card2/`, `Card3/`, etc. — only the ones used in `(site)` public pages
- `src/components/Sections/SectionMagazine7.tsx` inner cards if any have explicit `p-*`

| Before | After |
|---|---|
| `p-5 sm:p-6` | `p-4 sm:p-5` |
| `p-6 sm:p-8` | `p-5 sm:p-6` |
| `px-5 py-4 sm:px-6` | `px-4 py-3 sm:px-5` |
| `p-4 sm:p-6 lg:p-8` | `p-4 sm:p-5 lg:p-6` |

Use `grep` to find card padding patterns; verify each is a card root before changing.

### B.4 Hero sections (light touch)

Look at `(site)/(home)/page.tsx` and other hero blocks. If a hero heading uses `text-3xl sm:text-4xl lg:text-5xl`, drop one step to `text-2xl sm:text-3xl lg:text-4xl`. Don't change if it's already ≤ `text-2xl`.

### Verification
```bash
npx tsc --noEmit
```
Must exit 0.

---

## Anti-flake / guardrails

- Do NOT change `(dashboard)` files.
- Do NOT change `prisma/`, `src/lib/db.ts`, auth files.
- Do NOT introduce new dependencies.
- Do NOT modify `next.config.ts`, `package.json`, `tsconfig.json`.
- For each edit, ensure the `oldText` is unique. If a pattern occurs in many places, prefer per-file targeted `edit`s over a sweeping replace.
- If a section already uses tighter spacing than what the spec says, leave it alone — the goal is "professional density", not "uniformly tight".
- Run `npx tsc --noEmit` exactly once at the end. Do not loop on fixing type errors beyond the first report.

## Reporting

After each chunk, the Builder agent must report:
1. Files touched (paths + count)
2. One-line summary per file (what changed)
3. `tsc` exit status + any warnings
4. Any spec items that were skipped or could not be applied, with reason
