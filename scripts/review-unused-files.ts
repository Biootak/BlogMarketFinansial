import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

interface UnusedFileReport {
  path: string;
  size: number;
  type: string;
  lastModified: Date;
  gitHistory: boolean;
  dynamicImportPossible: boolean;
  recommendation: 'safe-to-delete' | 'review-needed' | 'keep';
  reason: string;
}

const DYNAMIC_IMPORT_PATTERNS = [
  /dynamic\s*\(/,
  /import\s*\(/,
  /require\s*\(/,
  /\[.*\]/,  // Dynamic route segments
];

const KEEP_PATTERNS = [
  /middleware\.ts$/,
  /instrumentation\.ts$/,
  /layout\.tsx$/,
  /page\.tsx$/,
  /route\.ts$/,
  /error\.tsx$/,
  /loading\.tsx$/,
  /not-found\.tsx$/,
  /template\.tsx$/,
];

function checkDynamicImportPossibility(filePath: string): boolean {
  // Check if file path suggests it might be dynamically imported
  if (filePath.includes('[') || filePath.includes(']')) {
    return true;
  }

  // Check if file is in a directory that commonly uses dynamic imports
  if (filePath.match(/components|pages|app/)) {
    return true;
  }

  return false;
}

function checkGitHistory(filePath: string): boolean {
  try {
    const log = execSync(`git log --oneline "${filePath}"`, { encoding: 'utf-8' });
    return log.trim().length > 0;
  } catch {
    return false;
  }
}

function shouldKeep(filePath: string): boolean {
  return KEEP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getRecommendation(
  filePath: string,
  dynamicImportPossible: boolean,
  gitHistory: boolean,
): { recommendation: UnusedFileReport['recommendation']; reason: string } {
  if (shouldKeep(filePath)) {
    return {
      recommendation: 'keep',
      reason: 'Next.js special file (layout, page, route, etc.)',
    };
  }

  if (dynamicImportPossible) {
    return {
      recommendation: 'review-needed',
      reason: 'Might be dynamically imported - needs manual review',
    };
  }

  if (gitHistory) {
    return {
      recommendation: 'review-needed',
      reason: 'Has git history - review before deletion',
    };
  }

  if (filePath.includes('test') || filePath.includes('spec')) {
    return {
      recommendation: 'safe-to-delete',
      reason: 'Test file',
    };
  }

  return {
    recommendation: 'safe-to-delete',
    reason: 'No imports found, no dynamic import patterns',
  };
}

console.log('📋 Generating detailed unused files report...\n');

// Read the output from find-unused-code
const unusedFilesOutput = execSync('npx tsx scripts/find-unused-code.ts', {
  encoding: 'utf-8',
});

// Parse the output to extract file paths
const fileMatches = unusedFilesOutput.matchAll(/📄 (.+?) \(/g);
const unusedFiles: string[] = [];

for (const match of fileMatches) {
  unusedFiles.push(match[1].trim());
}

console.log(`Found ${unusedFiles.length} unused files. Analyzing...\n`);

const reports: UnusedFileReport[] = [];

for (const filePath of unusedFiles) {
  try {
    const stat = require('fs').statSync(filePath);
    const dynamicImportPossible = checkDynamicImportPossibility(filePath);
    const gitHistory = checkGitHistory(filePath);
    const { recommendation, reason } = getRecommendation(
      filePath,
      dynamicImportPossible,
      gitHistory,
    );

    reports.push({
      path: filePath,
      size: stat.size,
      type: filePath.includes('component')
        ? 'component'
        : filePath.includes('util')
          ? 'utility'
          : 'other',
      lastModified: stat.mtime,
      gitHistory,
      dynamicImportPossible,
      recommendation,
      reason,
    });
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Group by recommendation
const safeToDelete = reports.filter((r) => r.recommendation === 'safe-to-delete');
const reviewNeeded = reports.filter((r) => r.recommendation === 'review-needed');
const keep = reports.filter((r) => r.recommendation === 'keep');

console.log('📊 ANALYSIS RESULTS:\n');
console.log('=' .repeat(80));
console.log(`\n✅ Safe to Delete: ${safeToDelete.length} files`);
console.log(`⚠️  Review Needed: ${reviewNeeded.length} files`);
console.log(`🔒 Keep: ${keep.length} files\n`);

// Generate report file
const reportContent = `# Unused Files Analysis Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Unused Files**: ${reports.length}
- **Safe to Delete**: ${safeToDelete.length}
- **Review Needed**: ${reviewNeeded.length}
- **Keep**: ${keep.length}

## Safe to Delete (${safeToDelete.length})

${safeToDelete
  .map(
    (r) => `- \`${r.path}\` (${(r.size / 1024).toFixed(2)} KB)
  - Reason: ${r.reason}`,
  )
  .join('\n')}

## Review Needed (${reviewNeeded.length})

${reviewNeeded
  .map(
    (r) => `- \`${r.path}\` (${(r.size / 1024).toFixed(2)} KB)
  - Reason: ${r.reason}
  - Dynamic Import Possible: ${r.dynamicImportPossible ? 'Yes' : 'No'}
  - Git History: ${r.gitHistory ? 'Yes' : 'No'}`,
  )
  .join('\n')}

## Keep (${keep.length})

${keep
  .map(
    (r) => `- \`${r.path}\`
  - Reason: ${r.reason}`,
  )
  .join('\n')}

## Deletion Script

To delete safe-to-delete files, run:

\`\`\`bash
${safeToDelete.map((r) => `rm "${r.path}"`).join('\n')}
\`\`\`

**⚠️ WARNING**: Always review files before deletion and create a backup!
`;

writeFileSync('UNUSED_FILES_REPORT.md', reportContent);

console.log('✅ Report generated: UNUSED_FILES_REPORT.md\n');
console.log('💡 Next steps:');
console.log('  1. Review UNUSED_FILES_REPORT.md');
console.log('  2. Manually verify "Review Needed" files');
console.log('  3. Create a git branch for cleanup');
console.log('  4. Delete safe files and test the application');
console.log('  5. Commit changes if everything works\n');
