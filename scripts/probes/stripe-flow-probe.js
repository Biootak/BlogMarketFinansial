// probe: stripe.com deep flow — sections, bento anatomy, typography, hover borders
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = document.scrollingElement || document.documentElement;
  const out = { url: location.href };

  // 1) typography hierarchy (h1→h4)
  const heads = {};
  for (const tag of ['h1', 'h2', 'h3', 'h4']) {
    const el = document.querySelector(tag);
    if (!el) continue;
    const c = getComputedStyle(el);
    heads[tag] = {
      text: el.textContent.trim().slice(0, 40),
      size: c.fontSize,
      weight: c.fontWeight,
      ls: c.letterSpacing,
    };
  }
  out.headings = heads;

  // 2) main sections as we scroll (class + bg + min-height)
  out.sections = [];
  const height = doc.scrollHeight;
  for (let y = 0; y < height; y += Math.max(500, height / 12)) {
    doc.scrollTop = y;
    await sleep(180);
    const main = document.querySelector('main') || document.body;
    const els = Array.from(main.querySelectorAll('section, header'));
    const visible = els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.2;
      })
      .slice(-2);
    for (const el of visible) {
      const c = getComputedStyle(el);
      const cls = String(el.className || '').slice(0, 60);
      if (!out.sections.some((s) => s.cls === cls)) {
        out.sections.push({ cls, bg: c.backgroundColor, padBlock: c.paddingBlock });
      }
    }
  }
  doc.scrollTop = 0;
  await sleep(300);

  // 3) bento card anatomy + hover border technique
  const bento = document.querySelector('[class*="bento"]');
  out.bento = bento
    ? {
        cls: String(bento.className).slice(0, 70),
        radius: getComputedStyle(bento).borderRadius,
        border: getComputedStyle(bento).border,
        hasGradientChild: !!bento.querySelector('[class*="gradient"]'),
        gradientChildCls: bento.querySelector('[class*="gradient"]')
          ? String(bento.querySelector('[class*="gradient"]').className).slice(0, 60)
          : null,
      }
    : null;

  // 4) color usage — count distinct non-grayscale backgrounds
  const colors = new Map();
  document.querySelectorAll('section, header, [class*="card"], [class*="bento"]').forEach((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)') return;
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return;
    const [, r, g, b] = m.map(Number);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : ((mx - mn) / mx) * 100;
    if (sat < 6) return; // ignore grays
    const key = `${bg}`;
    colors.set(key, (colors.get(key) || 0) + 1);
  });
  out.distinctSaturatedBgs = [...colors.entries()];

  return JSON.stringify(out, null, 1);
})()
