import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { findParentNode } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Plugin key for cell drag selection
const tableCellSelectionKey = new PluginKey('tableCellSelection');

// Helper function to set background color on all selected cells
const setSelectedCellsBackground = (editor: any, color: string | null) => {
  const { state, view } = editor;
  const { selection } = state;

  // Check if we have a cell selection (multiple cells selected)
  if (selection instanceof CellSelection) {
    const { tr } = state;

    // Iterate through all selected cells
    selection.forEachCell((node: any, pos: number) => {
      tr.setNodeMarkup(pos, null, {
        ...node.attrs,
        backgroundColor: color,
      });
    });

    view.dispatch(tr);
    return true;
  }

  // Fallback: single cell - find the cell at cursor position
  const cell = findParentNode(
    (node) => node.type.name === 'tableCell' || node.type.name === 'tableHeader'
  )(selection);

  if (cell) {
    const { tr } = state;
    tr.setNodeMarkup(cell.pos, null, {
      ...cell.node.attrs,
      backgroundColor: color,
    });
    view.dispatch(tr);
    return true;
  }

  return false;
};

// Find cell node position from DOM coordinates
const getCellPosFromCoords = (
  view: any,
  coords: { x: number; y: number }
): number | null => {
  const posAtCoords = view.posAtCoords({ left: coords.x, top: coords.y });
  if (!posAtCoords) return null;

  let pos = posAtCoords.pos;
  const doc = view.state.doc;

  // Walk up to find the cell
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      return $pos.before(depth);
    }
  }

  return null;
};

// Create cell selection plugin for drag-to-select
const createCellSelectionPlugin = () => {
  let isDragging = false;
  let startCellPos: number | null = null;
  let lastCellPos: number | null = null;

  return new Plugin({
    key: tableCellSelectionKey,
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          // Only left click
          if (event.button !== 0) return false;

          const target = event.target as HTMLElement;
          const cellElement = target.closest('td, th');
          if (!cellElement) return false;

          // Get cell position
          const cellPos = getCellPosFromCoords(view, {
            x: event.clientX,
            y: event.clientY,
          });

          if (cellPos !== null) {
            startCellPos = cellPos;
            lastCellPos = cellPos;
            isDragging = true;

            // Add mousemove and mouseup listeners to document
            const onMouseMove = (e: MouseEvent) => {
              if (!isDragging || startCellPos === null) return;

              const currentCellPos = getCellPosFromCoords(view, {
                x: e.clientX,
                y: e.clientY,
              });

              if (currentCellPos !== null && currentCellPos !== lastCellPos) {
                lastCellPos = currentCellPos;

                // Create cell selection
                try {
                  const selection = CellSelection.create(
                    view.state.doc,
                    startCellPos,
                    currentCellPos
                  );
                  view.dispatch(view.state.tr.setSelection(selection));
                } catch {
                  // Invalid selection, ignore
                }
              }
            };

            const onMouseUp = () => {
              isDragging = false;
              startCellPos = null;
              lastCellPos = null;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }

          return false;
        },
      },
    },
  });
};

// Configure Table extension
export const TableExtension = Table.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      setSelectedCellsBackgroundColor:
        (color: string | null) =>
        ({ editor }: any) => {
          return setSelectedCellsBackground(editor, color);
        },
    };
  },
  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), createCellSelectionPlugin()];
  },
}).configure({
  resizable: true,
  handleWidth: 5,
  cellMinWidth: 100,
  lastColumnResizable: true,
  allowTableNodeSelection: true,
});

// Custom TableCell with background color support
export const TableCellExtension = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
}).configure({
  HTMLAttributes: {
    class: 'table-cell',
  },
});

// Custom TableHeader with background color support
export const TableHeaderExtension = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
}).configure({
  HTMLAttributes: {
    class: 'table-header',
  },
});

// Export all table-related extensions
export const tableExtensions = [
  TableExtension,
  TableRow,
  TableCellExtension,
  TableHeaderExtension,
];

export { TableRow };
export default TableExtension;
