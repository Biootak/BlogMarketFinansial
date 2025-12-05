'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, User, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityFilters } from '@/actions/reports/activityLogs';

interface ActivityFiltersProps {
  onFilterChange: (filters: ActivityFilters) => void;
  users: Array<{ id: string; name: string; email: string }>;
}

const ACTION_TYPES = [
  { value: 'all', label: 'همه فعالیت‌ها' },
  { value: 'ایجاد', label: 'ایجاد' },
  { value: 'ویرایش', label: 'ویرایش' },
  { value: 'حذف', label: 'حذف' },
  { value: 'تغییر وضعیت', label: 'تغییر وضعیت' },
  { value: 'ورود', label: 'ورود' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'امروز' },
  { value: 'yesterday', label: 'دیروز' },
  { value: '7days', label: '7 روز گذشته' },
  { value: '30days', label: '30 روز گذشته' },
  { value: 'thisMonth', label: 'این ماه' },
  { value: 'lastMonth', label: 'ماه گذشته' },
  { value: 'custom', label: 'سفارشی' },
];

export function ActivityFilters({ onFilterChange, users }: ActivityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionType, setActionType] = useState('all');
  const [userId, setUserId] = useState('all');
  const [datePreset, setDatePreset] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // محاسبه تعداد فیلترهای فعال
  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (actionType !== 'all') count++;
    if (userId !== 'all') count++;
    if (dateFrom || dateTo) count++;
    setActiveFiltersCount(count);
  }, [searchQuery, actionType, userId, dateFrom, dateTo]);

  // اعمال فیلترها
  const applyFilters = () => {
    const filters: ActivityFilters = {};

    if (searchQuery) filters.searchQuery = searchQuery;
    if (actionType !== 'all') filters.actionType = actionType;
    if (userId !== 'all') filters.userId = userId;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    onFilterChange(filters);
    setIsOpen(false);
  };

  // پاک کردن فیلترها
  const clearFilters = () => {
    setSearchQuery('');
    setActionType('all');
    setUserId('all');
    setDatePreset('');
    setDateFrom('');
    setDateTo('');
    onFilterChange({});
  };

  // تنظیم بازه زمانی از پیش‌فرض‌ها
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
      case 'lastMonth':
        const lastMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthLast = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateFrom(lastMonthFirst.toISOString().split('T')[0]);
        setDateTo(lastMonthLast.toISOString().split('T')[0]);
        break;
      case 'custom':
        // کاربر خودش تاریخ را انتخاب می‌کند
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="جستجو در فعالیت‌ها، کاربران..."
          className={cn(
            'w-full pr-10 pl-4 py-3 rounded-xl',
            'bg-white border-2 border-gray-200',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            'transition-all duration-200',
            'text-sm'
          )}
        />
      </div>

      {/* Filter Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl',
            'border-2 transition-all duration-200',
            'text-sm font-semibold',
            isOpen
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>فیلترها</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 transition-all duration-200 text-sm font-semibold"
          >
            <X className="w-4 h-4" />
            <span>پاک کردن</span>
          </button>
        )}

        <button
          type="button"
          onClick={applyFilters}
          className="mr-auto px-6 py-2.5 rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 text-white font-semibold text-sm hover:shadow-lg transition-all duration-200"
        >
          اعمال فیلتر
        </button>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-xl space-y-6">
          {/* Action Type Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Activity className="w-4 h-4" />
              نوع عملیات
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setActionType(type.value)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    'border-2',
                    actionType === type.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <User className="w-4 h-4" />
              کاربر
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-sm"
            >
              <option value="all">همه کاربران</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Calendar className="w-4 h-4" />
              بازه زمانی
            </label>
            
            {/* Date Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleDatePresetChange(preset.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                    'border-2',
                    datePreset === preset.value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-2">از تاریخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">تا تاریخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
