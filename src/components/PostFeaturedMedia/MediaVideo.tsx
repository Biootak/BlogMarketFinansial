'use client';

import React, { type FC } from 'react';
import { Play } from 'lucide-react';

export interface MediaVideoProps {
  videoUrl: string;
  isHover: boolean;
}

const MediaVideo: FC<MediaVideoProps> = ({ videoUrl }) => {
  return (
    <div className="nc-MediaVideo relative">
      {/* Native HTML5 Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover bg-neutral-900"
        src={videoUrl}
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
      
      {/* Fallback for non-video URLs */}
      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
        <div className="text-center text-white">
          <Play className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">ویدیو</p>
        </div>
      </div>
    </div>
  );
};

export default MediaVideo;
