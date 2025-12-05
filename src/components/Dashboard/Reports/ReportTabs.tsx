'use client';

import { cn } from '@/lib/utils';
import { ReportCard } from './ReportCard';
import { LucideIcon } from 'lucide-react';

export interface ReportTab {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
}

interface ReportTabsProps {
  tabs: ReportTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function ReportTabs({ tabs, activeTab, onTabChange }: ReportTabsProps) {
  return (
    <nav className="relative">
      {/* Tabs Container with Glass Effect */}
      <div className="relative p-1.5 sm:p-2 bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xl sm:shadow-2xl shadow-gray-300/30">
        {/* Inner Glow */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row gap-1.5 sm:gap-2">
          {tabs.map((tab) => (
            <ReportCard
              key={tab.id}
              icon={tab.icon}
              title={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              gradient={tab.gradient}
              glowColor={tab.glowColor}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
