'use client';

import { useState } from 'react';
import { Activity, BarChart3, Terminal, Sparkles, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ReportsSkeleton } from '@/components/Skeletons';
import { cn } from '@/lib/utils';

const SystemReports = dynamic(() => import('@/components/Dashboard/Reports/SystemReports'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const ActivityLog = dynamic(() => import('@/components/Dashboard/Reports/ActivityLog'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const SystemLogsData = dynamic(() => import('./SystemLogsData'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      label: 'نمای کلی',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <SystemReports />,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      glowColor: 'rgba(59, 130, 246, 0.5)',
    },
    {
      id: 'activity',
      label: 'گزارش فعالیت‌ها',
      icon: <Activity className="w-4 h-4" />,
      component: <ActivityLog />,
      gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.5)',
    },
    {
      id: 'logs',
      label: 'لاگ‌های سیستم',
      icon: <Terminal className="w-4 h-4" />,
      component: <SystemLogsData />,
      gradient: 'from-amber-500 via-amber-600 to-orange-600',
      glowColor: 'rgba(245, 158, 11, 0.5)',
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-10 lg:py-14 px-3 sm:px-4 md:px-6 lg:px-8" dir="rtl">
      {/* Enhanced Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs - Responsive sizes */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-gradient-to-bl from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] lg:w-[500px] lg:h-[500px] bg-gradient-to-tr from-purple-400/15 via-pink-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] md:w-[400px] md:h-[400px] bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:48px_48px] md:bg-[size:64px_64px]" />
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
        {/* Premium Header Section */}
        <header className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-4 sm:gap-5 lg:gap-8">
            {/* Title Area */}
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon with Multi-layer Glow - Responsive */}
                <div className="relative group flex-shrink-0">
                  {/* Outer Glow Layers */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl blur-xl sm:blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                  
                  {/* Icon Container */}
                  <div className="relative p-3 sm:p-3.5 md:p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500 group-hover:scale-105">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-lg" />
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  
                  {/* Floating Particles - Hidden on very small screens */}
                  <div className="hidden sm:block absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                  <div className="hidden sm:block absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 space-y-2 sm:space-y-2.5">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-l from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent leading-tight tracking-tight">
                      گزارش‌های سیستم
                    </h1>
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30">
                      <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      فعال
                    </span>
                  </div>
                  
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium leading-relaxed">
                    مشاهده وضعیت لحظه‌ای، آمار تحلیلی و گزارش‌های جامع عملکرد سیستم
                  </p>
                  
                  {/* Decorative Line */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                    <div className="h-0.5 sm:h-1 w-12 sm:w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                    <div className="h-0.5 sm:h-1 w-6 sm:w-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                    <div className="h-0.5 sm:h-1 w-3 sm:w-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>


          </div>
        </header>

        {/* Premium Tabs Navigation */}
        <nav className="relative">
          {/* Tabs Container with Glass Effect */}
          <div className="relative p-1.5 sm:p-2 bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xl sm:shadow-2xl shadow-gray-300/30">
            {/* Inner Glow */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            
            <div className="relative flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 md:gap-3',
                      'px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4',
                      'rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base',
                      'transition-all duration-300 ease-out',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                      'group overflow-hidden',
                      'flex-1 min-w-0'
                    )}
                  >
                    {isActive ? (
                      <>
                        {/* Active State - Premium Gradient */}
                        <div className={cn(
                          'absolute inset-0 bg-gradient-to-l',
                          tab.gradient,
                          'shadow-lg sm:shadow-xl'
                        )} style={{ boxShadow: `0 4px 16px -4px ${tab.glowColor}, 0 8px 32px -8px ${tab.glowColor}` }} />
                        
                        {/* Shine Animation */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        
                        {/* Content */}
                        <span className="relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                          {tab.icon}
                        </span>
                        <span className="relative z-10 text-white drop-shadow-sm truncate">{tab.label}</span>
                        
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/10 animate-pulse" />
                      </>
                    ) : (
                      <>
                        {/* Inactive State - Elegant Hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl border border-gray-200/50 group-hover:border-gray-300 group-hover:shadow-md sm:group-hover:shadow-lg transition-all duration-300" />
                        
                        {/* Hover Gradient */}
                        <div className={cn(
                          'absolute inset-0 bg-gradient-to-l opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl sm:rounded-2xl',
                          tab.gradient
                        )} />
                        
                        {/* Content */}
                        <span className="relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gray-100 rounded-lg sm:rounded-xl group-hover:bg-gray-200 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
                          <span className="text-gray-600 group-hover:text-gray-800 transition-colors duration-300">
                            {tab.icon}
                          </span>
                        </span>
                        <span className="relative z-10 text-gray-700 group-hover:text-gray-900 transition-colors duration-300 truncate">
                          {tab.label}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Premium Content Area */}
        <main className="relative">
          {/* Multi-layer Glass Card */}
          <div className="relative">
            {/* Outer Glow */}
            <div className={cn(
              'absolute -inset-0.5 sm:-inset-1 bg-gradient-to-l rounded-2xl sm:rounded-3xl blur-lg sm:blur-xl opacity-20',
              activeTabData?.gradient || 'from-blue-500 to-indigo-600'
            )} />
            
            {/* Main Card */}
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl sm:rounded-3xl',
                'bg-white/90 backdrop-blur-2xl',
                'border border-white/80 sm:border-2',
                'shadow-xl sm:shadow-2xl shadow-gray-400/20'
              )}
            >
              {/* Top Gradient Bar - Thicker & More Prominent */}
              <div
                className={cn(
                  'absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-l',
                  activeTabData?.gradient || 'from-blue-500 to-indigo-600'
                )}
              />

              {/* Multi-layer Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-50/50 to-transparent pointer-events-none" />

              {/* Content with Enhanced Spacing - Responsive */}
              <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
                {/* Content Wrapper with Fade-in Animation */}
                <div className="animate-in fade-in duration-500">
                  {activeTabData?.component}
                </div>
              </div>

              {/* Bottom Subtle Gradient */}
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
