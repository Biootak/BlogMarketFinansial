'use client';

import { useEffect, useRef } from 'react';

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

const SEQUENCE_TIMEOUT_MS = 1000;
const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (IGNORED_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Bind global keyboard shortcuts to handlers.
 * Supported key formats:
 *   - 'Mod+K' (Cmd on macOS, Ctrl elsewhere)
 *   - 'Escape'
 *   - 'ArrowUp' / 'ArrowDown' / etc.
 *   - 'g d' / 'g p' / 'g s' (two-key sequence, 1s window)
 */
export function useHotkeys(map: HotkeyMap): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  const sequenceRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if focus is in an editable field
      if (isEditableTarget(e.target)) return;

      const parts: string[] = [];

      // Detect two-key sequences: e.g. 'g d'
      const seq = sequenceRef.current;
      if (seq && Date.now() - seq.at < SEQUENCE_TIMEOUT_MS) {
        parts.push(seq.key);
        sequenceRef.current = null;
      } else {
        sequenceRef.current = null;
      }

      // Modifier prefix
      if (e.metaKey || e.ctrlKey) parts.unshift('Mod');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      // Normalize key
      let key = e.key;
      if (key === ' ') key = 'Space';
      else if (key.length === 1) key = key.toUpperCase();
      parts.push(key);

      const combo = parts.join('+');

      // Try exact match first
      const exact = mapRef.current[combo];
      if (exact) {
        e.preventDefault();
        exact(e);
        return;
      }

      // Try sequence: if first key matches and it's a known sequence starter
      const sequenceOnly = parts.slice(-1)[0]; // just the last part
      if (sequenceOnly === 'g' || sequenceOnly === 'G') {
        sequenceRef.current = { key: 'g', at: Date.now() };
      } else if (sequenceOnly.length === 1 && /^[a-z]$/i.test(sequenceOnly)) {
        // First key in a sequence
        sequenceRef.current = { key: sequenceOnly.toLowerCase(), at: Date.now() };
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
