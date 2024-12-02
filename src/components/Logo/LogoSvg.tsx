import React from 'react';

type LogoSvgProps = {
  className?: string;
};

const LogoSvg = ({ className }: LogoSvgProps) => {
  return (
    <svg
      width="300"
      height="300"
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>

      {/* Base Shape - Hexagon */}
      <path
        d="M225 75L150 37.5L75 75L37.5 150L75 225L150 262.5L225 225L262.5 150L225 75Z"
        fill="url(#primaryGradient)"
      />

      {/* Inner Ring */}
      <path
        d="M195 105L150 82.5L105 105L82.5 150L105 195L150 217.5L195 195L217.5 150L195 105Z"
        fill="white"
        opacity="0.1"
      />

      {/* Chart Lines */}
      <path
        d="M105 165L127.5 135L150 150L172.5 120L195 135"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Accent Points */}
      <circle cx="127.5" cy="135" r="4.5" fill="white" />
      <circle cx="172.5" cy="120" r="4.5" fill="white" />

      <title>Financial Market Logo</title>
    </svg>
  );
};

export default LogoSvg;
