#!/usr/bin/env node
// ============================================================================
// مهاجرت URL هاي قديمي مدارک KYC به مسير دروازه‌ي احراز-گيت‌شده
// ----------------------------------------------------------------------------
// چرا: قبل از 2026-08-17 آدرس مدارک KYC (ملي/سلفي) به‌صورت URL عمومي S3
// (https://.../kyc/<file>) ذخيره مي‌شد — هر کسي با داشتن آدرس مي‌توانست فايل را
// ببيند و CDN آن را 1 سال public کش مي‌کرد. حالا سرو KYC فقط از
// /api/uploads/kyc/<file> با کنترل دسترسي انجام مي‌شود؛ اين اسکريپت رکوردهاي
// موجود را از URL عمومي به مسير دروازه بازنويسي مي‌کند.
//
// کاربرد (يک بار بعد از ديپلوي — روي ماشيني که به ديتابيس دسترسي دارد):
//   node scripts/migrate-kyc-urls.mjs            # dry-run (فقط گزارش)
//   node scripts/migrate-kyc-urls.mjs --apply    # بازنويسي واقعي
//
// توجه: آبجکت‌هاي قديمي در باکت S3 باقي مي‌مانند (باکت public-read است).
// بعد از مهاجرت، اگر خواستيد کاملاً پاک شوند، باکت‌سايد (policy/ACL يا
// re-copy با CacheControl جديد) لازم است — از کد قابل انجام نيست.
// ============================================================================
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

// بارگذاري .env (ديتابيس جاري/prod — Azure) سپس .env.local (legacy RDS).
// node 20.6+ دارد. در VM ديتابيس از env کانتينر مي‌آيد و اين بخش بي‌اثر است.
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile?.(file);
    console.log(`env: ${file}`);
    break;
  } catch {
    // فايل موجود نيست/نامعتبر — بعدي را امتحان کن
  }
}

const APPLY = process.argv.includes('--apply');

/** استخراج نام فايل از URL قديمي (https://.../kyc/<file>) — فقط absolute + الگوي kyc. */
function rewriteKycUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^https?:\/\/[^/]+\/kyc\/([A-Za-z0-9._-]+)$/);
  if (!m) return null;
  return `/uploads/kyc/${m[1]}`;
}

async function main() {
  const p = new PrismaClient();
  const updates = [];

  try {
    // 1) KycRecord — مدارک KYC پلتفرم
    const records = await p.kycRecord.findMany({
      select: { id: true, selfieUrl: true, docFrontUrl: true, docBackUrl: true },
    });
    for (const r of records) {
      for (const field of ['selfieUrl', 'docFrontUrl', 'docBackUrl']) {
        const next = rewriteKycUrl(r[field]);
        if (next && next !== r[field]) {
          updates.push({ model: 'KycRecord', id: r.id, field, from: r[field], to: next });
        }
      }
    }

    // 2) KycVerification — مدارک KYC مشتريان صرافي
    const verifications = await p.kycVerification.findMany({
      select: { id: true, fileUrl: true },
    });
    for (const v of verifications) {
      const next = rewriteKycUrl(v.fileUrl);
      if (next && next !== v.fileUrl) {
        updates.push({ model: 'KycVerification', id: v.id, field: 'fileUrl', from: v.fileUrl, to: next });
      }
    }

    console.log(
      `يافته: ${updates.length} فيلد براي بازنويسي${APPLY ? '' : ' (dry-run — بدون --apply چيزي تغيير نمي‌کند)'}`,
    );

    for (const u of updates) {
      console.log(`  ${u.model}#${u.id}.${u.field}: ${u.from} → ${u.to}`);
    }

    if (!APPLY) {
      console.log('\nبراي اعمال: node scripts/migrate-kyc-urls.mjs --apply');
      return;
    }

    // اعمال به‌صورت تکی (بدون transaction سنگين — تعداد کم است)
    let applied = 0;
    for (const u of updates) {
      if (u.model === 'KycRecord') {
        await p.kycRecord.update({ where: { id: u.id }, data: { [u.field]: u.to } });
      } else {
        await p.kycVerification.update({ where: { id: u.id }, data: { fileUrl: u.to } });
      }
      applied++;
    }
    console.log(`✅ ${applied} فيلد بازنويسي شد.`);

    if (applied > 0) {
      console.log(
        '\n⚠️ يادآوري: (1) در داشبورد Cloudflare Purge بزنيد تا نسخه‌هاي کش‌شده‌ي قديمي' +
          '\n   (public immutable) حذف شوند. (2) آبجکت‌هاي قديمي در باکت S3 هنوز با' +
          '\n   CacheControl قديمي هستند — اگر خواستيد، باکت‌سايد re-copy/Purge لازم است.',
      );
    }
  } finally {
    await p.$disconnect();
  }
}

main().catch((err) => {
  console.error('خطا:', err);
  process.exit(1);
});
