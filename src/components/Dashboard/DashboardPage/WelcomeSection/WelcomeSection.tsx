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
          0 0 0 1px rgba(255,255,255,0.1),
          0 4px 6px -1px rgba(0,0,0,0.1),
          0 20px 25px -5px rgba(124,58,237,0.25),
          0 40px 60px -12px rgba(79,70,229,0.3),
          inset 0 1px 0 rgba(255,255,255,0.1)
        `,
      }}
    >
      {/* Multi-layer gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/40 via-transparent to-cyan-500/20" />
      <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/20 via-transparent to-blue-600/30" />
      
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
