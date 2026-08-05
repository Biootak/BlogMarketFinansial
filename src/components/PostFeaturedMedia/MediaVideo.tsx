'use client';

import LoadingVideo from '@/components/LoadingVideo/LoadingVideo';
import dynamic from 'next/dynamic';
import { type FC, useRef, useState } from 'react';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export interface MediaVideoProps {
  videoUrl: string;
  isHover: boolean;
}

const MediaVideo: FC<MediaVideoProps> = ({ videoUrl, isHover }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [showDescUnmuted, setShowDescUnmuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  // 2026-08-perf: __timeOut از body component به useRef منتقل شد.
  // قبلاً `let __timeOut` در body component بود — هر re-render یک
  // مقدار جدید می‌ساخت و useEffect([__timeOut]) دائماً re-run می‌شد.
  // useRef مقدار پایدار دارد و هیچ re-render اضافه‌ای ایجاد نمی‌کند.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="nc-MediaVideo">
      <ReactPlayer
        url={videoUrl}
        muted={isMuted}
        playing={isHover}
        style={{
          opacity: isPlaying ? 1 : 0,
        }}
        className={'absolute bg-neutral-900 inset-0 transition-opacity'}
        width="100%"
        height="100%"
        onStart={() => {
          setIsPlaying(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setShowDescUnmuted(false);
          }, 2500);
        }}
      />
      <div
        className={`${
          isPlaying ? 'opacity-0' : 'opacity-100'
        } absolute bg-neutral-900/30 flex items-center justify-center inset-0 transition-opacity`}
      >
        <LoadingVideo />
      </div>
      {isPlaying && (
        <div
          className={`absolute z-20 bottom-2 start-2 h-6 rounded-full bg-black bg-opacity-70 text-white flex items-center justify-center text-sm transform transition-transform ${
            showDescUnmuted ? 'ps-[6px] pe-2' : 'w-6 hover:scale-125'
          }`}
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <>
              <HiSpeakerXMark className="w-3.5 h-3.5" />
              {showDescUnmuted && (
                <span className="ms-1 inline-block text-[9px]">Click here to unmute</span>
              )}
            </>
          ) : (
            <HiSpeakerWave className="w-3.5 h-3.5" />
          )}
        </div>
      )}
    </div>
  );
};

export default MediaVideo;
