/**
 * Third-Party Script Analyzer
 * تحلیل اسکریپت‌های شخص ثالث
 */

'use client';

export interface ScriptInfo {
  src: string;
  loadTime: number;
  executionTime: number;
  isBlocking: boolean;
  isAsync: boolean;
  isDefer: boolean;
  size: number;
  tbtImpact: number;
}

export interface ScriptAnalysis {
  scripts: ScriptInfo[];
  blockingScripts: ScriptInfo[];
  analyticsScripts: ScriptInfo[];
  totalTBT: number;
  recommendations: ScriptRecommendation[];
}

export interface ScriptRecommendation {
  script: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export class ScriptAnalyzer {
  private scripts: ScriptInfo[] = [];
  private tbtMeasurements: Map<string, number> = new Map();

  /**
   * شناسایی و اندازه‌گیری تمام اسکریپت‌ها
   */
  async analyzeScripts(): Promise<ScriptAnalysis> {
    if (typeof window === 'undefined') {
      throw new Error('ScriptAnalyzer can only be used in browser');
    }

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const scriptInfos: ScriptInfo[] = [];

    for (const script of scripts) {
      const info = await this.analyzeScript(script as HTMLScriptElement);
      if (info) {
        scriptInfos.push(info);
      }
    }

    this.scripts = scriptInfos;

    const blockingScripts = scriptInfos.filter((s) => s.isBlocking);
    const analyticsScripts = this.identifyAnalyticsScripts(scriptInfos);
    const totalTBT = scriptInfos.reduce((sum, s) => sum + s.tbtImpact, 0);
    const recommendations = this.generateRecommendations(scriptInfos);

    return {
      scripts: scriptInfos,
      blockingScripts,
      analyticsScripts,
      totalTBT,
      recommendations,
    };
  }

  /**
   * اندازه‌گیری TBT impact
   */
  measureTBTImpact(scriptSrc: string, duration: number): void {
    this.tbtMeasurements.set(scriptSrc, duration);
  }

  /**
   * تحلیل یک اسکریپت
   */
  private async analyzeScript(script: HTMLScriptElement): Promise<ScriptInfo | null> {
    const src = script.src;
    if (!src || src.startsWith('data:')) return null;

    // Check if it's a third-party script
    const isThirdParty = !src.includes(window.location.hostname);
    if (!isThirdParty) return null;

    // Get performance entry
    const entries = performance.getEntriesByName(src) as PerformanceResourceTiming[];
    const entry = entries[entries.length - 1];

    if (!entry) return null;

    const loadTime = entry.responseEnd - entry.startTime;
    const executionTime = entry.duration;
    const isBlocking = !script.async && !script.defer;
    const size = entry.transferSize || 0;
    const tbtImpact = this.tbtMeasurements.get(src) || 0;

    return {
      src,
      loadTime,
      executionTime,
      isBlocking,
      isAsync: script.async,
      isDefer: script.defer,
      size,
      tbtImpact,
    };
  }

  /**
   * شناسایی اسکریپت‌های analytics
   */
  private identifyAnalyticsScripts(scripts: ScriptInfo[]): ScriptInfo[] {
    const analyticsPatterns = [
      'google-analytics',
      'gtag',
      'analytics',
      'mixpanel',
      'segment',
      'hotjar',
      'clarity',
      'facebook.net',
      'doubleclick',
    ];

    return scripts.filter((script) =>
      analyticsPatterns.some((pattern) => script.src.toLowerCase().includes(pattern)),
    );
  }

  /**
   * تولید پیشنهادات
   */
  private generateRecommendations(scripts: ScriptInfo[]): ScriptRecommendation[] {
    const recommendations: ScriptRecommendation[] = [];

    // Check for blocking scripts
    for (const script of scripts) {
      if (script.isBlocking) {
        recommendations.push({
          script: script.src,
          issue: 'اسکریپت render را block می‌کند',
          suggestion: 'اضافه کردن async یا defer attribute',
          priority: 'high',
        });
      }

      // Check for large scripts
      if (script.size > 100 * 1024) {
        recommendations.push({
          script: script.src,
          issue: `حجم بزرگ (${this.formatBytes(script.size)})`,
          suggestion: 'بررسی امکان حذف یا جایگزینی با راه‌حل سبک‌تر',
          priority: 'medium',
        });
      }

      // Check for high TBT impact
      if (script.tbtImpact > 100) {
        recommendations.push({
          script: script.src,
          issue: `تأثیر بالا بر TBT (${script.tbtImpact.toFixed(0)}ms)`,
          suggestion: 'بررسی امکان lazy loading یا code splitting',
          priority: 'high',
        });
      }
    }

    // Check for multiple analytics
    const analyticsScripts = this.identifyAnalyticsScripts(scripts);
    if (analyticsScripts.length > 2) {
      recommendations.push({
        script: 'Multiple Analytics',
        issue: `${analyticsScripts.length} اسکریپت analytics مختلف`,
        suggestion: 'ادغام یا حذف analytics غیرضروری',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * تولید گزارش
   */
  generateReport(analysis: ScriptAnalysis): string {
    const { scripts, blockingScripts, analyticsScripts, totalTBT, recommendations } = analysis;

    let report = '# گزارش تحلیل اسکریپت‌های Third-Party\n\n';
    report += '## خلاصه\n';
    report += `- کل اسکریپت‌ها: ${scripts.length}\n`;
    report += `- اسکریپت‌های blocking: ${blockingScripts.length}\n`;
    report += `- اسکریپت‌های analytics: ${analyticsScripts.length}\n`;
    report += `- کل TBT Impact: ${totalTBT.toFixed(0)}ms\n\n`;

    if (blockingScripts.length > 0) {
      report += `## اسکریپت‌های Blocking (${blockingScripts.length})\n`;
      for (const script of blockingScripts) {
        report += `- ${script.src}\n`;
        report += `  Load: ${script.loadTime.toFixed(0)}ms | Size: ${this.formatBytes(script.size)}\n`;
      }
      report += '\n';
    }

    if (recommendations.length > 0) {
      report += `## پیشنهادات (${recommendations.length})\n`;
      for (const rec of recommendations) {
        report += `### ${rec.script} (${rec.priority})\n`;
        report += `- مشکل: ${rec.issue}\n`;
        report += `- پیشنهاد: ${rec.suggestion}\n\n`;
      }
    }

    return report;
  }

  /**
   * فرمت bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export const scriptAnalyzer = new ScriptAnalyzer();
