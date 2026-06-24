-- 2026-06-24: enforce at most one active OTP per (email, intent).
--
-- Race-fix: before this constraint, generateOtpToken deleted the prior
-- row only inside the same request. Two parallel `register` requests
-- for the same email could both pass the existence check and mint two
-- tokens. consumeOtpToken would then have ambiguity about which row
-- was authoritative. Adding the unique constraint forces the invariant
-- down to the database layer.
--
-- Step 1: delete duplicate (email, intent) rows, keeping the one with
-- the latest expires (most likely still active). This MUST happen
-- before adding the unique constraint or Postgres will refuse.
DELETE FROM "VerificationToken" v
USING "VerificationToken" dup
WHERE v."email" = dup."email"
  AND v."intent" = dup."intent"
  AND v."id" <> dup."id"
  AND v."expires" < dup."expires";

-- Step 2: add the unique constraint. Named to match Prisma's
-- convention so `prisma migrate diff` and `prisma db pull` stay in
-- sync with the schema.prisma source of truth.
ALTER TABLE "VerificationToken"
  ADD CONSTRAINT "VerificationToken_email_intent_key"
  UNIQUE ("email", "intent");
