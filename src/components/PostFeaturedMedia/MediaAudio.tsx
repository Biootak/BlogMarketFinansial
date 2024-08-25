import type React from 'react';
import ButtonPlayMusicPlayer from '@/components/ButtonPlayMusicPlayer';
import type { PostWithRelations } from '@/types/types';

interface MediaAudioProps {
  post: PostWithRelations;
}

const MediaAudio: React.FC<MediaAudioProps> = ({ post }) => {
  // اطمینان از وجود audioUrl قبل از رندر ButtonPlayMusicPlayer
  if (!post.audioUrl) {
    return null;
  }

  return (
    <ButtonPlayMusicPlayer
      className="absolute inset-0 bg-neutral-900/30 flex items-center justify-center"
      post={post}
    />
  );
};

export default MediaAudio;
