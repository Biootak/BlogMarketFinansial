# AGENTS.playwright.md — Playwright MCP / باز کردن مرورگر (قانونی و دائمی)

> **⛔ قانون P0: باز کردن مرورگر را هرگز از صفر کانفیگ نکن.**
> فقط از اسکریپت آماده استفاده کن: `npm run browser:open` (یا `node scripts/playwright-open.mjs`).
> این سند تنها مرجع است — هر AI دیگری باید همین را بخواند و همان را اجرا کند.

---

## چرا این فایل وجود دارد

در محیط Freebuff، ابزارهای MCP به agent وصل نمی‌شوند (ابزارهای `playwright_*` / `browser_*`
در toolset نیستند). برای باز کردن مرورگر واقعی، یک درایور کوچک با **SDK رسمی MCP** به سرور
رسمی `@playwright/mcp` وصل می‌شود و مرورگر headed را باز نگه می‌دارد.

این راه‌اندازی بارها دیباگ شده (نسخه‌های خراب، خطای دستی، تغییر نام ابزارها). **دوباره اختراعش نکن.**

---

## ⚡ راه‌اندازی سریع (فقط ۲ فرمان)

```bash
npm run dev            # ۱) سرور dev روی پورت 3000 (در یک ترمینال — مثل همیشه)
npm run browser:open   # ۲) باز کردن مرورگر واقعی پلی‌رایت (در ترمینال دیگر)
```

- مرورگر کرومیوم headed روی دسکتاپ باز می‌شود و به `http://localhost:3000` می‌رود.
- اسکرین‌شات تایید: `.playwright-mcp/open-browser-check.png` (بعد از ~۶ ثانیه ذخیره می‌شود).
- پروسه `browser:open` باید **زنده بماند** تا مرورگر باز بماند. با `Ctrl+C` بسته می‌شود.
- URL دلخواه: `PW_URL=http://localhost:3000/dashboard npm run browser:open`
- نسخه MCP دلخواه: `PW_MCP_PKG=@playwright/mcp@0.0.78 npm run browser:open`

### بعد از ریاستارت Freebuff / بسته شدن مرورگر
همه پروسه‌ها (dev server + درایور) از بین رفته‌اند — فقط همین دو فرمان را دوباره بزن. تمام.

---

## این اسکریپت چه کار می‌کند (خلاصه — لازم نیست تغییرش دهی)

`scripts/playwright-open.mjs`:
1. اگر `@modelcontextprotocol/sdk` در `.playwright-mcp/sdk/node_modules` نباشد → خودش `npm i` می‌کند (**خودترمیم** — اگر پاک شده بود دوباره ساخته می‌شود).
2. سرور MCP را با `npx -y @playwright/mcp@latest --user-data-dir .playwright-mcp/profile` بالا می‌آورد.
3. با SDK رسمی وصل می‌شود → `browser_navigate` → `browser_take_screenshot` → اتصال را زنده نگه می‌دارد.

---

## کانفیگ MCP (فقط در صورت پاک شدن `.mcp.json`)

`.mcp.json` به عمد در `.gitignore` است (خط ~104). اگر پاک شد، این بلاک را دوباره بساز —
**کپی کن، تغییر نده**:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "type": "stdio",
      "disabled": false,
      "alwaysAllow": [
        "playwright_navigate",
        "playwright_screenshot",
        "playwright_evaluate",
        "playwright_click",
        "playwright_fill",
        "playwright_get_visible_text",
        "playwright_get_visible_html"
      ]
    }
  }
}
```

> توجه: نسخه‌های جدید `@playwright/mcp` ابزارها را به `browser_*` تغییر داده‌اند
> (`browser_navigate`, `browser_take_screenshot`, ...). هر دو نام با کلاینت رسمی کار می‌کنند؛
> درایور هر دو را تشخیص می‌دهد.

---

## 🐛 تله‌ها (gotchas — درس‌های قبلی، تکرار نکن)

| تله | حقیقت |
|-----|-------|
| «Method not found» موقع `tools/call` | این خطا از **کلاینت دستی** (framing اشتباه) می‌آید، نه از سرور. همیشه از SDK رسمی استفاده کن — `@modelcontextprotocol/sdk` — نه JSON-RPC دستی. |
| `playwright_navigate` موجود نیست | طبیعی است — نسخه جدید `browser_navigate` است. درایور هر دو را امتحان می‌کند. |
| `@playwright/mcp@latest` «خراب» به نظر می‌رسد | اگر با کلاینت رسمی تست کنی کار می‌کند (۰.۰.۷۸ و ۰.۰.۷۹ تایید شده). فقط اگر واقعاً بشکند → در `scripts/playwright-open.mjs` نسخه را پین کن. |
| مرورگر بسته می‌شود | پروسه `browser:open` کشته شده. دوباره اجرا کن. |
| Preview تب Freebuff | جدا از مرورگر پلی‌رایت است — هر دو می‌توانند همزمان باز باشند. Preview = تب داخلی؛ پلی‌رایت = پنجره واقعی دسکتاپ. |
| `.playwright-mcp/` پاک شده | مهم نیست — اسکریپت SDK را خودش دوباره نصب می‌کند؛ profile دوباره ساخته می‌شود (session/login از بین می‌رود، طبیعی است). |

---

## چرا این راه‌اندازی پاک نمی‌شود

| جزء | کجا زندگی می‌کند | محافظت |
|-----|------------------|--------|
| درایور | `scripts/playwright-open.mjs` | **ورژن‌کنترل‌شده** (استثنای صریح در `.gitignore`) |
| فرمان | `package.json` → `"browser:open"` | ورژن‌کنترل‌شده |
| این سند | `AGENTS.playwright.md` + اشاره در `AGENTS.md` | ورژن‌کنترل‌شده — هر AI آن را می‌خواند |
| کانفیگ MCP | `.mcp.json` | gitignored ولی snippet در همین سند — در ۱۰ ثانیه بازسازی می‌شود |
| SDK + profile | `.playwright-mcp/` | gitignored ولی خودترمیم (اسکریپت دوباره نصب می‌کند) |

بنابراین حتی اگر workspace کاملاً تازه شود: `npm run dev` + `npm run browser:open` کافی است.

---

## تست / عیب‌یابی سریع

```bash
# ۱) سرور dev بالا است؟
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000

# ۲) درایور دارد کار می‌کند؟
tail -f .playwright-mcp/sdk/open-browser.out   # یا خروجی خود ترمینال

# ۳) اسکرین‌شات تایید
ls -la .playwright-mcp/open-browser-check.png
```

اگر درایور خطا داد: خروجی کامل را بخوان، سرور dev را چک کن، و اگر خطای MCP بود
با SDK رسمی در `.playwright-mcp/sdk/` تست کن — نه با ساخت کلاینت دستی.
