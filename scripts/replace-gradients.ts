import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

// Map of Tailwind gradient patterns to custom class names
const gradientReplacements: Record<string, string> = {
  // Primary gradients
  'bg-gradient-to-br from-blue-500 to-indigo-600': 'gradient-primary-br',
  'bg-gradient-to-r from-primary-500 to-primary-600': 'gradient-primary-r',
  'bg-gradient-to-br from-primary-400 to-primary-600': 'gradient-primary-br',
  'bg-gradient-to-br from-primary-500 to-primary-600': 'gradient-primary-br',
  
  // Success gradients
  'bg-gradient-to-br from-emerald-500 to-teal-600': 'gradient-success-br',
  'bg-gradient-to-r from-emerald-500 to-teal-500': 'gradient-success-br',
  
  // Warning gradients
  'bg-gradient-to-br from-amber-500 to-orange-600': 'gradient-warning-br',
  
  // Neutral gradients
  'bg-gradient-to-br from-neutral-50 to-neutral-100': 'gradient-neutral-br',
  'bg-gradient-to-br from-slate-100 to-slate-200': 'gradient-neutral-br',
  'bg-gradient-to-br from-slate-50 to-white': 'gradient-neutral-br',
  'bg-gradient-to-l from-neutral-50 to-white': 'gradient-neutral-l',
  'bg-gradient-to-l from-slate-50 to-white': 'gradient-neutral-l',
  
  // Overlay gradients
  'bg-gradient-to-t from-black/90 via-black/50 to-transparent': 'gradient-overlay-t',
  'bg-gradient-to-t from-black/80 via-black/40 to-transparent': 'gradient-overlay-t',
};

async function replaceGradients() {
  console.log('🔄 Replacing gradient utilities with custom classes...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  let totalFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (error) {
      continue;
    }

    let fileChanged = false;
    let fileReplacements = 0;

    // Replace each gradient pattern
    for (const [oldPattern, newClass] of Object.entries(gradientReplacements)) {
      const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, newClass);
        fileChanged = true;
        fileReplacements += matches.length;
      }
    }

    if (fileChanged) {
      writeFileSync(file, content, 'utf-8');
      totalFiles++;
      totalReplacements += fileReplacements;
      console.log(`✅ ${file}: ${fileReplacements} replacements`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log(`\n✨ Done! Estimated CSS savings: ~${Math.round(totalReplacements * 0.3)} KB`);
}

replaceGradients().catch(console.error);
