import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

// All Lucide icons we're using
const lucideIcons = [
  'Search', 'Eye', 'Clock', 'Calendar', 'CalendarDays', 'Hash', 'LifeBuoy', 'MessageSquare',
  'Share2', 'Heart', 'FileText', 'Edit', 'BarChart3', 'Bell', 'ShieldCheck', 'Sparkles',
  'Menu', 'Home', 'Users', 'Grid2X2', 'Megaphone', 'ClipboardList', 'DollarSign', 'Settings',
  'UserCircle', 'X', 'Check', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ChevronLeft',
  'ChevronRight', 'ChevronDown', 'ChevronUp', 'EyeOff', 'Pencil', 'Trash2', 'User', 'Folder',
  'Image', 'Video', 'Music', 'MoreHorizontal', 'MoreVertical', 'Plus', 'Minus', 'AlertTriangle',
  'Info', 'CheckCircle', 'XCircle', 'Bookmark', 'MessageCircle', 'SlidersHorizontal', 'Send',
  'MessagesSquare', 'Link', 'FolderOpen', 'PlusCircle', 'Circle', 'Github', 'GraduationCap',
  'Banknote', 'Clipboard', 'Copy', 'CreditCard', 'AlertCircle', 'Globe', 'Zap', 'Mail',
  'MinusCircle', 'Building2', 'LogOut', 'Filter', 'List', 'Phone', 'Pause', 'Play', 'Reply',
  'ShoppingCart', 'Volume2', 'VolumeX', 'Layers'
];

async function fixMissingImports() {
  console.log('🔧 Fixing missing Lucide imports...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  let totalFiles = 0;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (error) {
      continue;
    }

    // Check if file has Next.js imports that conflict
    const hasNextLink = /import\s+Link\s+from\s+['"]next\/link['"]/.test(content);
    const hasNextImage = /import\s+Image\s+from\s+['"]next\/image['"]/.test(content);
    const hasHeadlessMenu = /import\s+{\s*Menu\s*[,}]/.test(content) && content.includes('@headlessui/react');

    // Check if file uses any Lucide icons
    const usedIcons = new Set<string>();
    for (const icon of lucideIcons) {
      // Skip conflicting icons
      if (icon === 'Link' && hasNextLink) continue;
      if (icon === 'Image' && hasNextImage) continue;
      if (icon === 'Menu' && hasHeadlessMenu) continue;

      const regex = new RegExp(`<${icon}\\s`, 'g');
      if (regex.test(content)) {
        usedIcons.add(icon);
      }
    }

    if (usedIcons.size === 0) continue;

    // Check if lucide-react import exists
    const lucideImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);

    if (!lucideImportMatch) {
      // No lucide import, skip (might be a type file)
      continue;
    }

    // Get currently imported icons
    const currentImports = lucideImportMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const currentImportsSet = new Set(currentImports);

    // Find missing icons
    const missingIcons = Array.from(usedIcons).filter((icon) => !currentImportsSet.has(icon));

    if (missingIcons.length === 0) continue;

    // Add missing icons to import
    const allImports = [...currentImports, ...missingIcons].sort();
    const newImportStatement = `import { ${allImports.join(', ')} } from 'lucide-react';`;

    content = content.replace(
      /import\s+{[^}]+}\s+from\s+['"]lucide-react['"]/,
      newImportStatement
    );

    writeFileSync(file, content, 'utf-8');
    totalFiles++;
    console.log(`✅ ${file}: added ${missingIcons.join(', ')}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`\n✨ Done!`);
}

fixMissingImports().catch(console.error);
