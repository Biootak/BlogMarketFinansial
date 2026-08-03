'use client';

/**
 * MobileBottomNavSortable — dnd-kit reorder layer for the bottom nav.
 *
 * Split out of `MobileBottomNav` and loaded via next/dynamic so the entire
 * @dnd-kit bundle (~90KB) ships only when the user actually engages reorder
 * (long-press), instead of on every page load. Zero behavioral change: the
 * sortable behaves exactly like the old inline DndContext.
 *
 * The parent provides `renderLink` + `itemClassName` so the link markup and
 * CSS-module classes stay in MobileBottomNav; this module only owns the
 * drag-and-drop behaviour. `onReorder(newOrder)` fires after a drag completes.
 */
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FC, ReactElement } from 'react';

const _LONG_PRESS_MS = 500;
const SLOP_PX = 8;

export interface SortableNavItem {
  id: string;
  href: string;
  label: string;
  icon: FC<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  primary?: boolean;
  tabletOnly?: boolean;
}

export interface MobileBottomNavSortableProps {
  items: SortableNavItem[];
  activeId: string;
  /** Current order of item ids (may differ from items order). */
  order: readonly string[];
  /** Called with the new order after a drag completes. */
  onReorder: (newOrder: readonly string[]) => void;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, item: SortableNavItem) => void;
  /** Renders the <a> for an item (with icon + active state). */
  renderLink: (item: SortableNavItem, opts: { isActive: boolean }) => ReactElement;
  /** <ul> className (CSS module). */
  className: string;
  /** <ul> inline style — برای backdrop-filter که Lightning CSS حذف می‌کند. */
  style?: React.CSSProperties;
  /** className applied to each sortable <li>. */
  itemClassName: string;
  /** className applied to tablet-only items. */
  tabletOnlyClassName?: string;
}

function SortableItem({
  item,
  isActive,
  onLinkClick: _onLinkClick,
  renderLink,
  itemClassName,
  tabletOnlyClassName,
}: {
  item: SortableNavItem;
  isActive: boolean;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, item: SortableNavItem) => void;
  renderLink: MobileBottomNavSortableProps['renderLink'];
  itemClassName: string;
  tabletOnlyClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${itemClassName} ${item.tabletOnly ? (tabletOnlyClassName ?? '') : ''}`.trim()}
      data-dragging={isDragging ? 'true' : 'false'}
      {...attributes}
      {...listeners}
    >
      {renderLink(item, { isActive })}
    </li>
  );
}

export default function MobileBottomNavSortable({
  items,
  activeId,
  order,
  onReorder,
  onLinkClick,
  renderLink,
  className,
  style,
  itemClassName,
  tabletOnlyClassName,
}: MobileBottomNavSortableProps) {
  // Reorder mode is already engaged by the parent's long-press before this
  // mounts, so the drag sensor only needs a short delay to distinguish a
  // drag from a tap-navigate — 100ms, not the original 500ms.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: SLOP_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const base = [...order];
    const oldIndex = base.indexOf(String(active.id));
    const newIndex = base.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(base, oldIndex, newIndex));
  };

  return (
    <DndContext
      id="mobile-bottom-nav-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order.map(String)} strategy={horizontalListSortingStrategy}>
        <ul className={className} style={style}>
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onLinkClick={onLinkClick}
              renderLink={renderLink}
              itemClassName={itemClassName}
              tabletOnlyClassName={tabletOnlyClassName}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
