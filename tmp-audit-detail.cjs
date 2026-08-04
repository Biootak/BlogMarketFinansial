const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:7180';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log('nav err', e.message));
    await page.waitForTimeout(2000);

    const info = await page.evaluate(() => {
      const out = {};
      const h1s = [...document.querySelectorAll('h1')].map((h) => ({
        text: (h.textContent || '').trim().slice(0, 40),
        cls: (h.className && String(h.className).slice(0, 60)) || '',
        fs: Math.round(parseFloat(getComputedStyle(h).fontSize)),
      }));
      out.h1s = h1s;

      // what makes body scrollW > innerWidth?
      const winW = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      out.winW = winW;
      out.docW = docW;
      // find elements whose right edge exceeds viewport
      const over = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > winW + 1) {
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && String(el.className).slice(0, 70)) || '',
            right: Math.round(r.right),
            left: Math.round(r.left),
            w: Math.round(r.width),
          });
        }
      }
      over.sort((a, b) => b.right - a.right);
      out.overRight = over.slice(0, 10);

      // hero elements
      const hero = document.querySelector('section[aria-label*="صفحه اصلی"]');
      if (hero) {
        const pick = (sel) => {
          const el = hero.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            fs: Math.round(parseFloat(cs.fontSize)),
            padInline: `${cs.paddingInlineStart}/${cs.paddingInlineEnd}`,
            padBlock: `${cs.paddingTop}/${cs.paddingBottom}`,
          };
        };
        out.hero = {
          root: pick('.HeroSection-module__root') || pick('section > div'),
          badge: pick('.badge') || null,
          headline: (() => { const el = hero.querySelector('h1'); const r = el?.getBoundingClientRect(); const cs = el && getComputedStyle(el); return el ? { w: Math.round(r.width), fs: Math.round(parseFloat(cs.fontSize)), lh: cs.lineHeight } : null; })(),
          sub: pick('p'),
          ctaRow: (() => { const el = hero.querySelector('div[class*="ctas"]'); const r = el?.getBoundingClientRect(); return el ? { w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(el).flexDirection } : null; })(),
          ctas: [...hero.querySelectorAll('a')].slice(0, 6).map((a) => { const r = a.getBoundingClientRect(); return { t: (a.textContent || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height), fs: Math.round(parseFloat(getComputedStyle(a).fontSize)) }; }),
          statsBar: (() => { const el = hero.querySelector('ul'); const r = el?.getBoundingClientRect(); return el ? { w: Math.round(r.width), h: Math.round(r.height), cols: getComputedStyle(el).gridTemplateColumns } : null; })(),
          stats: [...hero.querySelectorAll('li')].map((li) => { const r = li.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }),
        };
      }

      // floating dock (bottom nav)
      const dock = [...document.querySelectorAll('nav, div')].find((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.position === 'fixed' && r.bottom > window.innerHeight - 120;
      });
      if (dock) {
        const r = dock.getBoundingClientRect();
        const items = [...dock.querySelectorAll('a,button')].map((a) => { const ir = a.getBoundingClientRect(); return { t: (a.textContent || '').trim().slice(0, 12), w: Math.round(ir.width), h: Math.round(ir.height) }; });
        out.dock = { cls: (dock.className && String(dock.className).slice(0, 80)) || '', w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), items };
      }

      // main sections: their heights/paddings
      out.sections = [...document.querySelectorAll('main section')].map((s) => {
        const r = s.getBoundingClientRect();
        const cs = getComputedStyle(s);
        return {
          cls: (s.className && String(s.className).slice(0, 60)) || '',
          w: Math.round(r.width),
          h: Math.round(r.height),
          padBlock: `${cs.paddingTop}/${cs.paddingBottom}`,
        };
      }).slice(0, 12);

      return out;
    });

    console.log(JSON.stringify(info, null, 2));
    await page.screenshot({ path: 'tmp-audit-mobile-detail.png', fullPage: true }).catch(() => {});
    await page.close();
  } finally {
    await browser.close();
  }
})();
