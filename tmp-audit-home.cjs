/**
 * Responsive audit script — homepage
 * Measures horizontal overflow, oversized items, and layout metrics
 * at mobile / tablet / desktop viewports against the running dev server.
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:7180';
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

async function auditPage(page, viewport, path) {
  const result = { path, viewport, overflow: [], oversized: [], anomalies: [] };

  // Horizontal overflow detection: any element sticking out of viewport
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    const offenders = [];
    if (docW > winW + 1) {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > winW + 2 || r.left < -2)) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' && r.width > winW) continue;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && String(el.className).slice(0, 90)) || '',
            right: Math.round(r.right),
            left: Math.round(r.left),
            width: Math.round(r.width),
          });
        }
      }
      // dedupe nested offenders (keep outermost)
      offenders.sort((a, b) => b.width - a.width);
      const seen = new Set();
      return offenders.filter((o) => {
        const key = `${o.cls}|${o.tag}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 12);
    }
    return [];
  });

  if (overflow.length) {
    result.overflow = { docW: overflow._docW, offenders: overflow.filter((o) => o !== undefined) };
  }

  // measure: elements that look too large relative to viewport
  const oversized = await page.evaluate(() => {
    const winW = window.innerWidth;
    const out = [];
    // hero headline font size
    const h1 = document.querySelector('h1');
    if (h1) {
      const fs = parseFloat(getComputedStyle(h1).fontSize);
      const w = h1.getBoundingClientRect().width;
      if (fs > winW * 0.1) out.push(`h1 font ${fs}px (${Math.round(fs / winW * 100)}% vw) width=${Math.round(w)}`);
    }
    // all h2
    document.querySelectorAll('h2').forEach((h) => {
      const fs = parseFloat(getComputedStyle(h).fontSize);
      if (fs > winW * 0.09) out.push(`h2 font ${fs}px (${Math.round(fs / winW * 100)}% vw)`);
    });
    // buttons with huge padding
    document.querySelectorAll('a,button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > winW * 0.95 && r.height > 40) {
        const cs = getComputedStyle(el);
        out.push(`near-full-width interactive: <${el.tagName.toLowerCase()}> ${(el.className && String(el.className).slice(0, 60)) || ''} ${Math.round(r.width)}x${Math.round(r.height)} padding=${cs.paddingInlineStart}/${cs.paddingInlineEnd}`);
      }
    });
    return out.slice(0, 15);
  });

  // horizontal scroll containers (good if intentional) — list them
  const scrollContainers = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 8) {
        const r = el.getBoundingClientRect();
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0, 80)) || '',
          clientW: Math.round(el.clientWidth),
          scrollW: Math.round(el.scrollWidth),
          vis: getComputedStyle(el).overflowX,
        });
      }
    });
    return out.slice(0, 10);
  });

  result.scrollContainers = scrollContainers;
  result.oversized = oversized;

  // font scale sanity on a few container headings
  const fontScale = await page.evaluate(() => {
    const out = {};
    const q = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return Math.round(parseFloat(getComputedStyle(el).fontSize));
    };
    out.h1 = q('h1');
    out.h2 = q('h2');
    out.cardTitle = q('.nc-card h3, article h3, h3');
    out.body = q('p');
    return out;
  });
  result.fontScale = fontScale;

  return result;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log('nav err', e.message));
      await page.waitForTimeout(1500);
      const r = await auditPage(page, vp, '/');
      results.push(r);
      await page.screenshot({ path: `tmp-audit-${vp.name}.png`, fullPage: true }).catch(() => {});
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
})();
