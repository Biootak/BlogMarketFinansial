import type { FC } from 'react';

export interface BgGlassmorphismProps {
  className?: string;
}

const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 top-0 min-h-0 ps-10 py-32 flex flex-col overflow-hidden z-0',
}) => {
  return (
    <div className={`nc-BgGlassmorphism ${className}`} data-nc-id="BgGlassmorphism">
      <span
        className="w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-20 lg:w-96 lg:h-96"
        style={{ background: 'var(--ds-accent-rose)' }}
      />
      <span
        className="w-80 h-80 ms-10 -mt-10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 lg:w-96 lg:h-96 nc-animation-delay-2000"
        style={{ background: 'var(--ds-accent-emerald)' }}
      />
    </div>
  );
};

export default BgGlassmorphism;
