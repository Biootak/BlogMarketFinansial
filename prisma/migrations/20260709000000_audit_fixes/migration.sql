-- Audit fixes (2026-07-09): safe, additive, idempotent.
-- Only the audit-relevant schema changes are applied here.
-- Unrelated DB<->schema drift (FK cascade definitions, the
-- Session.createdAt/updatedAt columns) is intentionally left for a
-- separate, deliberate migration so this one cannot abort on drift.

-- C7: prevent a user from liking the same post/comment twice.
-- The previous single composite unique (userId, postId, commentId)
-- allowed NULL targets to pair freely; split into two partial
-- uniques keyed by the non-null target.
DROP INDEX IF EXISTS "Like_userId_postId_commentId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_postId_key"
  ON "Like"("userId", "postId");
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_commentId_key"
  ON "Like"("userId", "commentId");

-- M6 / hot-path indexes that are declared in the schema but absent
-- from the live DB (added via db push drift).
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
