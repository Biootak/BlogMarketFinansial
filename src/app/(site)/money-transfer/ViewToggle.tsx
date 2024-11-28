'use client';

import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'card' | 'table';
  setView: (view: 'table' | 'card') => void;
}

export function ViewToggle({ view, setView }: ViewToggleProps) {
  return (
    <div className="flex justify-center space-x-4 space-x-reverse mb-6">
      <Button
        variant={view === 'table' ? 'default' : 'outline'}
        onClick={() => setView('table')}
        className="order-1"
      >
        نمایش جدولی
      </Button>
      <Button
        variant={view === 'card' ? 'default' : 'outline'}
        onClick={() => setView('card')}
        className="order-2"
      >
        نمایش کارتی
      </Button>
    </div>
  );
}
