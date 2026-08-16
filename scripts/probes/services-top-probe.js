// probe: scroll to top, verify hero/constellation in view
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (document.scrollingElement || document.documentElement).scrollTop = 0;
  window.scrollTo(0, 0);
  await sleep(700);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const tiles = qa('[class*="constTile"]').map((t) => {
    const r = t.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y) };
  });
  return JSON.stringify({
    scrollY: Math.round(window.scrollY),
    tiles,
    allInViewport: tiles.every((t) => t.y >= 0 && t.y < window.innerHeight),
  }, null, 1);
})()
