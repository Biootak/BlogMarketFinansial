'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function WelcomeSectionBackground() {
  return (
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-700"
      animate={{
        x: ['0%', '100%', '0%'],
      }}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        repeatType: 'reverse',
        duration: 10,
      }}
    />
  );
}
