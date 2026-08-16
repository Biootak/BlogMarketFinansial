// probe: checkout layout verification (desktop grid + sticky aside)
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1500);

  const q = (s) => document.querySelector(s);
  const out = { url: location.href };

  const grid = q('main [class*="grid"]');
  const form = q('main [class*="formCol"]');
  const aside = q('main [class*="asideCol"]');
  const summary = q('aside[aria-label="خلاصه سفارش"]');

  out.viewport = { w: window.innerWidth, h: window.innerHeight };
  out.gridCols = grid ? getComputedStyle(grid).gridTemplateColumns : null;
  out.formWidth = form ? Math.round(form.getBoundingClientRect().width) : null;
  out.asideWidth = aside ? Math.round(aside.getBoundingClientRect().width) : null;
  out.asidePosition = aside ? getComputedStyle(aside).position : null;
  out.summaryText = summary ? summary.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null;

  // is the summary sticky (top offset below scroll)?
  if (aside) {
    const rect = aside.getBoundingClientRect();
    out.asideRectTop = Math.round(rect.top);
    out.scrollY = Math.round(window.scrollY);
  }

  return JSON.stringify(out, null, 1);
})()
