/**
 * Font Optimizer
 * بهینه‌سازی بارگذاری فونت‌ها
 */

'use client';

export interface FontInfo {
  family: string;
  source: string;
  isNextFont: boolean;
  loadTime: number;
  isBlocking: boolean;
  hasSwap: boolean;
  weights: string[];
}

export interface FontAnalysis {
  fonts: FontInfo[];
  blockingFonts: FontInfo[];
  unusedWeights: string[];
  clsImpact: number;
  recommendations: FontRecommendation[];
}

export interface FontRecommendation {
  font: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export class FontOptimizer {
  /**
   * تحلیل فونت‌ها
   */
  async analyzeFonts(): Promise<FontAnalysis> {
    if (typeof window === 'undefined') {
      throw new Error('FontOptimizer can only be used in browser');
    }

    const fonts = await this.detectFonts();
    const blockingFonts = fonts.filter((f) => f.isBlocking);
    const unusedWeights = this.detectUnusedWeights(fonts);
    const clsImpact = this.measureCLSImpact();
    const recommendations = this.generateRecommendations(fonts);

    return {
      fonts,
      blockingFonts,
      unusedWeights,
      clsImpact,
      recommendations,
    };
  }

  /**
   * شناسایی فونت‌ها
   */
  private async detectFonts(): Promise<FontInfo[]> {
    const fonts: FontInfo[] = [];

    // Check for font face declarations
    const styleSheets = Array.from(document.styleSheets);

    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);

        for (const rule of rules) {
          if (rule instanceof CSSFontFaceRule) {
            const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '');
            const src = rule.style.getPropertyValue('src');
            const display = rule.style.getPropertyValue('font-display');

            fonts.push({
              family,
              source: src,
              isNextFont: src.includes('/_next/static/media/'),
              loadTime: 0,
              isBlocking: display !== 'swap' && display !== 'optional',
              hasSwap: display === 'swap',
              weights: [],
            });
          }
        }
      } catch (_e) {
        // CORS or other errors
      }
    }

    return fonts;
  }

  /**
   * شناسایی weightهای استفاده نشده
   */
  private detectUnusedWeights(_fonts: FontInfo[]): string[] {
    // این نیاز به تحلیل استاتیک CSS دارد
    // برای الان یک لیست خالی برمی‌گردانیم
    return [];
  }

  /**
   * اندازه‌گیری تأثیر CLS
   */
  private measureCLSImpact(): number {
    // این نیاز به PerformanceObserver برای layout-shift دارد
    return 0;
  }

  /**
   * تولید پیشنهادات
   */
  private generateRecommendations(fonts: FontInfo[]): FontRecommendation[] {
    const recommendations: FontRecommendation[] = [];

    // Check for Google Fonts not using next/font
    for (const font of fonts) {
      if (font.source.includes('fonts.googleapis.com') && !font.isNextFont) {
        recommendations.push({
          font: font.family,
          issue: 'استفاده از Google Fonts بدون next/font',
          suggestion: 'استفاده از next/font/google برای بهینه‌سازی خودکار',
          priority: 'high',
        });
      }

      // Check for blocking fonts
      if (font.isBlocking) {
        recommendations.push({
          font: font.family,
          issue: 'فونت render را block می‌کند',
          suggestion: 'اضافه کردن font-display: swap',
          priority: 'high',
        });
      }

      // Check for missing swap
      if (!font.hasSwap && !font.isNextFont) {
        recommendations.push({
          font: font.family,
          issue: 'فاقد font-display: swap',
          suggestion: 'اضافه کردن font-display: swap برای جلوگیری از FOIT',
          priority: 'medium',
        });
      }
    }

    return recommendations;
  }

  /**
   * تولید گزارش
   */
  generateReport(analysis: FontAnalysis): string {
    const { fonts, blockingFonts, unusedWeights, clsImpact, recommendations } = analysis;

    let report = '# گزارش تحلیل فونت‌ها\n\n';
    report += '## خلاصه\n';
    report += `- کل فونت‌ها: ${fonts.length}\n`;
    report += `- فونت‌های blocking: ${blockingFonts.length}\n`;
    report += `- Weightهای استفاده نشده: ${unusedWeights.length}\n`;
    report += `- تأثیر CLS: ${clsImpact.toFixed(3)}\n\n`;

    if (blockingFonts.length > 0) {
      report += '## فونت‌های Blocking\n';
      for (const font of blockingFonts) {
        report += `- ${font.family}\n`;
      }
      report += '\n';
    }

    if (recommendations.length > 0) {
      report += '## پیشنهادات\n';
      for (const rec of recommendations) {
        report += `### ${rec.font} (${rec.priority})\n`;
        report += `- مشکل: ${rec.issue}\n`;
        report += `- پیشنهاد: ${rec.suggestion}\n\n`;
      }
    }

    return report;
  }
}

export const fontOptimizer = new FontOptimizer();
