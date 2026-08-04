const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:7180';
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('nav err', e.message));
      await page.waitForTimeout(2500);

      const probs = await page.evaluate(() => {
        const winW = window.innerWidth;
        const out = { tinyText: [], hugeText: [], hugeBtn: [], hugePad: [], hugeGap: [], wide: [] };

        const all = [...document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, li, label, div')];
        for (const el of all) {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const fs = parseFloat(cs.fontSize);
          const txt = (el.textContent || '').trim();
          if (!txt) continue;
          // tiny readable text (persian needs at least ~11-12px; flag < 11.5px)
          if (fs > 0 && fs < 11.5 && r.width > 40 && !el.closest('[aria-hidden="true"]') && !el.closest('svg')) {
            if (out.tinyText.length < 14) {
              out.tinyText.push(`fs=${fs}px <${el.tagName.toLowerCase()}> "${txt.slice(0, 30)}" cls=${(el.className && String(el.className).slice(0, 50)) || ''}`);
            }
          }
          // huge heading vs viewport
          if (/^H[1-4]$/.test(el.tagName) && fs > winW * 0.075 && winW < 600) {
            out.hugeText.push(`h${el.tagName[1]} fs=${Math.round(fs)}px (${(fs / winW * 100).toFixed(1)}% vw) "${txt.slice(0, 24)}"`);
          }
          // interactive elements: buttons/links that look enormous relative to their text
          if ((el.tagName === 'BUTTON' || el.tagName === 'A') && r.height > 50) {
            out.hugeBtn.push(`<${el.tagName.toLowerCase()}> ${Math.round(r.width)}x${Math.round(r.height)} fs=${fs}px "${txt.slice(0, 20)}" cls=${(el.className && String(el.className).slice(0, 45)) || ''}`);
          }
        }

        // excessive vertical padding on section-level containers
        for (const el of document.querySelectorAll('section, div[class*="container"], div[class*="section"]')) {
          const cs = getComputedStyle(el);
          const pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
          const r = el.getBoundingClientRect();
          if (r.width < winW * 0.4) continue; // only wide containers
          if ((pt + pb) > 90 && winW < 600) {
            out.hugePad.push(`pad=${Math.round(pt)}/${Math.round(pb)} total=${Math.round(pt + pb)} w=${Math.round(r.width)} cls=${(el.className && String(el.className).slice(0, 55)) || ''}`);
          }
        }

        // very wide elements relative to viewport (excluding intentional marquees)
        for (const el of document.querySelectorAll('div, ul, section')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.width > winW * 1.02) {
            const cs = getComputedStyle(el);
            const isMarquee = cs.overflowX === 'hidden' || cs.overflow === 'hidden' || /marquee|ticker|scroll/i.test(String(el.className));
            if (!isMarquee) out.wide.push(`w=${Math.round(r.width)} (${(r.width / winW * 100).toFixed(0)}% vw) cls=${(el.className && String(el.className).slice(0, 60)) || ''}`);
          }
        }
        return out;
      });

      console.log(`\n===== ${vp.name} (${vp.width}px) =====`);
      console.log('TINY TEXT (<11.5px):', probs.tinyText.length ? '\n  ' + probs.tinyText.join('\n  ') : 'none');
      console.log('HUGE HEADINGS:', probs.hugeText.length ? '\n  ' + probs.hugeText.join('\n  ') : 'none');
      console.log('TALL BUTTONS (>50px):', probs.hugeBtn.length ? '\n  ' + probs.hugeBtn.slice(0, 10).join('\n  ') : 'none');
      console.log('HUGE PADDING (>90px mobile):', probs.hugePad.length ? '\n  ' + probs.hugePad.slice(0, 10).join('\n  ') : 'none');
      console.log('WIDE (>102% vw):', probs.wide.length ? '\n  ' + probs.wide.slice(0, 10).join('\n  ') : 'none');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
