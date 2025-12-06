import { readFileSync } from 'node:fs';
import { glob } from 'glob';

interface GradientUsage {
  pattern: string;
  count: number;
  files: string[];
}

async function analyzeGradients() {
  console.log('🔍 Analyzing gradient usage...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  const gradientMap = new Map<string, GradientUsage>();

  // Regex patterns for gradients
  const gradientPatterns = [
    /bg-gradient-to-[trblxy]+/g,
    /from-[\w-]+\/?\d*/g,
    /via-[\w-]+\/?\d*/g,
    /to-[\w-]+\/?\d*/g,
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    // Find all gradient classes
    const gradientRegex = /className="[^"]*bg-gradient-to-[^"]*"/g;
    const matches = content.match(gradientRegex);

    if (matches) {
      for (const match of matches) {
        // Extract the full gradient pattern
        const classes = match.match(/bg-gradient-to-[\w-]+(?:\s+from-[\w-/]+)?(?:\s+via-[\w-/]+)?(?:\s+to-[\w-/]+)?/g);
        
        if (classes) {
          for (const pattern of classes) {
            const existing = gradientMap.get(pattern);
            if (existing) {
              existing.count++;
              if (!existing.files.includes(file)) {
                existing.files.push(file);
              }
            } else {
              gradientMap.set(pattern, {
                pattern,
                count: 1,
                files: [file],
              });
            }
          }
        }
      }
    }
  }

  // Sort by usage count
  const sortedGradients = Array.from(gradientMap.values()).sort((a, b) => b.count - a.count);

  console.log('📊 Gradient Usage Statistics:\n');
  console.log(`Total unique gradients: ${sortedGradients.length}`);
  console.log(`Total files with gradients: ${new Set(sortedGradients.flatMap(g => g.files)).size}\n`);

  console.log('Top 20 Most Used Gradients:\n');
  sortedGradients.slice(0, 20).forEach((gradient, index) => {
    console.log(`${index + 1}. ${gradient.pattern}`);
    console.log(`   Used ${gradient.count} times in ${gradient.files.length} files`);
    console.log('');
  });

  // Suggest custom classes for frequently used gradients
  console.log('\n💡 Suggested Custom Classes (used 3+ times):\n');
  const frequentGradients = sortedGradients.filter(g => g.count >= 3);
  
  frequentGradients.forEach((gradient, index) => {
    const className = `gradient-${index + 1}`;
    console.log(`/* ${gradient.pattern} - used ${gradient.count} times */`);
    console.log(`.${className} {`);
    
    // Parse gradient direction
    const direction = gradient.pattern.match(/bg-gradient-to-([trblxy]+)/)?.[1];
    const from = gradient.pattern.match(/from-([\w-/]+)/)?.[1];
    const via = gradient.pattern.match(/via-([\w-/]+)/)?.[1];
    const to = gradient.pattern.match(/to-([\w-/]+)/)?.[1];
    
    console.log(`  /* Replace: ${gradient.pattern} */`);
    console.log(`  /* With: ${className} */`);
    console.log('}\n');
  });

  console.log(`\n✨ Total potential savings: ~${Math.round(sortedGradients.length * 0.5)} KB`);
}

analyzeGradients().catch(console.error);
