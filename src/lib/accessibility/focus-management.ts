/**
 * Focus Management Utilities
 * For keyboard navigation and accessibility
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
}

/**
 * Trap focus within a container (for modals, menus, etc.)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to previous element
 */
export function restoreFocus(previousElement: HTMLElement | null): void {
  if (previousElement && typeof previousElement.focus === 'function') {
    previousElement.focus();
  }
}

/**
 * Get logical tab order
 */
export function getTabOrder(container: HTMLElement): HTMLElement[] {
  const elements = getFocusableElements(container);

  // Sort by tabindex
  return elements.sort((a, b) => {
    const aIndex = parseInt(a.getAttribute('tabindex') || '0');
    const bIndex = parseInt(b.getAttribute('tabindex') || '0');

    if (aIndex === 0 && bIndex === 0) return 0;
    if (aIndex === 0) return 1;
    if (bIndex === 0) return -1;
    return aIndex - bIndex;
  });
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

/**
 * Add visible focus ring
 */
export function addFocusRing(element: HTMLElement): void {
  element.classList.add(
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary-500',
    'focus:ring-offset-2'
  );
}

/**
 * Handle keyboard navigation for dropdowns
 */
export function handleDropdownKeyboard(
  container: HTMLElement,
  onSelect: (index: number) => void,
  onClose: () => void
): () => void {
  let currentIndex = 0;
  const items = getFocusableElements(container);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, items.length - 1);
        items[currentIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        items[currentIndex]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(currentIndex);
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;

      case 'Home':
        e.preventDefault();
        currentIndex = 0;
        items[currentIndex]?.focus();
        break;

      case 'End':
        e.preventDefault();
        currentIndex = items.length - 1;
        items[currentIndex]?.focus();
        break;
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Create skip link for keyboard users
 */
export function createSkipLink(targetId: string, text: string): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className =
    'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg';

  return skipLink;
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
