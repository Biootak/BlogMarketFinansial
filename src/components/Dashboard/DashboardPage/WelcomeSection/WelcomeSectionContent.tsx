'use client';

import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineBolt, HiOutlineShieldCheck } from 'react-icons/hi2';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useState } from 'react';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدیر ارشد',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
};

const roleColors: Record<string, { bg: string; border: string; text: string }> = {
  SUPER_ADMIN: { bg: 'from-rose-500 to-pink-600', border: 'border-rose-400/50', text: 'text-white' },
  ADMIN: { bg: 'from-violet-500 to-purple-600', border: 'border-violet-400/50', text: 'text-white' },
  AUTHOR: { bg: 'from-amber-500 to-orange-500', border: 'border-amber-400/50', text: 'text-white' },
  USER: { bg: 'from-slate-500 to-gray-600', border: 'border-slate-400/50', text: 'text-white' },
};

export default function WelcomeSectionContent() {
  const user = useCurrentUser();
  const [showRolePopup, setShowRolePopup] = useState(false);
  const userRole = user?.role || 'USER';
  const roleStyle = roleColors[userRole] || roleColors.USER;

  return (
    <div className="relative flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 lg:gap-8">
      {/* Avatar Section with Role Badge */}
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
            sizeClass="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32"
            containerClassName="relative border-[3px] sm:border-[4px] border-white/20 shadow-2xl"
          />
          
          {/* Role Badge - Clickable */}
          <motion.button
            type="button"
            className={`absolute -bottom-0.5 sm:-bottom-1 -right-0.5 sm:-right-1 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r ${roleStyle.bg} ${roleStyle.border} border shadow-lg cursor-pointer`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRolePopup(!showRolePopup)}
          >
            <HiOutlineSparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 text-white/90" />
            <span className={`text-[10px] sm:text-xs font-bold ${roleStyle.text}`}>
              {roleLabels[userRole]}
            </span>
          </motion.button>

          {/* Role Popup */}
          <AnimatePresence>
            {showRolePopup && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute -bottom-24 right-0 z-50 min-w-[180px] p-4 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${roleStyle.bg}`}>
                    <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">سطح دسترسی</p>
                    <p className="text-sm font-bold text-gray-800">{roleLabels[userRole]}</p>
                  </div>
                </div>
                {/* Arrow */}
                <div className="absolute -top-2 right-6 w-4 h-4 bg-white/95 rotate-45 border-t border-l border-white/20" />
              </motion.div>
            )}
          </AnimatePresence>
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
          className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-4"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Online badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-medium shadow-lg">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400" />
            </span>
            <span>آنلاین</span>
          </div>
          
          {/* Pro badge */}
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-400/30 text-[10px] sm:text-xs font-medium shadow-lg">
            <HiOutlineSparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
            <span className="text-amber-200 hidden xs:inline">نویسنده حرفه‌ای</span>
            <span className="text-amber-200 xs:hidden">حرفه‌ای</span>
          </div>
        </motion.div>

        {/* Greeting - Without "خوش آمدید" */}
        <motion.h2 
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-2 sm:mb-3 leading-tight"
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
        
        {/* Description - Updated */}
        <motion.p 
          className="text-white/80 mb-4 sm:mb-5 lg:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <span className="text-white/90 font-medium">آماده خلق محتوای جدید هستید؟</span>
        </motion.p>
        
        {/* Action buttons */}
        <motion.div 
          className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5 lg:gap-3"
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
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 font-medium text-xs sm:text-sm hover:bg-white/20 transition-all duration-300 shadow-lg"
          >
            <HiOutlineBolt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">آمار سریع</span>
            <span className="xs:hidden">آمار</span>
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
