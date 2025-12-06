/**
 * Performance Audit Script for CI/CD
 * اسکریپت تحلیل عملکرد برای CI/CD
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BundleAnalyzer } from '../src/lib/performance/bundleAnalyzer';
import { ReportGenerator } from '../src/lib/performance/reportGenerator';

async function runPerformanceAudit() {
  console.log('🚀 Starting performance audit...\n');

  try {
    // Bundle Analysis
    console.log('📦 Analyzing bundles...');
    const bundleAnalyzer = new BundleAnalyzer();
    const bundleAnalysis = await bundleAnalyzer.analyze();

    console.log(`  - Total size: ${formatBytes(bundleAnalysis.totalSize)}`);
    console.log(`  - Bundles: ${bundleAnalysis.bundles.length}`);
    console.log(`  - Duplicates: ${bundleAnalysis.duplicates.length}`);

    // Generate Report
    console.log('\n📊 Generating report...');
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generateReport({
      bundle: bundleAnalysis,
    });

    // Check performance budgets
    const budgets = {
      totalSize: 500 * 1024, // 500KB
      criticalFindings: 0,
      highFindings: 5,
    };

    let failed = false;

    if (bundleAnalysis.totalSize > budgets.totalSize) {
      console.error(
        `❌ Bundle size exceeds budget: ${formatBytes(bundleAnalysis.totalSize)} > ${formatBytes(budgets.totalSize)}`,
      );
      failed = true;
    }

    if (report.summary.criticalCount > budgets.criticalFindings) {
      console.error(
        `❌ Critical findings exceed budget: ${report.summary.criticalCount} > ${budgets.criticalFindings}`,
      );
      failed = true;
    }

    if (report.summary.highCount > budgets.highFindings) {
      console.error(
        `❌ High severity findings exceed budget: ${report.summary.highCount} > ${budgets.highFindings}`,
      );
      failed = true;
    }

    // Export reports
    const reportsDir = path.join(process.cwd(), 'performance-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON Report
    fs.writeFileSync(
      path.join(reportsDir, `report-${timestamp}.json`),
      reportGenerator.exportToJSON(report),
    );

    // HTML Report
    fs.writeFileSync(
      path.join(reportsDir, `report-${timestamp}.html`),
      reportGenerator.exportToHTML(report),
    );

    // Markdown Report
    fs.writeFileSync(
      path.join(reportsDir, `report-${timestamp}.md`),
      reportGenerator.exportToMarkdown(report),
    );

    console.log(`\n✅ Reports generated in ${reportsDir}`);

    if (failed) {
      console.error('\n❌ Performance audit failed - budgets exceeded');
      process.exit(1);
    } else {
      console.log('\n✅ Performance audit passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Run audit
runPerformanceAudit();
