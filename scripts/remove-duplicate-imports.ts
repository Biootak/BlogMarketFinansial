import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

async function removeDuplicateImports() {
  console.log('🔧 Removing duplicate Lucide imports...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  let totalFiles = 0;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (error) {
      continue;
    }

    // Find all lucide-react imports
    const lucideImports = content.match(/import\s+{[^}]+}\s+from\s+['"]lucide-react['"];?/g);

    if (!lucideImports || lucideImports.length <= 1) continue;

    // Collect all imported icons
    const allIcons = new Set<string>();
    for (const importStatement of lucideImports) {
      const match = importStatement.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);
      if (match) {
        const icons = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const icon of icons) {
          allIcons.add(icon);
        }
      }
    }

    // Remove all lucide imports
    for (const importStatement of lucideImports) {
      content = content.replace(importStatement, '');
    }

    // Add single consolidated import
    const sortedIcons = Array.from(allIcons).sort();
    const newImport = `import { ${sortedIcons.join(', ')} } from 'lucide-react';`;

    // Find the best place to insert (after other imports)
    const lastImportMatch = content.match(/import[^;]+;(?=\s*\n)/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      content =
        content.slice(0, lastImportIndex + lastImport.length) +
        `\n${newImport}` +
        content.slice(lastImportIndex + lastImport.length);
    } else {
      // If no imports found, add at the beginning
      content = `${newImport}\n${content}`;
    }

    writeFileSync(file, content, 'utf-8');
    totalFiles++;
    console.log(`✅ ${file}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`\n✨ Done!`);
}

removeDuplicateImports().catch(console.error);
