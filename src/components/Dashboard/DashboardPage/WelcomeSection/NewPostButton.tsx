'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HiOutlinePencilSquare, HiOutlineSparkles } from 'react-icons/hi2';

export default function NewPostButton() {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-300"
      onClick={() => router.push('/dashboard/posts/create')}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.5),
          0 4px 6px -1px rgba(0,0,0,0.1),
          0 10px 20px -5px rgba(124,58,237,0.3),
          inset 0 1px 0 rgba(255,255,255,1)
        `,
      }}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      />
      
      {/* Icon container */}
      <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg group-hover:shadow-violet-500/40 transition-shadow duration-300">
        <HiOutlinePencilSquare className="w-4 h-4" />
      </span>
      
      {/* Text */}
      <span className="relative bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text text-transparent">
        نوشتن پست جدید
      </span>
      
      {/* Sparkle icon */}
      <HiOutlineSparkles className="relative w-4 h-4 text-amber-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />

      {/* CSS for shimmer */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </motion.button>
  );
}
