// probe: redesigned /services — zones, tiles, cards, grid layout
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);

  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));

  const out = { url: location.href, viewport: window.innerWidth };

  out.zones = qa('main section, main header').map((s) => {
    const h = s.querySelector('h1, h2');
    return h ? h.textContent.trim().slice(0, 24) : s.tagName;
  });

  out.quickTiles = qa('[class*="quickTile"]').length;
  out.serviceCards = qa('[class*="serviceCard"]').length;
  out.segTabs = qa('[class*="segTab"]').length;
  out.subChips = qa('[class*="chip"]').length;
  out.constTiles = qa('[class*="constTile"]').length;
  out.ambientDots = qa('[class*="ambientDot"]').length;
  out.steps = qa('[class*="step"]').length;

  const grid = q('main [class*="serviceGrid"]');
  out.gridCols = grid ? getComputedStyle(grid).gridTemplateColumns : null;
  out.featuredCards = qa('[class*="cardFeatured"]').length;
  out.soonBadges = qa('[class*="soonBadge"]').length;
  out.coverageBadges = qa('[class*="coverageBadge"]').length;
  out.orderLinks = qa('a[href*="/services/order"]').length;

  // constellation tile positions (centered, no NaN)
  out.constTileRects = qa('[class*="constTile"]').slice(0, 5).map((t) => {
    const r = t.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
  });

  // hero two-column check
  const heroInner = q('[class*="heroInner"]');
  out.heroCols = heroInner ? getComputedStyle(heroInner).gridTemplateColumns : null;

  return JSON.stringify(out, null, 1);
})()
