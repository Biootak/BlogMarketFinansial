import { getDocumentDirection } from '@/hooks/useDirection';
import {
  type ReferenceElement,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { exitSuggestion } from '@tiptap/suggestion';
import SlashCommandMenu, { type SlashCommandMenuRef } from '../components/slash-command-menu';
import {
  type SlashCommandItem,
  defaultSlashCommands,
  slashCommandsPluginKey,
} from '../extensions/slash-commands';

export const slashCommandsSuggestion = {
  items: ({ query }: { query: string }): SlashCommandItem[] => {
    const normalizedQuery = query.toLowerCase();

    return defaultSlashCommands.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
      const keywordMatch = item.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery),
      );
      return titleMatch || keywordMatch;
    });
  },

  render: () => {
    let component: ReactRenderer<SlashCommandMenuRef> | null = null;
    let popup: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;
    let editor: Editor | null = null;

    const closeMenu = () => {
      if (editor) {
        exitSuggestion(editor.view, slashCommandsPluginKey);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popup || popup.contains(target)) return;

      // کلیک داخل خود ویرایشگر را به پلاگین واگذار می‌کنیم؛ فقط کلیک بیرون
      // از popup و بیرون از editor باعث بسته شدن می‌شود.
      const editorElement = editor?.view.dom;
      if (editorElement?.contains(target)) return;

      closeMenu();
    };

    const updatePosition = (referenceClientRect: DOMRect) => {
      if (!popup) return;

      const referenceElement: ReferenceElement = {
        getBoundingClientRect: () => referenceClientRect,
      };

      cleanup = autoUpdate(referenceElement, popup, () => {
        if (!popup) return;
        computePosition(referenceElement, popup, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (!popup) return;
          Object.assign(popup.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      });
    };

    return {
      onStart: (props: any) => {
        editor = props.editor;

        component = new ReactRenderer(SlashCommandMenu, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = document.createElement('div');
        popup.className = 'at-slash-popup';
        popup.style.position = 'fixed';
        popup.style.zIndex = '9999';
        popup.setAttribute('dir', getDocumentDirection('rtl'));
        popup.setAttribute('data-slash-popup', '');
        if (component.element) {
          popup.appendChild(component.element);
        }
        document.body.appendChild(popup);
        document.addEventListener('pointerdown', onPointerDown);

        updatePosition(props.clientRect());
      },

      onUpdate(props: any) {
        editor = props.editor;
        component?.updateProps(props);

        if (!props.clientRect || !popup) {
          return;
        }

        cleanup?.();
        updatePosition(props.clientRect());
      },

      onKeyDown(props: any) {
        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        document.removeEventListener('pointerdown', onPointerDown);
        cleanup?.();
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
        cleanup = null;
        editor = null;
      },
    };
  },
};

export default slashCommandsSuggestion;
