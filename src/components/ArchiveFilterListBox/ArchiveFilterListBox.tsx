'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Clock, TrendingUp, Calendar, List, ChevronDown, Check } from 'lucide-react';

export interface ArchiveFilterListBoxProps {
  className?: string;
  filters: { name: string }[];
  initialFilter: string;
}

const getFilterIcon = (name: string) => {
  if (name.includes('همه')) return <List className="w-4 h-4" />;
  if (name.includes('جدید')) return <Clock className="w-4 h-4" />;
  if (name.includes('قدیم')) return <Calendar className="w-4 h-4" />;
  if (name.includes('محبوب')) return <TrendingUp className="w-4 h-4" />;
  return <List className="w-4 h-4" />;
};

const ArchiveFilterListBox: React.FC<ArchiveFilterListBoxProps> = ({
  className = '',
  filters,
  initialFilter,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(initialFilter);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (value: string) => {
    setSelected(value);
    setIsOpen(false);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('filter', value);
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`nc-ArchiveFilterListBox relative ${className}`} dir="rtl" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="انتخاب فیلتر مرتب‌سازی"
        className="
          flex items-center justify-between gap-2
          w-[160px] h-11 
          px-4 
          bg-[rgb(var(--background))]
          border-2 border-[rgb(var(--border))]
          hover:border-[rgb(var(--ring))]
          hover:shadow-md
          rounded-2xl 
          shadow-sm 
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]/30 focus:border-[rgb(var(--ring))]
          text-sm font-medium
          text-[rgb(var(--foreground))]
        "
      >
        <span className="flex items-center gap-2">
          <span className="text-[rgb(var(--muted-foreground))]">
            {getFilterIcon(selected)}
          </span>
          <span className="truncate">{selected}</span>
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-[rgb(var(--muted-foreground))] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute top-full mt-2 
            right-0
            min-w-[180px] 
            p-2 
            bg-[rgb(var(--popover))]
            border-2 border-[rgb(var(--border))]
            rounded-2xl 
            shadow-xl
            z-50
          "
          role="listbox"
          aria-label="فیلترهای مرتب‌سازی"
        >
          <div className="space-y-1">
            {filters.map((item) => {
              const isSelected = selected === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleFilterChange(item.name)}
                  className={`
                    flex items-center gap-3 w-full
                    px-3 py-2.5 
                    text-sm font-medium
                    rounded-xl 
                    cursor-pointer 
                    transition-all duration-200
                    text-start
                    ${isSelected 
                      ? 'bg-[rgb(var(--ring))]/10 text-[rgb(var(--ring))]' 
                      : 'text-[rgb(var(--popover-foreground))] hover:bg-[rgb(var(--accent))]'
                    }
                    focus:outline-none focus:bg-[rgb(var(--accent))]
                  `}
                >
                  <span className={isSelected ? 'text-[rgb(var(--ring))]' : 'text-[rgb(var(--muted-foreground))]'}>
                    {getFilterIcon(item.name)}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[rgb(var(--ring))]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveFilterListBox;
