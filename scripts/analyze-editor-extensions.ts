import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ExtensionUsage {
  name: string;
  usedInControls: string[];
  usedInComponents: string[];
  totalUsage: number;
  isEssential: boolean;
}

const ESSENTIAL_EXTENSIONS = [
  'StarterKit',
  'Paragraph',
  'Heading',
  'TextStyle',
  'Placeholder',
  'CharacterCount',
];

function findFilesRecursively(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findFilesRecursively(fullPath, pattern));
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeExtensionUsage(): Map<string, ExtensionUsage> {
  const usage = new Map<string, ExtensionUsage>();

  // Initialize extensions from index.ts
  const extensionsFile = readFileSync('src/components/Editor1/extensions/index.ts', 'utf-8');
  const extensionNames = [
    'Image',
    'StarterKit',
    'Paragraph',
    'Heading',
    'Underline',
    'TextAlign',
    'TextStyle',
    'Color',
    'Highlight',
    'Link',
    'Placeholder',
    'CodeBlockLowlight',
    'CharacterCount',
    'SlashCommands',
    'Callout',
    'Embed',
    'Superscript',
    'Subscript',
    'Math',
    'Mention',
    'FontSize',
    'FontFamily',
    'DragHandle',
    'KeyboardShortcuts',
    'Table',
    'TaskList',
  ];

  for (const name of extensionNames) {
    usage.set(name, {
      name,
      usedInControls: [],
      usedInComponents: [],
      totalUsage: 0,
      isEssential: ESSENTIAL_EXTENSIONS.includes(name),
    });
  }

  // Analyze controls
  const controlFiles = findFilesRecursively('src/components/Editor1/controls', /\.tsx?$/);
  for (const file of controlFiles) {
    const content = readFileSync(file, 'utf-8');
    const fileName = file.split(/[\\/]/).pop() || '';

    for (const [name, data] of usage) {
      const patterns = [
        new RegExp(`editor\\.chain\\(\\).*\\.toggle${name}`, 'g'),
        new RegExp(`editor\\.chain\\(\\).*\\.set${name}`, 'g'),
        new RegExp(`editor\\.isActive\\(['"]${name.toLowerCase()}['"]`, 'g'),
        new RegExp(`editor\\.commands\\.${name.toLowerCase()}`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          data.usedInControls.push(fileName);
          data.totalUsage++;
          break;
        }
      }
    }
  }

  // Analyze components
  const componentFiles = findFilesRecursively('src/components/Editor1/components', /\.tsx?$/);
  for (const file of componentFiles) {
    const content = readFileSync(file, 'utf-8');
    const fileName = file.split(/[\\/]/).pop() || '';

    for (const [name, data] of usage) {
      if (content.includes(name) || content.includes(name.toLowerCase())) {
        data.usedInComponents.push(fileName);
        data.totalUsage++;
      }
    }
  }

  return usage;
}

function main() {
  console.log('🔍 Analyzing TipTap Editor Extensions Usage...\n');

  const usage = analyzeExtensionUsage();

  // Sort by usage
  const sorted = Array.from(usage.values()).sort((a, b) => b.totalUsage - a.totalUsage);

  console.log('📊 Extension Usage Report:\n');
  console.log('=' .repeat(80));

  // Used extensions
  const used = sorted.filter((ext) => ext.totalUsage > 0);
  console.log('\n✅ USED EXTENSIONS:\n');
  for (const ext of used) {
    const essential = ext.isEssential ? '⭐' : '  ';
    console.log(`${essential} ${ext.name.padEnd(20)} - ${ext.totalUsage} usage(s)`);
    if (ext.usedInControls.length > 0) {
      console.log(`   Controls: ${ext.usedInControls.join(', ')}`);
    }
    if (ext.usedInComponents.length > 0) {
      console.log(`   Components: ${ext.usedInComponents.join(', ')}`);
    }
    console.log();
  }

  // Unused extensions
  const unused = sorted.filter((ext) => ext.totalUsage === 0 && !ext.isEssential);
  if (unused.length > 0) {
    console.log('\n❌ POTENTIALLY UNUSED EXTENSIONS:\n');
    for (const ext of unused) {
      console.log(`   ${ext.name}`);
    }
    console.log();
  }

  // Essential but unused
  const essentialUnused = sorted.filter((ext) => ext.totalUsage === 0 && ext.isEssential);
  if (essentialUnused.length > 0) {
    console.log('\n⚠️  ESSENTIAL BUT NOT DIRECTLY USED:\n');
    for (const ext of essentialUnused) {
      console.log(`   ${ext.name} (Keep - Core functionality)`);
    }
    console.log();
  }

  console.log('=' .repeat(80));

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:\n');

  if (unused.length > 0) {
    console.log('🔴 Consider removing these extensions if not needed:');
    for (const ext of unused) {
      console.log(`   - ${ext.name}`);
    }
    console.log();
  }

  console.log('✅ Keep all essential extensions (marked with ⭐)');
  console.log('✅ Keep extensions with active usage');
  console.log();

  const potentialSavings = unused.length * 10; // Rough estimate: 10KB per extension
  console.log(`📦 Potential savings: ~${potentialSavings} KB\n`);
}

main();
