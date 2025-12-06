import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageSize {
  name: string;
  size: number;
  sizeFormatted: string;
}

async function analyzeDependencies() {
  console.log('📦 Analyzing dependencies...\n');

  try {
    // Read package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    console.log(`Total packages: ${Object.keys(dependencies).length}\n`);

    // Get sizes using du command (works on Unix-like systems)
    const packages: PackageSize[] = [];

    for (const [name] of Object.entries(dependencies)) {
      try {
        const path = join('node_modules', name);
        // Use PowerShell command for Windows
        const sizeOutput = execSync(
          `powershell -Command "(Get-ChildItem -Path '${path}' -Recurse -File | Measure-Object -Property Length -Sum).Sum"`,
          { encoding: 'utf-8' },
        ).trim();

        const size = Number.parseInt(sizeOutput, 10);
        if (!Number.isNaN(size) && size > 0) {
          packages.push({
            name,
            size,
            sizeFormatted: formatBytes(size),
          });
        }
      } catch (error) {
        // Package might not be installed or accessible
        continue;
      }
    }

    // Sort by size
    packages.sort((a, b) => b.size - a.size);

    // Display top 30
    console.log('📊 Top 30 Largest Packages:\n');
    packages.slice(0, 30).forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name.padEnd(40)} ${pkg.sizeFormatted}`);
    });

    // Category analysis
    console.log('\n\n📈 Category Analysis:\n');

    const categories = {
      ui: ['@radix-ui', '@headlessui', 'framer-motion', 'lucide-react'],
      editor: ['@tiptap', 'lowlight', 'katex'],
      charts: ['recharts'],
      forms: ['react-hook-form', 'zod', '@hookform'],
      database: ['@prisma', 'prisma'],
      auth: ['next-auth', '@auth'],
      aws: ['@aws-sdk'],
      build: ['next', 'react', 'react-dom', 'typescript', '@types'],
      styling: ['tailwindcss', '@tailwindcss', 'postcss', 'sass'],
      other: [],
    };

    const categoryTotals: Record<string, number> = {};

    for (const pkg of packages) {
      let categorized = false;
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some((keyword) => pkg.name.includes(keyword))) {
          categoryTotals[category] = (categoryTotals[category] || 0) + pkg.size;
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        categoryTotals.other = (categoryTotals.other || 0) + pkg.size;
      }
    }

    Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, size]) => {
        console.log(`${category.padEnd(15)} ${formatBytes(size)}`);
      });

    // Recommendations
    console.log('\n\n💡 Recommendations:\n');

    const largePackages = packages.filter((p) => p.size > 5 * 1024 * 1024); // > 5MB
    if (largePackages.length > 0) {
      console.log('🔴 Large packages (> 5MB):');
      largePackages.forEach((pkg) => {
        console.log(`   - ${pkg.name} (${pkg.sizeFormatted})`);
        
        // Specific recommendations
        if (pkg.name.includes('@aws-sdk')) {
          console.log('     → Consider using only specific AWS SDK clients instead of full SDK');
        } else if (pkg.name.includes('prisma')) {
          console.log('     → Prisma size is normal for ORM with full features');
        } else if (pkg.name.includes('@tiptap')) {
          console.log('     → Consider lazy loading TipTap extensions');
        }
      });
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

analyzeDependencies().catch(console.error);
