// probe: sticky summary check — scroll the actual scroll container, confirm aside stays in view
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);

  const doc = document.scrollingElement || document.documentElement;
  doc.scrollTop = 400;
  await sleep(600);

  const aside = q('[class*="asideCol"]');
  const rect = aside.getBoundingClientRect();
  return JSON.stringify({
    scrolledTo: Math.round(doc.scrollTop),
    asideTop: Math.round(rect.top),
    asideBottom: Math.round(rect.bottom),
    inViewport: rect.top >= 0 && rect.top < window.innerHeight,
  }, null, 1);
})()
