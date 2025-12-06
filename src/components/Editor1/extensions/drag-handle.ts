import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import type { DraggedNodeContent } from '../types';

export interface DragHandleOptions {
  dragHandleWidth: number;
}

const dragHandlePluginKey = new PluginKey('dragHandle');

export const DragHandle = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      dragHandleWidth: 24,
    };
  },

  addProseMirrorPlugins() {
    const _editor = this.editor;
    let dragHandleElement: HTMLElement | null = null;
    let currentPos: number | null = null;
    let dropIndicator: HTMLElement | null = null;

    const createDragHandle = () => {
      const handle = document.createElement('div');
      handle.className = 'drag-handle';
      handle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5"/>
          <circle cx="11" cy="4" r="1.5"/>
          <circle cx="5" cy="8" r="1.5"/>
          <circle cx="11" cy="8" r="1.5"/>
          <circle cx="5" cy="12" r="1.5"/>
          <circle cx="11" cy="12" r="1.5"/>
        </svg>
      `;
      handle.style.cssText = `
        position: absolute;
        left: -28px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        opacity: 0;
        transition: opacity 0.2s;
        color: #9ca3af;
        border-radius: 4px;
        z-index: 50;
      `;
      handle.draggable = true;
      return handle;
    };

    const createDropIndicator = () => {
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      indicator.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: #3b82f6;
        border-radius: 2px;
        pointer-events: none;
        display: none;
        z-index: 100;
      `;
      return indicator;
    };

    return [
      new Plugin({
        key: dragHandlePluginKey,
        view: (view) => {
          dragHandleElement = createDragHandle();
          dropIndicator = createDropIndicator();
          view.dom.parentElement?.appendChild(dragHandleElement);
          view.dom.parentElement?.appendChild(dropIndicator);

          const getBlockPos = (node: HTMLElement): number | null => {
            try {
              const pos = view.posAtDOM(node, 0);
              if (pos === undefined || pos === null) return null;
              const $pos = view.state.doc.resolve(pos);
              // اگر در سطح بالای document هستیم، از خود pos استفاده می‌کنیم
              if ($pos.depth === 0) return pos;
              return $pos.before($pos.depth);
            } catch (_error) {
              // اگر خطایی رخ داد، null برمی‌گردانیم
              return null;
            }
          };

          const showHandle = (node: HTMLElement, pos: number) => {
            if (!dragHandleElement) return;
            currentPos = pos;
            const rect = node.getBoundingClientRect();
            const editorRect = view.dom.getBoundingClientRect();
            dragHandleElement.style.top = `${rect.top - editorRect.top + 4}px`;
            dragHandleElement.style.opacity = '1';
          };

          const hideHandle = () => {
            if (dragHandleElement) {
              dragHandleElement.style.opacity = '0';
            }
            currentPos = null;
          };

          const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const blockNode = target.closest(
              'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, [data-callout], [data-embed]',
            );
            if (blockNode && view.dom.contains(blockNode)) {
              const pos = getBlockPos(blockNode as HTMLElement);
              if (pos !== null) {
                showHandle(blockNode as HTMLElement, pos);
              }
            }
          };

          const handleMouseLeave = (event: MouseEvent) => {
            const relatedTarget = event.relatedTarget as HTMLElement;
            if (!relatedTarget?.closest('.drag-handle')) {
              hideHandle();
            }
          };

          dragHandleElement.addEventListener('mouseenter', () => {
            if (dragHandleElement) {
              dragHandleElement.style.opacity = '1';
              dragHandleElement.style.backgroundColor = '#f3f4f6';
            }
          });

          dragHandleElement.addEventListener('mouseleave', (e) => {
            if (dragHandleElement) {
              dragHandleElement.style.backgroundColor = 'transparent';
            }
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!view.dom.contains(relatedTarget)) {
              hideHandle();
            }
          });

          let draggedNodeContent: DraggedNodeContent | null = null;
          let draggedNodePos: number | null = null;

          dragHandleElement.addEventListener('dragstart', (e) => {
            if (currentPos === null) return;
            draggedNodePos = currentPos;
            const node = view.state.doc.nodeAt(currentPos);
            if (node) {
              draggedNodeContent = node.toJSON();
              e.dataTransfer?.setData(
                'application/x-prosemirror-node',
                JSON.stringify({ pos: currentPos }),
              );
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
              }
              if (dragHandleElement?.style) {
                dragHandleElement.style.cursor = 'grabbing';
              }
            }
          });

          view.dom.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!dropIndicator || draggedNodePos === null) return;

            try {
              const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
              if (pos) {
                const $pos = view.state.doc.resolve(pos.pos);
                const blockPos = $pos.depth === 0 ? pos.pos : $pos.before($pos.depth);
                const node = view.nodeDOM(blockPos) as HTMLElement;
                if (node) {
                  const rect = node.getBoundingClientRect();
                  const editorRect = view.dom.getBoundingClientRect();
                  const isAbove = e.clientY < rect.top + rect.height / 2;
                  dropIndicator.style.display = 'block';
                  dropIndicator.style.top = `${(isAbove ? rect.top : rect.bottom) - editorRect.top}px`;
                }
              }
            } catch (_error) {
              // در صورت خطا، indicator را مخفی می‌کنیم
              if (dropIndicator) {
                dropIndicator.style.display = 'none';
              }
            }
          });

          view.dom.addEventListener('dragleave', () => {
            if (dropIndicator) {
              dropIndicator.style.display = 'none';
            }
          });

          view.dom.addEventListener('drop', (e) => {
            e.preventDefault();
            if (dropIndicator) {
              dropIndicator.style.display = 'none';
            }

            if (draggedNodePos === null || !draggedNodeContent) return;

            try {
              const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
              if (!pos) return;

              const $pos = view.state.doc.resolve(pos.pos);
              const targetPos = $pos.depth === 0 ? pos.pos : $pos.before($pos.depth);
              const node = view.nodeDOM(targetPos) as HTMLElement;

              if (node) {
                const rect = node.getBoundingClientRect();
                const isAbove = e.clientY < rect.top + rect.height / 2;
                const targetNode = view.state.doc.nodeAt(targetPos);
                if (!targetNode) return;

                const insertPos = isAbove ? targetPos : targetPos + targetNode.nodeSize;

                const { tr } = view.state;
                const nodeToMove = view.state.doc.nodeAt(draggedNodePos);
                if (nodeToMove) {
                  const adjustedInsertPos =
                    insertPos > draggedNodePos ? insertPos - nodeToMove.nodeSize : insertPos;
                  tr.delete(draggedNodePos, draggedNodePos + nodeToMove.nodeSize);
                  tr.insert(adjustedInsertPos, nodeToMove);
                  view.dispatch(tr);
                }
              }
            } catch (error) {
              console.error('Error during drop:', error);
            }

            draggedNodeContent = null;
            draggedNodePos = null;
          });

          dragHandleElement.addEventListener('dragend', () => {
            if (dragHandleElement) {
              dragHandleElement.style.cursor = 'grab';
            }
            if (dropIndicator) {
              dropIndicator.style.display = 'none';
            }
            draggedNodeContent = null;
            draggedNodePos = null;
          });

          view.dom.addEventListener('mouseover', handleMouseOver);
          view.dom.addEventListener('mouseleave', handleMouseLeave);

          return {
            destroy: () => {
              view.dom.removeEventListener('mouseover', handleMouseOver);
              view.dom.removeEventListener('mouseleave', handleMouseLeave);
              dragHandleElement?.remove();
              dropIndicator?.remove();
            },
          };
        },
      }),
    ];
  },
});

export default DragHandle;
