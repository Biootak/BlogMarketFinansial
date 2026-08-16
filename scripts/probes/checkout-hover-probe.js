(() => {
  const card = document.querySelector('div[class*="formCard"]');
  if (!card) return { found: false };
  const cs = getComputedStyle(card, '::after');
  return {
    found: true,
    afterOpacity: cs.opacity,
    afterBg: cs.backgroundImage.slice(0, 60),
    hasMask: cs.maskImage !== 'none' || cs.webkitMaskImage !== 'none',
  };
})()