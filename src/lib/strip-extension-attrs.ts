/**
 * @file Inline script that strips attributes injected by browser extensions
 * (notably SimilarTech "BisFinder", which adds `bis_skin_checked="1"` to every
 * DOM element and causes React to log a hydration mismatch warning in dev).
 *
 * The script:
 *   1. Synchronously registers a `MutationObserver` on `document.documentElement`
 *      so any time a browser-extension content script injects one of the
 *      targeted attributes, it is removed in the next microtask — well before
 *      React's hydration walk reaches that node.
 *   2. Also strips already-injected attributes on `DOMContentLoaded` as a
 *      safety net for content scripts that run before us.
 *
 * Served via `<Script strategy="beforeInteractive">` in `src/app/layout.tsx`,
 * which Next.js renders inline at the top of the document `<head>`, so it
 * runs before React's hydration script.
 */

const STRIP_EXTENSION_ATTRS_SCRIPT = `(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof MutationObserver === 'undefined') return;

  var ATTRS = ['bis_skin_checked', 'bis_use', 'bis_id', 'bis_name'];

  function strip(node){
    if (!node || node.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (node.hasAttribute(a)) node.removeAttribute(a);
    }
  }

  function stripAll(root){
    // 2026-06-24: bug fix. MutationObserver addedNodes can contain
    // Text, CDATA, Comment, or DocumentType nodes — none of which
    // implement querySelectorAll. Earlier versions only guarded strip()
    // (which already checks nodeType !== 1), but stripAll blindly
    // called querySelectorAll on whatever Node the observer handed us.
    // On a heavy hydration pass this threw TypeError and crashed the
    // observer loop. We now bail out unless root is something we can
    // actually walk (Element / Document / DocumentFragment).
    // NOTE: comments inside this template literal must NOT contain
    // backticks — they terminate the outer string literal early.
    if (!root || typeof root.querySelectorAll !== 'function') return;
    strip(root);
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) strip(all[i]);
  }

  function onReady(){ stripAll(document.documentElement); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  var obs = new MutationObserver(function(mutations){
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'attributes' && ATTRS.indexOf(m.attributeName) !== -1) {
        m.target.removeAttribute(m.attributeName);
      } else if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          stripAll(m.addedNodes[j]);
        }
      }
    }
  });

  obs.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ATTRS,
  });
})();`;

export default STRIP_EXTENSION_ATTRS_SCRIPT;
