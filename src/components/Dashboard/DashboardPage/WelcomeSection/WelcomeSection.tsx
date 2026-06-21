'use client';

import { motion } from '@/lib/motion-shim';
import WelcomeSectionBackground from './WelcomeSectionBackground';
import WelcomeSectionContent from './WelcomeSectionContent';

export default function WelcomeSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl text-white"
      style={{
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.08),
          0 4px 6px -1px rgba(0,0,0,0.15),
          0 24px 40px -12px oklch(45% 0.14 255 / 0.45),
          0 50px 70px -20px oklch(30% 0.10 255 / 0.5),
          inset 0 1px 0 rgba(255,255,255,0.08)
        `,
      }}
    >
      {/* Multi-layer aurora gradient — navy × indigo × emerald */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, oklch(32% 0.10 260) 0%, oklch(26% 0.09 255) 45%, oklch(20% 0.07 250) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(110% 130% at 100% 0%, oklch(62% 0.16 255 / 0.45), transparent 55%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(100% 120% at 0% 100%, oklch(68% 0.13 165 / 0.30), transparent 55%)' }} />
      
      {/* Animated background elements */}
      <WelcomeSectionBackground />
      
      {/* Glass morphism overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px] bg-white/[0.02]" />
      
      {/* Top highlight */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-400/20 to-transparent rounded-tr-full" />
      
      {/* Content wrapper with padding */}
      <div className="relative z-10 p-8 sm:p-10">
        <WelcomeSectionContent />
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-indigo-900/20 to-transparent pointer-events-none" />
    </motion.div>
  );
}
