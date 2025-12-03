'use client';

import { motion } from 'framer-motion';
import WelcomeSectionBackground from './WelcomeSectionBackground';
import WelcomeSectionContent from './WelcomeSectionContent';

export default function WelcomeSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-xl"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/30 via-transparent to-blue-600/20" />
      
      {/* Background elements */}
      <WelcomeSectionBackground />
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-white/5" />
      
      {/* Decorative blurs */}
      <div className="absolute top-0 left-0 w-60 h-60 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      {/* Content */}
      <WelcomeSectionContent />
    </motion.div>
  );
}
