'use client';

import { useState, useCallback, Fragment, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { cn, toPersianNumber } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

const ImageWithSkeleton: React.FC<{
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, fill = true, sizes, className, priority = false }) => {
  const [isLoading, setLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 animate-pulse rounded-xl" />
      )}
      <Image
        alt={alt}
        src={src}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={cn(
          className,
          'transition-all duration-300',
          isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

interface GalleryImagesProps {
  post: {
    title: string;
    featuredImage?: string | null;
    galleryImages: string[];
  };
}

const GalleryImages: React.FC<GalleryImagesProps> = ({ post }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const IMAGES_GALLERY =
    post.galleryImages.length > 0
      ? post.galleryImages
      : ([post.featuredImage].filter(Boolean) as string[]);

  const handleOpenModalImageGallery = useCallback((index: number = 0) => {
    setIsModalOpen(true);
    setCurrentImageIndex(index);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('modal', 'PHOTO_TOUR_SCROLLABLE');
    router.push(`?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('modal');
    router.push(`?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % IMAGES_GALLERY.length);
  }, [IMAGES_GALLERY.length]);

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? IMAGES_GALLERY.length - 1 : prevIndex - 1
    );
  }, [IMAGES_GALLERY.length]);

  // Handle keyboard navigation for active slide controls & modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextImage, handlePrevImage, isModalOpen, handleCloseModal]);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40 bg-neutral-900/10 dark:bg-neutral-950/30 p-4 sm:p-5 backdrop-blur-md shadow-2xl my-8">
        
        {/* Main Immersive Viewport */}
        <div className="relative aspect-[16/9] lg:aspect-[21/9] w-full overflow-hidden rounded-xl bg-neutral-950 shadow-inner group/viewport">
          
          {/* Ambient Glow matching active image colors */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {IMAGES_GALLERY[currentImageIndex] && (
              <Image
                alt="Ambient Glow"
                src={IMAGES_GALLERY[currentImageIndex]}
                fill
                className="object-cover blur-3xl opacity-20 dark:opacity-30 scale-110"
                sizes="10vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
          </div>

          {/* Large Main Image Display */}
          <div 
            className="relative w-full h-full z-10 cursor-zoom-in"
            onClick={() => handleOpenModalImageGallery(currentImageIndex)}
          >
            <ImageWithSkeleton
              alt={`${post.title} - ${currentImageIndex + 1}`}
              src={IMAGES_GALLERY[currentImageIndex] || '/images/placeholder.png'}
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              priority={true}
              className="object-contain"
            />
          </div>

          {/* HUD Overlay - Bottom Right (RTL) - Stats Counter */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 px-3 py-1.5 rounded-full bg-neutral-950/70 backdrop-blur-md border border-neutral-800 text-xs text-neutral-300 select-none font-medium transition-opacity duration-300">
            <span dir="ltr" className="unicode-bidi-isolate">
              {toPersianNumber(currentImageIndex + 1)} / {toPersianNumber(IMAGES_GALLERY.length)}
            </span>
          </div>

          {/* HUD Overlay - Bottom Left (RTL) - Zoom Trigger */}
          <button
            type="button"
            onClick={() => handleOpenModalImageGallery(currentImageIndex)}
            className="absolute bottom-4 left-4 z-20 flex items-center justify-center p-2 rounded-full bg-neutral-950/70 backdrop-blur-md border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
            aria-label="Open Fullscreen View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Viewport Control Navigation Arrows */}
          <button
            type="button"
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-neutral-950/60 hover:bg-neutral-950/80 border border-neutral-800 text-white backdrop-blur-md transition-all duration-200 cursor-pointer opacity-0 group-hover/viewport:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-neutral-950/60 hover:bg-neutral-950/80 border border-neutral-800 text-white backdrop-blur-md transition-all duration-200 cursor-pointer opacity-0 group-hover/viewport:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Filmstrip Navigation Carousel */}
        {IMAGES_GALLERY.length > 1 && (
          <div className="relative mt-4 flex items-center justify-start gap-3 overflow-x-auto py-2 scrollbar-none">
            {IMAGES_GALLERY.map((item, index) => {
              const isActive = index === currentImageIndex;
              return (
                <div
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "relative w-20 h-14 sm:w-24 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300",
                    isActive 
                      ? "border-primary-500 scale-105 shadow-[0_0_12px_rgba(94,106,230,0.4)]" 
                      : "border-transparent opacity-50 hover:opacity-100"
                  )}
                >
                  <Image
                    alt={`${post.title} thumb ${index + 1}`}
                    src={item}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal Dialog */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[9999]" onClose={handleCloseModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-xl transition-opacity" />
          </Transition.Child>

          {/* SVG Grain Noise Overlay for Premium Depth */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E')] z-10" />

          <div className="fixed inset-0 overflow-y-auto z-20">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-transparent text-right align-middle transition-all flex flex-col items-center justify-between min-h-[90vh]">
                  
                  {/* Close Trigger Button */}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="absolute top-4 left-4 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white backdrop-blur-md transition-all cursor-pointer z-50"
                    aria-label="Close Gallery Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="relative w-full flex-grow flex items-center justify-center mt-12 mb-4">
                    {/* Left arrow (RTL-aware next/prev logic) */}
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all cursor-pointer"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    {/* Main Fullscreen Viewport Display */}
                    <div className="relative w-full h-[65vh] flex items-center justify-center">
                      <Image
                        src={IMAGES_GALLERY[currentImageIndex] || '/images/placeholder.png'}
                        alt={`${post.title} large - ${currentImageIndex + 1}`}
                        fill
                        priority={true}
                        sizes="100vw"
                        className="object-contain rounded-lg select-none"
                      />
                    </div>

                    {/* Right arrow */}
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all cursor-pointer"
                      aria-label="Next Image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Footer metadata details */}
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md rounded-b-xl z-20">
                    <span className="text-neutral-200 text-sm font-medium order-2 sm:order-1">
                      {post.title}
                    </span>
                    <span dir="ltr" className="unicode-bidi-isolate text-neutral-400 text-xs font-semibold order-1 sm:order-2">
                      {toPersianNumber(currentImageIndex + 1)} / {toPersianNumber(IMAGES_GALLERY.length)}
                    </span>
                  </div>

                  {/* Horizontal filmstrip navigation inside modal */}
                  {IMAGES_GALLERY.length > 1 && (
                    <div className="w-full max-w-4xl flex items-center justify-center gap-2 overflow-x-auto py-3 px-4 scrollbar-none z-20">
                      {IMAGES_GALLERY.map((item, index) => {
                        const isActive = index === currentImageIndex;
                        return (
                          <div
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={cn(
                              "relative w-14 h-10 flex-shrink-0 rounded overflow-hidden cursor-pointer border transition-all duration-300",
                              isActive
                                ? "border-primary-500 scale-105 shadow-[0_0_8px_rgba(94,106,230,0.4)]"
                                : "border-neutral-800 opacity-40 hover:opacity-100"
                            )}
                          >
                            <Image
                              alt={`modal thumb ${index + 1}`}
                              src={item}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default GalleryImages;
