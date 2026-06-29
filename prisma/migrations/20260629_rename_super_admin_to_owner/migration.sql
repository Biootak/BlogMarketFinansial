-- Rename the highest role from SUPER_ADMIN to OWNER across the database.
-- Postgres 10+ supports renaming enum values without recreating the type.
ALTER TYPE "Role" RENAME VALUE 'SUPER_ADMIN' TO 'OWNER';

-- Defensive update: ensure any rows that still hold the old label are migrated.
-- This is effectively a no-op when the rename above succeeds, but protects
-- deployments where the enum value may have been altered manually.
UPDATE "User" SET role = 'OWNER' WHERE role = 'SUPER_ADMIN';
