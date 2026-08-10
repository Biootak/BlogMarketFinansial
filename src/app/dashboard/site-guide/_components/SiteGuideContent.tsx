'use client';

import {
  BookOpen,
  ExternalLink,
  Info,
  Keyboard,
  Map as MapIcon,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HowToGuides } from './HowToGuides';
import { QuickAccess } from './QuickAccess';
import { ShortcutsModal } from './ShortcutsModal';
import { SidebarNav } from './SidebarNav';
import s from './SiteGuideContent.module.css';
import { SystemStatus } from './SystemStatus';
import { type RouteItem, SECTIONS, type Tone, totalPages } from './data/site-guide-routes';

/* ─── Tone maps ───────────────────────────────────────────────────── */

const TONE_ICON_CLASS: Record<Tone, string> = {
  primary: s.tonePrimary,
  emerald: s.toneEmerald,
  amber: s.toneAmber,
  rose: s.toneRose,
  violet: s.toneViolet,
  cyan: s.toneCyan,
  slate: s.toneSlate,
};

const BADGE_CLASS: Record<Tone, string> = {
  primary: s.badgePrimary,
  emerald: s.badgeEmerald,
  amber: s.badgeAmber,
  rose: s.badgeRose,
  violet: s.badgeViolet,
  cyan: s.badgeCyan,
  slate: s.badgeSlate,
};

/* ─── Route Card ──────────────────────────────────────────────────── */

function RouteCard({ item, highlighted }: { item: RouteItem; highlighted: boolean }) {
  return (
    <Link
      href={item.path}
      className={`${s.card} ${highlighted ? s.cardHighlight : ''}`}
      target={item.path.startsWith('http') ? '_blank' : undefined}
    >
      <div className={s.cardTop}>
        <span className={`${s.cardIcon} ${TONE_ICON_CLASS[item.tone]}`}>{item.icon}</span>
        <span className={s.cardLabel}>{item.label}</span>
        {item.badge && (
          <span className={`${s.cardBadge} ${BADGE_CLASS[item.badgeTone ?? item.tone]}`}>
            {item.badge}
          </span>
        )}
      </div>
      <p className={s.cardDesc}>{item.description}</p>
      <div className={s.cardBottom}>
        <span className={s.cardPath}>{item.path}</span>
        {item.ownerOnly && <span className={s.ownerTag}>مالک</span>}
      </div>
    </Link>
  );
}

/* ─── Section ─────────────────────────────────────────────────────── */

function GuideSection({
  section,
  searchQuery,
  onRef,
}: {
  section: (typeof SECTIONS)[0];
  searchQuery: string;
  onRef: (id: string, el: HTMLElement | null) => void;
}) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    onRef(section.id, rootRef.current);
  }, [section.id, onRef]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return section.routes;
    const q = searchQuery.toLowerCase();
    return section.routes.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q),
    );
  }, [section.routes, searchQuery]);

  if (filteredRoutes.length === 0) return null;

  return (
    <section ref={rootRef} id={section.id} className={s.section}>
      <div className={s.sectionHeader}>
        <span className={`${s.sectionIcon} ${TONE_ICON_CLASS[section.tone]}`}>{section.icon}</span>
        <h2 className={s.sectionTitle}>{section.title}</h2>
        <span className={s.sectionBadge}>{filteredRoutes.length} صفحه</span>
      </div>
      <div className={s.grid}>
        {filteredRoutes.map((r) => (
          <RouteCard
            key={r.path}
            item={r}
            highlighted={
              !!searchQuery &&
              (r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.path.toLowerCase().includes(searchQuery.toLowerCase()))
            }
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Main Content ────────────────────────────────────────────────── */

export function SiteGuideContent({
  userRole,
}: {
  userRole: 'OWNER' | 'SUPERADMIN' | 'ADMIN';
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const totalRoutes = totalPages();

  const handleSectionRef = useCallback((id: string, el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // Scroll-spy for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    const ids = Object.keys(sectionRefs.current);
    for (const id of ids) {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+/ → shortcuts
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
      // Ctrl+K → focus search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('guide-search');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const roleLabel =
    userRole === 'OWNER' ? 'مالک' : userRole === 'SUPERADMIN' ? 'سوپرادمین' : 'مدیر';

  return (
    <div className={s.page}>
      {/* ── Shortcuts Modal ── */}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* ── Layout: content + sidebar ── */}
      <div className={s.layout}>
        {/* Sidebar nav */}
        <SidebarNav activeSection={activeSection} />

        {/* Main content */}
        <main className={s.main}>
          {/* ── Hero ── */}
          <header className={s.hero}>
            <div className={s.heroBg} aria-hidden />
            <div className={s.heroContent}>
              <div className={s.heroLeft}>
                <span className={s.eyebrow}>
                  <Sparkles size={13} />
                  راهنمای جامع پلتفرم
                </span>
                <h1 className={s.heroTitle}>نقشه سایت و راهنمای بخش‌ها</h1>
                <p className={s.heroDesc}>
                  تور کامل از تمام صفحات، بخش‌ها و routeهای پلتفرم. هر کارت لینک مستقیم به آن صفحه
                  است.
                </p>
                <div className={s.heroMeta}>
                  <span className={s.metaChip}>{SECTIONS.length} بخش اصلی</span>
                  <span className={s.metaChip}>{totalRoutes} صفحه مستند</span>
                  <span className={`${s.metaChip} ${s.metaChipRole}`}>نقش: {roleLabel}</span>
                </div>
              </div>
              <div className={s.heroRight}>
                <div className={s.heroIcon} aria-hidden>
                  <MapIcon size={40} />
                </div>
              </div>
            </div>
          </header>

          {/* ── Search Bar ── */}
          <div className={s.searchRow}>
            <div className={s.searchWrap}>
              <Search size={18} className={s.searchIcon} />
              <input
                id="guide-search"
                type="text"
                className={s.searchInput}
                placeholder="جستجو در ۸۰+ صفحه... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir="rtl"
              />
              {searchQuery && (
                <button
                  className={s.searchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="پاک کردن"
                >
                  ×
                </button>
              )}
            </div>
            <button
              className={s.shortcutsBtn}
              onClick={() => setShortcutsOpen(true)}
              aria-label="میانبرهای کیبورد"
            >
              <Keyboard size={16} />
              میانبر
            </button>
          </div>

          {/* ── Info Box ── */}
          <div className={s.infoBox}>
            <Info size={16} className={s.infoBoxIcon} />
            <p className={s.infoBoxText}>
              روی هر کارت کلیک کنید تا مستقیماً به آن بخش بروید. کارت‌هایی که badge «مالک» دارند فقط
              برای OWNER و SUPERADMIN قابل دسترسی‌اند.
            </p>
          </div>

          {/* ── Quick Access ── */}
          <QuickAccess />

          {/* ── System Status ── */}
          <SystemStatus />

          {/* ── How-To Guides ── */}
          <HowToGuides />

          {/* ── Divider ── */}
          <div className={s.divider}>
            <BookOpen size={16} />
            <span>تمام بخش‌ها</span>
          </div>

          {/* ── Sections ── */}
          {SECTIONS.map((section) => (
            <GuideSection
              key={section.id}
              section={section}
              searchQuery={searchQuery}
              onRef={handleSectionRef}
            />
          ))}

          {/* ── Footer ── */}
          <footer className={s.footer}>
            <div className={s.footerInner}>
              <p className={s.footerText}>
                راهنمای جامع پلتفرم — {totalRoutes} صفحه در {SECTIONS.length} بخش
              </p>
              <div className={s.footerLinks}>
                <Link href="/help-center" className={s.footerLink}>
                  <ExternalLink size={12} />
                  مرکز کمک
                </Link>
                <Link href="/faq" className={s.footerLink}>
                  <ExternalLink size={12} />
                  سؤالات متداول
                </Link>
                <Link href="/support" className={s.footerLink}>
                  <ExternalLink size={12} />
                  پشتیبانی
                </Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
