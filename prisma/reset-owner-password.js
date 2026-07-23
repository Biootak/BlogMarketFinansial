/* prisma/reset-owner-password.js
 * =============================================================
 * ریست رمز عبور مالک (OWNER)
 * =============================================================
 *
 * متغیرهای محیطی:
 *   SEED_OWNER_EMAIL    (اختیاری) — پیش‌فرض Admin@gmail.com
 *   SEED_OWNER_PASSWORD (اختیاری) — اگر تنظیم نشود، رمز تصادفی قوی تولید و چاپ می‌شود
 *
 * اجرا:
 *   node prisma/reset-owner-password.js
 *   یا با رمز دلخواه:
 *   SEED_OWNER_PASSWORD=MyNewPass123! node prisma/reset-owner-password.js
 * =============================================================
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const p = new PrismaClient();

function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;
  const pick = (src) => src[Math.floor(Math.random() * src.length)];
  const pw = [pick(upper), pick(lower), pick(digits), pick(special)];
  for (let i = pw.length; i < length; i++) pw.push(pick(all));
  return pw.sort(() => Math.random() - 0.5).join('');
}

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || 'Admin@gmail.com';
  const passwordFromEnv = process.env.SEED_OWNER_PASSWORD;
  const newPassword = passwordFromEnv || generatePassword(16);

  const owner = await p.user.findFirst({ where: { email: ownerEmail, role: 'OWNER' } });

  if (!owner) {
    console.error(`❌ کاربر OWNER با ایمیل "${ownerEmail}" در دیتابیس پیدا نشد.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await p.user.update({ where: { id: owner.id }, data: { password: hash } });

  console.log('');
  console.log('✅ رمز عبور مالک با موفقیت تغییر کرد');
  console.log('─────────────────────────────────────');
  console.log('   Email   :', ownerEmail);
  if (!passwordFromEnv) {
    console.log('   Password:', newPassword);
    console.log('   ⚠️  این رمز را همین الان جایی امن ذخیره کنید — دیگر نمایش داده نمی‌شود.');
  } else {
    console.log('   Password: <از متغیر محیطی SEED_OWNER_PASSWORD>');
  }
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
