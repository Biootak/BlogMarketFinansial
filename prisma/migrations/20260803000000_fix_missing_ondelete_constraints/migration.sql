-- ============================================================
-- fix_missing_ondelete_constraints — 2026-08-03
-- رفع مشکل FK های فاقد onDelete — جلوگیری از orphaned records
-- همه دستورات idempotent هستند (DROP CONSTRAINT IF EXISTS)
-- ============================================================

-- ── Profile → User: Cascade (حذف کاربر، پروفایل را هم حذف کند) ───────────
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_userId_fkey";
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Post → User (author): SetNull (حذف کاربر، مطالبش باقی بماند) ──────────
ALTER TABLE "Post" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_authorId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── View → Post: Cascade (حذف پست، viewها هم حذف شوند) ───────────────────
ALTER TABLE "View" DROP CONSTRAINT IF EXISTS "View_postId_fkey";
ALTER TABLE "View" ADD CONSTRAINT "View_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Comment → User (author): Cascade (حذف کاربر، کامنت‌هایش حذف شوند) ────
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_authorId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Comment → Post: Cascade (حذف پست، کامنت‌هایش حذف شوند) ────────────────
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_postId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Comment → Comment (parent): Cascade (حذف parent، replies هم حذف شوند) ─
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_parentId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Like → Comment: Cascade ────────────────────────────────────────────────
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_commentId_fkey";
ALTER TABLE "Like" ADD CONSTRAINT "Like_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Like → Post: Cascade ───────────────────────────────────────────────────
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_postId_fkey";
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Like → User: Cascade ───────────────────────────────────────────────────
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_fkey";
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SavedPost → Post: Cascade ──────────────────────────────────────────────
ALTER TABLE "SavedPost" DROP CONSTRAINT IF EXISTS "SavedPost_postId_fkey";
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SavedPost → User: Cascade ──────────────────────────────────────────────
ALTER TABLE "SavedPost" DROP CONSTRAINT IF EXISTS "SavedPost_userId_fkey";
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Notification → User: Cascade ───────────────────────────────────────────
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Newsletter → User: SetNull ─────────────────────────────────────────────
ALTER TABLE "Newsletter" DROP CONSTRAINT IF EXISTS "Newsletter_userId_fkey";
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ActivityLog → User: SetNull (لاگ‌ها باقی بمانند حتی بعد از حذف کاربر) ─
ALTER TABLE "ActivityLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_userId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ServiceRequest → User: SetNull (درخواست‌ها باقی بمانند) ─────────────────
ALTER TABLE "ServiceRequest" DROP CONSTRAINT IF EXISTS "ServiceRequest_userId_fkey";
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Task → User: Cascade (حذف کاربر، tasksهایش حذف شوند) ────────────────
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_userId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Customer → User: SetNull (Customer می‌تواند بدون user باشد) ─────────────
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_userId_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── FraudReview → Customer: SetNull ────────────────────────────────────────
ALTER TABLE "FraudReview" DROP CONSTRAINT IF EXISTS "FraudReview_customerId_fkey";
ALTER TABLE "FraudReview" ADD CONSTRAINT "FraudReview_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── FraudReview → Transaction: SetNull ─────────────────────────────────────
ALTER TABLE "FraudReview" DROP CONSTRAINT IF EXISTS "FraudReview_txnId_fkey";
ALTER TABLE "FraudReview" ADD CONSTRAINT "FraudReview_txnId_fkey"
  FOREIGN KEY ("txnId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── LedgerEntry → Transaction: SetNull ─────────────────────────────────────
ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_txnId_fkey";
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_txnId_fkey"
  FOREIGN KEY ("txnId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
