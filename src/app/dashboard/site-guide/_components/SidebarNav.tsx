'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import s from './SidebarNav.module.css';
import { SECTIONS } from './data/site-guide-routes';

/**
 * SidebarNav — sticky in-page navigation with scroll-spy.
 * Shows all section anchors for quick vertical navigation.
 */
export function SidebarNav({ activeSection }: { activeSection: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={s.root} data-collapsed={collapsed} aria-label="ناوبری داخلی">
      <button
        className={s.toggle}
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'باز کردن ناوبری' : 'بستن ناوبری'}
      >
        <ChevronRight size={14} />
      </button>

      {!collapsed && (
        <nav className={s.nav}>
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={s.link}
              data-active={section.id === activeSection}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(section.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className={s.linkDot} data-tone={section.tone} />
              <span className={s.linkText}>{section.title}</span>
              <span className={s.linkCount}>{section.routes.length}</span>
            </a>
          ))}
        </nav>
      )}
    </aside>
  );
}
