import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Shared AUTH_SECRET resolver — used by BOTH src/auth.ts (Auth.js signer)
 * and middleware.ts (guard verifier), which run in separate module contexts.
 *
 * Resolution order:
 *   1. process.env.AUTH_SECRET (canonical) or NEXTAUTH_SECRET — mirrored to
 *      both names so Auth.js, middleware, and totp-secrets never drift.
 *   2. Dev only: a persisted secret file (.freebuff/dev-auth-secret, gitignored).
 *      Without this, a dev server started without the env secret mints a
 *      RANDOM per-process secret — every Turbopack panic / dev-turbo restart
 *      (this project restarts on `.freebuff/*.db-shm` lock panics) invalidates
 *      ALL existing sessions and users must re-login. The file makes the
 *      secret stable across restarts AND across parallel dev servers on the
 *      same machine (localhost cookies are shared between ports, so servers
 *      with different secrets bounce each other's sessions).
 *   3. Production: fail closed — never auto-generate.
 */
const DEV_SECRET_FILE = process.env.DEV_AUTH_SECRET_FILE
  ? path.resolve(process.env.DEV_AUTH_SECRET_FILE)
  : path.join(process.cwd(), '.freebuff', 'dev-auth-secret');

function mirrorIntoEnv(secret: string): string {
  process.env.AUTH_SECRET = secret;
  process.env.NEXTAUTH_SECRET = secret;
  return secret;
}

export function getAuthSecret(): string {
  const envSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (envSecret) return mirrorIntoEnv(envSecret);

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET (or NEXTAUTH_SECRET) is required in production. ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  // Dev fallback — persist so restarts / parallel servers share the secret.
  try {
    if (fs.existsSync(DEV_SECRET_FILE)) {
      const existing = fs.readFileSync(DEV_SECRET_FILE, 'utf8').trim();
      if (existing) return mirrorIntoEnv(existing);
    }
  } catch {
    // fall through to generate
  }

  const generated = randomBytes(32).toString('base64');
  try {
    fs.mkdirSync(path.dirname(DEV_SECRET_FILE), { recursive: true });
    fs.writeFileSync(DEV_SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
  } catch {
    // best-effort — in-memory secret still works within this process
  }
  return mirrorIntoEnv(generated);
}
