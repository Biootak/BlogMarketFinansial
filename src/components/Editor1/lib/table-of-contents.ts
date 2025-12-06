import type { EditorInstance } from '..';
import type { HeadingNode } from '../types';
import { slugify } from './utils';

export type TocItem = {
  id: string;
  text: string;
  level: number;
  node: Element;
};

export type ToCObject = TocItem & {
  children: ToCObject[];
};

interface HeadingData {
  id: string;
  level: number;
  text: string;
  node?: Element;
}

export class TOC {
  parent: TOC | null = null;
  children: TOC[] = [];

  constructor(
    private id: string,
    private text: string,
    private node: Element,
  ) {}

  get level(): number {
    return this.parent ? this.parent.level + 1 : 1;
  }

  addChild(id: string, text: string, node: Element) {
    const child = new TOC(id, text, node);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  flatten() {
    this.children.forEach((child) => child.flatten());

    if (!this.text && this.parent) {
      const index = this.parent.children.indexOf(this);
      this.parent.children.splice(index, 1, ...this.children);
      this.children.forEach((child) => (child.parent = this.parent));
    }

    return this;
  }

  toObject(): ToCObject {
    return {
      id: this.id,
      text: this.text,
      level: this.level,
      node: this.node,
      children: this.children.map((child) => child.toObject()),
    };
  }
}

function fillEmpty(headings: HeadingData[]) {
  for (let i = 0; i < headings.length; i++) {
    let level = headings[i - 1]?.level || 1;
    if (headings[i].level - level > 1) {
      while (level < headings[i].level) {
        headings.splice(i, 0, { id: '', level: level + 1, text: '' });
        level++;
      }
    }
  }
}

function createTree(headings: HeadingData[], depth: number) {
  fillEmpty(headings);

  const tree = new TOC('', '', document.createElement('div'));
  let current = tree;

  for (const heading of headings) {
    while (current.level >= heading.level && current.parent) current = current.parent;
    current = current.addChild(heading.id, heading.text, heading.node || document.createElement('div'));
  }
  return flatten(tree.flatten().toObject(), depth);
}

function flatten(toc: ToCObject, depth: number): TocItem[] {
  const items: TocItem[] = [];

  for (const item of toc.children) {
    if (item.level > depth) break;
    const { children, ...rest } = item;
    items.push(rest);
    items.push(...flatten(item, depth));
  }

  return items;
}

export function getToCItems(editor: EditorInstance, depth = 3) {
  const headings: HeadingData[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const id = slugify(node.textContent);

      if (node.attrs.id !== id) {
        const transaction = editor.state.tr;

        transaction.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          id: id,
        });

        transaction.setMeta('addToHistory', false);
        transaction.setMeta('preventUpdate', true);
        editor.view.dispatch(transaction);
      }

      const domNode = editor.view.nodeDOM(pos);
      headings.push({
        id,
        level: node.attrs.level,
        text: node.textContent,
        node: domNode instanceof Element ? domNode : undefined,
      });
    }
  });

  return createTree(headings, depth);
}
