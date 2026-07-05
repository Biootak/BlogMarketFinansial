import type React from 'react';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import { debounce } from 'lodash';
import { COLOR_PALETTE, DEFAULT_COLORS, hexToRgba, rgbaToHexAlpha, isRgba } from '../constants/color';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type ColorPickerProps = {
  color?: string;
  onChange: (color: string) => void;
  onClear: () => void;
  showOpacity?: boolean;
};

export const ColorPicker = memo(({ color, onChange, onClear, showOpacity = true }: ColorPickerProps) => {
  // استخراج hex و alpha از رنگ فعلی
  const { initialHex, initialAlpha } = useMemo(() => {
    if (!color) return { initialHex: '#000000', initialAlpha: 1 };
    if (isRgba(color)) {
      const { hex, alpha } = rgbaToHexAlpha(color);
      return { initialHex: hex, initialAlpha: alpha };
    }
    return { initialHex: color, initialAlpha: 1 };
  }, [color]);

  const [hexColor, setHexColor] = useState<string>(initialHex);
  const [opacity, setOpacity] = useState<number>(initialAlpha);
  const [colorInputValue, setColorInputValue] = useState<string>(initialHex);
  const [activeTab, setActiveTab] = useState<'palette' | 'custom'>('palette');

  // به‌روزرسانی رنگ نهایی
  const updateFinalColor = useCallback((hex: string, alpha: number) => {
    if (alpha < 1) {
      onChange(hexToRgba(hex, alpha));
    } else {
      onChange(hex);
    }
  }, [onChange]);

  // دیبانس شده برای تغییرات
  const debouncedUpdateColor = useMemo(
    () => debounce((hex: string, alpha: number) => updateFinalColor(hex, alpha), 150),
    [updateFinalColor]
  );

  const handleHexChange = useCallback((newHex: string) => {
    setHexColor(newHex);
    setColorInputValue(newHex);
    debouncedUpdateColor(newHex, opacity);
  }, [opacity, debouncedUpdateColor]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    debouncedUpdateColor(hexColor, newOpacity);
  }, [hexColor, debouncedUpdateColor]);

  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setColorInputValue(e.target.value);
  }, []);

  const handleColorInputBlur = useCallback(() => {
    const isCorrectColor = /^#([0-9A-F]{3}){1,2}$/i.test(colorInputValue);
    if (!isCorrectColor) return;
    setHexColor(colorInputValue);
    updateFinalColor(colorInputValue, opacity);
  }, [colorInputValue, opacity, updateFinalColor]);

  const handlePaletteColorClick = useCallback((value: string) => {
    setHexColor(value);
    setColorInputValue(value);
    updateFinalColor(value, opacity);
  }, [opacity, updateFinalColor]);

  useEffect(() => {
    if (!color) return;
    if (isRgba(color)) {
      const { hex, alpha } = rgbaToHexAlpha(color);
      setHexColor(hex);
      setColorInputValue(hex);
      setOpacity(alpha);
    } else {
      setHexColor(color);
      setColorInputValue(color);
      setOpacity(1);
    }
  }, [color]);

  return (
    <div className="flex flex-col gap-3 p-1 min-w-[280px]">
      {/* تب‌ها */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'palette'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          پالت رنگ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'custom'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          سفارشی
        </button>
      </div>

      {activeTab === 'palette' ? (
        /* پالت رنگی */
        <div className="space-y-2">
          {Object.entries(COLOR_PALETTE).map(([category, colors]) => (
            <div key={category} className="flex gap-1">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handlePaletteColorClick(c.value)}
                  title={c.name}
                  className={cn(
                    'w-7 h-7 rounded-md transition-all hover:scale-110 border',
                    hexColor.toLowerCase() === c.value.toLowerCase()
                      ? 'ring-2 ring-primary-500 ring-offset-1'
                      : '',
                    c.isBrightColor ? 'border-gray-200 dark:border-gray-600' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* انتخاب‌گر سفارشی */
        <div className="space-y-3">
          <HexColorPicker 
            className="!w-full !h-40" 
            color={hexColor} 
            onChange={handleHexChange} 
          />
          
          {/* ورودی hex */}
          <div className="flex gap-2 items-center">
            <div
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0"
              style={{ 
                backgroundColor: opacity < 1 ? hexToRgba(hexColor, opacity) : hexColor,
                backgroundImage: opacity < 1 
                  ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                  : 'none',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
              }}
            >
              <div 
                className="w-full h-full rounded-lg"
                style={{ backgroundColor: opacity < 1 ? hexToRgba(hexColor, opacity) : hexColor }}
              />
            </div>
            <input
              type="text"
              className="flex-1 outline-none px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary-500 rounded-lg text-sm font-mono"
              placeholder="#000000"
              value={colorInputValue}
              onChange={handleColorInputChange}
              onBlur={handleColorInputBlur}
            />
          </div>
        </div>
      )}

      {/* اسلایدر شفافیت */}
      {showOpacity && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">شفافیت</span>
            <span className="font-mono text-gray-900 dark:text-white">{Math.round(opacity * 100)}%</span>
          </div>
          <div className="relative">
            {/* پس‌زمینه شطرنجی برای نمایش شفافیت */}
            <div 
              className="absolute inset-0 rounded-lg"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
              }}
            />
            <div 
              className="absolute inset-0 rounded-lg"
              style={{
                background: `linear-gradient(to right, transparent, ${hexColor})`
              }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={handleOpacityChange}
              className="relative w-full h-6 appearance-none bg-transparent cursor-pointer opacity-slider"
            />
          </div>
        </div>
      )}

      {/* رنگ‌های سریع و دکمه پاک کردن */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
        {DEFAULT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handlePaletteColorClick(c.value)}
            title={c.name}
            className={cn(
              'w-6 h-6 rounded-md transition-all hover:scale-110',
              hexColor.toLowerCase() === c.value.toLowerCase()
                ? 'ring-2 ring-primary-500 ring-offset-1'
                : ''
            )}
            style={{ backgroundColor: c.value }}
          />
        ))}
        <button
          type="button"
          onClick={onClear}
          className="ms-auto p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          title="پاک کردن رنگ"
        >
          <Icon name="Undo" strokeWidth={2} className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';
