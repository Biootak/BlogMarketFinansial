import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import SlashCommandMenu, { type SlashCommandMenuRef } from '../components/slash-command-menu';
import { type SlashCommandItem, defaultSlashCommands } from '../extensions/slash-commands';

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
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandMenu, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};

export default slashCommandsSuggestion;
