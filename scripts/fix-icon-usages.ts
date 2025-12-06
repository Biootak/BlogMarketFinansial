import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

// Mapping از React Icons به Lucide React
const iconMapping: Record<string, string> = {
  HiOutlineMagnifyingGlass: 'Search',
  HiOutlineEye: 'Eye',
  HiOutlineClock: 'Clock',
  HiOutlineCalendar: 'Calendar',
  HiOutlineCalendarDays: 'CalendarDays',
  HiOutlineHashtag: 'Hash',
  HiOutlineLifebuoy: 'LifeBuoy',
  HiOutlineChatBubbleLeftEllipsis: 'MessageSquare',
  HiOutlineShare: 'Share2',
  HiOutlineHeart: 'Heart',
  HiOutlineDocumentText: 'FileText',
  HiOutlinePencilSquare: 'Edit',
  HiOutlineChartBar: 'BarChart3',
  HiOutlineBell: 'Bell',
  HiOutlineShieldCheck: 'ShieldCheck',
  HiOutlineSparkles: 'Sparkles',
  HiOutlineBars3: 'Menu',
  HiOutlineHome: 'Home',
  HiOutlineUsers: 'Users',
  HiOutlineSquares2X2: 'Grid2X2',
  HiOutlineMegaphone: 'Megaphone',
  HiOutlineClipboardDocumentList: 'ClipboardList',
  HiOutlineCurrencyDollar: 'DollarSign',
  HiOutlineCog6Tooth: 'Settings',
  HiOutlineChartBarSquare: 'BarChart3',
  HiOutlineUserCircle: 'UserCircle',
  HiXMark: 'X',
  HiCheck: 'Check',
  HiPencilSquare: 'Edit',
  HiArrowLeft: 'ArrowLeft',
  HiArrowRight: 'ArrowRight',
  HiArrowDown: 'ArrowDown',
  HiArrowUp: 'ArrowUp',
  HiChevronLeft: 'ChevronLeft',
  HiChevronRight: 'ChevronRight',
  HiChevronDown: 'ChevronDown',
  HiChevronUp: 'ChevronUp',
  HiEyeSlash: 'EyeOff',
  HiMagnifyingGlass: 'Search',
  HiPencil: 'Pencil',
  HiTrash: 'Trash2',
  HiUser: 'User',
  HiFolder: 'Folder',
  HiDocument: 'FileText',
  HiPhoto: 'Image',
  HiVideoCamera: 'Video',
  HiMusicalNote: 'Music',
  HiEllipsisHorizontal: 'MoreHorizontal',
  HiEllipsisVertical: 'MoreVertical',
  HiPlus: 'Plus',
  HiMinus: 'Minus',
  HiExclamationTriangle: 'AlertTriangle',
  HiInformationCircle: 'Info',
  HiCheckCircle: 'CheckCircle',
  HiXCircle: 'XCircle',
  HiShare: 'Share2',
  HiBookmark: 'Bookmark',
  HiChatBubbleLeft: 'MessageCircle',
  HiAdjustmentsHorizontal: 'SlidersHorizontal',
  HiPaperAirplane: 'Send',
  HiChatBubbleLeftRight: 'MessagesSquare',
  HiHashtag: 'Hash',
  HiHome: 'Home',
  HiLink: 'Link',
  HiSparkles: 'Sparkles',
  FaGlobe: 'Globe',
  HiOutlinePlus: 'Plus',
  HiOutlinePencil: 'Pencil',
  HiOutlineTrash: 'Trash2',
  FaLayerGroup: 'Layers',
  FaFolder: 'Folder',
  HiOutlineChevronDown: 'ChevronDown',
  HiOutlineChevronLeft: 'ChevronLeft',
  HiOutlineChevronRight: 'ChevronRight',
  HiOutlineChevronUp: 'ChevronUp',
  HiOutlineFolderOpen: 'FolderOpen',
  HiPlusCircle: 'PlusCircle',
  FaCheck: 'Check',
  FaChevronLeft: 'ChevronLeft',
  FaCircle: 'Circle',
  FaGithub: 'Github',
  FaTelegram: 'Send',
  FaTimes: 'X',
  FaWhatsapp: 'MessageCircle',
  HiAcademicCap: 'GraduationCap',
  HiCalendar: 'Calendar',
  HiCalendarDays: 'CalendarDays',
  HiCash: 'Banknote',
  HiClipboard: 'Clipboard',
  HiClipboardCopy: 'Copy',
  HiClock: 'Clock',
  HiCreditCard: 'CreditCard',
  HiCurrencyDollar: 'DollarSign',
  HiDocumentDuplicate: 'Copy',
  HiDocumentText: 'FileText',
  HiExclamationCircle: 'AlertCircle',
  HiEye: 'Eye',
  HiGlobe: 'Globe',
  HiLightningBolt: 'Zap',
  HiMail: 'Mail',
  HiMinusCircle: 'MinusCircle',
  HiOfficeBuilding: 'Building2',
  HiOutlineArrowLeft: 'ArrowLeft',
  HiOutlineArrowRightOnRectangle: 'LogOut',
  HiOutlineBolt: 'Zap',
  HiOutlineDocumentDuplicate: 'Copy',
  HiOutlineEnvelope: 'Mail',
  HiOutlineFunnel: 'Filter',
  HiOutlineInformationCircle: 'Info',
  HiOutlineListBullet: 'List',
  HiOutlinePencilAlt: 'Edit',
  HiOutlinePhone: 'Phone',
  HiOutlineUser: 'User',
  HiOutlineXCircle: 'XCircle',
  HiPause: 'Pause',
  HiPencilAlt: 'Edit',
  HiPhone: 'Phone',
  HiPlay: 'Play',
  HiReply: 'Reply',
  HiSearch: 'Search',
  HiShieldCheck: 'ShieldCheck',
  HiShoppingCart: 'ShoppingCart',
  HiSpeakerWave: 'Volume2',
  HiSpeakerXMark: 'VolumeX',
  HiOutlineClipboard: 'Clipboard',
  IoExitOutline: 'LogOut',
  HiOutlineEyeSlash: 'EyeOff',
  HiOutlineFlag: 'Flag',
  FcGoogle: 'Chrome',
  FiFolder: 'Folder',
  HiOutlineReply: 'Reply',
  FiX: 'X',
  FiSearch: 'Search',
  FiChevronDown: 'ChevronDown',
  FiCheck: 'Check',
  BiLoaderAlt: 'Loader2',
  FiFileText: 'FileText',
  FiVideo: 'Video',
  FiGrid: 'Grid',
  FiMusic: 'Music',
  FiTag: 'Tag',
  FiImage: 'Image',
  RiDraftLine: 'FileEdit',
  RiSendPlaneFill: 'Send',
  FiLink: 'Link2',
  FiPlus: 'Plus',
  FiStar: 'Star',
  HiOutlineRectangleStack: 'Layers',
  MdFolder: 'Folder',
  HiOutlineArrowPath: 'RefreshCw',
  HiOutlineCheckCircle: 'CheckCircle',
  IoAlertCircle: 'AlertCircle',
  RiCloseLine: 'X',
  RiImageAddLine: 'ImagePlus',
  RiUploadCloudLine: 'CloudUpload',
  RiUploadCloud2Line: 'CloudUpload',
};

async function fixIconUsages() {
  console.log('🔧 Fixing icon usages...\n');

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

    // Replace icon usages in JSX
    for (const [oldIcon, newIcon] of Object.entries(iconMapping)) {
      const regex = new RegExp(`<${oldIcon}\\s`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `<${newIcon} `);
        fileChanged = true;
        fileReplacements++;
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
  console.log(`\n✨ Done!`);
}

fixIconUsages().catch(console.error);
