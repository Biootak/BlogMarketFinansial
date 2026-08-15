'use client';

/**
 * SearchModalLazy — click-to-open search with the heavy modal deferred.
 *
 * The full `SearchModal` pulls in @headlessui/react (+ ~109 KB chunk) on every
 * page load even though the dialog is closed. This wrapper renders only a
 * static trigger button initially; the dialog module (headlessui) is fetched
 * lazily the first time the user opens search, so the modal cost is paid only
 * on interaction, not on first paint.
 */
import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';

const LazySearchModal = dynamic(() => import('./SearchModal'), {
  ssr: false,
});

interface Props {
  renderTrigger?: () => ReactNode;
}

export default function SearchModalLazy({ renderTrigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          relative
          flex items-center justify-center
          size-10 rounded-xl
          text-neutral-600 dark:text-neutral-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
          transition-colors duration-200
        "
        aria-label="جستجو"
      >
        {renderTrigger ? renderTrigger() : <Search className="size-5" />}
      </button>

      {open && (
        <LazySearchModal
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
