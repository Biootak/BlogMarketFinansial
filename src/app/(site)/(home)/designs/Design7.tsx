'use client';

// طرح 7: کارت‌های سه‌بعدی با افکت Perspective
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import NcImage from '@/components/NcImage/NcImage';
import Avatar from '@/components/Avatar/Avatar';

import { getPostLink } from '@/lib/getPostLink';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';


type Props = { initialPosts: PostWithRelations[]; className?: string };

export default function Design7({ initialPosts, className = '' }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!initialPosts?.length) return <CardLarge1Skeleton />;

  return (
    <section className={`py-4 sm:py-6 ${className}`}>
      {/* 3D Cards Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5" style={{ perspective: '1500px' }}>
        {initialPosts.slice(0, 6).map((post, i) => {
          const isHovered = hoveredIndex === i;
          const isFirst = i === 0;

          return (
            <motion.article
              key={post.id}
              className={`relative group ${isFirst ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              style={{
                transformStyle: 'preserve-3d',
              }}
              whileHover={{
                rotateY: isFirst ? 0 : -3,
                rotateX: isFirst ? 0 : 3,
                scale: 1.01,
                z: 30,
              }}
            >
              <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl ${isFirst ? 'h-[280px] sm:h-[350px] lg:h-[450px]' : 'h-[200px] sm:h-[220px] lg:h-[220px]'}`}>
                {/* Image */}
                <Link href={getPostLink(post.postType, post.slug)} className="absolute inset-0">
                  <NcImage
                    containerClassName="absolute inset-0"
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    src={post.featuredImage || '/placeholder.jpg'}
                    alt={post.title}
                    fill
                    sizes={isFirst ? '66vw' : '33vw'}
                    priority={i < 3}
                  />
                </Link>

                {/* Floating Badge */}
                <motion.div
                  className="absolute top-3 sm:top-4 start-3 sm:start-4"
                  animate={{ y: isHovered ? -3 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {i === 0 && (
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/30">
                      ⭐ برترین
                    </span>
                  )}
                  {post.categories?.[0] && i !== 0 && (
                    <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg border border-white/30">
                      {post.categories[0].name}
                    </span>
                  )}
                </motion.div>

                {/* Content - Compact layout */}
                <div 
                  className="absolute bottom-0 start-0 end-0 p-2 sm:p-3 lg:p-4" 
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)' }}
                >
                  {/* Title */}
                  <h3 className={`font-black text-white leading-tight mb-1 sm:mb-2 ${isFirst ? 'text-base sm:text-lg lg:text-2xl line-clamp-2' : 'text-xs sm:text-sm lg:text-base line-clamp-2'}`}>
                    <Link href={getPostLink(post.postType, post.slug)} className="hover:text-primary-300 transition-colors">
                      {post.title}
                    </Link>
                  </h3>

                  {/* Author - Simple */}
                  <div className="flex items-center gap-2">
                    <Avatar sizeClass={isFirst ? 'h-6 w-6 sm:h-8 sm:w-8' : 'h-5 w-5 sm:h-6 sm:w-6'} radius="rounded-full" imgUrl={post.author.profile?.avatar || post.author.image} userName={post.author.name || ''} />
                    <span className="font-medium text-white text-[10px] sm:text-xs truncate">{post.author.name}</span>
                  </div>
                </div>

                {/* 3D Shine Effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, transparent 50%)',
                  }}
                  animate={{
                    x: isHovered ? '200%' : '-100%',
                  }}
                  transition={{ duration: 0.6 }}
                />
              </div>

              {/* 3D Shadow */}
              <motion.div
                className="absolute -bottom-4 start-4 end-4 h-8 bg-black/20 rounded-full blur-xl -z-10"
                animate={{
                  scale: isHovered ? 1.1 : 1,
                  opacity: isHovered ? 0.5 : 0.3,
                }}
              />
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
