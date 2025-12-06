import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

// Mapping از React Icons به Lucide React
const iconMapping: Record<string, string> = {
  // HeroIcons 2 (hi2) -> Lucide
  HiArrowRight: 'ArrowRight',
  HiArrowLeft: 'ArrowLeft',
  HiArrowDown: 'ArrowDown',
  HiArrowUp: 'ArrowUp',
  HiCheck: 'Check',
  HiChevronLeft: 'ChevronLeft',
  HiChevronRight: 'ChevronRight',
  HiChevronDown: 'ChevronDown',
  HiChevronUp: 'ChevronUp',
  HiCalendar: 'Calendar',
  HiCalendarDays: 'CalendarDays',
  HiClock: 'Clock',
  HiEye: 'Eye',
  HiEyeSlash: 'EyeOff',
  HiHeart: 'Heart',
  HiLink: 'Link',
  HiMagnifyingGlass: 'Search',
  HiPencil: 'Pencil',
  HiPencilSquare: 'Edit',
  HiTrash: 'Trash2',
  HiUser: 'User',
  HiUsers: 'Users',
  HiFolder: 'Folder',
  HiDocument: 'FileText',
  HiDocumentText: 'FileText',
  HiPhoto: 'Image',
  HiVideoCamera: 'Video',
  HiMusicalNote: 'Music',
  HiHashtag: 'Hash',
  HiEllipsisHorizontal: 'MoreHorizontal',
  HiEllipsisVertical: 'MoreVertical',
  HiBars3: 'Menu',
  HiXMark: 'X',
  HiPlus: 'Plus',
  HiMinus: 'Minus',
  HiExclamationTriangle: 'AlertTriangle',
  HiInformationCircle: 'Info',
  HiCheckCircle: 'CheckCircle',
  HiXCircle: 'XCircle',
  HiShare: 'Share2',
  HiBookmark: 'Bookmark',
  HiChatBubbleLeft: 'MessageCircle',
  HiChatBubbleLeftEllipsis: 'MessageSquare',
  HiSparkles: 'Sparkles',
  HiShieldCheck: 'ShieldCheck',
  HiAdjustmentsHorizontal: 'SlidersHorizontal',
  HiOutlineCalendarDays: 'CalendarDays',
  HiOutlineEye: 'Eye',
  HiOutlineHeart: 'Heart',
  HiOutlineClock: 'Clock',
  HiOutlineCalendar: 'Calendar',
  HiOutlineChartBar: 'BarChart3',
  HiOutlineDocumentText: 'FileText',
  HiOutlinePencilSquare: 'Edit',
  HiOutlineShare: 'Share2',
  HiOutlineChatBubbleLeftEllipsis: 'MessageSquare',
  HiOutlineMagnifyingGlass: 'Search',
  HiOutlineBell: 'Bell',
  HiOutlineBars3: 'Menu',
  HiOutlineShieldCheck: 'ShieldCheck',
  HiOutlineSparkles: 'Sparkles',
  HiOutlineLifebuoy: 'LifeBuoy',
  HiPlusCircle: 'PlusCircle',
  HiSpeakerWave: 'Volume2',
  HiSpeakerXMark: 'VolumeX',

  // HeroIcons 1 (hi) -> Lucide
  HiAcademicCap: 'GraduationCap',
  HiShoppingCart: 'ShoppingCart',
  HiRefresh: 'RefreshCw',
  HiSearch: 'Search',
  HiSupport: 'HelpCircle',

  // FontAwesome (fa) -> Lucide
  FaTimes: 'X',
  FaCheck: 'Check',
  FaChevronLeft: 'ChevronLeft',
  FaChevronRight: 'ChevronRight',
  FaCircle: 'Circle',
  FaFacebook: 'Facebook',
  FaTwitter: 'Twitter',
  FaLinkedinIn: 'Linkedin',
  FaTelegram: 'Send',
  FaWhatsapp: 'MessageCircle',

  // Remix Icons (ri) -> Lucide
  RiMoonLine: 'Moon',
  RiSunLine: 'Sun',
  RiCloseLine: 'X',
  RiImageAddLine: 'ImagePlus',
  RiUploadCloud2Line: 'CloudUpload',
  RiDraftLine: 'FileEdit',
  RiSendPlaneFill: 'Send',

  // Bootstrap Icons (bi) -> Lucide
  BiLoaderAlt: 'Loader2',

  // Feather Icons (fi) -> Lucide
  FiFileText: 'FileText',
  FiImage: 'Image',
  FiVideo: 'Video',
  FiMusic: 'Music',
  FiFolder: 'Folder',
  FiTag: 'Tag',
  FiPlus: 'Plus',
  FiX: 'X',
  FiCheck: 'Check',
  FiSearch: 'Search',

  // Material Design (md) -> Lucide
  MdCheckCircle: 'CheckCircle',
  MdClose: 'X',
  MdError: 'AlertCircle',
  MdInfo: 'Info',
  MdWarning: 'AlertTriangle',
  MdFolder: 'Folder',

  // Ionicons (io5) -> Lucide
  IoAlertCircle: 'AlertCircle',
  IoExitOutline: 'LogOut',

  // Ant Design (ai) -> Lucide
  AiOutlineLoading3Quarters: 'Loader2',

  // CSS.gg (cg) -> Lucide
  CgSpinner: 'Loader',

  // IcoMoon (im) -> Lucide
  ImSpinner2: 'Loader2',

  // FontAwesome 6 (fa6) -> Lucide
  FaGithub: 'Github',
  FaFolder: 'Folder',
  FaLayerGroup: 'Layers',
  FaGlobe: 'Globe',

  // FontAwesome Color (fc) -> Lucide
  FcGoogle: 'Chrome', // Google icon doesn't exist in Lucide, using Chrome as alternative

  // Bootstrap Icons (bs) -> Lucide
  BsFolder2Open: 'FolderOpen',
  BsTag: 'Tag',

  // HeroIcons (hi) - additional
  HiOutlineFlag: 'Flag',
  HiOutlinePencil: 'Pencil',
  HiOutlineReply: 'Reply',
  HiOutlineTrash: 'Trash2',
  HiReply: 'Reply',
  HiPause: 'Pause',
  HiPlay: 'Play',
  HiOutlineClipboard: 'Clipboard',
  HiOutlineInformationCircle: 'Info',
  HiOutlineFolderOpen: 'FolderOpen',
  HiOutlineChevronDown: 'ChevronDown',
  HiOutlinePlus: 'Plus',
  HiOutlineUsers: 'Users',
  HiOutlineEyeSlash: 'EyeOff',
  HiOutlineCurrencyDollar: 'DollarSign',
  HiOutlineChevronLeft: 'ChevronLeft',
  HiOutlineMegaphone: 'Megaphone',
  HiOutlineHome: 'Home',
  HiOutlineSquares2X2: 'Grid2X2',
  HiOutlineClipboardDocumentList: 'ClipboardList',
  HiOutlineCog6Tooth: 'Settings',
  HiOutlineChartBarSquare: 'BarChart3',
  HiOutlineUserCircle: 'UserCircle',
  HiOutlineHashtag: 'Hash',
};

async function migrateIcons() {
  console.log('🚀 Starting React Icons to Lucide migration...\n');

  const files = await glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**', nodir: true });
  let totalFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (error) {
      continue; // Skip directories or unreadable files
    }
    let fileChanged = false;
    let fileReplacements = 0;

    // Pattern 1: import { Icon1, Icon2 } from 'react-icons/xx';
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]react-icons\/[^'"]+['"];?/g;
    const matches = [...content.matchAll(importRegex)];

    for (const match of matches) {
      const importStatement = match[0];
      const iconsString = match[1];
      const icons = iconsString.split(',').map((i) => i.trim());

      const lucideIcons: string[] = [];
      const unmappedIcons: string[] = [];

      for (const icon of icons) {
        if (iconMapping[icon]) {
          lucideIcons.push(iconMapping[icon]);
          fileReplacements++;
        } else {
          unmappedIcons.push(icon);
        }
      }

      if (lucideIcons.length > 0) {
        const newImport = `import { ${lucideIcons.join(', ')} } from 'lucide-react';`;
        content = content.replace(importStatement, newImport);
        fileChanged = true;

        if (unmappedIcons.length > 0) {
          console.log(`⚠️  ${file}: Unmapped icons: ${unmappedIcons.join(', ')}`);
        }
      }
    }

    // Pattern 2: import type { IconType } from 'react-icons';
    if (content.includes("import type { IconType } from 'react-icons'")) {
      content = content.replace(
        /import type { IconType } from 'react-icons';?/g,
        "import type { LucideIcon } from 'lucide-react';",
      );
      content = content.replace(/IconType/g, 'LucideIcon');
      fileChanged = true;
      fileReplacements++;
    }

    if (fileChanged) {
      writeFileSync(file, content, 'utf-8');
      totalFiles++;
      totalReplacements += fileReplacements;
      console.log(`✅ ${file}: ${fileReplacements} replacements`);
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log(`\n✨ Migration complete!`);
}

migrateIcons().catch(console.error);
