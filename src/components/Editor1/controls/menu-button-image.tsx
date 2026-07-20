import type { Editor } from '@tiptap/core';
import type React from 'react';
import { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonImageProps {
  editor: Editor;
}

/**
 * Toolbar button that opens the editor's shared image-upload dialog.
 *
 * 2026-07-06: Previously this component mounted its own Dialog + ImageUploader
 * tree, duplicating the dialog logic that already lives in
 * `components/image-upload-dialog.tsx`. Two side-effects of the duplication:
 *   1. alt-text input + URL validation weren't shared, so toolbar uploads
 *      silently skipped both.
 *   2. Two dialog instances could exist at the same time (toolbar AND
 *      slash command), with no shared state.
 *
 * The single source of truth is now the dialog mounted in `editor.tsx`,
 * reachable via `editor.storage.slashCommands.openImageUpload()` — the
 * same entry point the slash command uses. Both entry points open the
 * same dialog, share the same `alt`/`title` inputs, and feed the same
 * `setImage` command.
 */
export const MenuButtonImage: React.FC<MenuButtonImageProps> = ({ editor }) => {
  const handleClick = useCallback(() => {
    const open = editor.storage.slashCommands?.openImageUpload;
    if (typeof open === 'function') {
      open();
      return;
    }
    // Fallback: storage wasn't wired (older editor shell without the
    // dialog mounted). Surface a console error so it's debuggable rather
    // than failing silently.
    // eslint-disable-next-line no-console
    console.error(
      'MenuButtonImage: editor.storage.slashCommands.openImageUpload is not wired. ' +
        'Mount <ImageUploadDialog editor={editor} /> in the editor shell.',
    );
  }, [editor]);

  return (
    <Toolbar.Button tooltip="درج تصویر" onClick={handleClick}>
      <Icon name="image" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonImage, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
