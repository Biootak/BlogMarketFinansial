'use client';

import type { ReportData } from '@/actions/reportActions';
import { toast } from '@/components/ui/use-toast';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

interface ExportButtonProps {
  data: ReportData;
  dateRange: { from: Date; to: Date };
  disabled?: boolean;
}

export function ExportButton({ data, dateRange, disabled = false }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      if (format === 'excel') {
        exportToExcel(data, dateRange);
        toast({
          title: 'موفق',
          description: 'گزارش با موفقیت به فرمت Excel دانلود شد',
        });
      } else {
        exportToCSV(data, dateRange);
        toast({
          title: 'موفق',
          description: 'گزارش با موفقیت به فرمت CSV دانلود شد',
        });
      }
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود گزارش',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative flex-1 sm:flex-initial">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={cn(
          'flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2',
          'bg-gradient-to-r from-blue-600 to-indigo-600',
          'text-white font-medium text-xs sm:text-sm rounded-lg sm:rounded-xl',
          'hover:from-blue-700 hover:to-indigo-700',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'shadow-lg hover:shadow-xl',
          'w-full sm:w-auto',
        )}
      >
        <Download
          className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0', isExporting && 'animate-bounce')}
        />
        <span className="truncate">{isExporting ? 'در حال دانلود...' : 'دانلود'}</span>
      </button>

      {isOpen && !isExporting && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 sm:right-auto mt-2 sm:w-56 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-1.5 sm:p-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 px-2 sm:px-3 py-1.5 sm:py-2">
                انتخاب فرمت
              </p>

              <button
                type="button"
                onClick={() => handleExport('excel')}
                className={cn(
                  'w-full flex items-center gap-2 sm:gap-3 px-2 py-2 sm:px-3 sm:py-2.5 rounded-md sm:rounded-lg',
                  'text-xs sm:text-sm text-gray-700 hover:bg-emerald-50',
                  'transition-colors group',
                )}
              >
                <div className="p-1 sm:p-1.5 bg-emerald-100 rounded-md sm:rounded-lg group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="font-medium truncate">Excel (XLSX)</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    فایل اکسل با چند برگه
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleExport('csv')}
                className={cn(
                  'w-full flex items-center gap-2 sm:gap-3 px-2 py-2 sm:px-3 sm:py-2.5 rounded-md sm:rounded-lg',
                  'text-xs sm:text-sm text-gray-700 hover:bg-blue-50',
                  'transition-colors group',
                )}
              >
                <div className="p-1 sm:p-1.5 bg-blue-100 rounded-md sm:rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="font-medium truncate">CSV</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    فایل متنی با جداکننده کاما
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
