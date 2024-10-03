'use client';

import type React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

interface ClientSideWrapperProps {
  children: React.ReactNode;
}

function ClientSideWrapper({ children }: ClientSideWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleOpenModalImageGallery = () => {
    router.push(`${pathname}/?modal=PHOTO_TOUR_SCROLLABLE` as Route);
  };

  const handleCloseModalImageGallery = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('modal');
    router.push(`${pathname}/?${params.toString()}` as Route);
  };

  return <div onClick={handleOpenModalImageGallery}>{children}</div>;
}

export default ClientSideWrapper;
