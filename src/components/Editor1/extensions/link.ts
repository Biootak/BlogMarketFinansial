import { Link as BaseLink, type LinkOptions } from '@tiptap/extension-link';
import { markInputRule } from '@tiptap/core';

const extractHrefFromMatch = (match: any) => {
  return { href: match.groups.href };
};

export const extractHrefFromMarkdownLink = (match: any) => {
  /**
   * Removes the last capture group from the match to satisfy
   * tiptap markInputRule expectation of having the content as
   * the last capture group in the match.
   *
   * https://github.com/ueberdosis/tiptap/blob/%40tiptap/core%402.0.0-beta.75/packages/core/src/inputRules/markInputRule.ts#L11
   */
  match.pop();
  return extractHrefFromMatch(match);
};

export const Link = BaseLink.extend({
  inclusive: false,

  // 2026-07-08 (C5): reject dangerous URI schemes. TipTap's schema keeps
  // `href` verbatim, so a pasted/inserted `javascript:` link would survive
  // into stored content and execute on click. Constrain to safe schemes.
  addOptions() {
    return {
      ...this.parent?.(),
      protocols: [
        { scheme: 'http' },
        { scheme: 'https' },
        { scheme: 'mailto' },
        { scheme: 'tel' },
      ],
      validate: (href: string) => /^(https?:|mailto:|tel:)/i.test(href),
    } as LinkOptions;
  },

  addInputRules() {
    const urlSyntaxRegExp =
      //@ts-ignore
      /(?:^|\s)(?<href>(?:https?:\/\/|www\.)[\S]+)(?:\s|\n)$/gim;

    return [
      markInputRule({
        find: urlSyntaxRegExp,
        type: this.type,
        getAttributes: extractHrefFromMatch,
      }),
    ];
  },
});

export default Link;
