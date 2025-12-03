'use client';

import React from 'react';

export default function WelcomeSectionBackground() {
  return (
    <>
      {/* Simple gradient orbs - no heavy animations */}
      <div
        className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      
      <div
        className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(79,70,229,0.4) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </>
  );
}
