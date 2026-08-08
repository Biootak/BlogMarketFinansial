const { PrismaClient } = require('@prisma/client');

async function migrate() {
  const prisma = new PrismaClient();
  try {
    console.log('Running migration...');
    
    await prisma.$executeRaw`ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "lastChangePercent" DOUBLE PRECISION NOT NULL DEFAULT 0`;
    console.log('Added lastChangePercent column');
    
    await prisma.$executeRaw`ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "lastChangeAt" TIMESTAMP(3)`;
    console.log('Added lastChangeAt column');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
