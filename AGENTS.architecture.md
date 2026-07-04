# AGENTS.architecture.md — Architecture guardrails

Load for multi-file changes, DB / auth / caching / routing work.

## Core principles

- **DRY**: extract shared logic after the third duplication, not before.
- **Rollback**: every migration and multi-step change must have a rollback path.
- **Rate limits**: all write-heavy and auth routes go through `src/lib/rate-limiter.ts`.
- **Accessibility**: WCAG 2.2 AA minimum; keyboard nav + focus management non-negotiable.
- **Performance budgets**: Core Web Vitals stay green; no single page dependency blocks first paint.

## API / Security / Database

- **API**: Versioned · Typed · Validated. Shared types. Standard error shape `{ success: false, error: { code, message } }`. Input validation. Rate limit.
- **Security**: Secure auth · Authorization · Password hashing · Input sanitization · Security headers · CSP · Audit logs.
- **DB**: Safe & reversible migrations · Correct indexes · Pagination · Query optimization · Soft delete. Forbidden: destructive deletes, N+1 queries.

## Change report format (end of task)

- What changed
- Why
- Which files / dependencies
- Risks
- Performance / Accessibility / SEO impact