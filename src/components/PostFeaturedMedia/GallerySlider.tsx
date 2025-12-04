'use client';

import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import Image, { type StaticImageData } from 'next/image';
import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { variants } from '@/utils/animationVariants';
import Link from 'next/link';

export interface GallerySliderProps {
  className?: string;
  galleryImgs: (StaticImageData | string)[];
  ratioClass?: string;
  href?: string;
  imageClass?: string;
  galleryClass?: string;
  navigation?: boolean;
}

export default function GallerySlider({
  className = 'relative z-10',
  galleryImgs,
  ratioClass = 'relative aspect-w-4 aspect-h-3',
  imageClass = '',
  galleryClass = 'rounded-xl',
  href,
  navigation = true,
}: GallerySliderProps) {
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const images = galleryImgs;

  function changePhotoId(newVal: number) {
    if (newVal > index) {
      setDirection(1);
    } else {
      setDirection(-1);
    }
    setIndex(newVal);
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (index < images?.length - 1) {
        changePhotoId(index + 1);
      }
    },
    onSwipedRight: () => {
      if (index > 0) {
        changePhotoId(index - 1);
      }
    },
    trackMouse: true,
  });

  const currentImage = images[index];

  const ImageWrapper = ({ children }: { children: React.ReactNode }) =>
    href ? (
      <Link href={href} className={`flex items-center justify-center ${ratioClass}`}>
        {children}
      </Link>
    ) : (
      <div className={`flex items-center justify-center ${ratioClass}`}>{children}</div>
    );

  return (
    <MotionConfig
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <div className={`group group/cardGallerySlider ${className}`} {...handlers}>
        {/* Main image */}
        <div className={`w-full overflow-hidden ${galleryClass}`}>
          <ImageWrapper>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={variants(300, 1)}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <Image
                  src={currentImage || '/images/placeholder-large.png'}
                  fill
                  alt="listing card gallery"
                  className={`object-cover ${imageClass}`}
                  onLoad={() => setLoaded(true)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder-large.png';
                  }}
                  sizes="(max-width: 1025px) 100vw, 300px"
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>
          </ImageWrapper>
        </div>

        {loaded && navigation && (
          <div className="opacity-0 group-hover/cardGallerySlider:opacity-100 transition-opacity">
            {index > 0 && (
              <button
                type="button"
                className="absolute w-8 h-8 start-3 top-[calc(50%-16px)] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-6000 dark:hover:border-neutral-500 rounded-full flex items-center justify-center hover:border-neutral-300 focus:outline-none z-10"
                style={{ transform: 'translate3d(0, 0, 0)' }}
                onClick={() => changePhotoId(index - 1)}
              >
                <HiChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
            )}
            {index + 1 < images.length && (
              <button
                type="button"
                className="absolute w-8 h-8 end-3 top-[calc(50%-16px)] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-6000 dark:hover:border-neutral-500 rounded-full flex items-center justify-center hover:border-neutral-300 focus:outline-none z-10"
                style={{ transform: 'translate3d(0, 0, 0)' }}
                onClick={() => changePhotoId(index + 1)}
              >
                <HiChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Nav bar */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-neutral-900 opacity-50 rounded-b-lg" />
        <div className="flex items-center justify-center absolute bottom-2 start-1/2 transform -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              type="button"
              className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60 '}`}
              onClick={() => changePhotoId(i)}
              key={i}
            />
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}
