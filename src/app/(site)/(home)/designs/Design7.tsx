'use client';

// طرح 7: کارت‌های سه‌بعدی با افکت Perspective
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import Image from 'next/image';
import Avatar from '@/components/Avatar/Avatar';

import { getPostLink } from '@/lib/getPostLink';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

type Props = { initialPosts: PostWithRelations[]; className?: string };

// انیمیشن‌های بهبود یافته
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const overlayVariants = {
  initial: { opacity: 0 },
  hover: { opacity: 1 },
};

export default function Design7({ initialPosts, className = '' }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!initialPosts?.length) return <CardLarge1Skeleton />;

  return (
    <section className={`${className}`}>
      {/* 3D Cards Container */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5" 
        style={{ perspective: '2000px' }}
      >
        <AnimatePresence>
          {initialPosts.slice(0, 3).map((post, i) => {
            const isHovered = hoveredIndex === i;
            const isFirst = i === 0;

            return (
              <motion.article
                key={post.id}
                className={`relative group cursor-pointer ${isFirst ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                style={{ transformStyle: 'preserve-3d' }}
                whileHover={{
                  rotateY: isFirst ? 0 : -2,
                  rotateX: isFirst ? 0 : 2,
                  scale: 1.02,
                  z: 50,
                  transition: { duration: 0.3, ease: 'easeOut' },
                }}
              >
                {/* کارت اصلی */}
                <div 
                  className={`relative overflow-hidden rounded-2xl sm:rounded-3xl ${
                    isFirst 
                      ? 'h-[300px] sm:h-[380px] lg:h-full lg:min-h-[460px]' 
                      : 'h-[200px] sm:h-[220px]'
                  }`}
                >
                  {/* تصویر */}
                  <Link href={getPostLink(post.postType, post.slug)} className="absolute inset-0 block z-0">
                    <Image
                      className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105"
                      src={post.featuredImage || '/images/placeholder-large.png'}
                      alt={post.title}
                      fill
                      sizes={isFirst ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
                      priority={i < 3}
                    />
                  </Link>

                  {/* گرادیانت پایین */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* افکت هاور گرادیانت */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-primary-900/60 via-primary-800/20 to-transparent pointer-events-none"
                    variants={overlayVariants}
                    initial="initial"
                    animate={isHovered ? 'hover' : 'initial'}
                    transition={{ duration: 0.3 }}
                  />

                  {/* بج شناور */}
                  <motion.div
                    className="absolute top-3 sm:top-4 start-3 sm:start-4 z-10"
                    animate={{ 
                      y: isHovered ? -5 : 0,
                      scale: isHovered ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {isFirst && (
                      <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-amber-500/40">
                        <span className="text-base">⭐</span>
                        برترین
                      </span>
                    )}
                    {post.categories?.[0] && !isFirst && (
                      <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/15 backdrop-blur-lg text-white text-[10px] sm:text-xs font-semibold rounded-lg border border-white/20">
                        {post.categories[0].name}
                      </span>
                    )}
                  </motion.div>

                  {/* محتوا */}
                  <motion.div 
                    className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 lg:p-5 z-10"
                    animate={{ y: isHovered ? -5 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {/* عنوان */}
                    <h3 className={`font-black text-white leading-snug mb-2 sm:mb-3 drop-shadow-lg ${
                      isFirst 
                        ? 'text-lg sm:text-xl lg:text-2xl line-clamp-2' 
                        : 'text-sm sm:text-base line-clamp-2'
                    }`}>
                      <Link 
                        href={getPostLink(post.postType, post.slug)} 
                        className="hover:text-primary-200 transition-colors duration-300"
                      >
                        {post.title}
                      </Link>
                    </h3>

                    {/* نویسنده */}
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Avatar 
                          sizeClass={isFirst ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-6 w-6 sm:h-7 sm:w-7'} 
                          radius="rounded-full" 
                          imgUrl={post.author.profile?.avatar || post.author.image} 
                          userName={post.author.name || ''} 
                        />
                      </motion.div>
                      <span className="font-medium text-white/90 text-xs sm:text-sm truncate drop-shadow">
                        {post.author.name}
                      </span>
                    </div>
                  </motion.div>

                  {/* افکت درخشش */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    initial={false}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)',
                      }}
                      animate={{
                        x: isHovered ? '150%' : '-150%',
                      }}
                      transition={{ duration: 0.7, ease: 'easeInOut' }}
                    />
                  </motion.div>
                </div>

                {/* سایه سه‌بعدی */}
                <motion.div
                  className="absolute -bottom-3 start-6 end-6 h-6 bg-black/25 rounded-full blur-xl -z-10"
                  animate={{
                    scale: isHovered ? 1.15 : 1,
                    opacity: isHovered ? 0.6 : 0.35,
                    y: isHovered ? 4 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
