(() => {
  const h1 = document.querySelector('h1');
  const cs = h1 ? getComputedStyle(h1) : null;
  return {
    viewport: window.innerWidth,
    h1Size: cs?.fontSize,
    h1Weight: cs?.fontWeight,
    h1Tracking: cs?.letterSpacing,
  };
})()