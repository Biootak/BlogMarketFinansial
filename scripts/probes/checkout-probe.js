(() => {
  const q = (sel) => document.querySelector(sel);
  const all = (sel) => [...document.querySelectorAll(sel)];
  const label = (el) => el?.textContent?.trim().slice(0, 60) ?? null;
  // Probe the send-money / transfer form structure
  const inputs = all('input').map((i) => ({
    type: i.type,
    placeholder: i.placeholder,
    value: i.value,
    step: i.step,
    min: i.min,
    max: i.max,
  }));
  const selects = all('select').length;
  const buttons = all('button').map((b) => label(b)).filter(Boolean).slice(0, 8);
  const h1 = q('h1');
  const h2s = all('h2').map(label).filter(Boolean).slice(0, 6);
  const summary = all('[class*="summary"],[class*="summary-"]').map(label).filter(Boolean).slice(0, 6);
  const steps = all('[role="progressbar"],[class*="stepper"],[class*="progress"]').map(label).filter(Boolean).slice(0, 4);
  const forms = all('form').map((f) => ({
    inputs: f.querySelectorAll('input').length,
    text: label(f) ?? f.getAttribute('aria-label'),
  }));
  return {
    url: location.href,
    h1: label(h1),
    h2s,
    inputs,
    selectCount: selects,
    buttons,
    summary,
    steps,
    forms,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
})()