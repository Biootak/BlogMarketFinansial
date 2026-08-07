# Production Release Checklist

**Project:** BlogMarketFinansial  
**Branch:** `redesign/observability-almanac-2026`  
**Owner:** ____________________  
**Release/version:** ____________________  
**Planned release time:** ____________________  
**Rollback owner:** ____________________  

> Do not deploy until every **P0** item is checked. A checked box means evidence exists, not that the task was merely attempted.

## P0: Release blockers

### Source and build integrity

- [ ] No merge-conflict markers remain: `git grep -n -E '<<<<<<<|=======|>>>>>>>' -- ':!docs/*'`
- [ ] `npm ci` completes successfully from a clean checkout
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm test` passes
- [ ] `npm run verify` passes
- [ ] Approved production build passes: `npm run build:webpack` or the current deployment command
- [ ] Build output was generated from the exact commit being deployed
- [ ] No uncommitted changes exist in the deployment workspace

### Secrets and environment

- [ ] Production `AUTH_SECRET` is present, strong, and not reused from development
- [ ] `DATABASE_URL` and `DIRECT_URL` point to the intended production database
- [ ] `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` use the canonical HTTPS domain
- [ ] `CRON_SECRET`, storage credentials, SMTP credentials, Sentry DSN, and payment/provider credentials are configured in the secret manager
- [ ] `.env`, database dumps, backup files, private keys, and credentials are not tracked or included in the artifact
- [ ] Seed credentials and development accounts are not present in production
- [ ] `NODE_ENV=production` is set and verified at runtime
- [ ] Encryption/key-rotation variables required by secret-bearing models are configured

### Authentication and authorization

- [ ] Anonymous requests to every private page return the expected redirect/401 response
- [ ] Anonymous requests to every private API return JSON 401, not an HTML login page
- [ ] USER, AUTHOR, ADMIN, OWNER, SUPERADMIN, SUPPORT, CUSTOMER, MERCHANT, and EXCHANGE role boundaries are smoke-tested
- [ ] Cross-user object access is denied for IDs, filenames, tracking codes, accounts, transactions, KYC, tickets, and backups
- [ ] Session expiry returns a safe 401 and does not create redirect loops for fetch requests
- [ ] 2FA enrollment, verification, backup codes, recovery, and disable flows are tested
- [ ] The 2FA QR endpoint requires authentication and never forwards the `otpauth` secret to a third party
- [ ] Password reset, email verification, OTP, and login brute-force limits are active
- [ ] Cookies are Secure, HttpOnly where appropriate, SameSite-correct, scoped correctly, and not exposed in logs

### Financial correctness

- [ ] Every transaction/deal/transfer/refund/settlement mutation has an idempotency key or equivalent duplicate guard
- [ ] Concurrent requests with the same idempotency key create exactly one business result
- [ ] Financial mutations use one database transaction for state changes, ledger writes, status logs, and side effects that must be atomic
- [ ] Ledger debit/credit direction and running balances reconcile for representative flows
- [ ] Amounts, currencies, rates, fees, and rounding are validated server-side
- [ ] AFN is the default currency where the product contract requires it
- [ ] Expired quotes cannot be selected or used
- [ ] Refund, reversal, cancellation, and dispute paths are tested
- [ ] Settlement totals reconcile against completed deals and platform fees
- [ ] No test or seed transaction exists in the production database

### Uploads and sensitive data

- [ ] Upload MIME type is checked against magic bytes, not only the client-provided type
- [ ] Image dimensions, decompression/resource limits, file count, and request size are bounded
- [ ] SVG/script-capable formats are rejected or sanitized with a security-reviewed pipeline
- [ ] KYC, exchange, avatar, and general uploads enforce purpose, owner/entity binding, and role authorization before storage
- [ ] Private documents are not served from a public URL without an access check or signed short-lived URL
- [ ] Backup/export files redact SMTP passwords, API secrets, webhook secrets, OTP secrets, and tokens
- [ ] Error responses never include database, provider, filesystem, stack, or secret details

## P1: Platform readiness

### Database and migrations

- [ ] Migration status is clean and all migrations are committed
- [ ] Migration was tested against a production-like database snapshot
- [ ] A rollback or forward-fix plan exists for the migration
- [ ] Required indexes exist for high-volume queries and rate-limit lookups
- [ ] Connection pool limits are compatible with the production database
- [ ] Backup completed immediately before migration
- [ ] Backup restore was tested in a clean database

### APIs, jobs, and integrations

- [ ] Every API route has an explicit auth/public classification and a route-level test
- [ ] Public APIs have rate limits, bounded pagination, bounded query strings, and safe cache headers
- [ ] Cron endpoints require constant-time secret verification and reject missing/invalid secrets
- [ ] Dev/debug/seed endpoints are absent from the production artifact or fail closed with verified 404 behavior
- [ ] SMTP test performs a real bounded connection/authentication, not a simulated delay
- [ ] External market-rate providers have timeout, retry, stale-data, and failure behavior verified
- [ ] Queue jobs are retry-safe and dead-letter behavior is observable
- [ ] Sentry receives a test event without exposing secrets or personal data
- [ ] Health endpoints expose only intentional public data

### Security headers and browser behavior

- [ ] CSP is verified in production and does not rely on unnecessary `unsafe-inline` or `unsafe-eval`
- [ ] HSTS is active only on the canonical HTTPS production domain
- [ ] `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and frame protections are present
- [ ] Cache headers never cache authenticated, settings, financial, KYC, backup, or error responses publicly
- [ ] CORS/origin policy is intentional and tested
- [ ] No mixed-content requests occur
- [ ] Remote image/script/frame allowlists contain only required domains

## P1: Product and UX smoke test

- [ ] Home, blog, post detail, search, categories, rates, money transfer, tracking, auth, dashboard, customer portal, and exchange portal load successfully
- [ ] Persian RTL and mixed Persian/Latin content render correctly on mobile and desktop
- [ ] AFN appears first where required; Iranian تومان is not used as the default Afghan unit
- [ ] Forms show server validation errors and preserve safe user input
- [ ] Loading, empty, unauthorized, expired-session, degraded, and error states are visible and truthful
- [ ] Mobile navigation, upload flows, tables, filters, dialogs, and keyboard focus work
- [ ] No hydration warnings appear in browser console
- [ ] No uncaught client errors appear in browser console
- [ ] Lighthouse/performance budget is recorded for mobile and desktop
- [ ] Accessibility smoke test covers keyboard navigation, focus visibility, labels, contrast, and screen-reader landmarks

## Deployment and rollback

- [ ] Deployment artifact is tagged with commit SHA: ____________________
- [ ] Database backup ID/checksum: ____________________
- [ ] Migration command and result recorded: ____________________
- [ ] Deployment completed with zero unexpected errors
- [ ] Process/container health is green
- [ ] Logs, metrics, queues, cron runs, email delivery, storage, and database latency are monitored for 15 minutes
- [ ] One authenticated smoke test and one anonymous smoke test pass after deploy
- [ ] Critical financial read/write smoke test passes with test-safe data
- [ ] Rollback command is known and tested/documented: ____________________
- [ ] Rollback decision owner is available during the observation window
- [ ] Release notes and known limitations are published

## Sign-off

- [ ] Engineering sign-off: ____________________  Date: __________
- [ ] Security sign-off: ____________________  Date: __________
- [ ] Product/operations sign-off: ____________________  Date: __________
- [ ] Release manager sign-off: ____________________  Date: __________

## Evidence links

- Build/CI run: ____________________
- Test report: ____________________
- Migration report: ____________________
- Backup/restore report: ____________________
- Security scan: ____________________
- Post-deploy monitoring dashboard: ____________________
