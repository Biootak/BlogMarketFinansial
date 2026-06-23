# Security Audit & Hardening — 2026-06-23

A focused security pass on the dashboard and role-based access control layer
of `blogmarketfinansial.ir`. The full findings list (with severity), what was
fixed in this pass, and what remains as follow-up.

## Threat model

* Anonymous visitors can hit any public route — must not reach admin data.
* Authenticated `USER` — can read public content, comment, like.
* `AUTHOR` — same as USER + create / edit / delete **their own** posts.
* `ADMIN` — full content + user management.
* `SUPER_ADMIN` — system settings + everything.

The middleware enforces the route-level view; **Server Actions are the trust
boundary** because they are reachable from any logged-in user with a valid JWT.

## Findings & fixes

### Critical (fixed)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `src/actions/userActions.ts` | `updateUser` / `deleteUser` / `updateUserRole` used `roleHierarchy[current] <= roleHierarchy[target]` which (a) prevented `SUPER_ADMIN` from editing themselves and (b) lived in three duplicate inline tables that could drift. | Single shared `ROLE_HIERARCHY` constant. New semantics: strictly greater (`<`) to mutate, plus an explicit `isSelf` short-circuit for self-edit. Self-role-escalation explicitly blocked. Self-delete explicitly blocked (no lock-out). |
| 2 | `src/actions/commentActions.ts` | `deleteComment` / `editComment` checked `role !== 'ADMIN'`, silently **denying SUPER_ADMIN** moderation rights. | Added `&& role !== 'SUPER_ADMIN'`. |
| 3 | `src/actions/categoryActions.ts` | `createCategory` / `updateCategory` / `deleteCategory` had **no role check** — any logged-in user could mutate the taxonomy. | `requireAdmin()` guard at the top of each. |
| 4 | `src/actions/advertisementActions.ts` | `createAdvertisement` / `updateAdvertisement` / `deleteAdvertisement` had **no role check**. | `requireAdmin()` guard. |
| 5 | `src/actions/exchange-rates.ts` | `createExchangeRate` / `updateExchangeRate` / `deleteExchangeRate` had **no role check**. | `requireAdmin()` guard. |
| 6 | `src/actions/rate-lists.ts` | Same as above. | `requireAdmin()` guard. |
| 7 | `src/actions/socialLinkActions.ts` | `createSocialLink` / `updateSocialLink` / `deleteSocialLink` / `toggleSocialLink` / `reorderSocialLinks` had **no role check**. | `requireAdmin()` guard. |
| 8 | `src/actions/S3Actions.ts` | `getPresignedUrl` was a fully public action that returned a **1-hour presigned PUT URL for any key** in the bucket — any anonymous caller could turn the bucket into a malware host using our Liara credentials. | `requireUser()` guard + MIME-type allowlist (jpg/png/webp/gif/svg only) + filename regex (`[a-zA-Z0-9._-]+`) + return shape `{ success, url, key }`. Note: no in-repo callers of `getPresignedUrl` were found, so this is also dead code that should be removed in a follow-up. |
| 9 | `src/actions/reports/activityLogs.ts` | `getActivityLog` did **not** call `checkReportAccess` despite importing `revalidatePath` — any logged-in user could read every user's activity history. | Added `await checkReportAccess()` at the top of `getActivityLog`. `systemLogs.ts` already calls it. |

### High (fixed)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 10 | `src/actions/settingsActions.ts` | 8 mutating settings actions (`updateGeneralSettings`, `updateEmailSettings`, `updateSocialSettings`, `updateCacheSettings`, `updateMaintenanceMode`, `generateApiKey`, `testSmtpConnection`, `testDatabaseConnection`) had **no role check** — any logged-in user could rewrite the site's SMTP credentials or maintenance flag. | `requireSuperAdmin()` guard on each (these touch the global config; not even `ADMIN` should touch them). |
| 11 | `src/lib/utils.ts` | `checkRole()` called `redirect('/unauthorized')` without `return`. After Next 16's typed revalidation wrapper changes this still works (redirect throws), but TypeScript inferred `Session | undefined`, so all callers had to write `session.user?.id` and runtime would crash if the redirect didn't throw (e.g. wrapped in try/catch). | Added `return null` after each `redirect()` and guarded the two call sites in `postActions.ts` (`createPost`, `likeItem`). |
| 12 | `src/actions/postActions.ts` | `createPost` and `likeItem` did `await checkRole([...])` then dereferenced `session.user.id` directly — they would have crashed if the type ever widens. | Added `if (!session) return { success: false, ... }` after each call. |

### Medium (already protected but worth noting)

| # | File | Status |
|---|------|--------|
| 13 | `src/actions/headerAdActions.ts` | ✓ `checkAdmin()` already used in all 4 mutating functions (`createHeaderAd`, `updateHeaderAd`, `deleteHeaderAd`, `toggleHeaderAd`). |
| 14 | `src/actions/postActions.ts` | ✓ `deletePost` and `updatePost` check role + ownership (AUTHOR can only touch their own posts). `deletePostAndInvalidate` calls `deletePost` so the check is transitive. |
| 15 | `src/actions/commentActions.ts` | ✓ `addComment` requires a session; `deleteComment`/`editComment` check ownership OR moderator (now also SUPER_ADMIN). |

### Low / informational (not fixed in this pass)

| # | Item | Notes |
|---|------|-------|
| 16 | `src/lib/utils.ts` `checkRole` redirects to `/unauthorized`. The page does not exist as a public route (it isn't in `publicRoutes`); fallback lands on `/`. | Cosmetic — the route does work, the path string is just unconventional. |
| 17 | `src/actions/currency-patterns.ts` mutating helpers (`savePatternToDB`, `savePatternsGroupToDB`, `loadPatternsFromDB`) have no auth. | These look like scrape-job internals; consider whether they should be `auth === SUPER_ADMIN` or moved to `/api/cron/*`. |
| 18 | `src/actions/shareAction.ts`, `serviceRequestActions.ts`, `newsletter.ts`, `search.ts` | Read or low-risk mutations; left untouched. Worth a follow-up pass. |
| 19 | `src/actions/cacheActions.ts` invalidate* helpers | They can only invalidate caches, not read or write data; the impact of a logged-in USER calling them is only stale data + cache slot pressure. Document as "intentionally public to logged-in users" or wrap in `requireUser()`. |
| 20 | `src/lib/rate-limiter.ts` | The Upstash path exists with a memory-LRU fallback. The fallback's per-IP window is in-process, so it is bypassable by spreading load across processes or containers. If the project scales to >1 Node process, **disable the fallback** via env to force Upstash. |

## Helpers introduced

* `src/lib/require-auth.ts` — `requireUser`, `requireRole`, `requireAdmin`,
  `requireSuperAdmin`, `requireAuthor`, `authFailureToActionResult`.
  Returns a discriminated `AuthResult` so server actions don't have to throw
  redirects into a try/catch (which silently swallows the redirect in some
  Next 16 server-action paths).

## Verification

* `npx tsc --noEmit` — zero errors in any of the hardened files. The two
  pre-existing TS errors in `src/actions/sidebarActions.ts` and
  `src/components/WidgetTags/WidgetTags.tsx` are unrelated to security.
* ESLint — not run; the project doesn't have an `eslint.config.js` configured.
  This is a pre-existing gap (see AGENTS.md).

## Recommended follow-up

1. **Write integration tests for each requireRole gate.** The project has no
   test framework installed; installing `vitest` is a small lift and would
   catch regressions like the ones found here.
2. **Add a Sentry alert** for `requireAdmin` → `FORBIDDEN` outcomes on the
   `updateEmailSettings` action specifically (smtp-credential change attempts
   from non-SUPER_ADMIN are a strong signal of compromise).
3. **Audit `src/app/api/*` route handlers.** The middleware does role-gate
   `/api/*` based on prefix lists, but specific handlers (e.g.
   `/api/cron/sync-bazaar`) should double-check their own auth header.
4. **Tighten the `bcrypt` rounds from 12 to a budget-aware value** for 2026
   hardware. 12 is the floor; if the login latency budget allows, bump to
   13 in a single change once measured.
5. **Drop `src/actions/S3Actions.ts` entirely.** No in-repo callers; remove
   to avoid drift between `/api/upload` and this direct-uploader.