-- Drop any existing unique constraint on (customerId, identifier) regardless of name
DO $$
DECLARE
  idx_name TEXT;
BEGIN
  SELECT indexname INTO idx_name
  FROM pg_indexes
  WHERE tablename = 'Beneficiary'
    AND indexdef LIKE '%customerId%identifier%'
    AND indexdef LIKE '%UNIQUE%';

  IF idx_name IS NOT NULL AND idx_name != 'Beneficiary_customerId_identifier_key' THEN
    EXECUTE 'DROP INDEX IF EXISTS "' || idx_name || '"';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_customerId_identifier_key"
  ON "Beneficiary"("customerId", "identifier");
