-- AlterTable
ALTER TABLE "User" ADD COLUMN "deniedPermissions" TEXT[] NOT NULL DEFAULT '{}';
