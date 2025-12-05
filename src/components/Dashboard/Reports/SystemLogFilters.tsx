'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, Code, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemLogFilters } from '@/actions/reports/systemLogs';

interface SystemLogFiltersProps {
  onFilterChange: (filters: SystemLogFilters) => void;
  sources: string[];
}

const LOG_LEVELS = [
  { value: 'all', label: 'همه سطوح' },
  { value: 'INFO', label: 'اطلاعات' },
  { value: 'WARNING', label: 'هشدار' },
  { value: 'ERROR', label: 'خطا' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'امروز' },
  { value: 'yesterday', label: 'دیروز' },
  { value: '7days', label: '7 روز گذشته' },
  { value: '30days', label: '30 روز گذشته' },
  { value: 'thisMonth', label: 'این ماه' },
  { value: 'custom', label: 'سفارشی' },
];

export function SystemLogFilters({ onFilterChange, sources }: SystemLogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [source, setSource] = useState('all');
  const [datePreset, setDatePreset] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (level !== 'all') count++;
    if (source !== 'all') count++;
    if (dateFrom || dateTo) count++;
    setActiveFiltersCount(count);
  }, [searchQuery, level, source, dateFrom, dateTo]);

  const applyFilters = () => {
    const filters: SystemLogFilters = {};

    if (searchQuery) filters.searchQuery = searchQuery;
    if (level !== 'all') filters.level = level;
    if (source !== 'all') filters.source = source;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    onFilterChange(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLevel('all');
    setSource('all');
    setDatePreset('');
    setDateFrom('');
    setDateTo('');
    onFilterChange({});
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (preset) {
      case 'today':
        setDateFrom(today.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'yesterday':
        setDateFrom(yesterday.toISOString().split('T')[0]);
        setDateTo(yesterday.toISOString().split('T')[0]);
        break;
      case '7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        setDateFrom(week.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case '30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        setDateFrom(month.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(firstDay.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'custom':
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="جستجو در پیام‌ها و منابع..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
        />
      </div>

      {/* Filter Toggle Button */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium',
            isOpen ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>فیلترها</span>
          {activeFiltersCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{activeFiltersCount}</span>}
        </button>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">پاک کردن</span>
          </button>
        )}

        <button
          type="button"
          onClick={applyFilters}
          className="mr-auto px-5 py-2 rounded-xl bg-gradient-to-l from-amber-600 to-orange-700 text-white font-medium text-sm hover:shadow-lg transition-all"
        >
          اعمال
        </button>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-lg space-y-4 sm:space-y-6">
          {/* Level Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <AlertCircle className="w-4 h-4" />
              سطح لاگ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOG_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setLevel(lvl.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                    level === lvl.value ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                  )}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Code className="w-4 h-4" />
              منبع
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
            >
              <option value="all">همه منابع</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4" />
              بازه زمانی
            </label>

            {/* Date Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleDatePresetChange(preset.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    datePreset === preset.value ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">از تاریخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">تا تاریخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
