'use client';

import { useState, useCallback, Fragment } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils'; // Import cn utility for conditional classnames

// Helper component for image with skeleton loading state
const ImageWithSkeleton: React.FC<{
  src: string;
  alt: string;
  fill: boolean;
  sizes: string;
  className: string;
}> = ({ src, alt, fill, sizes, className }) => {
  const [isLoading, setLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-xl" />
      )}
      <Image
        alt={alt}
        src={src}
        fill={fill}
        sizes={sizes}
        className={cn(
          className,
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setLoading(false)}
        onLoadingComplete={() => setLoading(false)} // Ensure loading state is false
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Added for modal navigation

  const IMAGES_GALLERY =
    post.galleryImages.length > 0
      ? post.galleryImages
      : ([post.featuredImage].filter(Boolean) as string[]);

  const handleOpenModalImageGallery = useCallback(() => {
    setIsModalOpen(true);
    setCurrentImageIndex(0); // Reset to first image when opening modal
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

  return (
    <>
      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 my-10">
        <div
          className="col-span-2 row-span-2 relative rounded-xl overflow-hidden cursor-pointer aspect-w-16 aspect-h-9"
          onClick={handleOpenModalImageGallery}
          onKeyDown={(e) => e.key === 'Enter' && handleOpenModalImageGallery()}
          aria-label="Open image gallery"
        >
          <ImageWithSkeleton
            alt={post.title}
            src={IMAGES_GALLERY[0] || '/images/placeholder.png'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="rounded-xl object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
        {IMAGES_GALLERY.slice(1, 5).map((item, index) => (
          <div
            key={index}
            className={`relative rounded-xl overflow-hidden cursor-pointer aspect-w-4 aspect-h-3 ${
              index >= 2 ? 'hidden sm:block' : ''
            }`}
            onClick={handleOpenModalImageGallery}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenModalImageGallery()}
            aria-label={`Open image gallery - image ${index + 2}`}
          >
            <ImageWithSkeleton
              alt={`${post.title} - image ${index + 2}`}
              src={item || '/images/placeholder-small.png'}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="rounded-xl object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
        <button
          type="button"
          className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm md:text-base rounded-lg bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 text-gray-800 dark:text-gray-200 font-semibold shadow-md hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all duration-200 z-10"
          onClick={handleOpenModalImageGallery}
        >
          نمایش همه تصاویر
        </button>
      </div>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-90" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
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
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-3 sm:p-6 text-right align-middle shadow-xl transition-all max-h-[90vh] flex flex-col">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4"
                  >
                    گالری
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="absolute top-4 left-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    <Icon name="x" className="w-6 h-6" />
                  </button>
                  <div className="relative overflow-hidden flex-grow flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2 sm:left-4 z-20 p-2 rounded-full bg-white/75 dark:bg-gray-800/75 hover:bg-white dark:hover:bg-gray-700 transition-colors duration-200 shadow-md"
                      aria-label="Previous image"
                    >
                      <Icon name="arrow-left" className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>

                    <div className="relative w-full h-[calc(100vh-200px)] max-h-[80vh] flex items-center justify-center">
                      <div className="relative w-full pb-[56.25%]"> {/* 16:9 Aspect Ratio (9/16 = 0.5625) using padding-bottom */}
                        <ImageWithSkeleton
                          src={IMAGES_GALLERY[currentImageIndex] || '/images/placeholder.png'}
                          alt={`${post.title} - image ${currentImageIndex + 1}`}
                          fill
                          sizes="100vw"
                          className="rounded-lg object-contain absolute inset-0"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2 sm:right-4 z-20 p-2 rounded-full bg-white/75 dark:bg-gray-800/75 hover:bg-white dark:hover:bg-gray-700 transition-colors duration-200 shadow-md"
                      aria-label="Next image"
                    >
                      <Icon name="arrow-right" className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {currentImageIndex + 1} از {IMAGES_GALLERY.length}
                  </div>
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
