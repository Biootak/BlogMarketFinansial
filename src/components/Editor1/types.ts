/**
 * Editor Type Definitions
 * تعاریف type برای TipTap Editor
 */

import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Editor Instance with State and View
 */
export interface EditorInstance extends Editor {
  state: EditorState;
  view: EditorView;
}

/**
 * Range for text selection
 */
export interface Range {
  from: number;
  to: number;
}

/**
 * Match object from regex
 */
export interface RegexMatch extends Omit<RegExpMatchArray, 'groups'> {
  groups?: {
    href?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Lowlight instance type
 */
export interface LowlightInstance {
  highlight: (language: string, code: string) => LowlightResult;
  highlightAuto: (code: string) => LowlightResult;
  listLanguages: () => string[];
}

/**
 * Lowlight result type
 */
export interface LowlightResult {
  value?: LowlightNode[];
  children?: LowlightNode[];
  language?: string;
  relevance?: number;
}

/**
 * Lowlight node type
 */
export interface LowlightNode {
  type: 'element' | 'text' | 'raw' | string;
  tagName?: string;
  properties?: {
    className?: string[];
    [key: string]: unknown;
  };
  children?: LowlightNode[];
  value?: string;
}

/**
 * Table editor instance
 */
export interface TableEditor {
  state: EditorState;
  view: EditorView;
  chain: () => {
    focus: () => {
      deleteRange: (range: Range) => { run: () => boolean };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/**
 * Cell node with attributes
 */
export interface CellNode extends ProseMirrorNode {
  attrs: {
    backgroundColor?: string | null;
    [key: string]: unknown;
  };
}

/**
 * View with dispatch
 */
export interface ViewWithDispatch extends EditorView {
  dispatch: (tr: Transaction) => void;
}

/**
 * Heading node type
 */
export interface HeadingNode {
  type: string;
  attrs: {
    level: number;
  };
  content?: {
    text?: string;
  }[];
  textContent?: string;
}

/**
 * Dragged node content
 */
export interface DraggedNodeContent {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
  [key: string]: unknown;
}
