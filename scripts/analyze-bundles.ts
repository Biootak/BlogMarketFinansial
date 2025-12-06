#!/usr/bin/env tsx
/**
 * Bundle Analysis Script
 * Analyzes Next.js build output and identifies optimization opportunities
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface BundleInfo {
  name: string;
  size: number;
  sizeKB: number;
  type: 'js' | 'css' | 'other';
}

interface AnalysisResult {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  bundles: BundleInfo[];
  recommendations: string[];
}

function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function analyzeBundles(): AnalysisResult {
  const staticDir = path.join(process.cwd(), '.next', 'static');

  if (!fs.existsSync(staticDir)) {
    console.error('❌ .next/static directory not found. Run build first.');
    process.exit(1);
  }

  const allFiles = getAllFiles(staticDir);
  const bundles: BundleInfo[] = [];

  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;

  for (const file of allFiles) {
    const size = getFileSize(file);
    const ext = path.extname(file);
    const name = path.basename(file);

    let type: 'js' | 'css' | 'other' = 'other';
    if (ext === '.js') {
      type = 'js';
      jsSize += size;
    } else if (ext === '.css') {
      type = 'css';
      cssSize += size;
    }

    totalSize += size;

    bundles.push({
      name,
      size,
      sizeKB: Math.round((size / 1024) * 100) / 100,
      type,
    });
  }

  // Sort by size
  bundles.sort((a, b) => b.size - a.size);

  const recommendations: string[] = [];

  // Analyze and generate recommendations
  const largeJsBundles = bundles.filter((b) => b.type === 'js' && b.sizeKB > 200);
  if (largeJsBundles.length > 0) {
    recommendations.push(
      `🔴 CRITICAL: ${largeJsBundles.length} JS bundle(s) > 200 KB detected. Consider code splitting.`
    );
  }

  const totalJsMB = jsSize / (1024 * 1024);
  if (totalJsMB > 2) {
    recommendations.push(
      `🔴 CRITICAL: Total JS size (${totalJsMB.toFixed(2)} MB) exceeds 2 MB. Target: < 1 MB`
    );
  }

  const totalCssMB = cssSize / (1024 * 1024);
  if (totalCssMB > 0.5) {
    recommendations.push(
      `🟡 MEDIUM: Total CSS size (${totalCssMB.toFixed(2)} MB) exceeds 500 KB. Check Tailwind purge.`
    );
  }

  return {
    totalSize,
    jsSize,
    cssSize,
    bundles,
    recommendations,
  };
}

function printReport(result: AnalysisResult): void {
  console.log('\n📊 Bundle Analysis Report\n');
  console.log('='.repeat(60));

  // Summary
  console.log('\n📦 Summary:');
  console.log(`  Total Size: ${(result.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  JavaScript: ${(result.jsSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  CSS: ${(result.cssSize / (1024 * 1024)).toFixed(2)} MB`);

  // Top 15 largest bundles
  console.log('\n🔍 Top 15 Largest Files:');
  console.log('-'.repeat(60));
  const top15 = result.bundles.slice(0, 15);
  for (const bundle of top15) {
    const icon = bundle.type === 'js' ? '📜' : bundle.type === 'css' ? '🎨' : '📄';
    const warning = bundle.sizeKB > 200 ? ' ⚠️' : '';
    console.log(`  ${icon} ${bundle.name.padEnd(30)} ${bundle.sizeKB.toFixed(2)} KB${warning}`);
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    console.log('-'.repeat(60));
    for (const rec of result.recommendations) {
      console.log(`  ${rec}`);
    }
  }

  // Bundle breakdown by type
  const jsBundles = result.bundles.filter((b) => b.type === 'js');
  const cssBundles = result.bundles.filter((b) => b.type === 'css');

  console.log('\n📊 Bundle Breakdown:');
  console.log(`  JS Files: ${jsBundles.length} files`);
  console.log(`  CSS Files: ${cssBundles.length} files`);

  // Large bundles analysis
  const criticalBundles = jsBundles.filter((b) => b.sizeKB > 300);
  const largeBundles = jsBundles.filter((b) => b.sizeKB > 200 && b.sizeKB <= 300);
  const mediumBundles = jsBundles.filter((b) => b.sizeKB > 100 && b.sizeKB <= 200);

  console.log('\n🎯 Size Distribution:');
  console.log(`  Critical (> 300 KB): ${criticalBundles.length} files`);
  console.log(`  Large (200-300 KB): ${largeBundles.length} files`);
  console.log(`  Medium (100-200 KB): ${mediumBundles.length} files`);

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
try {
  console.log('🚀 Starting bundle analysis...\n');
  const result = analyzeBundles();
  printReport(result);

  // Save to file
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`✅ Detailed report saved to: ${reportPath}\n`);
} catch (error) {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
}
