'use client';

import Avatar from '@/components/Avatar/Avatar';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Eye } from 'lucide-react';;;
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = { initialPosts: PostWithRelations[]; className?: string };

const shimmer = {
  hidden: { x: '-100%' },
  visible: {
    x: '100%',
    transition: { duration: 1.5, ease: 'easeInOut' as const },
  },
};

export default function Design7({ initialPosts, className = '' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-slide
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % initialPosts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, initialPosts.length]);

  if (!initialPosts?.length) return <CardLarge1Skeleton />;

  const mainPost = initialPosts[activeIndex];
  const otherPosts = initialPosts.filter((_, i) => i !== activeIndex);

  return (
    <section
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Container with Glass Effect */}
      <div className="relative rounded-3xl overflow-hidden gradient-neutral-br dark:from-neutral-900 dark:to-neutral-800 p-1.5 sm:p-2">
        {/* Inner Glow Border */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/20 via-transparent to-primary-600/20 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4">
          {/* Main Featured Card */}
          <div className="lg:col-span-8 relative">
            <AnimatePresence mode="wait">
              <motion.article
                key={mainPost.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="relative group h-[320px] sm:h-[400px] lg:h-[480px] rounded-2xl overflow-hidden"
              >
                {/* Image */}
                <Link
                  href={getPostLink(mainPost.postType, mainPost.slug)}
                  className="absolute inset-0"
                >
                  <Image
                    src={mainPost.featuredImage || '/images/placeholder-large.png'}
                    alt={mainPost.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                </Link>

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Shimmer Effect on Hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  variants={shimmer}
                  initial="hidden"
                  whileHover="visible"
                />

                {/* Top Badge */}
                <motion.div
                  className="absolute top-4 sm:top-6 start-4 sm:start-6 z-10"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg shadow-amber-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    برترین
                  </span>
                </motion.div>

                {/* Content */}
                <div className="absolute bottom-0 start-0 end-0 p-4 sm:p-6 lg:p-8 z-10">
                  {/* Category */}
                  {mainPost.categories?.[0] && (
                    <motion.span
                      className="inline-block px-3 py-1 mb-3 bg-white/10 backdrop-blur-md text-white/90 text-xs font-medium rounded-lg border border-white/20"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {mainPost.categories[0].name}
                    </motion.span>
                  )}

                  {/* Title */}
                  <motion.h2
                    className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight mb-4 line-clamp-2"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Link
                      href={getPostLink(mainPost.postType, mainPost.slug)}
                      className="hover:text-primary-200 transition-colors duration-300"
                    >
                      {mainPost.title}
                    </Link>
                  </motion.h2>

                  {/* Meta Info */}
                  <motion.div
                    className="flex items-center gap-4 flex-wrap"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {/* Author */}
                    <div className="flex items-center gap-2.5 group/author">
                      <div className="relative">
                        <div className="absolute -inset-1 gradient-primary-r rounded-full opacity-0 group-hover/author:opacity-100 blur transition-opacity duration-300" />
                        <Avatar
                          sizeClass="h-10 w-10 relative"
                          radius="rounded-full"
                          imgUrl={mainPost.author.profile?.avatar || mainPost.author.image}
                          userName={mainPost.author.name || ''}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">
                          {mainPost.author.name}
                        </span>
                        <span className="text-white/60 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(mainPost.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </div>

                    {/* Views */}
                    {mainPost.viewCount > 0 && (
                      <div className="flex items-center gap-1.5 text-white/70 text-sm">
                        <Eye className="w-4 h-4" />
                        <span>{mainPost.viewCount.toLocaleString('fa-IR')}</span>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Navigation Dots */}
                <div className="absolute bottom-4 sm:bottom-6 end-4 sm:end-6 flex items-center gap-2 z-10">
                  {initialPosts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`relative h-2 rounded-full transition-all duration-300 ${
                        i === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      {i === activeIndex && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                          layoutId="activeDot"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          {/* Side Cards */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 sm:gap-3">
            {otherPosts.slice(0, 2).map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="relative group flex-1 h-[160px] sm:h-[180px] lg:h-auto rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setActiveIndex(initialPosts.findIndex((p) => p.id === post.id))}
              >
                {/* Image */}
                <Image
                  src={post.featuredImage || '/images/placeholder-large.png'}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 z-10">
                  {post.categories?.[0] && (
                    <span className="inline-block px-2 py-0.5 mb-2 bg-white/15 backdrop-blur-sm text-white/90 text-[10px] font-medium rounded-md">
                      {post.categories[0].name}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-primary-200 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar
                      sizeClass="h-5 w-5"
                      radius="rounded-full"
                      imgUrl={post.author.profile?.avatar || post.author.image}
                      userName={post.author.name || ''}
                    />
                    <span className="text-white/70 text-xs truncate">{post.author.name}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute top-1/2 -translate-y-1/2 start-0 end-0 flex justify-between pointer-events-none px-2 sm:px-4 z-20">
        <button
          onClick={() =>
            setActiveIndex((prev) => (prev - 1 + initialPosts.length) % initialPosts.length)
          }
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={() => setActiveIndex((prev) => (prev + 1) % initialPosts.length)}
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </section>
  );
}
