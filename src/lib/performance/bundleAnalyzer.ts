/**
 * Bundle Analyzer
 * تحلیل حجم و ترکیب JavaScript bundles
 */

export interface BundleInfo {
  name: string;
  size: number;
  gzipSize: number;
  dependencies: string[];
  route?: string;
}

export interface DuplicatePackage {
  name: string;
  versions: string[];
  locations: string[];
  totalSize: number;
}

export interface Recommendation {
  type: 'code-splitting' | 'lazy-loading' | 'vendor-split' | 'duplicate-removal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  example?: string;
}

export interface BundleAnalysis {
  totalSize: number;
  bundles: BundleInfo[];
  duplicates: DuplicatePackage[];
  recommendations: Recommendation[];
  analyzedAt: Date;
}

export class BundleAnalyzer {
  private statsData: any = null;

  /**
   * تحلیل webpack stats و تولید گزارش جامع
   */
  async analyze(statsPath?: string): Promise<BundleAnalysis> {
    // Load stats from .next/analyze or provided path
    const stats = await this.loadStats();
    this.statsData = stats;

    const bundles = this.extractBundles(stats);
    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
    const duplicates = this.findDuplicates();
    const recommendations = this.generateRecommendations(bundles, duplicates);

    return {
      totalSize,
      bundles,
      duplicates,
      recommendations,
      analyzedAt: new Date(),
    };
  }

  /**
   * شناسایی پکیج‌های بزرگتر از threshold
   */
  identifyLargePackages(threshold: number = 100 * 1024): BundleInfo[] {
    if (!this.statsData) {
      throw new Error('No stats data available. Run analyze() first.');
    }

    const bundles = this.extractBundles(this.statsData);
    return bundles.filter((bundle) => bundle.size > threshold);
  }

  /**
   * پیدا کردن dependency های تکراری
   */
  findDuplicates(): DuplicatePackage[] {
    if (!this.statsData) {
      throw new Error('No stats data available. Run analyze() first.');
    }

    const packageMap = new Map<string, Set<string>>();
    const locationMap = new Map<string, string[]>();
    const sizeMap = new Map<string, number>();

    // Parse modules to find duplicates
    if (this.statsData.modules) {
      for (const module of this.statsData.modules) {
        const match = (module as any).name?.match(/node_modules\/([^/]+)/);
        if (match) {
          const pkgName = match[1];
          const version = this.extractVersion((module as any).name);

          if (!packageMap.has(pkgName)) {
            packageMap.set(pkgName, new Set());
            locationMap.set(pkgName, []);
            sizeMap.set(pkgName, 0);
          }

          if (version) {
            packageMap.get(pkgName)?.add(version);
          }
          locationMap.get(pkgName)?.push((module as any).name);
          sizeMap.set(pkgName, sizeMap.get(pkgName)! + ((module as any).size || 0));
        }
      }
    }

    // Filter to only duplicates (multiple versions)
    const duplicates: DuplicatePackage[] = [];
    for (const [name, versions] of packageMap.entries()) {
      if (versions.size > 1) {
        duplicates.push({
          name,
          versions: Array.from(versions),
          locations: locationMap.get(name) || [],
          totalSize: sizeMap.get(name) || 0,
        });
      }
    }

    return duplicates;
  }

  /**
   * پیشنهاد استراتژی‌های code splitting
   */
  suggestCodeSplitting(): Recommendation[] {
    if (!this.statsData) {
      throw new Error('No stats data available. Run analyze() first.');
    }

    const recommendations: Recommendation[] = [];
    const bundles = this.extractBundles(this.statsData);

    // Check for large vendor bundles
    const vendorBundles = bundles.filter((b) => b.name.includes('vendor'));
    for (const bundle of vendorBundles) {
      if (bundle.size > 500 * 1024) {
        recommendations.push({
          type: 'vendor-split',
          severity: 'high',
          title: 'Vendor bundle بیش از 500KB است',
          description: `Bundle ${bundle.name} با حجم ${this.formatSize(bundle.size)} بسیار بزرگ است.`,
          impact: 'کاهش زمان بارگذاری اولیه و بهبود caching',
          effort: 'medium',
          example: `
// در next.config.ts:
webpack: (config) => {
  config.optimization.splitChunks = {
    cacheGroups: {
      react: {
        test: /[\\\\/]node_modules[\\\\/](react|react-dom)[\\\\/]/,
        name: 'react-vendor',
        chunks: 'all',
      },
      // سایر vendor packages
    }
  };
}`,
        });
      }
    }

    // Check for opportunities to lazy load
    const largeBundles = bundles.filter((b) => b.size > 200 * 1024 && !b.name.includes('vendor'));
    for (const bundle of largeBundles) {
      recommendations.push({
        type: 'lazy-loading',
        severity: 'medium',
        title: `فرصت lazy loading در ${bundle.name}`,
        description: `Bundle ${bundle.name} با حجم ${this.formatSize(bundle.size)} می‌تواند به صورت lazy load شود.`,
        impact: 'کاهش bundle اولیه و بهبود First Load JS',
        effort: 'low',
        example: `
// استفاده از dynamic import:
const Component = dynamic(() => import('./Component'), {
  loading: () => <p>Loading...</p>
});`,
      });
    }

    return recommendations;
  }

  /**
   * Load webpack stats from file
   */
  private async loadStats(_statsPath?: string): Promise<any> {
    // در محیط واقعی، این از فایل stats.json خوانده می‌شود
    // برای الان، یک mock data برمی‌گردانیم
    return {
      assets: [],
      modules: [],
      chunks: [],
    };
  }

  /**
   * Extract bundle information from stats
   */
  private extractBundles(stats: any): BundleInfo[] {
    const bundles: BundleInfo[] = [];

    if (stats.assets) {
      for (const asset of stats.assets) {
        if (asset.name.endsWith('.js')) {
          bundles.push({
            name: asset.name,
            size: asset.size || 0,
            gzipSize: Math.floor((asset.size || 0) * 0.3), // تخمین gzip
            dependencies: [],
          });
        }
      }
    }

    return bundles;
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(
    _bundles: BundleInfo[],
    duplicates: DuplicatePackage[],
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Add code splitting recommendations
    recommendations.push(...this.suggestCodeSplitting());

    // Add duplicate removal recommendations
    for (const dup of duplicates) {
      recommendations.push({
        type: 'duplicate-removal',
        severity: 'high',
        title: `پکیج ${dup.name} تکراری است`,
        description: `پکیج ${dup.name} در ${dup.versions.length} نسخه مختلف وجود دارد: ${dup.versions.join(', ')}`,
        impact: `کاهش ${this.formatSize(dup.totalSize)} از حجم bundle`,
        effort: 'medium',
        example: `
// در package.json از resolutions استفاده کنید:
"resolutions": {
  "${dup.name}": "${dup.versions[0]}"
}`,
      });
    }

    return recommendations;
  }

  /**
   * Extract version from module path
   */
  private extractVersion(modulePath: string): string | null {
    const match = modulePath.match(/node_modules\/[^/]+@([^/]+)/);
    return match ? match[1] : null;
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
