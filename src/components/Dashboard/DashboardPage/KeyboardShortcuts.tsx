'use client';

import { useToast } from '@/components/ui/use-toast';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import type { PortalType } from './DashboardProviders';

const HIGHLIGHT_DURATION_MS = 1600;
const ADMIN_HIGHLIGHT_TARGET = 'liveops';
/** Event name Header listens to for silent focus (see Header.tsx). */
const SILENT_SEARCH_FOCUS_EVENT = 'cmd-search:focus-silently';

/**
 * KeyboardShortcuts — global hotkeys (admin-scoped + portal-agnostic).
 *
 * Universal (all portals):
 *   • ⌘/Ctrl + K         → open command palette
 *   • g t                → toggle dark/light theme
 *   • g k                → focus the Header search input
 *   • g ?                → toast listing all chord shortcuts
 *
 * Admin-only (gated by `portal === 'admin'`):
 *   • g d                → /dashboard                  (home)
 *   • g p                → /dashboard/posts            (content)
 *   • g s                → /dashboard/settings         (system)
 *   • g r                → /dashboard/reports          (analytics)
 *   • g c                → /dashboard/customers        (people)
 *   • g a                → /dashboard/audit-log        (activity)
 *   • g l                → /dashboard + scroll to LiveOps widget
 *
 * Architecture note:
 *   The chord layer is intentionally small (one component, no per-portal
 *   duplication). Adding a parallel `useChordShortcut` hook was rejected
 *   during cleanup because the codebase already canonicalises keyboard
 *   handling through `useHotkeys` (see the "CUSTOM-FIRST, NATIVE-NEVER"
 *   P0 rule in AGENTS.md). The `onPrefix`-style hint is achieved here
 *   via the `g ?` toast instead of a dedicated UI surface.
 */
export function KeyboardShortcuts({ portal = 'admin' }: { portal?: PortalType }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { toggleDarkMode } = useThemeMode();

  // Smoothly scroll to a [data-shortcut-target="..."] element and pulse
  // a `data-shortcut-active` flag for CSS-side highlight.
  const focusTarget = useCallback(
    (target: string, fallbackHref?: string) => {
      const el = document.querySelector(`[data-shortcut-target="${target}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.dataset.shortcutActive = 'true';
        window.setTimeout(() => {
          delete el.dataset.shortcutActive;
        }, HIGHLIGHT_DURATION_MS);
        return;
      }
      if (fallbackHref) {
        router.push(`${fallbackHref}#${target}`);
      }
    },
    [router],
  );

  // Focus the Header search input directly. Uses the `cmd-search:focus-silently`
  // custom event so the Header can set a one-shot "silent focus" flag and
  // skip opening the command palette in admin (which would otherwise fire
  // from the input's `onFocus` and visually collide with this shortcut's
  // intent — a quick inline search, not the palette overlay).
  const focusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent(SILENT_SEARCH_FOCUS_EVENT));
  }, []);

  // Theme toggle — universal across all portals.
  const handleThemeToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  // The full admin keymap. Non-admin portals only get the universal subset.
  const adminKeys: Record<string, () => void> = {
    'g d': () => router.push('/dashboard'),
    'g p': () => router.push('/dashboard/posts'),
    'g s': () => router.push('/dashboard/settings'),
    'g r': () => router.push('/dashboard/reports'),
    'g c': () => router.push('/dashboard/customers'),
    'g a': () => router.push('/dashboard/audit-log'),
    'g l': () => focusTarget(ADMIN_HIGHLIGHT_TARGET, '/dashboard'),
  };

  const universalKeys: Record<string, () => void> = {
    'Mod+K': () => {
      window.dispatchEvent(new CustomEvent('cmd-palette:open'));
    },
    'g t': handleThemeToggle,
    'g k': focusSearch,
    'g ?': () => {
      toast({
        title: 'میان‌برهای صفحه‌کلید',
        description:
          '⌘/Ctrl + K فرمان · g t تغییر تم · g k جستجو' +
          (portal === 'admin'
            ? ' · g d داشبورد · g p نوشته‌ها · g s تنظیمات · g r گزارش‌ها · g c مشتریان · g a ممیزی · g l مرکز عملیات'
            : ''),
        duration: 6000,
      });
    },
  };

  useHotkeys(portal === 'admin' ? { ...universalKeys, ...adminKeys } : universalKeys);

  // If we landed on the dashboard with a #liveops hash, scroll to it
  // (the `focusTarget` chord only runs while the user is on the page).
  useEffect(() => {
    if (portal !== 'admin') return;
    if (pathname !== '/dashboard') return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== `#${ADMIN_HIGHLIGHT_TARGET}`) return;
    const raf = window.requestAnimationFrame(() => focusTarget(ADMIN_HIGHLIGHT_TARGET));
    return () => window.cancelAnimationFrame(raf);
  }, [pathname, focusTarget, portal]);

  return null;
}
