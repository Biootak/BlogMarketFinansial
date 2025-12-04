'use client';

import { motion } from 'framer-motion';
import { ArrowLeftRight, Shield, Clock, Headphones, CreditCard, Globe } from 'lucide-react';

const infoCards = [
  {
    icon: ArrowLeftRight,
    title: 'نرخ‌های رقابتی',
    description: 'بهترین نرخ‌های ارز در بازار را به شما ارائه می‌دهیم.',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/20',
    bgGlow: 'bg-blue-500/10',
  },
  {
    icon: Shield,
    title: 'امنیت بالا',
    description: 'انتقال ایمن و مطمئن ارز با پیشرفته‌ترین سیستم‌های امنیتی.',
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/20',
    bgGlow: 'bg-emerald-500/10',
  },
  {
    icon: Clock,
    title: 'سرعت بالا',
    description: 'انتقال سریع ارز در کمترین زمان ممکن.',
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/20',
    bgGlow: 'bg-violet-500/10',
  },
  {
    icon: Headphones,
    title: 'پشتیبانی ۲۴/۷',
    description: 'تیم پشتیبانی ما همیشه آماده پاسخگویی به شماست.',
    gradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/20',
    bgGlow: 'bg-amber-500/10',
  },
  {
    icon: CreditCard,
    title: 'کارمزد پایین',
    description: 'کمترین کارمزد برای انتقال ارز در مقایسه با رقبا.',
    gradient: 'from-rose-500 to-pink-600',
    shadowColor: 'shadow-rose-500/20',
    bgGlow: 'bg-rose-500/10',
  },
  {
    icon: Globe,
    title: 'پوشش جهانی',
    description: 'امکان انتقال ارز به بیش از ۵۰ کشور جهان.',
    gradient: 'from-cyan-500 to-blue-600',
    shadowColor: 'shadow-cyan-500/20',
    bgGlow: 'bg-cyan-500/10',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function InfoCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
    >
      {infoCards.map((card, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          whileHover={{ y: -8, scale: 1.02 }}
          className={`group relative bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl ${card.shadowColor} hover:shadow-2xl transition-all duration-500`}
        >
          {/* Background Glow */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 ${card.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          
          {/* Icon Container */}
          <div className="relative mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
              <card.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            {/* Decorative Ring */}
            <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-l group-hover:bg-clip-text group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-all duration-300">
            {card.title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {card.description}
          </p>

          {/* Bottom Accent Line */}
          <div className={`absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r ${card.gradient} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </motion.div>
      ))}
    </motion.div>
  );
}
