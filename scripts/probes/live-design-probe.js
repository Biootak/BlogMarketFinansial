// Live design probe — extracts REAL design-system data from the current page.
// Run via: node scripts/pw-eval.mjs scripts/probes/live-design-probe.js
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2000); // let fonts/layout settle

  const cs = (el) => (el ? getComputedStyle(el) : null);
  const q = (s) => document.querySelector(s);
  const all = (s) => Array.from(document.querySelectorAll(s));
  const cls = (el) => (el && el.className ? String(el.className).slice(0, 80) : null);

  const out = { url: location.href, title: document.title };

  // ── Typography ───────────────────────────────────────────────────────────
  const h1 = q('h1');
  out.typography = {
    bodyFont: cs(document.body)?.fontFamily,
    bodySize: cs(document.body)?.fontSize,
    bodyWeight: cs(document.body)?.fontWeight,
    h1Font: cs(h1)?.fontFamily,
    h1Size: cs(h1)?.fontSize,
    h1Weight: cs(h1)?.fontWeight,
    h1LetterSpacing: cs(h1)?.letterSpacing,
    h1LineHeight: cs(h1)?.lineHeight,
    h1Text: h1?.textContent?.trim().slice(0, 90),
  };

  // ── Colors ───────────────────────────────────────────────────────────────
  out.colors = {
    bodyBg: cs(document.body)?.backgroundColor,
    bodyColor: cs(document.body)?.color,
    accentFound: (() => {
      // most saturated hue among common interactive elements
      const els = all('button, a[class*="btn"], [class*="Button"]').slice(0, 20);
      let best = null;
      for (const el of els) {
        const c = cs(el)?.backgroundColor;
        if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') continue;
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) continue;
        const [, r, g, b] = m.map(Number);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx === 0 ? 0 : ((mx - mn) / mx) * 100;
        if (sat > 30 && (!best || sat > best.sat)) best = { sat: Math.round(sat), color: c, sample: (el.textContent || '').trim().slice(0, 25) };
      }
      return best;
    })(),
  };

  // ── Hero structure ───────────────────────────────────────────────────────
  const main = q('main') || document.body;
  const heroCandidate = q('[class*="hero" i], [class*="Hero"], main > section, main > div') || main;
  out.hero = {
    tag: heroCandidate.tagName,
    className: cls(heroCandidate),
    padding: cs(heroCandidate)?.padding,
    minHeight: cs(heroCandidate)?.minHeight,
    bg: cs(heroCandidate)?.backgroundColor || cs(heroCandidate)?.backgroundImage?.slice(0, 60),
  };

  // ── CSS custom properties (design tokens) ────────────────────────────────
  const rs = cs(document.documentElement);
  const props = [];
  for (let i = 0; i < rs.length; i++) {
    const k = rs[i];
    if (k.startsWith('--')) props.push([k, rs.getPropertyValue(k).trim().slice(0, 50)]);
  }
  out.customProps = props.slice(0, 40);

  // ── Animations currently running ─────────────────────────────────────────
  const anims = document.getAnimations().slice(0, 12).map((a) => {
    const timing = a.effect?.getTiming?.();
    return {
      name: a.animationName || 'n/a',
      duration: timing?.duration ?? null,
      delay: timing?.delay ?? null,
      iterations: timing?.iterations ?? null,
      easing: timing?.easing ?? null,
      state: a.playState,
      target: a.effect?.target ? `${a.effect.target.tagName}.${cls(a.effect.target)}` : null,
    };
  });
  out.animations = anims;

  // ── Interactions / micro-interactions ────────────────────────────────────
  out.interactions = {
    buttons: all('button, a[class*="btn"], [class*="Button"], [role="button"]').slice(0, 10).map((b) => ({
      text: (b.textContent || '').trim().slice(0, 40),
      cls: cls(b),
      transition: cs(b)?.transition?.slice(0, 120),
      radius: cs(b)?.borderRadius,
      padding: cs(b)?.padding,
    })),
    navLinks: all('nav a, header a').slice(0, 12).map((a) => (a.textContent || '').trim().slice(0, 30)),
  };

  // ── Spacing rhythm (top-level section gaps) ──────────────────────────────
  const secs = all('main section, main > div').slice(0, 8).map((s) => ({
    cls: cls(s),
    padBlock: cs(s)?.paddingBlock,
    marginBlock: cs(s)?.marginBlock,
  }));
  out.sections = secs;

  return JSON.stringify(out, null, 1);
})()
