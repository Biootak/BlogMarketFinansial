/**
 * Report Generator
 * تولید گزارش جامع performance audit
 */

import type { BundleAnalysis } from './bundleAnalyzer';
import type {
  DatabaseAnalysis,
  SSRAnalysis,
  ClientAnalysis,
  ImageAnalysis,
  MemoryAnalysis,
  CacheAnalysis,
  ScriptsAnalysis,
  APIAnalysis,
  FontsAnalysis,
} from './types';

export interface CodeLocation {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface Finding {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: CodeLocation;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  title: string;
  description: string;
  before?: string;
  after?: string;
  expectedGain: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface PriorityItem {
  finding: Finding;
  recommendation?: Recommendation;
  impactScore: number;
  effortScore: number;
  priorityScore: number;
}

export interface ReportSummary {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  estimatedImpact: string;
  generatedAt: Date;
}

export interface PerformanceReport {
  summary: ReportSummary;
  findings: Finding[];
  recommendations: Recommendation[];
  priorityMatrix: PriorityItem[];
}

export interface AllAnalyses {
  bundle?: BundleAnalysis;
  database?: DatabaseAnalysis;
  ssr?: SSRAnalysis;
  client?: ClientAnalysis;
  image?: ImageAnalysis;
  memory?: MemoryAnalysis;
  cache?: CacheAnalysis;
  scripts?: ScriptsAnalysis;
  api?: APIAnalysis;
  fonts?: FontsAnalysis;
}

export class ReportGenerator {
  /**
   * تولید گزارش جامع از تمام تحلیل‌ها
   */
  generateReport(analyses: AllAnalyses): PerformanceReport {
    const findings = this.categorizeFindings(analyses);
    const recommendations = this.generateRecommendations(findings);
    const priorityMatrix = this.prioritize(findings, recommendations);
    const summary = this.generateSummary(findings);

    return {
      summary,
      findings,
      recommendations,
      priorityMatrix,
    };
  }

  /**
   * Export report to JSON format
   */
  exportToJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to HTML format
   */
  exportToHTML(report: PerformanceReport): string {
    const { summary, findings, recommendations, priorityMatrix } = report;

    return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>گزارش تحلیل عملکرد</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .summary-card.critical { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary-card.high { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .summary-card.medium { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .summary-card.low { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .summary-card h3 { font-size: 14px; margin-bottom: 5px; opacity: 0.9; }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .finding { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-right: 4px solid #3498db; }
    .finding.critical { border-right-color: #e74c3c; }
    .finding.high { border-right-color: #e67e22; }
    .finding.medium { border-right-color: #f39c12; }
    .finding.low { border-right-color: #27ae60; }
    .finding h3 { color: #2c3e50; margin-bottom: 8px; }
    .finding .meta { display: flex; gap: 15px; font-size: 12px; color: #7f8c8d; margin-bottom: 8px; }
    .finding .description { color: #34495e; margin-bottom: 8px; }
    .finding .impact { background: #e8f4f8; padding: 8px; border-radius: 4px; font-size: 14px; }
    .recommendation { background: #e8f5e9; padding: 15px; margin: 10px 0; border-radius: 5px; border-right: 4px solid #4caf50; }
    .recommendation h3 { color: #2e7d32; margin-bottom: 8px; }
    .code { background: #263238; color: #aed581; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px; margin: 8px 0; overflow-x: auto; }
    .priority-matrix { display: grid; gap: 10px; }
    .priority-item { background: white; border: 1px solid #e0e0e0; padding: 15px; border-radius: 5px; }
    .priority-score { display: inline-block; background: #3498db; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge.critical { background: #ffebee; color: #c62828; }
    .badge.high { background: #fff3e0; color: #e65100; }
    .badge.medium { background: #fff8e1; color: #f57f17; }
    .badge.low { background: #e8f5e9; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 گزارش تحلیل عملکرد</h1>
    <p>تاریخ تولید: ${summary.generatedAt.toLocaleString('fa-IR')}</p>

    <h2>خلاصه</h2>
    <div class="summary">
      <div class="summary-card">
        <h3>کل مشکلات</h3>
        <div class="value">${summary.totalFindings}</div>
      </div>
      <div class="summary-card critical">
        <h3>بحرانی</h3>
        <div class="value">${summary.criticalCount}</div>
      </div>
      <div class="summary-card high">
        <h3>مهم</h3>
        <div class="value">${summary.highCount}</div>
      </div>
      <div class="summary-card medium">
        <h3>متوسط</h3>
        <div class="value">${summary.mediumCount}</div>
      </div>
      <div class="summary-card low">
        <h3>کم</h3>
        <div class="value">${summary.lowCount}</div>
      </div>
    </div>

    <h2>🔍 مشکلات یافت شده</h2>
    ${findings
      .map(
        (f) => `
      <div class="finding ${f.severity}">
        <h3>${f.title}</h3>
        <div class="meta">
          <span class="badge ${f.severity}">${f.severity}</span>
          <span>📁 ${f.location.file}</span>
          <span>⚡ تلاش: ${f.effort}</span>
        </div>
        <div class="description">${f.description}</div>
        <div class="impact"><strong>تأثیر:</strong> ${f.impact}</div>
      </div>
    `,
      )
      .join('')}

    <h2>💡 پیشنهادات</h2>
    ${recommendations
      .map(
        (r) => `
      <div class="recommendation">
        <h3>${r.title}</h3>
        <p>${r.description}</p>
        ${r.before ? `<div class="code">// قبل:\n${r.before}</div>` : ''}
        ${r.after ? `<div class="code">// بعد:\n${r.after}</div>` : ''}
        <p><strong>سود مورد انتظار:</strong> ${r.expectedGain}</p>
      </div>
    `,
      )
      .join('')}

    <h2>📈 ماتریس اولویت</h2>
    <div class="priority-matrix">
      ${priorityMatrix
        .slice(0, 10)
        .map(
          (item) => `
        <div class="priority-item">
          <span class="priority-score">امتیاز: ${item.priorityScore.toFixed(1)}</span>
          <h3>${item.finding.title}</h3>
          <p>تأثیر: ${item.impactScore} | تلاش: ${item.effortScore}</p>
        </div>
      `,
        )
        .join('')}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Export report to Markdown format
   */
  exportToMarkdown(report: PerformanceReport): string {
    const { summary, findings, recommendations, priorityMatrix } = report;

    let md = '# 📊 گزارش تحلیل عملکرد\n\n';
    md += `**تاریخ تولید:** ${summary.generatedAt.toLocaleString('fa-IR')}\n\n`;

    // Summary
    md += '## خلاصه\n\n';
    md += '| معیار | تعداد |\n';
    md += '|-------|-------|\n';
    md += `| کل مشکلات | ${summary.totalFindings} |\n`;
    md += `| بحرانی | ${summary.criticalCount} |\n`;
    md += `| مهم | ${summary.highCount} |\n`;
    md += `| متوسط | ${summary.mediumCount} |\n`;
    md += `| کم | ${summary.lowCount} |\n`;
    md += `| تأثیر کلی | ${summary.estimatedImpact} |\n\n`;

    // Findings
    md += '## 🔍 مشکلات یافت شده\n\n';
    for (const finding of findings) {
      md += `### ${finding.title}\n\n`;
      md += `- **دسته:** ${finding.category}\n`;
      md += `- **شدت:** ${finding.severity}\n`;
      md += `- **مکان:** ${finding.location.file}\n`;
      md += `- **توضیحات:** ${finding.description}\n`;
      md += `- **تأثیر:** ${finding.impact}\n`;
      md += `- **تلاش:** ${finding.effort}\n\n`;
    }

    // Recommendations
    md += '## 💡 پیشنهادات\n\n';
    for (const rec of recommendations) {
      md += `### ${rec.title}\n\n`;
      md += `${rec.description}\n\n`;
      if (rec.before) {
        md += `**قبل:**\n\`\`\`\n${rec.before}\n\`\`\`\n\n`;
      }
      if (rec.after) {
        md += `**بعد:**\n\`\`\`\n${rec.after}\n\`\`\`\n\n`;
      }
      md += `**سود مورد انتظار:** ${rec.expectedGain}\n\n`;
    }

    // Priority Matrix
    md += '## 📈 ماتریس اولویت (10 مورد برتر)\n\n';
    md += '| اولویت | عنوان | امتیاز تأثیر | امتیاز تلاش | امتیاز کل |\n';
    md += '|--------|--------|--------------|-------------|----------|\n';
    for (const [index, item] of priorityMatrix.slice(0, 10).entries()) {
      md += `| ${index + 1} | ${item.finding.title} | ${item.impactScore} | ${item.effortScore} | ${item.priorityScore.toFixed(1)} |\n`;
    }

    return md;
  }

  /**
   * دسته‌بندی findings بر اساس severity
   */
  categorizeFindings(analyses: AllAnalyses): Finding[] {
    const findings: Finding[] = [];

    // Bundle analysis findings
    if (analyses.bundle) {
      const bundleFindings = this.extractBundleFindings(analyses.bundle);
      findings.push(...bundleFindings);
    }

    // Database findings
    if (analyses.database) {
      const dbFindings = this.extractDatabaseFindings(analyses.database);
      findings.push(...dbFindings);
    }

    // SSR findings
    if (analyses.ssr) {
      const ssrFindings = this.extractSSRFindings(analyses.ssr);
      findings.push(...ssrFindings);
    }

    // Client findings
    if (analyses.client) {
      const clientFindings = this.extractClientFindings(analyses.client);
      findings.push(...clientFindings);
    }

    // Sort by severity
    return findings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * اولویت‌بندی findings بر اساس impact و effort
   */
  prioritize(findings: Finding[], recommendations: Recommendation[]): PriorityItem[] {
    const items: PriorityItem[] = [];

    for (const finding of findings) {
      const recommendation = recommendations.find((r) => r.title.includes(finding.title));

      const impactScore = this.calculateImpactScore(finding);
      const effortScore = this.calculateEffortScore(finding.effort);
      const priorityScore = impactScore / effortScore;

      items.push({
        finding,
        recommendation,
        impactScore,
        effortScore,
        priorityScore,
      });
    }

    // Sort by priority score (higher is better)
    return items.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Extract findings from bundle analysis
   */
  private extractBundleFindings(bundle: BundleAnalysis): Finding[] {
    const findings: Finding[] = [];

    // Large packages
    const largePackages = bundle.bundles.filter((b) => b.size > 100 * 1024);
    for (const pkg of largePackages) {
      findings.push({
        category: 'Bundle Size',
        severity: pkg.size > 500 * 1024 ? 'critical' : 'high',
        title: `پکیج بزرگ: ${pkg.name}`,
        description: `پکیج ${pkg.name} با حجم ${this.formatSize(pkg.size)} بسیار بزرگ است.`,
        location: {
          file: pkg.name,
        },
        impact: 'افزایش زمان بارگذاری و مصرف bandwidth',
        effort: 'medium',
      });
    }

    // Duplicates
    for (const dup of bundle.duplicates) {
      findings.push({
        category: 'Bundle Optimization',
        severity: 'high',
        title: `پکیج تکراری: ${dup.name}`,
        description: `پکیج ${dup.name} در ${dup.versions.length} نسخه مختلف وجود دارد.`,
        location: {
          file: 'package.json',
        },
        impact: `${this.formatSize(dup.totalSize)} فضای اضافی`,
        effort: 'medium',
      });
    }

    return findings;
  }

  /**
   * Extract findings from database analysis
   */
  private extractDatabaseFindings(database: DatabaseAnalysis): Finding[] {
    const findings: Finding[] = [];

    // Slow queries
    if (database.slowQueries) {
      for (const query of database.slowQueries) {
        findings.push({
          category: 'Database Performance',
          severity: query.duration > 500 ? 'critical' : 'high',
          title: `کوئری کند: ${query.duration}ms`,
          description: query.query,
          location: {
            file: query.stackTrace?.[0] || 'unknown',
          },
          impact: 'افزایش زمان پاسخ‌دهی سرور',
          effort: 'medium',
        });
      }
    }

    return findings;
  }

  /**
   * Extract findings from SSR analysis
   */
  private extractSSRFindings(ssr: SSRAnalysis): Finding[] {
    const findings: Finding[] = [];

    if (ssr.slowPages) {
      for (const page of ssr.slowPages) {
        findings.push({
          category: 'SSR Performance',
          severity: page.renderTime > 1000 ? 'critical' : 'high',
          title: `صفحه کند: ${page.route}`,
          description: `زمان رندر: ${page.renderTime}ms`,
          location: {
            file: page.route,
          },
          impact: 'افزایش TTFB و تجربه کاربری ضعیف',
          effort: 'high',
        });
      }
    }

    return findings;
  }

  /**
   * Extract findings from client analysis
   */
  private extractClientFindings(client: ClientAnalysis): Finding[] {
    const findings: Finding[] = [];

    // LCP issues
    if (client.lcp > 2500) {
      findings.push({
        category: 'Core Web Vitals',
        severity: 'critical',
        title: `LCP بالا: ${client.lcp}ms`,
        description: 'Largest Contentful Paint بیش از حد مجاز است.',
        location: {
          file: client.lcpElement || 'unknown',
        },
        impact: 'تجربه کاربری ضعیف و رتبه SEO پایین',
        effort: 'medium',
      });
    }

    // CLS issues
    if (client.cls > 0.1) {
      findings.push({
        category: 'Core Web Vitals',
        severity: 'high',
        title: `CLS بالا: ${client.cls}`,
        description: 'Cumulative Layout Shift بیش از حد مجاز است.',
        location: {
          file: 'layout',
        },
        impact: 'تجربه کاربری ضعیف',
        effort: 'low',
      });
    }

    return findings;
  }

  /**
   * Generate recommendations from findings
   */
  private generateRecommendations(findings: Finding[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const finding of findings) {
      if (finding.category === 'Bundle Size') {
        recommendations.push({
          title: `بهینه‌سازی ${finding.title}`,
          description: 'استفاده از code splitting و lazy loading',
          before: `import Component from './Component';`,
          after: `const Component = dynamic(() => import('./Component'));`,
          expectedGain: 'کاهش 30-50% در First Load JS',
          effort: finding.effort,
          priority: this.calculateImpactScore(finding),
        });
      }

      if (finding.category === 'Database Performance') {
        recommendations.push({
          title: 'بهینه‌سازی کوئری دیتابیس',
          description: 'افزودن index یا استفاده از Prisma include',
          before: finding.description,
          after: '// با index یا include بهینه شود',
          expectedGain: 'کاهش 50-80% در زمان کوئری',
          effort: finding.effort,
          priority: this.calculateImpactScore(finding),
        });
      }

      if (finding.category === 'Core Web Vitals') {
        recommendations.push({
          title: `بهبود ${finding.title}`,
          description: 'بهینه‌سازی تصاویر و استفاده از next/image',
          expectedGain: 'بهبود 40-60% در Core Web Vitals',
          effort: finding.effort,
          priority: this.calculateImpactScore(finding),
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(findings: Finding[]): ReportSummary {
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;
    const mediumCount = findings.filter((f) => f.severity === 'medium').length;
    const lowCount = findings.filter((f) => f.severity === 'low').length;

    return {
      totalFindings: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      estimatedImpact: this.calculateEstimatedImpact(findings),
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate impact score
   */
  private calculateImpactScore(finding: Finding): number {
    const severityScores = { critical: 10, high: 7, medium: 4, low: 2 };
    return severityScores[finding.severity];
  }

  /**
   * Calculate effort score
   */
  private calculateEffortScore(effort: 'low' | 'medium' | 'high'): number {
    const effortScores = { low: 1, medium: 3, high: 5 };
    return effortScores[effort];
  }

  /**
   * Calculate estimated impact
   */
  private calculateEstimatedImpact(findings: Finding[]): string {
    const totalImpact = findings.reduce((sum, f) => sum + this.calculateImpactScore(f), 0);

    if (totalImpact > 50) return 'بسیار بالا';
    if (totalImpact > 30) return 'بالا';
    if (totalImpact > 15) return 'متوسط';
    return 'پایین';
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
