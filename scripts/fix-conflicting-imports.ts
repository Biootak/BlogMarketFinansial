import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

// Icons that conflict with Next.js components
const conflictingIcons = ['Link', 'Image', 'Menu'];

async function fixConflictingImports() {
  console.log('🔧 Fixing conflicting imports (Link, Image, Menu)...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  let totalFiles = 0;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (error) {
      continue;
    }

    let modified = false;

    // Check if file has Next.js Link or Image import
    const hasNextLink = /import\s+Link\s+from\s+['"]next\/link['"]/.test(content);
    const hasNextImage = /import\s+Image\s+from\s+['"]next\/image['"]/.test(content);
    const hasHeadlessMenu = /import\s+{\s*Menu\s*[,}]/.test(content) && content.includes('@headlessui/react');

    // Find lucide-react import
    const lucideImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/);

    if (!lucideImportMatch) continue;

    const currentImports = lucideImportMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let needsUpdate = false;
    const filteredImports = currentImports.filter((icon) => {
      if (icon === 'Link' && hasNextLink) {
        needsUpdate = true;
        return false;
      }
      if (icon === 'Image' && hasNextImage) {
        needsUpdate = true;
        return false;
      }
      if (icon === 'Menu' && hasHeadlessMenu) {
        needsUpdate = true;
        return false;
      }
      return true;
    });

    if (!needsUpdate) continue;

    // Replace the import
    if (filteredImports.length > 0) {
      const newImportStatement = `import { ${filteredImports.join(', ')} } from 'lucide-react';`;
      content = content.replace(
        /import\s+{[^}]+}\s+from\s+['"]lucide-react['"];?;?/,
        newImportStatement
      );
    } else {
      // Remove the import entirely if no icons left
      content = content.replace(/import\s+{[^}]+}\s+from\s+['"]lucide-react['"];?;?\n?/, '');
    }

    writeFileSync(file, content, 'utf-8');
    totalFiles++;
    modified = true;
    console.log(`✅ ${file}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`\n✨ Done!`);
}

fixConflictingImports().catch(console.error);
