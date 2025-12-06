/**
 * Image Analyzer
 * تحلیل و بهینه‌سازی تصاویر
 */

export interface ImageIssue {
  src: string;
  currentSize: number;
  optimalSize: number;
  wastedBytes: number;
  recommendations: string[];
  element?: string;
}

export interface FormatIssue {
  src: string;
  currentFormat: string;
  suggestedFormat: string;
  estimatedSaving: number;
}

export interface SizingIssue {
  src: string;
  displaySize: { width: number; height: number };
  actualSize: { width: number; height: number };
  wastedBytes: number;
}

export interface ImageAnalysis {
  unoptimizedImages: ImageIssue[];
  formatIssues: FormatIssue[];
  sizingIssues: SizingIssue[];
  lazyLoadingMissing: string[];
  totalWastedBytes: number;
  summary: {
    totalImages: number;
    optimizedImages: number;
    issuesFound: number;
  };
}

export class ImageAnalyzer {
  /**
   * اسکن تمام تصاویر در صفحه
   */
  async scanImages(): Promise<ImageAnalysis> {
    if (typeof window === 'undefined') {
      throw new Error('ImageAnalyzer can only be used in browser environment');
    }

    const images = Array.from(document.querySelectorAll('img'));
    const unoptimizedImages: ImageIssue[] = [];
    const formatIssues: FormatIssue[] = [];
    const sizingIssues: SizingIssue[] = [];
    const lazyLoadingMissing: string[] = [];

    for (const img of images) {
      // Check Next.js Image usage
      const isNextImage = img.getAttribute('data-nimg') !== null;

      if (!isNextImage) {
        const issue = await this.analyzeImage(img);
        if (issue) {
          unoptimizedImages.push(issue);
        }
      }

      // Check format
      const formatIssue = this.checkFormat(img);
      if (formatIssue) {
        formatIssues.push(formatIssue);
      }

      // Check sizing
      const sizingIssue = this.checkSizing(img);
      if (sizingIssue) {
        sizingIssues.push(sizingIssue);
      }

      // Check lazy loading
      if (!this.hasLazyLoading(img)) {
        lazyLoadingMissing.push(img.src);
      }
    }

    const totalWastedBytes = [...unoptimizedImages, ...sizingIssues].reduce(
      (sum, issue) => sum + issue.wastedBytes,
      0,
    );

    return {
      unoptimizedImages,
      formatIssues,
      sizingIssues,
      lazyLoadingMissing,
      totalWastedBytes,
      summary: {
        totalImages: images.length,
        optimizedImages: images.length - unoptimizedImages.length,
        issuesFound: unoptimizedImages.length + formatIssues.length + sizingIssues.length,
      },
    };
  }

  /**
   * بررسی استفاده از Next.js Image component
   */
  checkNextImageUsage(): ImageIssue[] {
    if (typeof window === 'undefined') return [];

    const regularImages = Array.from(document.querySelectorAll('img:not([data-nimg])'));
    const issues: ImageIssue[] = [];

    for (const img of regularImages) {
      issues.push({
        src: img.src,
        currentSize: 0, // نیاز به fetch برای دریافت سایز واقعی
        optimalSize: 0,
        wastedBytes: 0,
        recommendations: [
          'استفاده از next/image component',
          'بهینه‌سازی خودکار فرمت و سایز',
          'lazy loading خودکار',
        ],
        element: img.outerHTML.substring(0, 100),
      });
    }

    return issues;
  }

  /**
   * بررسی فرمت تصاویر
   */
  verifyFormats(): FormatIssue[] {
    if (typeof window === 'undefined') return [];

    const images = Array.from(document.querySelectorAll('img'));
    const issues: FormatIssue[] = [];

    for (const img of images) {
      const format = this.getImageFormat(img.src);

      if (format === 'jpg' || format === 'png') {
        issues.push({
          src: img.src,
          currentFormat: format,
          suggestedFormat: 'WebP/AVIF',
          estimatedSaving: format === 'png' ? 70 : 30, // درصد
        });
      }
    }

    return issues;
  }

  /**
   * بررسی lazy loading
   */
  checkLazyLoading(): string[] {
    if (typeof window === 'undefined') return [];

    const images = Array.from(document.querySelectorAll('img'));
    const missing: string[] = [];

    for (const img of images) {
      if (!this.hasLazyLoading(img)) {
        // Check if image is above the fold
        const rect = img.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          missing.push(img.src);
        }
      }
    }

    return missing;
  }

  /**
   * محاسبه wasted bytes
   */
  calculateWastedBytes(): number {
    if (typeof window === 'undefined') return 0;

    const images = Array.from(document.querySelectorAll('img'));
    let totalWasted = 0;

    for (const img of images) {
      const sizingIssue = this.checkSizing(img);
      if (sizingIssue) {
        totalWasted += sizingIssue.wastedBytes;
      }
    }

    return totalWasted;
  }

  /**
   * تحلیل یک تصویر
   */
  private async analyzeImage(img: HTMLImageElement): Promise<ImageIssue | null> {
    const recommendations: string[] = [];

    // Check dimensions
    if (!img.width || !img.height) {
      recommendations.push('اضافه کردن width و height برای جلوگیری از CLS');
    }

    // Check format
    const format = this.getImageFormat(img.src);
    if (format === 'jpg' || format === 'png') {
      recommendations.push(`تبدیل به WebP یا AVIF (صرفه‌جویی ~${format === 'png' ? 70 : 30}%)`);
    }

    // Check lazy loading
    if (!this.hasLazyLoading(img)) {
      recommendations.push('اضافه کردن loading="lazy"');
    }

    if (recommendations.length === 0) return null;

    return {
      src: img.src,
      currentSize: 0,
      optimalSize: 0,
      wastedBytes: 0,
      recommendations,
      element: img.outerHTML.substring(0, 100),
    };
  }

  /**
   * بررسی فرمت تصویر
   */
  private checkFormat(img: HTMLImageElement): FormatIssue | null {
    const format = this.getImageFormat(img.src);

    if (format === 'jpg' || format === 'png') {
      return {
        src: img.src,
        currentFormat: format,
        suggestedFormat: 'WebP/AVIF',
        estimatedSaving: format === 'png' ? 70 : 30,
      };
    }

    return null;
  }

  /**
   * بررسی سایز تصویر
   */
  private checkSizing(img: HTMLImageElement): SizingIssue | null {
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const actualWidth = img.naturalWidth;
    const actualHeight = img.naturalHeight;

    if (actualWidth > displayWidth * 2 || actualHeight > displayHeight * 2) {
      // Image is more than 2x larger than display size
      const wastedPixels = actualWidth * actualHeight - displayWidth * displayHeight;
      const wastedBytes = wastedPixels * 3; // Rough estimate (3 bytes per pixel)

      return {
        src: img.src,
        displaySize: { width: displayWidth, height: displayHeight },
        actualSize: { width: actualWidth, height: actualHeight },
        wastedBytes,
      };
    }

    return null;
  }

  /**
   * بررسی lazy loading
   */
  private hasLazyLoading(img: HTMLImageElement): boolean {
    return (
      img.loading === 'lazy' ||
      img.getAttribute('data-nimg') !== null || // Next.js Image
      img.classList.contains('lazyload') ||
      img.classList.contains('lazy')
    );
  }

  /**
   * دریافت فرمت تصویر از URL
   */
  private getImageFormat(src: string): string {
    const extension = src.split('.').pop()?.toLowerCase().split('?')[0];
    return extension || 'unknown';
  }

  /**
   * تولید گزارش جامع
   */
  generateReport(analysis: ImageAnalysis): string {
    const { summary, unoptimizedImages, formatIssues, sizingIssues, lazyLoadingMissing, totalWastedBytes } =
      analysis;

    let report = `# گزارش تحلیل تصاویر\n\n`;
    report += `## خلاصه\n`;
    report += `- کل تصاویر: ${summary.totalImages}\n`;
    report += `- تصاویر بهینه: ${summary.optimizedImages}\n`;
    report += `- مشکلات یافت شده: ${summary.issuesFound}\n`;
    report += `- فضای هدر رفته: ${this.formatBytes(totalWastedBytes)}\n\n`;

    if (unoptimizedImages.length > 0) {
      report += `## تصاویر بدون next/image (${unoptimizedImages.length})\n`;
      for (const issue of unoptimizedImages.slice(0, 5)) {
        report += `- ${issue.src}\n`;
        for (const rec of issue.recommendations) {
          report += `  - ${rec}\n`;
        }
      }
      report += `\n`;
    }

    if (formatIssues.length > 0) {
      report += `## مشکلات فرمت (${formatIssues.length})\n`;
      for (const issue of formatIssues.slice(0, 5)) {
        report += `- ${issue.src}: ${issue.currentFormat} → ${issue.suggestedFormat} (صرفه‌جویی ~${issue.estimatedSaving}%)\n`;
      }
      report += `\n`;
    }

    if (sizingIssues.length > 0) {
      report += `## مشکلات سایز (${sizingIssues.length})\n`;
      for (const issue of sizingIssues.slice(0, 5)) {
        report += `- ${issue.src}: ${issue.actualSize.width}x${issue.actualSize.height} → ${issue.displaySize.width}x${issue.displaySize.height}\n`;
        report += `  هدر رفته: ${this.formatBytes(issue.wastedBytes)}\n`;
      }
      report += `\n`;
    }

    if (lazyLoadingMissing.length > 0) {
      report += `## تصاویر بدون lazy loading (${lazyLoadingMissing.length})\n`;
      for (const src of lazyLoadingMissing.slice(0, 5)) {
        report += `- ${src}\n`;
      }
    }

    return report;
  }

  /**
   * فرمت کردن bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Singleton instance
export const imageAnalyzer = new ImageAnalyzer();
