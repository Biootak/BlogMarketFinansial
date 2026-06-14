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

export const calloutTypeConfig: Record<
  CalloutType,
  { icon: LucideIcon; iconName: string; bgColor: string; borderColor: string; textColor: string }
> = {
  info: {
    icon: Info,
    iconName: 'Info',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    iconName: 'AlertTriangle',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-800 dark:text-yellow-200',
  },
  success: {
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: XCircle,
    iconName: 'XCircle',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
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
