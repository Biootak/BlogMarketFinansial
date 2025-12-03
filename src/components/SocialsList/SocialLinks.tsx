import * as motion from 'framer-motion/client';
import Image from 'next/image';
import { getSocialLinks } from '@/actions/socialLinkActions';

interface SocialLinksProps {
  className?: string;
  itemClass?: string;
  iconSize?: number;
}

const SocialLinks = async ({ className = '', itemClass = '', iconSize = 24 }: SocialLinksProps) => {
  const result = await getSocialLinks();
  const links = result.success ? result.data : [];

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link, index) => (
        <motion.a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.name}
          aria-label={`دنبال کردن در ${link.name}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`${itemClass} rounded-full p-2.5 transition-all duration-300 ease-in-out bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl hover:bg-neutral-100 dark:hover:bg-neutral-700`}
          style={{ 
            borderColor: link.color || undefined,
            borderWidth: link.color ? '2px' : undefined,
          }}
        >
          {link.icon ? (
            <Image
              src={link.icon}
              alt={link.name}
              width={iconSize}
              height={iconSize}
              className="object-contain"
            />
          ) : (
            <span
              className="flex items-center justify-center font-bold text-sm"
              style={{ 
                color: link.color || '#666',
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
