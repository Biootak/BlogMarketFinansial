# Production-Critical Audit

**Repository:** `Biootak/BlogMarketFinansial`  
**Branch audited:** `redesign/observability-almanac-2026`  
**Audit date:** 2026-08-07  
**Method:** repeated static repository review, targeted source/config/schema inspection, route and security-boundary review. No build, deploy, database mutation, or runtime smoke test was executed.

## Release decision

**DO NOT DEPLOY.** The project has unresolved release blockers. A static audit is not a green release gate.

## Pass 1 findings

### C-01: Merge-conflict markers in production source

**Severity:** Critical  
**Evidence:** `src/app/dashboard/observability/page.tsx` was confirmed on the audited branch with `<<<<<<< HEAD`, `=======`, and `>>>>>>>`, causing the reported `Expression expected` error. Conflict markers were also found in observability stylesheets/components, including `observability.module.css`, `boards.module.css`, `LiveBar.module.css`, `BoardSkeleton.module.css`, and `ObservabilityNav.module.css`.

**Impact:** Next.js parser/PostCSS failure.  
**Required fix:** remove every conflict marker across the repository, then run typecheck, lint, tests, verify, and production build.

### C-02: API key generation has competing implementations

`src/actions/settingsActions.ts` contains `generateApiKey()`, which returns a UUID-shaped key without persisting a real `ApiKey` record. The same file has `createApiKey()` storing metadata in `AuditLog`, while `prisma/schema.prisma` defines a real `ApiKey` model.

**Impact:** keys can be non-durable, inconsistently revocable, and impossible to validate consistently.  
**Fix:** choose one canonical storage/verification flow with expiry, scopes, revocation, last-used updates, hashing, and tests.

### C-03: Security settings are not authoritative runtime configuration

`updateSecuritySettings()` stores policy values in an `AuditLog` snapshot and returns success even when the audit write fails. `getSecuritySettings()` reconstructs the latest snapshot from that log.

**Impact:** session timeout, IP allowlist, forced 2FA, concurrent-session limits, and retention settings are not guaranteed to be applied.  
**Fix:** persist a real singleton/table or explicit columns, write transactionally, fail closed, and make auth/session/rate-limit code consume them.

### C-04: SMTP test is simulated

`testSmtpConnection()` waits 1.5 seconds and returns success without connecting to SMTP.

**Impact:** invalid production mail credentials can be reported as healthy.  
**Fix:** perform a bounded real connection/authentication and return only stable safe errors.

### C-05: Financial mutation safety is unverified

The schema includes `Transaction`, `LedgerEntry`, `CurrencyDeal`, and `Settlement` with idempotency fields, but static review cannot prove every create/approve/complete/refund/settle mutation uses one database transaction, checks idempotency before side effects, and writes matching ledger entries.

**Release gate:** concurrent idempotency and ledger-consistency tests are mandatory.

## Pass 2 findings

### C-06: TOTP QR endpoint leaks the OTP enrollment secret to a third party

**Evidence:** `src/app/api/2fa/qr/route.ts` accepts any `data` query parameter beginning with `otpauth://totp/` without authentication, then forwards the full secret-bearing URI to `https://api.qrserver.com/v1/create-qr-code/`.

**Impact:** anyone who obtains or guesses an enrollment URI can send the TOTP secret to an external service and receive a QR image. This is a credential-enrollment secret, not public content. It also creates an unnecessary third-party privacy dependency.

**Required fix:** require the authenticated user and verify the URI belongs to the current enrollment flow; generate QR locally or use a server-side library; never send the secret to a third party; add no-store headers and tests for unauthenticated access.

### C-07: Production API error details are still exposed

**Evidence:** `src/app/api/tickets/snapshot/route.ts`, `src/app/api/money-transfer/symbols/route.ts`, and `src/app/api/money-transfer/rates/route.ts` return `err.message` to clients. `src/app/api/system-status/route.ts` also conditionally returns `String(err)` in development, which is unsafe if environment configuration is wrong or a non-production mode is exposed.

**Impact:** provider, database, filesystem, or query details become an information oracle.  
**Required fix:** stable `{ success: false, error: { code, message } }` responses only; send full errors to the server logger/Sentry.

### H-01: Middleware API coverage is fragile

`middleware.ts` uses an explicit list of management API matchers. Any future private route omitted from that list bypasses middleware and must remember to implement its own guard. The route search also surfaced many API handlers outside the middleware list.

**Required fix:** use a default API matcher with explicit public exceptions, or enforce a shared private-route wrapper and add an automated auth-coverage test.

### H-02: Development/debug route files ship in the app tree

`src/app/api/dev/*` and `src/app/api/debug-session` exist in the production route tree. Several handlers return 404 in production, but they remain defense-by-runtime-branch rather than being removed from the artifact.

**Required fix:** move development handlers out of the production route tree or fail the production build when dev routes are present.

### H-03: Sensitive upload folders are broad and not entity-bound

`src/app/api/upload/route.ts` allows authenticated users to upload to `kyc`, `logos`, and `exchange`; ownership/binding is deferred to later actions.

**Impact:** orphaned sensitive documents, storage abuse, and cross-entity attachment mistakes.  
**Required fix:** require purpose plus target entity, authorize ownership/staff access before storage, create a pending attachment record, and expose only bound objects.

### H-04: Production CSP allows `unsafe-inline` scripts

`next.config.ts` includes `script-src 'self' 'unsafe-inline'` in production.

**Required fix:** move to nonce/hash-based CSP where framework constraints allow it and document any unavoidable exception.

### H-05: Secrets are plaintext-capable in the schema

`SystemSettings.smtpPassword`, `User.twoFactorSecret`, `ApiKey.secret`, and `Webhook.secret` are plain `String` fields. Some flows have encrypted variants, but the model/code contract is mixed.

**Required fix:** use envelope encryption for retrievable secrets, hashes where verification is enough, rotation, and backup/export redaction.

## Pass 2 false-positive handling

Direct branch reads confirmed that `/api/system-health` and `/api/backup/download` had auth/rate-limit protections in the audited branch. Some GitHub code-search snippets were stale/default-ref results, so those routes are not reclassified as current blockers without a direct branch read. This is why the report distinguishes confirmed branch reads from search-only leads.

## Correctness and operational findings

### Q-01: API-key source of truth is split

Schema `ApiKey`, AuditLog reconstruction, and legacy key generation can drift between UI metadata, actual authentication, revoke behavior, and expiry.

### Q-02: Important audit writes are best-effort

API-key, backup, and security audit rows are caught/ignored in places where success should mean durable auditability.

### Q-03: Backup deletion can diverge filesystem and database

`deleteBackup()` deletes the filesystem object first and then best-effort deletes metadata. Reconciliation failures can leave inventory inconsistent.

### Q-04: Many standalone Prisma clients exist in scripts

This is acceptable only for isolated CLI processes. It must be explicitly kept out of imported runtime code and deployment entry points.

### Q-05: Seed data is unsafe for production

`prisma/seed.js` creates development users, sample OAuth tokens, sample financial records, placeholder images, and test transactions. Deployment must guarantee the seed never runs against production.

### Q-06: Public market-rate APIs leak raw exception messages

The public market-rates/money-transfer failure path is externally callable, so error messages must not include provider or database details.

## Mandatory release gates

1. `git grep -n -E '<<<<<<<|=======|>>>>>>>' -- ':!docs/PRODUCTION-CRITICAL-AUDIT.md'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npm run build:webpack` or the approved production build command
7. authenticated route smoke tests for every private API
8. unauthenticated TOTP QR test proving enrollment secrets are never forwarded
9. concurrent idempotency tests for transaction, deal, transfer, refund, and settlement mutations
10. backup restore test into a clean database
11. production CSP, cookie, secret-redaction, and route-auth scan

The GitHub code-search API hit its rate limit during repeated passes, so this file records confirmed findings and explicitly labels unresolved verification. **This report is not a claim that the project is deployable.**