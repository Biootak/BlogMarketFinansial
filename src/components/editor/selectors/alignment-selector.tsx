import { useEditor } from 'novel';
import { RiAlignLeft, RiAlignCenter, RiAlignRight } from 'react-icons/ri';
import { Toggle } from '@/components/ui/toggle';

interface AlignmentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRTL: boolean;
}

export function AlignmentSelector({ open, onOpenChange, isRTL }: AlignmentSelectorProps) {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    editor.chain().focus().setTextAlign(alignment).run();
    onOpenChange(false);
  };

  return (
    <div className="flex items-center">
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: isRTL ? 'right' : 'left' })}
        onPressedChange={() => handleAlignmentChange(isRTL ? 'right' : 'left')}
      >
        <RiAlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => handleAlignmentChange('center')}
      >
        <RiAlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: isRTL ? 'left' : 'right' })}
        onPressedChange={() => handleAlignmentChange(isRTL ? 'left' : 'right')}
      >
        <RiAlignRight className="h-4 w-4" />
      </Toggle>
    </div>
  );
}
