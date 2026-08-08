const { Client } = require('pg');

async function migrate() {
  const client = new Client(process.env.DATABASE_URL);
  try {
    await client.connect();
    console.log('Connected to database');

    await client.query('ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "lastChangePercent" DOUBLE PRECISION NOT NULL DEFAULT 0');
    console.log('Added lastChangePercent column');

    await client.query('ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "lastChangeAt" TIMESTAMP(3)');
    console.log('Added lastChangeAt column');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
