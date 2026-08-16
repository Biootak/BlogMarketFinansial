// probe: hover state of first service card
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(300);
  const card = document.querySelector('[class*="serviceCard"]');
  const cs = getComputedStyle(card);
  const after = getComputedStyle(card, '::after');
  return JSON.stringify({
    afterOpacity: after.opacity,
    afterBg: after.backgroundImage.slice(0, 50),
    borderColor: cs.borderColor,
    transform: cs.transform,
  }, null, 1);
})()
