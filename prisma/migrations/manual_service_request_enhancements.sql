-- 2026-07-07: Service Request enhancements
-- Add new columns to ServiceRequest table
ALTER TABLE "ServiceRequest" 
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "estimatedCompletionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "externalTxId" TEXT;

-- Add foreign key from ServiceRequest to User
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ServiceRequest_userId_fkey'
  ) THEN
    ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index on userId
CREATE INDEX IF NOT EXISTS "ServiceRequest_userId_idx" ON "ServiceRequest"("userId");

-- Create ServiceRequestStatusLog table
CREATE TABLE IF NOT EXISTS "ServiceRequestStatusLog" (
  "id"          TEXT NOT NULL,
  "requestId"   TEXT NOT NULL,
  "fromStatus"  TEXT,
  "toStatus"    TEXT NOT NULL,
  "changedBy"   TEXT NOT NULL,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRequestStatusLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for status log
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ServiceRequestStatusLog_requestId_fkey'
  ) THEN
    ALTER TABLE "ServiceRequestStatusLog" ADD CONSTRAINT "ServiceRequestStatusLog_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ServiceRequestStatusLog_requestId_createdAt_idx" 
  ON "ServiceRequestStatusLog"("requestId", "createdAt" DESC);
