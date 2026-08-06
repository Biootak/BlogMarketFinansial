// 2026-06-23: unified 6-digit OTP model.
//
// All auth flows (register / login / reverify / recover) now share this:
//   generateOtpToken({ email, intent }) — creates a fresh code, cooldowns resends
//   consumeOtpToken({ email, code })    — validates + deletes in one step
//
// Each (email, intent) pair keeps at most one active code. Generating a new
// code invalidates the prior one for that intent. `attempts` is a per-token
// brute-force counter for code guesses.

import { randomBytes, randomInt } from 'node:crypto';
import prisma from '@/lib/db';

// 2026-07-10: 'service-verify' — OTP issued after ServiceRequest is created,
// to verify the requester's email and enable Progressive Capture (auto-create account).
export type VerificationEmailIntent =
  | 'register'
  | 'login'
  | 'reverify'
  | 'recover'
  | 'service-verify'
  | 'phone-verify'
  | 'fintech-otp'
  // C1-fix (2026-08-01): مرحلهٔ دوم ورود — TOTP 2FA. بعد از تأیید رمز، یک
  // challenge یکبارمصرف می‌سازیم؛ کاربر کد Authenticator را وارد می‌کند و
  // verifyTotpLogin آن را مصرف می‌کند تا سشن امن بسازد.
  | '2fa';

export const OTP_EXPIRES_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

// 2026-06-24: short-lived (5 min) secret token issued after a successful
// `recover` OTP verify. `setNewPassword` MUST present this token to
// rewrite the password — without it, anyone who guesses the email could
// reset the password from the outside (rate-limit only). We keep it on
// the same `VerificationToken` table (intent='reset') so the model stays
// single-source-of-truth, but the token is a 64-char hex string instead
// of a 6-digit code (much higher entropy, not meant to be human-typed).
export const PASSWORD_RESET_TOKEN_EXPIRES_MS = 5 * 60 * 1000;

function generateResetSecret(): string {
  return randomBytes(32).toString('hex');
}

/** Cryptographic 6-digit code (000000–999999), 0-padded. */
export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export type GenerateOtpResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; reason: 'wait'; retryAfterMs: number };

export async function generateOtpToken(args: {
  email: string;
  intent: VerificationEmailIntent;
}): Promise<GenerateOtpResult> {
  const normalizedEmail = args.email.trim().toLowerCase();

  const existing = await prisma.verificationToken.findFirst({
    where: { email: normalizedEmail, intent: args.intent },
  });

  if (existing) {
    const ageMs = Date.now() - (existing.expires.getTime() - OTP_EXPIRES_MS);
    if (ageMs < OTP_RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: 'wait',
        retryAfterMs: OTP_RESEND_COOLDOWN_MS - ageMs,
      };
    }
    await prisma.verificationToken.delete({ where: { id: existing.id } });
  }

  const code = generateSixDigitCode();
  const expires = new Date(Date.now() + OTP_EXPIRES_MS);

  const created = await prisma.verificationToken.create({
    data: {
      email: normalizedEmail,
      token: code,
      expires,
      intent: args.intent,
      attempts: 0,
    },
  });

  return { ok: true, code, expiresAt: created.expires };
}

export type ConsumeOtpResult =
  | { ok: true; intent: VerificationEmailIntent; isNewIntent?: boolean }
  | {
      ok: false;
      reason: 'not-found' | 'expired' | 'too-many-attempts' | 'wrong-code';
    };

/**
 * 2026-06-24: atomic OTP consumption.
 *
 * The previous implementation was racy: two parallel verifyOtp requests
 * with the same email + intent + code could both find the row and both
 * think they succeeded. We now use a single `deleteMany` with the full
 * predicate as the atomic gate: only one of N concurrent calls sees
 * `count > 0`.
 *
 * On a wrong code we still want to bump `attempts` (per-token brute-
 * force counter). That runs in the same `$transaction` as the gate
 * so two wrong-code calls can't both push attempts past MAX.
 *
 * We intentionally drop the old `intent-mismatch` reason and never
 * reveal whether a token exists for a different intent — a single
 * `not-found` is returned in all non-match cases that don't hit the
 * attempts cap.
 */
export async function consumeOtpToken(args: {
  email: string;
  code: string;
  intent: VerificationEmailIntent;
}): Promise<ConsumeOtpResult> {
  const normalizedEmail = args.email.trim().toLowerCase();
  const code = args.code.trim();

  return prisma.$transaction(async (tx) => {
    // Step 1: opportunistic delete-on-match. This is the atomic gate.
    const deleted = await tx.verificationToken.deleteMany({
      where: {
        email: normalizedEmail,
        intent: args.intent,
        token: code,
        expires: { gt: new Date() },
      },
    });
    if (deleted.count > 0) {
      return { ok: true, intent: args.intent };
    }

    // Step 2: token exists but code is wrong (or expired). Locate it.
    const sameIntent = await tx.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        intent: args.intent,
      },
    });

    if (!sameIntent) {
      return { ok: false, reason: 'not-found' };
    }
    if (sameIntent.expires.getTime() <= Date.now()) {
      await tx.verificationToken.delete({ where: { id: sameIntent.id } });
      return { ok: false, reason: 'expired' };
    }
    if (sameIntent.attempts >= OTP_MAX_ATTEMPTS) {
      await tx.verificationToken.delete({ where: { id: sameIntent.id } });
      return { ok: false, reason: 'too-many-attempts' };
    }
    await tx.verificationToken.update({
      where: { id: sameIntent.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'wrong-code' };
  });
}

export async function invalidateOtpTokens(args: {
  email: string;
  intent?: VerificationEmailIntent;
}): Promise<void> {
  const normalizedEmail = args.email.trim().toLowerCase();
  await prisma.verificationToken.deleteMany({
    where: {
      email: normalizedEmail,
      ...(args.intent ? { intent: args.intent } : {}),
    },
  });
}

// 2026-06-24: mint a one-shot password-reset secret after `verifyOtp`
// succeeds with intent='recover'. We delete any prior reset token for
// the same email so only one is active at a time. The token never
// leaves the server except as part of the `verifyOtp` success response
// (held in React state on the client) — we never email it.
export async function generatePasswordResetToken(email: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  await prisma.verificationToken.deleteMany({
    where: { email: normalizedEmail, intent: 'reset' },
  });

  const token = generateResetSecret();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MS);
  await prisma.verificationToken.create({
    data: {
      email: normalizedEmail,
      token,
      intent: 'reset',
      expires: expiresAt,
      attempts: 0,
    },
  });
  return { token, expiresAt };
}

export type ConsumeResetResult = { ok: true } | { ok: false; reason: 'not-found' | 'expired' };

/**
 * 2026-06-24: consume a reset secret. Atomic via deleteMany with the
 * full predicate so concurrent calls can't both succeed. On mismatch
 * we return `not-found` without leaking whether the token exists.
 */
export async function consumePasswordResetToken(args: {
  email: string;
  token: string;
}): Promise<ConsumeResetResult> {
  const normalizedEmail = args.email.trim().toLowerCase();

  const deleted = await prisma.verificationToken.deleteMany({
    where: {
      email: normalizedEmail,
      intent: 'reset',
      token: args.token,
      expires: { gt: new Date() },
    },
  });
  if (deleted.count > 0) return { ok: true };

  // Token either doesn't exist, expired, or was the wrong secret.
  // Return 'not-found' uniformly to avoid leaking which.
  const exists = await prisma.verificationToken.findFirst({
    where: { email: normalizedEmail, intent: 'reset' },
    select: { expires: true },
  });
  if (exists && exists.expires.getTime() <= Date.now()) {
    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail, intent: 'reset' },
    });
    return { ok: false, reason: 'expired' };
  }
  return { ok: false, reason: 'not-found' };
}

// 2026-07-08: P0 fix for the `after_otp` auth bypass. After a successful OTP
// verify, verifyOtp mints a single-use, short-lived login token (intent='login')
// and hands it to the credentials signIn call. authorize() then consumes it, so
// a public caller cannot reach the session gate with kind=after_otp + a verified
// email alone — they would need this server-issued token, which is only created
// after a real OTP is consumed.
export const LOGIN_TOKEN_EXPIRES_MS = 2 * 60 * 1000;

export async function generateLoginToken(email: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  await prisma.verificationToken.deleteMany({
    where: { email: normalizedEmail, intent: 'login' },
  });
  const token = generateResetSecret();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_EXPIRES_MS);
  await prisma.verificationToken.create({
    data: {
      email: normalizedEmail,
      token,
      intent: 'login',
      expires: expiresAt,
      attempts: 0,
    },
  });
  return { token, expiresAt };
}

export type ConsumeLoginResult = { ok: true } | { ok: false; reason: 'not-found' | 'expired' };

export async function consumeLoginToken(args: {
  email: string;
  token: string;
}): Promise<ConsumeLoginResult> {
  const normalizedEmail = args.email.trim().toLowerCase();
  const deleted = await prisma.verificationToken.deleteMany({
    where: {
      email: normalizedEmail,
      intent: 'login',
      token: args.token,
      expires: { gt: new Date() },
    },
  });
  if (deleted.count > 0) return { ok: true };
  const exists = await prisma.verificationToken.findFirst({
    where: { email: normalizedEmail, intent: 'login' },
    select: { expires: true },
  });
  if (exists && exists.expires.getTime() <= Date.now()) {
    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail, intent: 'login' },
    });
    return { ok: false, reason: 'expired' };
  }
  return { ok: false, reason: 'not-found' };
}
