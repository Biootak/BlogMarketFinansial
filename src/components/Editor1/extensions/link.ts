import { markInputRule } from '@tiptap/core';
import { Link as BaseLink } from '@tiptap/extension-link';
import type { RegexMatch } from '../types';

const extractHrefFromMatch = (match: RegexMatch) => {
  return { href: match.groups?.href || '' };
};

export const extractHrefFromMarkdownLink = (match: RegexMatch) => {
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
