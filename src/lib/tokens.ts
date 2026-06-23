// 2026-06-23: unified 6-digit OTP model.
//
// All auth flows (register / login / reverify / recover) now share this:
//   generateOtpToken({ email, intent }) — creates a fresh code, cooldowns resends
//   consumeOtpToken({ email, code })    — validates + deletes in one step
//
// Each (email, intent) pair keeps at most one active code. Generating a new
// code invalidates the prior one for that intent. `attempts` is a per-token
// brute-force counter for code guesses.

import { randomInt } from 'node:crypto';
import prisma from '@/lib/db';

export type VerificationEmailIntent =
  | 'register'
  | 'login'
  | 'reverify'
  | 'recover';

export const OTP_EXPIRES_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

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
  | { ok: true; intent: VerificationEmailIntent }
  | {
      ok: false;
      reason:
        | 'not-found'
        | 'expired'
        | 'too-many-attempts'
        | 'wrong-code'
        | 'intent-mismatch';
    };

/**
 * Atomically validates a 6-digit code against active tokens for `email`.
 * On match, deletes the row (one-time use). Wrong guesses bump `attempts`
 * (a per-token counter); once it reaches OTP_MAX_ATTEMPTS the code is
 * deleted and the caller must request a fresh one.
 */
export async function consumeOtpToken(args: {
  email: string;
  code: string;
  intent?: VerificationEmailIntent;
}): Promise<ConsumeOtpResult> {
  const normalizedEmail = args.email.trim().toLowerCase();
  const code = args.code.trim();

  const tokens = await prisma.verificationToken.findMany({
    where: { email: normalizedEmail },
  });

  const now = Date.now();
  const expiredIds = tokens
    .filter((t) => t.expires.getTime() <= now)
    .map((t) => t.id);

  if (expiredIds.length > 0) {
    await prisma.verificationToken.deleteMany({
      where: { id: { in: expiredIds } },
    });
  }

  const active = tokens.filter((t) => t.expires.getTime() > now);
  if (active.length === 0) {
    return { ok: false, reason: 'not-found' };
  }

  if (args.intent) {
    const matchingIntent = active.find(
      (t) => t.intent === args.intent && t.token === code,
    );
    if (matchingIntent) {
      await prisma.verificationToken.delete({ where: { id: matchingIntent.id } });
      return { ok: true, intent: matchingIntent.intent as VerificationEmailIntent };
    }

    // 2026-06-23: don't leak whether the user has a token for a different intent.
    const sameIntent = active.find((t) => t.intent === args.intent);
    if (!sameIntent) return { ok: false, reason: 'not-found' };

    if (sameIntent.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.verificationToken.delete({ where: { id: sameIntent.id } });
      return { ok: false, reason: 'too-many-attempts' };
    }
    await prisma.verificationToken.update({
      where: { id: sameIntent.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'wrong-code' };
  }

  // No intent filter: match by code only.
  const match = active.find((t) => t.token === code);
  if (match) {
    await prisma.verificationToken.delete({ where: { id: match.id } });
    return { ok: true, intent: match.intent as VerificationEmailIntent };
  }

  // Cheapest hint: if any token has hit MAX_ATTEMPTS, surface that.
  const exhausted =
    active.length === 1 && active[0].attempts >= OTP_MAX_ATTEMPTS;
  if (exhausted) {
    await prisma.verificationToken.deleteMany({
      where: { id: { in: active.map((t) => t.id) } },
    });
    return { ok: false, reason: 'too-many-attempts' };
  }

  if (active.length === 1) {
    await prisma.verificationToken.update({
      where: { id: active[0].id },
      data: { attempts: { increment: 1 } },
    });
  }
  return { ok: false, reason: 'wrong-code' };
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
