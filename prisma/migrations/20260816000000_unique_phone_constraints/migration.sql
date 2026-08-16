-- Migration: unique_phone_constraints
-- P0 fix: prevent duplicate phone numbers across users and within an exchange's customers

-- DropIndex: replaced by @unique below
DROP INDEX "User_phoneNumber_idx";

-- DropIndex: replaced by @@unique([exchangeId, phone]) below
DROP INDEX "Customer_phone_idx";

-- CreateIndex: User.phoneNumber must be globally unique (nullable — Postgres allows multiple NULLs)
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex: Customer.phone must be unique per exchange (same phone cannot be registered twice in same exchange)
CREATE UNIQUE INDEX "Customer_exchangeId_phone_key" ON "Customer"("exchangeId", "phone");
