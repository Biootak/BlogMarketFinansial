import * as motion from 'framer-motion/client';
import Image from 'next/image';
import { getSocialLinks } from '@/actions/socialLinkActions';

interface SocialLinksProps {
  className?: string;
  itemClass?: string;
  iconSize?: number;
}

const SocialLinks = async ({ className = '', itemClass = '', iconSize = 22 }: SocialLinksProps) => {
  const result = await getSocialLinks();
  const links = result.success ? result.data : [];

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <nav className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((link, index) => (
        <motion.a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.name}
          aria-label={`دنبال کردن در ${link.name}`}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={`
            ${itemClass}
            group relative flex items-center justify-center
            w-11 h-11 rounded-xl
            bg-white dark:bg-neutral-800/80
            border border-slate-200/50 dark:border-slate-700/50
            shadow-sm hover:shadow-lg hover:shadow-primary-500/10
            transition-all duration-200 ease-out
            overflow-hidden
          `}
        >
          {/* Gradient overlay on hover */}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              background: link.color
                ? `linear-gradient(135deg, ${link.color}15, ${link.color}05)`
                : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))',
            }}
          />
          {/* Border glow on hover */}
          <span
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              boxShadow: link.color
                ? `inset 0 0 0 1.5px ${link.color}40`
                : 'inset 0 0 0 1.5px rgba(99,102,241,0.3)',
            }}
          />
          {link.icon ? (
            <Image
              src={link.icon}
              alt={link.name}
              width={iconSize}
              height={iconSize}
              className="relative z-10 object-contain transition-transform duration-200 group-hover:scale-110"
            />
          ) : (
            <span
              className="relative z-10 flex items-center justify-center font-bold text-sm transition-transform duration-200 group-hover:scale-110"
              style={{
                color: link.color || '#6366f1',
                width: iconSize,
                height: iconSize,
              }}
            >
              {link.name.charAt(0).toUpperCase()}
            </span>
          )}
        </motion.a>
      ))}
    </nav>
  );
};

export default SocialLinks;
