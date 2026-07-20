'use client';

import React, { type FC } from 'react';
import { HiPlusCircle } from 'react-icons/hi2';
import Button, { type ButtonProps } from './Button/Button';
import ButtonPrimary from './Button/ButtonPrimary';

export interface FollowButtonProps extends ButtonProps {
  isFollowing?: boolean;
}

const FollowButton: FC<FollowButtonProps> = ({
  className,
  sizeClass,
  fontSize,
  isFollowing = false,
}) => {
  const [following, setFollowing] = React.useState(isFollowing);

  return !following ? (
    <ButtonPrimary
      className={className}
      sizeClass={sizeClass}
      fontSize={fontSize}
      onClick={() => setFollowing(true)}
    >
      <HiPlusCircle className="w-5 h-5 sm:-ms-2.5" />
      <span className="ms-2">Follow</span>
    </ButtonPrimary>
  ) : (
    <Button
      className={className}
      sizeClass={sizeClass}
      fontSize={fontSize}
      onClick={() => setFollowing(false)}
    >
      <span className="text-sm ">Following</span>
    </Button>
  );
};

export default FollowButton;
