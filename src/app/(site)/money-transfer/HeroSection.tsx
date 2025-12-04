'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Globe, Shield, Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center overflow-hidden overflow-x-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-900 dark:to-slate-900" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 sm:-top-1/4 sm:-right-1/4 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-gradient-to-br from-blue-400/40 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-20 -left-20 sm:-bottom-1/4 sm:-left-1/4 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-gradient-to-tr from-indigo-500/30 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center lg:text-right"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8"
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white/90">صرافی آنلاین معتبر</span>
            </motion.div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 sm:mb-6">
              انتقال ارز
              <br />
              <span className="bg-gradient-to-l from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
                سریع و مطمئن
              </span>
            </h1>

            <p className="text-sm sm:text-lg md:text-xl text-blue-100/80 leading-relaxed mb-6 sm:mb-10 max-w-xl mx-auto lg:mx-0 lg:mr-0 px-4 sm:px-0">
              بهترین نرخ‌ها برای حواله ارزی در سراسر جهان با امنیت بالا و کارمزد پایین
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-4 sm:px-0">
              <motion.a
                href="#rates"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_15px_50px_-10px_rgba(255,255,255,0.4)] transition-all duration-300"
              >
                <span>مشاهده نرخ‌های لحظه‌ای</span>
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
              </motion.a>
              
              <motion.a
                href="#contact"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-md text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <span>تماس با ما</span>
              </motion.a>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:grid grid-cols-2 gap-4"
          >
            {[
              { icon: Globe, title: 'پوشش جهانی', desc: 'انتقال به بیش از ۵۰ کشور', color: 'from-blue-400 to-blue-600' },
              { icon: Zap, title: 'سرعت بالا', desc: 'انتقال در کمتر از ۲۴ ساعت', color: 'from-amber-400 to-orange-500' },
              { icon: Shield, title: 'امنیت کامل', desc: 'رمزنگاری پیشرفته', color: 'from-emerald-400 to-teal-600' },
              { icon: Globe, title: 'نرخ رقابتی', desc: 'بهترین قیمت بازار', color: 'from-purple-400 to-indigo-600' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 hover:bg-white/15 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-blue-100/70">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            className="fill-slate-50 dark:fill-slate-950"
          />
        </svg>
      </div>
    </section>
  );
}
