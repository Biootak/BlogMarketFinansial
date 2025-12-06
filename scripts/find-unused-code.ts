import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface UnusedFile {
  path: string;
  size: number;
  type: 'component' | 'utility' | 'type' | 'style' | 'other';
}

interface UnusedExport {
  file: string;
  export: string;
  line: number;
}

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.kiro',
  'coverage',
  'performance-reports',
];

const CONFIG_FILES = [
  'next.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'biome.json',
  'tsconfig.json',
  'package.json',
  '.env',
  '.env.local',
  '.env.example',
  'middleware.ts',
  'instrumentation.ts',
];

const ENTRY_POINTS = [
  'src/app',
  'src/middleware.ts',
  'src/instrumentation.ts',
  'pages/_app.tsx',
  'pages/_document.tsx',
];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some((pattern) => filePath.includes(pattern))) {
      continue;
    }

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (
      filePath.match(/\.(ts|tsx|js|jsx)$/) &&
      !filePath.includes('.test.') &&
      !filePath.includes('.spec.')
    ) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function isFileImported(filePath: string, allFiles: string[]): boolean {
  // Check if it's a config file
  if (CONFIG_FILES.some((config) => filePath.endsWith(config))) {
    return true;
  }

  // Check if it's an entry point
  if (ENTRY_POINTS.some((entry) => filePath.includes(entry))) {
    return true;
  }

  // Get relative path without extension for import matching
  const relativePath = relative(process.cwd(), filePath)
    .replace(/\\/g, '/')
    .replace(/\.(ts|tsx|js|jsx)$/, '');

  // Check if any file imports this file
  for (const file of allFiles) {
    if (file === filePath) continue;

    try {
      const content = readFileSync(file, 'utf-8');

      // Check for various import patterns
      const importPatterns = [
        new RegExp(`from ['"].*${relativePath.split('/').pop()}['"]`, 'g'),
        new RegExp(`from ['"]@/.*${relativePath.split('/').pop()}['"]`, 'g'),
        new RegExp(`import\\(['"].*${relativePath.split('/').pop()}['"]\\)`, 'g'),
        new RegExp(`require\\(['"].*${relativePath.split('/').pop()}['"]\\)`, 'g'),
      ];

      if (importPatterns.some((pattern) => pattern.test(content))) {
        return true;
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return false;
}

function categorizeFile(filePath: string): UnusedFile['type'] {
  if (filePath.match(/components/i)) return 'component';
  if (filePath.match(/utils|lib|helpers/i)) return 'utility';
  if (filePath.match(/types|interfaces/i)) return 'type';
  if (filePath.match(/styles|css|scss/i)) return 'style';
  return 'other';
}

function findUnusedFiles(): UnusedFile[] {
  console.log('🔍 Scanning for unused files...\n');

  const allFiles = getAllFiles('src');
  const unusedFiles: UnusedFile[] = [];

  for (const file of allFiles) {
    if (!isFileImported(file, allFiles)) {
      const stat = statSync(file);
      unusedFiles.push({
        path: relative(process.cwd(), file),
        size: stat.size,
        type: categorizeFile(file),
      });
    }
  }

  return unusedFiles;
}

function findUnusedExports(): UnusedExport[] {
  console.log('🔍 Scanning for unused exports...\n');

  try {
    // Use ts-prune if available
    const output = execSync('npx ts-prune --error', { encoding: 'utf-8' });
    const lines = output.split('\n');
    const unusedExports: UnusedExport[] = [];

    for (const line of lines) {
      const match = line.match(/^(.+):(\d+) - (.+) is unused$/);
      if (match) {
        unusedExports.push({
          file: match[1],
          line: Number.parseInt(match[2]),
          export: match[3],
        });
      }
    }

    return unusedExports;
  } catch (error) {
    console.log('⚠️  ts-prune not available. Install with: npm install -D ts-prune\n');
    return [];
  }
}

function findUnusedDependencies(): string[] {
  console.log('🔍 Scanning for unused dependencies...\n');

  try {
    const output = execSync('npx depcheck --json', { encoding: 'utf-8' });
    const result = JSON.parse(output);
    return result.dependencies || [];
  } catch (error) {
    console.log('⚠️  depcheck not available. Install with: npm install -D depcheck\n');
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function main() {
  console.log('🚀 Starting Dead Code Analysis...\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Find unused files
  const unusedFiles = findUnusedFiles();

  if (unusedFiles.length > 0) {
    console.log('📁 UNUSED FILES:\n');

    const byType = unusedFiles.reduce(
      (acc, file) => {
        if (!acc[file.type]) acc[file.type] = [];
        acc[file.type].push(file);
        return acc;
      },
      {} as Record<string, UnusedFile[]>,
    );

    for (const [type, files] of Object.entries(byType)) {
      console.log(`\n${type.toUpperCase()}S (${files.length}):`);
      for (const file of files.slice(0, 10)) {
        console.log(`  📄 ${file.path} (${formatBytes(file.size)})`);
      }
      if (files.length > 10) {
        console.log(`  ... and ${files.length - 10} more`);
      }
    }

    const totalSize = unusedFiles.reduce((sum, file) => sum + file.size, 0);
    console.log(`\n💾 Total unused file size: ${formatBytes(totalSize)}`);
  } else {
    console.log('✅ No unused files found!\n');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Find unused exports
  const unusedExports = findUnusedExports();

  if (unusedExports.length > 0) {
    console.log('📤 UNUSED EXPORTS:\n');

    const byFile = unusedExports.reduce(
      (acc, exp) => {
        if (!acc[exp.file]) acc[exp.file] = [];
        acc[exp.file].push(exp);
        return acc;
      },
      {} as Record<string, UnusedExport[]>,
    );

    let count = 0;
    for (const [file, exports] of Object.entries(byFile)) {
      if (count >= 10) {
        console.log(`\n... and ${Object.keys(byFile).length - 10} more files`);
        break;
      }
      console.log(`\n${file}:`);
      for (const exp of exports.slice(0, 5)) {
        console.log(`  ↳ Line ${exp.line}: ${exp.export}`);
      }
      if (exports.length > 5) {
        console.log(`  ... and ${exports.length - 5} more exports`);
      }
      count++;
    }

    console.log(`\n📊 Total unused exports: ${unusedExports.length}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Find unused dependencies
  const unusedDeps = findUnusedDependencies();

  if (unusedDeps.length > 0) {
    console.log('📦 UNUSED DEPENDENCIES:\n');
    for (const dep of unusedDeps) {
      console.log(`  ❌ ${dep}`);
    }
    console.log(`\n💡 Consider removing these with: npm uninstall ${unusedDeps.join(' ')}`);
  } else {
    console.log('✅ No unused dependencies found!\n');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Summary
  console.log('📊 SUMMARY:\n');
  console.log(`  Unused Files: ${unusedFiles.length}`);
  console.log(`  Unused Exports: ${unusedExports.length}`);
  console.log(`  Unused Dependencies: ${unusedDeps.length}`);

  if (unusedFiles.length > 0) {
    const totalSize = unusedFiles.reduce((sum, file) => sum + file.size, 0);
    console.log(`  Potential Savings: ${formatBytes(totalSize)}`);
  }

  console.log('\n💡 RECOMMENDATIONS:\n');

  if (unusedFiles.length > 0) {
    console.log('  1. Review unused files before deletion');
    console.log('  2. Some files may be used dynamically (check carefully)');
    console.log('  3. Create a backup before removing files');
  }

  if (unusedExports.length > 0) {
    console.log('  4. Remove unused exports to improve tree shaking');
    console.log('  5. Some exports may be used by external packages');
  }

  if (unusedDeps.length > 0) {
    console.log('  6. Remove unused dependencies to reduce node_modules size');
    console.log('  7. Check if dependencies are used in scripts or config files');
  }

  if (unusedFiles.length === 0 && unusedExports.length === 0 && unusedDeps.length === 0) {
    console.log('  ✨ Your codebase is clean! No unused code detected.');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

main();
