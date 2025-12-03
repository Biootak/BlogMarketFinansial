import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Configure Table extension with resizable cells and keyboard shortcuts
export const TableExtension = Table.configure({
  resizable: true,
  handleWidth: 5,
  cellMinWidth: 100,
  lastColumnResizable: true,
  allowTableNodeSelection: true,
});

// Custom TableCell with better styling
export const TableCellExtension = TableCell.configure({
  HTMLAttributes: {
    class: 'table-cell',
  },
});

// Custom TableHeader with better styling
export const TableHeaderExtension = TableHeader.configure({
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
