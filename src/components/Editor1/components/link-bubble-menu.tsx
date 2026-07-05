import { BubbleMenu } from '@tiptap/react/menus';
import { type Editor, type Range, getMarkRange, getMarkType, posToDOMRect } from '@tiptap/core';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import LinkPanelEdit from './link-panel-edit';
import LinkPanelPreview from './link-panel-preview';
import { useAttributes } from '../hooks/use-attributes';
// 2026-07-05: dir از hook مرکزی می‌آید تا در پورتل body جهت متن
// مستقل از cascade <html dir> درست بماند.
import { useDirection } from '@/hooks/useDirection';

interface LinkBubbleProps {
  editor: Editor;
}

const LinkBubble = ({ editor }: LinkBubbleProps) => {
  const dir = useDirection('rtl');
  const { href }: { href: string } = useAttributes(editor, 'link', {
    href: '',
    target: '',
  });

  const initialUrl = useRef<string>('');
  const [isEdit, setIsEdit] = useState(false);
  const [pos, setPos] = useState<Range>({ from: -1, to: -1 });

  const shouldShow = useCallback(() => editor.isActive('link'), [editor]);

  const handleEdit = useCallback(() => {
    setIsEdit(true);
  }, []);

  const onSetLink = useCallback(
    (url: string) => {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, class: 'link' }).run();
      initialUrl.current = '';
      setIsEdit(false);
    },
    [editor],
  );

  const onUnsetLink = useCallback(() => {
    let transaction = editor.chain().focus();
    if (pos) {
      transaction.setTextSelection(pos);
      setPos({ from: -1, to: -1 });
    }
    return transaction.unsetLink().run();
  }, [editor, pos]);

  const getReferenceClientRect = useCallback(() => {
    const { view, state } = editor;
    const {
      selection: { from, to, $to },
    } = view.state;
    const linkRange = getMarkRange($to, getMarkType('link', editor.schema));

    if (linkRange) {
      const node = view.nodeDOM(linkRange.from) as HTMLElement;
      return node!.parentElement!.getBoundingClientRect();
    }

    return posToDOMRect(view, from, to);
  }, [editor]);

  useEffect(() => {
    const isLinkActive = editor.isActive('link');

    if (!isLinkActive) return;

    const prev = initialUrl.current;
    const current = href;

    if (!current)
      setIsEdit(true); // add new link;
    else if (prev !== current) setIsEdit(false); // update link

    initialUrl.current = current;

    const { from, to } = editor.state.selection;

    setPos({ from, to });
    // 2026-07-05: فقط با تغییر selection اجرا شود، نه با هر کیبورد.
  }, [editor.state.selection, href]);



  return (
    <BubbleMenu
      editor={editor}
      pluginKey={`linkMenu`}
      shouldShow={shouldShow}
      updateDelay={0}
      options={{
        placement: 'bottom-start',
      }}
    >
      <div dir={dir} data-dir={dir}>
        {isEdit ? (
          <LinkPanelEdit initial={href} isOpen={isEdit} onSetLink={onSetLink} />
        ) : (
          <LinkPanelPreview url={href} onEdit={handleEdit} onRemove={() => onUnsetLink()} />
        )}
      </div>
    </BubbleMenu>
  );
};

export default LinkBubble;
