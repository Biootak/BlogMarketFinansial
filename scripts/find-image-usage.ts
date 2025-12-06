import { readFileSync } from 'node:fs';
import { glob } from 'glob';

async function findImageUsage() {
  console.log('🔍 Finding Image component usage...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  
  const imageUsage: Array<{
    file: string;
    hasNextImage: boolean;
    hasStaticImport: boolean;
    imageCount: number;
  }> = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    
    // Check for next/image import
    const hasNextImage = /import\s+.*Image.*from\s+['"]next\/image['"]/.test(content);
    
    // Check for static image imports
    const hasStaticImport = /import\s+\w+\s+from\s+['"].*\.(jpg|jpeg|png|webp)['"]/.test(content);
    
    // Count <Image> or <img> tags
    const imageMatches = content.match(/<(Image|img)\s/g);
    const imageCount = imageMatches ? imageMatches.length : 0;

    if (hasNextImage || hasStaticImport || imageCount > 0) {
      imageUsage.push({
        file,
        hasNextImage,
        hasStaticImport,
        imageCount,
      });
    }
  }

  console.log(`📊 Summary:\n`);
  console.log(`Files with Image usage: ${imageUsage.length}`);
  console.log(`Files using next/image: ${imageUsage.filter(u => u.hasNextImage).length}`);
  console.log(`Files with static imports: ${imageUsage.filter(u => u.hasStaticImport).length}`);
  console.log(`Total <Image>/<img> tags: ${imageUsage.reduce((sum, u) => sum + u.imageCount, 0)}\n`);

  console.log('📁 Files with static image imports:\n');
  imageUsage
    .filter(u => u.hasStaticImport)
    .forEach(usage => {
      console.log(`  ${usage.file} (${usage.imageCount} images)`);
    });

  console.log('\n💡 Recommendation:');
  console.log('Most images are already using next/image which automatically optimizes images.');
  console.log('The WebP versions created can be used as fallbacks or for manual optimization.');
  console.log('\n✨ Done!');
}

findImageUsage().catch(console.error);
