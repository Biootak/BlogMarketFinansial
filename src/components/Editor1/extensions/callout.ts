import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import CalloutBlock from '../components/callout-block';

export type CalloutType = 'info' | 'warning' | 'success' | 'error';

export interface CalloutOptions {
  types: CalloutType[];
  defaultType: CalloutType;
  defaultIcon: string;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType; icon?: string }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType; icon?: string }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

// کلاس‌های Tailwind قبلاً اینجا بود ولی باعث bleed بین callout-block و
// استایل سراسری داشبورد می‌شد. الان رنگ‌ها از طریق `[data-callout-type]`
// در styles/callout.scss به‌صورت تم-محور اعمال می‌شوند.
export const calloutTypeConfig: Record<
  CalloutType,
  { icon: LucideIcon; iconName: string }
> = {
  info: {
    icon: Info,
    iconName: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    iconName: 'AlertTriangle',
  },
  success: {
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
  },
  error: {
    icon: XCircle,
    iconName: 'XCircle',
  },
};

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  addOptions() {
    return {
      types: ['info', 'warning', 'success', 'error'],
      defaultType: 'info',
      defaultIcon: 'Info',
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: this.options.defaultType,
        parseHTML: (element) => element.getAttribute('data-type') || this.options.defaultType,
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
      icon: {
        default: this.options.defaultIcon,
        parseHTML: (element) => element.getAttribute('data-icon') || this.options.defaultIcon,
        renderHTML: (attributes) => ({
          'data-icon': attributes.icon,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-callout': '' }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addNodeView() {
    // biome-ignore lint/suspicious/noExplicitAny: TipTap React 19 compatibility
    return ReactNodeViewRenderer(CalloutBlock as any);
  },
});

export default Callout;
