import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

interface ImageStats {
  original: number;
  optimized: number;
  savings: number;
  savingsPercent: number;
}

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  const imagePatterns = ['public/images/**/*.{jpg,jpeg,png}', 'src/images/**/*.{jpg,jpeg,png}'];
  const allImages: string[] = [];

  for (const pattern of imagePatterns) {
    const files = await glob(pattern, { nodir: true });
    allImages.push(...files);
  }

  if (allImages.length === 0) {
    console.log('No images found to optimize.');
    return;
  }

  console.log(`Found ${allImages.length} images to optimize\n`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  const results: Array<{ file: string; stats: ImageStats }> = [];

  for (const imagePath of allImages) {
    try {
      const { dir, name, ext } = parse(imagePath);
      const webpPath = join(dir, `${name}.webp`);

      // Skip if WebP already exists
      if (existsSync(webpPath)) {
        console.log(`⏭️  Skipping ${imagePath} (WebP already exists)`);
        continue;
      }

      const originalSize = readFileSync(imagePath).length;
      totalOriginal += originalSize;

      // Convert to WebP with quality 85
      await sharp(imagePath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);

      const optimizedSize = readFileSync(webpPath).length;
      totalOptimized += optimizedSize;

      const savings = originalSize - optimizedSize;
      const savingsPercent = (savings / originalSize) * 100;

      results.push({
        file: imagePath,
        stats: {
          original: originalSize,
          optimized: optimizedSize,
          savings,
          savingsPercent,
        },
      });

      console.log(
        `✅ ${imagePath}\n   ${(originalSize / 1024).toFixed(2)} KB → ${(optimizedSize / 1024).toFixed(2)} KB (${savingsPercent.toFixed(1)}% smaller)\n`,
      );
    } catch (error) {
      console.error(`❌ Error processing ${imagePath}:`, error);
    }
  }

  // Summary
  console.log('\n📊 Optimization Summary:\n');
  console.log(`Total images processed: ${results.length}`);
  console.log(`Original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Optimized size: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `Total savings: ${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(2)} MB (${(((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(1)}%)\n`,
  );

  // Top 10 savings
  console.log('🏆 Top 10 Savings:\n');
  results
    .sort((a, b) => b.stats.savings - a.stats.savings)
    .slice(0, 10)
    .forEach((result, index) => {
      console.log(
        `${index + 1}. ${result.file}\n   Saved: ${(result.stats.savings / 1024).toFixed(2)} KB (${result.stats.savingsPercent.toFixed(1)}%)\n`,
      );
    });

  console.log('\n💡 Next Steps:');
  console.log('1. Update Image components to use WebP with fallback');
  console.log('2. Consider using next/image for automatic optimization');
  console.log('3. Remove original images after verifying WebP versions work');
  console.log('\n✨ Done!');
}

optimizeImages().catch(console.error);
