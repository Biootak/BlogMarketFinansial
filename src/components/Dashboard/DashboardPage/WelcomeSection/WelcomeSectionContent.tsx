'use client';

import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineBolt } from 'react-icons/hi2';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function WelcomeSectionContent() {
  const user = useCurrentUser();

  return (
    <div className="relative flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-8">
      {/* Avatar Section */}
      <motion.div 
        className="relative sm:order-last flex-shrink-0"
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-4 rounded-full opacity-60"
          style={{
            background: 'conic-gradient(from 0deg, rgba(236,72,153,0.5), rgba(168,85,247,0.5), rgba(59,130,246,0.5), rgba(236,72,153,0.5))',
            filter: 'blur(20px)',
            animation: 'spin 8s linear infinite',
          }}
        />
        
        {/* Inner glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/50 via-violet-500/50 to-indigo-500/50 rounded-full blur-xl" />
        
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.08, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {/* Avatar border ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-indigo-500 p-[3px]">
            <div className="w-full h-full rounded-full bg-violet-600" />
          </div>
          
          <Avatar
            imgUrl={(user?.profile?.avatar || user?.image) ?? undefined}
            userName={user?.name ?? undefined}
            sizeClass="h-28 w-28 sm:h-32 sm:w-32"
            containerClassName="relative border-[4px] border-white/20 shadow-2xl"
          />
          
          {/* Online indicator with pulse */}
          <motion.div 
            className="absolute bottom-2 right-2 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
          >
            <span className="absolute w-6 h-6 bg-emerald-400/40 rounded-full animate-ping" />
            <span className="relative w-5 h-5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-[3px] border-white shadow-lg" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Text Content */}
      <motion.div 
        className="text-center sm:text-right flex-1 max-w-lg"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Status badges row */}
        <motion.div 
          className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Online badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>آنلاین</span>
          </div>
          
          {/* Pro badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-400/30 text-xs font-medium shadow-lg">
            <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-200">نویسنده حرفه‌ای</span>
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.h2 
          className="text-3xl sm:text-4xl font-black mb-3 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}
        >
          <span className="inline-block">سلام،</span>{' '}
          <span className="inline-block bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            {user?.name ?? 'کاربر'}
          </span>{' '}
          <motion.span 
            className="inline-block origin-bottom-right"
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
            transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
          >
            👋
          </motion.span>
        </motion.h2>
        
        {/* Description */}
        <motion.p 
          className="text-white/75 mb-6 text-base sm:text-lg leading-relaxed font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          به داشبورد وبلاگ خود خوش آمدید.
          <br className="hidden sm:block" />
          <span className="text-white/90 font-normal">آماده خلق محتوای جدید هستید؟</span>
        </motion.p>
        
        {/* Action buttons */}
        <motion.div 
          className="flex flex-wrap items-center justify-center sm:justify-start gap-3"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <NewPostButton />
          
          {/* Quick stats button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 font-medium text-sm hover:bg-white/20 transition-all duration-300 shadow-lg"
          >
            <HiOutlineBolt className="w-4 h-4" />
            <span>آمار سریع</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
