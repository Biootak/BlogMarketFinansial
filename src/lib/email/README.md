# Email provider abstraction (2026-06-23)

Vendor-neutral email API. Swap Resend ↔ SMTP (Mailgun / SES / Postmark / Gmail) ↔
console logger by changing **one env var** — no call site has to change.

## Files

```
src/lib/email/
├── types.ts          # EmailMessage, EmailProvider, EmailConfigError, EMAIL_ENV
├── index.ts          # getEmailProvider() / getEmailProviderAsync() — factory
├── resend.ts         # Resend SDK implementation (default)
├── smtp.ts           # Nodemailer implementation (Mailgun / SES / Postmark / Gmail)
├── console.ts        # stdout logger (dev/test only — throws in prod)
├── templates.ts      # verificationEmail({ to, url, expiresLabel })
└── nodemailer.d.ts   # ambient declaration; delete after `npm i nodemailer -D`
```

## How to switch providers

| `EMAIL_PROVIDER` | Backend | Extra env | Install |
|------------------|---------|-----------|---------|
| `resend` (default) | Resend SDK | `RESEND_API_KEY`, `RESEND_FROM` | (already installed) |
| `smtp` | Nodemailer | `SMTP_HOST/PORT/USER/PASS/FROM` | `npm i nodemailer` + delete `nodemailer.d.ts` |
| `console` | stdout only | — | (none) |

## Adding a new provider

1. Drop a new file in `src/lib/email/` that implements `EmailProvider`.
2. Add a `case` in `getEmailProvider()` (or `getEmailProviderAsync()` if it
   needs async initialization).
3. Add the env vars to `.env.example` and to `EMAIL_ENV` in `types.ts`.
4. **No call site changes.**

## Migration from `src/lib/mail.ts`

`mail.ts` is still the legacy wrapper. To migrate:

```ts
// src/actions/auth-actions.ts
- import { sendVerificationEmail } from '@/lib/mail';
- await sendVerificationEmail(verificationToken.email, verificationToken.token);
+ import { getEmailProvider } from '@/lib/email';
+ import { verificationEmail } from '@/lib/email/templates';
+ const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-request?token=${token}`;
+ await getEmailProvider().send(
+   verificationEmail({ to: email, url, expiresLabel: 'یک ساعت دیگر' }),
+ );
```

After migration, delete `src/lib/mail.ts`.

## Magic links (`signIn('resend', ...)`)

That's the **NextAuth built-in provider** (`@auth/core/providers/resend`),
not our `resend` SDK. Auth.js swaps that by editing
`src/auth.config.ts`:

```ts
- import Resend from 'next-auth/providers/resend';
+ import Nodemailer from 'next-auth/providers/nodemailer';

  providers: [
-   Resend({ apiKey: process.env.RESEND_API_KEY, from: '...' }),
+   Nodemailer({ server: { host: ..., port: ..., auth: { user, pass } }, from: '...' }),
  ]
```

That's it — the call site `signIn('resend', ...)` becomes
`signIn('nodemailer', ...)`. No template change needed; Auth.js renders
the magic-link HTML.

## Why the factory is memoized

`getEmailProvider()` returns the same instance for the lifetime of the
process so the Resend client (and SMTP socket, if reused) isn't
re-constructed on every send. Test helper: `__resetEmailProviderForTests()`
clears the cache (not re-exported from the barrel).

## Failure modes

| Situation | Behavior |
|-----------|----------|
| Missing required env | `EmailConfigError` thrown with the list of missing vars |
| Vendor returns error | `send()` throws; `loginUser` translates to a Persian toast |
| `EMAIL_PROVIDER=console` in prod | `createConsoleProvider()` throws immediately |
| SMTP chosen but `nodemailer` not installed | Dynamic import throws at first `send()` |