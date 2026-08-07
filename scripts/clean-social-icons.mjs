import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const isValid = (v) =>
  v &&
  (v.startsWith('/') ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('data:'));
async function main() {
  const rows = await p.socialLink.findMany();
  for (const r of rows) {
    if (r.icon && !isValid(r.icon)) {
      await p.socialLink.update({ where: { id: r.id }, data: { icon: null } });
      console.log('Cleared invalid icon for:', r.name, '(was:', r.icon, ')');
    } else {
      console.log('OK:', r.name, '->', r.icon);
    }
  }
}
main().finally(() => p.$disconnect());
