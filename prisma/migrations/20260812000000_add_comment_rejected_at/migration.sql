-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Comment_rejectedAt_idx" ON "Comment"("rejectedAt");
