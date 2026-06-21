#!/usr/bin/env node
/**
 * migrate-ad-images — 2026-06-21
 * --------------------------------------------------------------------------
 * تصاویر تبلیغاتی که قبل از سیستم responsive variants آپلود شده‌اند را
 * به‌روزرسانی می‌کند:
 *   1. ابعاد واقعی هر تصویر را از S3/لوکال می‌خواند (با sharp)
 *   2. variant های 400/800/1200/1920w را تولید و آپلود می‌کند
 *   3. ابعاد را در `Advertisement.customDimensions` دیتابیس ذخیره می‌کند
 *
 * استفاده:
 *   node scripts/migrate-ad-images.js              # همه‌ی تبلیغات فعال
 *   node scripts/migrate-ad-images.js --dry-run    # فقط گزارش، بدون تغییر
 *   node scripts/migrate-ad-images.js --id=clxxx   # فقط یک تبلیغ
 *
 * ایمن: اگر تصویر در storage موجود نباشد، skip می‌شود. اگر ابعاد از قبل
 * ذخیره شده باشد، فقط variant ها تولید می‌شوند (نه overwrite دیتابیس).
 * --------------------------------------------------------------------------
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const STORAGE_DIR = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const ALLOWED_FOLDERS = ['ads', 'posts', 'avatars', 'categories', 'tags', 'general'];
const VARIANT_WIDTHS = [400, 800, 1200, 1920];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ID_FLAG = args.find((a) => a.startsWith('--id='));
const ONLY_ID = ID_FLAG ? ID_FLAG.slice('--id='.length) : null;

/* ------------------------------ helpers --------------------------------- */

function parseImageUrl(url) {
  // نمونه‌ها:
  //   /uploads/ads/123-abc-image.webp
  //   /images/ads/ads-1.svg
  //   https://cdn.example.com/ads/123-abc-image.webp
  try {
    const u = new URL(url, 'http://localhost');
    const parts = u.pathname.split('/').filter(Boolean);
    const filename = parts[parts.length - 1];
    // پیدا کردن folder از مسیر
    let folder = null;
    for (const p of parts) {
      if (ALLOWED_FOLDERS.includes(p)) { folder = p; break; }
    }
    if (!folder || !filename) return null;
    return { folder, filename, raw: u.pathname };
  } catch {
    return null;
  }
}

function parseSvgDimensions(content) {
  // SVG ممکن است width/height در root داشته باشد، یا فقط viewBox
  const widthMatch = content.match(/\bwidth=["']([\d.]+)(?:px)?["']/);
  const heightMatch = content.match(/\bheight=["']([\d.]+)(?:px)?["']/);
  if (widthMatch && heightMatch) {
    return {
      width: Math.round(parseFloat(widthMatch[1])),
      height: Math.round(parseFloat(heightMatch[1])),
    };
  }
  // fallback: از viewBox
  const viewBoxMatch = content.match(/\bviewBox=["']\s*[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)["']/);
  if (viewBoxMatch) {
    return {
      width: Math.round(parseFloat(viewBoxMatch[1])),
      height: Math.round(parseFloat(viewBoxMatch[2])),
    };
  }
  return null;
}

function variantName(filename, width) {
  return filename.replace(/\.[^/.]+$/, `-${width}.webp`);
}

async function readLocal(folder, filename) {
  // 1) اول از /public/uploads/{folder}/ — خروجی آپلود route
  // 2) بعد از /public/images/{folder}/ — asset های استاتیک پروژه
  // 3) بعد از /public/images/ — تصاویر ریشه
  const candidates = [
    path.join(STORAGE_DIR, folder, filename),
    path.join(PUBLIC_IMAGES_DIR, folder, filename),
    path.join(PUBLIC_IMAGES_DIR, filename),
  ];
  for (const p of candidates) {
    try {
      return await fs.promises.readFile(p);
    } catch {
      // try next
    }
  }
  return null;
}

async function readS3(folder, filename) {
  // در صورت نیاز می‌توان S3 client را اینجا اضافه کرد.
  // فعلاً فقط dev (local) پشتیبانی می‌شود.
  return null;
}

async function writeLocal(folder, filename, buffer) {
  const dir = path.join(STORAGE_DIR, folder);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), buffer);
}

async function generateVariants(sourceBuffer, mimeType) {
  const variants = new Map();
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') return variants;
  const meta = await sharp(sourceBuffer).metadata();
  if (!meta.width) return variants;
  for (const w of VARIANT_WIDTHS) {
    if (w >= meta.width) break;
    const buf = await sharp(sourceBuffer)
      .resize(w, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 82 })
      .toBuffer();
    variants.set(w, buf);
  }
  return variants;
}

/* -------------------------------- main ---------------------------------- */

async function processAd(ad) {
  const parsed = parseImageUrl(ad.imageUrl);
  if (!parsed) {
    return { ok: false, reason: 'invalid-url', url: ad.imageUrl };
  }

  // 1. خواندن تصویر
  let buffer = await readLocal(parsed.folder, parsed.filename);
  if (!buffer) buffer = await readS3(parsed.folder, parsed.filename);
  if (!buffer) {
    return { ok: false, reason: 'not-found-in-storage', parsed };
  }

  // 2. استخراج ابعاد
  const isSvg = parsed.filename.toLowerCase().endsWith('.svg');
  let dims;
  if (isSvg) {
    const content = buffer.toString('utf8');
    dims = parseSvgDimensions(content);
    if (!dims) {
      return { ok: false, reason: 'svg-no-dims', parsed };
    }
  } else {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) {
      return { ok: false, reason: 'cannot-read-dims', parsed };
    }
    dims = { width: meta.width, height: meta.height };
  }

  const existingDims = ad.customDimensions || {};
  const alreadyHasDims = existingDims.width && existingDims.height;
  const existingW = alreadyHasDims ? parseInt(existingDims.width, 10) : null;
  const existingH = alreadyHasDims ? parseInt(existingDims.height, 10) : null;
  const dimsMatch = existingW === dims.width && existingH === dims.height;

  // 3. تولید variant ها — فقط برای raster images (نه SVG)
  const baseNoExt = parsed.filename.replace(/\.[^/.]+$/, '');
  const generated = [];
  const skipped = [];

  if (isSvg) {
    // SVG ها vector هستند، variant WebP لازم ندارند
    skipped.push('svg-vector');
  } else if (!DRY_RUN) {
    const variants = await generateVariants(buffer, 'image/webp');
    for (const [w, buf] of variants) {
      const vName = variantName(parsed.filename, w);
      await writeLocal(parsed.folder, vName, buf);
      generated.push(vName);
    }
  } else {
    const variants = await generateVariants(buffer, 'image/webp');
    for (const w of variants.keys()) generated.push(variantName(parsed.filename, w));
  }

  // 4. به‌روزرسانی دیتابیس
  const needDbUpdate = !dimsMatch;
  if (needDbUpdate && !DRY_RUN) {
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: {
        customDimensions: {
          width: String(dims.width),
          height: String(dims.height),
          aspectRatio: `${dims.width}/${dims.height}`,
        },
      },
    });
  }

  return {
    ok: true,
    id: ad.id,
    title: ad.title,
    parsed,
    dims,
    existingDims: alreadyHasDims ? { width: existingW, height: existingH } : null,
    dbUpdated: needDbUpdate && !DRY_RUN,
    variantsGenerated: generated.length,
    variants: generated,
    skipped,
  };
}

async function main() {
  console.log('🔍 migrate-ad-images');
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — هیچ تغییری ذخیره نمی‌شود');
  console.log('');

  const where = ONLY_ID ? { id: ONLY_ID } : {};
  const ads = await prisma.advertisement.findMany({ where });
  console.log(`📦 ${ads.length} تبلیغ یافت شد`);
  console.log('');

  let ok = 0;
  let failed = 0;
  let dbUpdated = 0;
  let variantsTotal = 0;

  for (const ad of ads) {
    try {
      const result = await processAd(ad);
      if (!result.ok) {
        failed += 1;
        console.log(`  ❌ ${ad.title || ad.id} — ${result.reason}`);
        if (result.url) console.log(`     ${result.url}`);
        if (result.parsed) console.log(`     ${result.parsed.folder}/${result.parsed.filename}`);
        continue;
      }
      ok += 1;
      if (result.dbUpdated) dbUpdated += 1;
      variantsTotal += result.variantsGenerated;

      const dimStr = `${result.dims.width}×${result.dims.height}`;
      const aspectStr = (result.dims.width / result.dims.height).toFixed(2);
      const dbStr = result.dbUpdated ? '🆕 آپدیت شد' : '✓  قبلاً صحیح بود';
      console.log(
        `  ✅ ${ad.title || ad.id} — ${dimStr} (نسبت ${aspectStr}) — ${result.variantsGenerated} variant — ${dbStr}`,
      );
    } catch (err) {
      failed += 1;
      console.log(`  ❌ ${ad.title || ad.id} — خطا: ${err.message}`);
    }
  }

  console.log('');
  console.log('────────────────────────────────────');
  console.log(`✅ موفق:    ${ok}`);
  console.log(`❌ ناموفق:  ${failed}`);
  console.log(`🆕 دیتابیس آپدیت شد: ${dbUpdated}`);
  console.log(`📐 variant تولید شد: ${variantsTotal}`);
  if (DRY_RUN) console.log('⚠️  حالت DRY RUN — هیچ تغییری واقعی ذخیره نشد');
}

main()
  .catch((err) => {
    console.error('💥 خطای غیرمنتظره:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
