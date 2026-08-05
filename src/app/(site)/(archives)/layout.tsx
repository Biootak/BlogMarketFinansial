import type React from 'react';
import '../../atelier-archive.css';
import '@/styles/archive-hub.css';

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="nc-ArchiveLayout">{children}</div>;
}
