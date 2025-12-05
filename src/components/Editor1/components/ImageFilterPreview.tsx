import React from 'react';

interface ImageFilterPreviewProps {
  src: string;
  filter: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
}

const ImageFilterPreview: React.FC<ImageFilterPreviewProps> = ({
  src,
  filter,
  name,
  isActive,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg transition-all ${
        isActive
          ? 'ring-2 ring-primary-500 ring-offset-2 scale-105'
          : 'hover:scale-105 hover:shadow-md'
      }`}
    >
      <div className="aspect-square w-full">
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          style={{ filter }}
        />
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] text-center backdrop-blur-sm ${
          isActive
            ? 'bg-primary-500/90 text-white'
            : 'bg-black/60 text-white'
        }`}
      >
        {name}
      </div>
    </button>
  );
};

export default ImageFilterPreview;
