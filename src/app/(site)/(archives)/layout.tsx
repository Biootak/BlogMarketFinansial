import type React from 'react';

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="nc-ArchiveLayout">{children}</div>;
}
