// NOTE: این ماژول فقط از سمت سرور (pages/actions) و اسکریپت‌های ops قابل
// استفاده است — از client import نشود. عمداً از 'server-only' استفاده نشده تا
// اسکریپت CLI (scripts/owner-setup-invite.ts) بتواند همان منطق mint را
// بدون duplication اجرا کند.

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';

/**
 * Owner handover — invite-based activation (server-only).
 *
 * The `/setup` page is a one-shot bootstrap: whoever runs it first creates
 * the single OWNER account, and once an OWNER row exists the wizard locks
 * (`AlreadyConfigured`). That breaks the handover scenario — the platform is
 * built and provisioned by an operator, then handed to the real owner, who
 * must set up their own credentials/profile.
 *
 * Architecture — two phases, one invariant:
 *
 *   1. Provision (operator): `provisionOwnerSetupInvite(email)` resets the
 *      OWNER row to `status='Pending'` (clears password, revokes sessions,
 *      bumps tokenVersion) or creates it fresh, and mints a single-use
 *      high-entropy invite token in `VerificationToken` (intent
 *      `setup-owner`, default 72h TTL). Output: `/setup?token=<raw>`.
 *
 *   2. Activate (owner): the owner opens the link; the wizard locks the
 *      email, the owner fills name/password/phone/profile, and
 *      `activateOwner` (see src/actions/activateOwner.ts) consumes the token
 *      atomically, completes the account, and sets `status='Active'`.
 *
 * The one-OWNER invariant is preserved: bootstrap is only possible when no
 * OWNER row exists, and the pending row cannot be completed without the
 * token. Token storage mirrors the password-reset flow (64-char hex in
 * `VerificationToken`, plaintext like `generateResetSecret`) — high-entropy
 * enough that DB disclosure alone does not grant access.
 */

/** VerificationToken.intent for owner-setup invites — never collides with OTP intents. */
export const OWNER_SETUP_INTENT = 'setup-owner';

/** Default invite lifetime. Long enough to survive delivery friction, short
 *  enough that a leaked link is worthless quickly. */
export const OWNER_SETUP_INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export function normalizeOwnerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface ProvisionOwnerSetupResult {
  ok: boolean;
  /** Human-readable Persian error for the operator, when `ok` is false. */
  message?: string;
  token?: string;
  /** Absolute `/setup?token=...` link to hand to the owner. */
  link?: string;
  email?: string;
  expiresAt?: Date;
}

/**
 * Phase 1 — operator provisioning.
 *
 * Resets the single OWNER row to `Pending` (or creates it when none exists)
 * and mints a fresh invite token, replacing any previous one for that email.
 * Everything runs in one Serializable transaction so two concurrent
 * provisions can never create two OWNER rows or two live tokens.
 *
 * The raw token is returned once — it is not retrievable afterwards. Keep
 * the returned link private (share it with the owner directly, e.g. via a
 * secure channel).
 */
export async function provisionOwnerSetupInvite(
  emailInput: string,
  ttlMs: number = OWNER_SETUP_INVITE_TTL_MS,
  /**
   * اجازهٔ تغییر ایمیل مالکِ موجود (سناریوی تحویل واقعی: مالکِ توسعه‌دهنده
   * با ایمیل خودش ساخته شده و حالا باید به ایمیل مالکِ واقعی منتقل شود).
   * فقط وقتی امن است که همزمان رمز باطل و نشست‌ها حذف شوند — که همین‌جا می‌شود.
   */
  replaceEmail = false,
): Promise<ProvisionOwnerSetupResult> {
  // ایمیل خالی مجاز است — در آن صورت از ایمیل مالکِ موجود استفاده می‌شود
  // (سناریوی «مالک از قبل ساخته شده، فقط لینک تحویل می‌خواهیم»).
  const requestedEmail = normalizeOwnerEmail(emailInput);

  const result = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.user.findFirst({ where: { role: Role.OWNER } });

      if (existing && requestedEmail && existing.email.toLowerCase() !== requestedEmail) {
        if (!replaceEmail) {
          return {
            ok: false as const,
            message: `حساب مالک با ایمیل دیگری ثبت شده است (${existing.email}). برای تغییر ایمیل از --replace-email استفاده کنید.`,
          };
        }
        // ایمیل جدید نباید به کاربر دیگری (مثلاً USER عادی) تعلق داشته باشد —
        // unique constraint روی User.email در غیر این صورت تراکنش را می‌شکند.
        const emailTaken = await tx.user.findUnique({ where: { email: requestedEmail } });
        if (emailTaken && emailTaken.id !== existing.id) {
          return {
            ok: false as const,
            message: `این ایمیل متعلق به کاربر دیگری است (${requestedEmail}) و نمی‌تواند برای مالک استفاده شود.`,
          };
        }
      }

      const email = requestedEmail || existing?.email.toLowerCase();
      if (!email) {
        return {
          ok: false as const,
          message: 'هنوز حسابی ساخته نشده و ایمیل هم داده نشده است. از --email استفاده کنید.',
        };
      }

      let ownerId: string;
      if (existing) {
        // Handover reset: drop credentials + revoke every session so the
        // old (e.g. development-time) owner can no longer sign in.
        await tx.session.deleteMany({ where: { userId: existing.id } });
        await tx.user.update({
          where: { id: existing.id },
          data: {
            // در حالت --replace-email، ایمیل هم به مالکِ واقعی منتقل می‌شود.
            ...(existing.email.toLowerCase() !== email ? { email } : {}),
            status: 'Pending',
            password: null,
            emailVerified: null,
            tokenVersion: { increment: 1 },
          },
        });
        ownerId = existing.id;
      } else {
        const created = await tx.user.create({
          data: {
            email,
            role: Role.OWNER,
            status: 'Pending',
            name: null,
          },
        });
        ownerId = created.id;
      }

      // One live token per owner — a new invite invalidates the old one.
      // When the email changed, also clear tokens minted under the old email.
      await tx.verificationToken.deleteMany({
        where: {
          email: { in: [email, existing?.email.toLowerCase() ?? email] },
          intent: OWNER_SETUP_INTENT,
        },
      });

      const raw = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + ttlMs);
      await tx.verificationToken.create({
        data: {
          email,
          token: raw,
          expires: expiresAt,
          intent: OWNER_SETUP_INTENT,
          attempts: 0,
        },
      });

      return { ok: true as const, ownerId, raw, expiresAt, email };
    },
    { isolationLevel: 'Serializable' },
  );

  if (!result.ok) return { ok: false, message: result.message };

  // `||` نه `??` — env خالی/نامعتبر هم باید به fallback برسد.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/setup?token=${encodeURIComponent(result.raw)}`;

  return {
    ok: true,
    token: result.raw,
    link,
    email: result.email,
    expiresAt: result.expiresAt,
  };
}

export type ResolveOwnerSetupInviteResult = { ok: true; email: string } | { ok: false };

/**
 * Server-side token check for the `/setup?token=...` routes.
 *
 * Read-only — deliberately does NOT consume the token, so refreshing or
 * navigating between wizard sub-routes does not burn the invite. The token
 * is consumed exactly once, atomically, inside `activateOwner` at submit.
 * Also verifies the OWNER row is still `Pending`; an already-activated
 * account (or a re-provisioned one) invalidates the link.
 */
export async function resolveOwnerSetupInvite(
  rawToken: string,
): Promise<ResolveOwnerSetupInviteResult> {
  const token = rawToken.trim();
  if (!token) return { ok: false };

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.intent !== OWNER_SETUP_INTENT || row.expires.getTime() <= Date.now()) {
    return { ok: false };
  }

  const owner = await prisma.user.findFirst({
    where: {
      email: { equals: row.email, mode: 'insensitive' },
      role: Role.OWNER,
    },
  });
  if (!owner || owner.status !== 'Pending') return { ok: false };

  return { ok: true, email: row.email };
}

export type ConsumeOwnerSetupInviteResult =
  | { ok: true; user: { id: string } }
  | { ok: false; reason: 'invalid' | 'expired' };

/**
 * Atomic single-use consumption of the invite token.
 *
 * The `deleteMany` with the full predicate (email + intent + token +
 * not-expired) is the gate: only one of N concurrent submits can see
 * `count > 0`. Mirrors `consumePasswordResetToken` in the auth pipeline.
 * Returns the pending OWNER row so the caller can complete it.
 */
export async function consumeOwnerSetupInvite(
  rawToken: string,
  emailInput: string,
): Promise<ConsumeOwnerSetupInviteResult> {
  const email = normalizeOwnerEmail(emailInput);
  const token = rawToken.trim();

  const consumed = await prisma.$transaction(async (tx) => {
    const res = await tx.verificationToken.deleteMany({
      where: {
        email,
        intent: OWNER_SETUP_INTENT,
        token,
        expires: { gt: new Date() },
      },
    });
    if (res.count === 0) return null;

    return tx.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        role: Role.OWNER,
        status: 'Pending',
      },
      select: { id: true },
    });
  });

  if (!consumed) return { ok: false, reason: 'invalid' };
  return { ok: true, user: { id: consumed.id } };
}
