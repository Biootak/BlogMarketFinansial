import { useEditor } from 'novel';
import { RiAlignLeft, RiAlignCenter, RiAlignRight } from 'react-icons/ri';
import { Toggle } from '@/components/ui/toggle';

interface AlignmentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlignmentSelector({ open, onOpenChange }: AlignmentSelectorProps) {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center">
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <RiAlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <RiAlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <RiAlignRight className="h-4 w-4" />
      </Toggle>
    </div>
  );
}
