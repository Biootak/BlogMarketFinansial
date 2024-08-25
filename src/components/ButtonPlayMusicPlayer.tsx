'use client';

import Image from 'next/image';
import iconPlaying from '@/images/icon-playing.gif';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import type { PostWithRelations } from '@/types/types';

export interface ButtonPlayMusicPlayerProps {
  className?: string;
  post: PostWithRelations;
  renderChildren?: (playing: boolean) => React.ReactNode;
  renderDefaultBtn?: () => React.ReactNode;
  renderPlayingBtn?: () => React.ReactNode;
}

const ButtonPlayMusicPlayer: React.FC<ButtonPlayMusicPlayerProps> = ({
  className = '',
  post,
  renderChildren,
  renderDefaultBtn,
  renderPlayingBtn,
}) => {
  const { postData: currentMediaPostData, setPostData, setPlaying, playing } = useMusicPlayer();

  const handleClickNewAudio = () => {
    setPostData(post);
    setPlaying(true);
  };

  const handleClickButton = () => {
    if (
      !currentMediaPostData ||
      currentMediaPostData.id !== post.id ||
      currentMediaPostData.audioUrl !== post.audioUrl
    ) {
      return handleClickNewAudio();
    }

    setPlaying(!playing);
  };

  const _renderDefaultBtn = () => {
    if (renderDefaultBtn) {
      return renderDefaultBtn();
    }
    return (
      <PostTypeFeaturedIcon
        className="z-20 hover:scale-105 transform cursor-pointer transition-transform"
        postType="AUDIO"
      />
    );
  };

  const _renderPlayingBtn = () => {
    if (currentMediaPostData?.id !== post.id) {
      return _renderDefaultBtn();
    }

    if (renderPlayingBtn) {
      return renderPlayingBtn();
    }

    return (
      <span className="z-10 bg-neutral-900 bg-opacity-60 rounded-full flex items-center justify-center text-xl text-white border border-white w-11 h-11 cursor-pointer">
        <Image className="w-5" src={iconPlaying} alt="paused" />
      </span>
    );
  };

  return (
    <div
      className={`nc-ButtonPlayMusicPlayer select-none ${className}`}
      onClick={handleClickButton}
    >
      {renderChildren ? (
        renderChildren(playing)
      ) : (
        <>{playing ? _renderPlayingBtn() : _renderDefaultBtn()}</>
      )}
    </div>
  );
};

export default ButtonPlayMusicPlayer;
