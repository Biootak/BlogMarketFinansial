import { readFileSync } from 'node:fs';
import { glob } from 'glob';

async function findRemainingIcons() {
  console.log('🔍 Finding remaining React Icons...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  const iconPattern = /<(Hi|Fa)[A-Z][a-zA-Z]+\s/g;
  const foundIcons = new Set<string>();

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const matches = content.matchAll(iconPattern);

      for (const match of matches) {
        const iconName = match[0].slice(1, -1); // Remove < and space
        foundIcons.add(iconName);
      }
    } catch (error) {
      continue;
    }
  }

  if (foundIcons.size === 0) {
    console.log('✅ No remaining React Icons found!\n');
  } else {
    console.log('❌ Found remaining icons:\n');
    for (const icon of Array.from(foundIcons).sort()) {
      console.log(`  - ${icon}`);
    }
    console.log(`\nTotal: ${foundIcons.size} icons\n`);
  }
}

findRemainingIcons().catch(console.error);
