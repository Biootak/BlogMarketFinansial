# Production-Critical Audit

**Repository:** `Biootak/BlogMarketFinansial`  
**Branch audited:** `redesign/observability-almanac-2026`  
**Audit date:** 2026-08-07  
**Method:** static repository review, targeted source/config/schema inspection, route and security-boundary review. No build, deploy, database mutation, or runtime smoke test was executed.

## Release decision

**DO NOT DEPLOY.** The branch currently contains parser-breaking merge-conflict markers and multiple production-behavior defects. The conflict markers alone make the release a hard stop.

## Confirmed critical blockers

### C-01: Merge-conflict markers remain in production source

**Severity:** Critical  
**Evidence:** `src/app/dashboard/observability/page.tsx` contains `<<<<<<< HEAD`, `=======`, and `>>>>>>>`. The reported build error at line 67 is a direct consequence. The same marker pattern was also found in observability stylesheets/components during the audit, including `observability.module.css`, `boards.module.css`, `LiveBar.module.css`, `BoardSkeleton.module.css`, and `ObservabilityNav.module.css`.

**Impact:** Next.js parser/PostCSS failure; production cannot build reliably.  
**Required fix:** remove every conflict marker across the entire repository, then run typecheck, lint, and the production build.

### C-02: API key generation path is not a complete persisted API-key flow

**Severity:** Critical  
**Evidence:** `src/actions/settingsActions.ts` contains `generateApiKey()`, which creates a UUID-shaped key and returns it, but does not persist an `ApiKey` row or hash. The same file has a separate `createApiKey()` flow that stores metadata in `AuditLog`, while `prisma/schema.prisma` also defines a real `ApiKey` model. These are competing implementations.

**Impact:** keys generated through the legacy action are not durable, not revocable through the real key table, and cannot be validated consistently. A security setting can appear to succeed while creating an unusable credential.

**Required fix:** delete or migrate `generateApiKey()` to the canonical `createApiKey()` implementation; choose one storage model; add an authenticated verification path, expiry enforcement, scope enforcement, revocation, last-used updates, and tests.

### C-03: Security settings are persisted only as an audit-log snapshot

**Severity:** Critical  
**Evidence:** `updateSecuritySettings()` in `src/actions/settingsActions.ts` writes values into an `AuditLog` row and returns `success: true`. `getSecuritySettings()` reconstructs the latest values from that log. The action comments explicitly describe this as best-effort.

**Impact:** security controls such as session timeout, IP allowlist, forced 2FA, concurrent-session limits, and audit retention are not authoritative runtime configuration. If the audit insert fails, the action still succeeds and the requested security policy is not applied.

**Required fix:** add a real `SecuritySettings` singleton/table or explicit columns, write transactionally, fail closed on persistence failure, and make auth/session/rate-limit code consume the stored values.

### C-04: SMTP test reports success without testing SMTP

**Severity:** Critical  
**Evidence:** `testSmtpConnection()` in `src/actions/settingsActions.ts` waits 1.5 seconds and returns a success message. Its own comment says it simulates the test.

**Impact:** operators can deploy invalid mail credentials believing email delivery is healthy. Password-reset, OTP, verification, and notification flows can fail in production while the settings UI reports green.

**Required fix:** perform a real bounded SMTP connection/authentication using the configured host, port, username, and password; never return credentials; add timeout and safe error mapping.

### C-05: Financial/data mutations need a deployment gate for idempotency and transactionality

**Severity:** Critical pending runtime verification  
**Evidence:** the schema contains financial mutation entities (`Transaction`, `LedgerEntry`, `CurrencyDeal`, `Settlement`) and idempotency fields, but static inspection alone cannot prove every mutation path uses a single database transaction, checks idempotency before side effects, and writes matching ledger entries.

**Impact:** duplicate requests, partial writes, balance drift, or double settlement are unacceptable in a real financial product.

**Required fix:** block release until every create/approve/complete/refund/settle path is mapped and covered by concurrency tests using the same idempotency key.

## Confirmed high-severity findings

### H-01: Raw internal error text is returned by production-facing action/API paths

**Evidence:** `src/actions/headerAdActions.ts` returns `String(err)` in action results; `src/app/api/system-status/route.ts` includes `String(err)` in development responses; `src/app/api/money-transfer/symbols/route.ts` and `src/app/api/money-transfer/rates/route.ts` return `error.message`.

**Impact:** infrastructure/provider/database details can leak to clients and become an information oracle.  
**Fix:** return stable public error codes/messages; log the full exception server-side through the central logger.

### H-02: Middleware does not cover every API route

**Evidence:** `middleware.ts` matcher is an explicit list of selected management endpoints. All other `/api/*` routes bypass this middleware and must be independently authenticated. The current architecture is fragile because adding a sensitive route without adding it to the list silently creates a security gap.

**Impact:** future or currently unreviewed routes can be exposed if their handler forgets its own auth guard.  
**Fix:** use a default API matcher with explicit public exceptions, or enforce a shared auth wrapper in every private route and add an automated route-auth audit.

### H-03: Development/debug routes are shipped into the application bundle

**Evidence:** `src/app/api/dev/*` and `src/app/api/debug-session` exist in the app tree. They currently return 404 in production in several handlers and middleware also blocks them, but this is defense by runtime branch rather than removal from the production artifact.

**Impact:** accidental environment misconfiguration or a future missing guard can expose seed/debug behavior.  
**Fix:** move dev-only handlers outside the production route tree or fail the build when dev routes are present in a production manifest.

### H-04: Uploaded KYC/exchange assets are accepted for any authenticated user in broad folders

**Evidence:** `src/app/api/upload/route.ts` allows authenticated users to write to `kyc`, `logos`, and `exchange`; the handler comment says binding is checked later by another action. The upload endpoint itself does not bind the uploaded object to a specific owner/entity before storage.

**Impact:** orphaned sensitive documents, storage abuse, and possible cross-entity attachment mistakes if a caller later reuses the returned URL incorrectly.

**Fix:** require an upload purpose plus target entity, authorize ownership/staff access in the upload route, store a pending attachment row, and only expose object URLs after binding.

### H-05: Production CSP permits `unsafe-inline` scripts

**Evidence:** `next.config.ts` sets `script-src 'self' 'unsafe-inline'` in production.

**Impact:** XSS impact is materially higher if any HTML/script injection exists elsewhere.  
**Fix:** move to nonce/hash-based CSP for inline scripts; keep exceptions only where framework-required and document them.

### H-06: Secrets are represented as plaintext fields in the database schema

**Evidence:** `SystemSettings.smtpPassword`, `User.twoFactorSecret`, `ApiKey.secret`, and `Webhook.secret` are plaintext `String` fields in `prisma/schema.prisma`. Some flows use encrypted variants for 2FA, but the schema and code paths are mixed.

**Impact:** a database read or backup leak becomes credential compromise.  
**Fix:** encrypt secrets at rest with a versioned KMS/app-key envelope, store only hashes where verification is sufficient, rotate keys, and redact backup/export paths.

## Confirmed release-quality / correctness findings

### Q-01: No single source of truth for API keys

The schema has `ApiKey`, the settings actions reconstruct keys from `AuditLog`, and the route reads the action. This guarantees drift between UI metadata, actual authentication, revoke behavior, and expiry behavior.

### Q-02: Backup and audit operations are best-effort in places where correctness matters

`settingsActions.ts` catches and ignores failures for audit rows around API keys, backup settings, backup deletion, and security settings. A successful response can therefore mean the requested audit/security record was not written.

### Q-03: Backup deletion is filesystem-first and database-second

`deleteBackup()` removes the file and then best-effort deletes the `BackupRun` row. If the database deletion fails, the UI and filesystem/database inventory can diverge. The operation should be transactional at the metadata level and return a warning/failure when reconciliation fails.

### Q-04: Repository contains many standalone Prisma clients in scripts

`new PrismaClient()` appears in multiple scripts and seed utilities. This is acceptable only for isolated CLI processes, not application code, but it must be explicitly classified and excluded from the rule rather than allowed to drift into imported runtime modules.

### Q-05: Seed data is not production-safe by default

`prisma/seed.js` creates development users, sample OAuth tokens, sample financial/exchange records, placeholder external images, and test transactions. The script is correctly separate from normal runtime, but deployment pipelines must guarantee it is never run against production.

## Coverage notes and unresolved verification items

The GitHub code-search API hit its rate limit during the audit, so this file records confirmed static findings plus the remaining mandatory gates rather than claiming a green full-project verification.

Before deployment, execute and attach results for:

1. `git grep -n -E '<<<<<<<|=======|>>>>>>>' -- ':!docs/PRODUCTION-CRITICAL-AUDIT.md'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npm run build:webpack` (or the approved production build command)
7. authenticated route smoke tests for every private API
8. concurrent idempotency tests for transaction, deal, transfer, refund, and settlement mutations
9. backup restore test into a clean database
10. production CSP and cookie/security-header scan

**This audit file is a release blocker checklist, not a claim that the project is deployable.**