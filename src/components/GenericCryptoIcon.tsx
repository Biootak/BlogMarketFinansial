import type React from 'react';

interface GenericCryptoIconProps {
  className?: string;
}

const GenericCryptoIcon: React.FC<GenericCryptoIconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#ff9a9e', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#fad0c4', stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#a18cd1', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#fbc2eb', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    {/* Background circle */}
    <circle cx="12" cy="12" r="10" fill="url(#grad1)" />

    {/* Inner circle */}
    <circle cx="12" cy="12" r="8" fill="url(#grad2)" stroke="#ffffff" strokeWidth="0.5" />

    {/* Crypto symbol */}
    <path
      d="M11 7h2v1.5h1.5v1h-1.5v2h1.5v1h-1.5V16h-2v-3.5H9.5v-1H11v-2H9.5v-1H11V7z"
      fill="#ffffff"
    />

    {/* Decorative elements */}
    <circle
      cx="12"
      cy="12"
      r="6"
      fill="none"
      stroke="#ffffff"
      strokeWidth="0.5"
      strokeDasharray="3,1"
    />
    <path d="M12 9l1.5 1.5L12 12l-1.5-1.5z" fill="#ffffff" opacity="0.7" />
    <path d="M12 12l1.5 1.5L12 15l-1.5-1.5z" fill="#ffffff" opacity="0.7" />

    {/* Sparkles */}
    <circle cx="6" cy="6" r="0.5" fill="#ffffff" />
    <circle cx="18" cy="6" r="0.5" fill="#ffffff" />
    <circle cx="6" cy="18" r="0.5" fill="#ffffff" />
    <circle cx="18" cy="18" r="0.5" fill="#ffffff" />

    <title>پیش فرض</title>
  </svg>
);

export default GenericCryptoIcon;
