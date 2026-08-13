# AGENTS.mcp.md — Graphify knowledge graph MCP

Load for codebase navigation (BFS/DFS/shortest-path) instead of linear grep — especially during deep refactors. Saves tokens.

## Install (one-time, global)

```bash
pip install "graphifyy[mcp]"
pip install openai             # only for type-check; not needed for code-only corpus
```

## Build graph (regeneration)

```powershell
# temp: move non-code files out of scan path (PowerShell)
Move-Item src\images .graphify-bak-images -Force
Rename-Item src\lib\email\README.md src\lib\email\.README.md.bak

# build (no API key needed for code-only; GRAPHIFY_OUT absolute keeps output at root)
$env:GRAPHIFY_OUT = "E:\FinancialMarket\graphify-out"
python -m graphify update src

# restore
Rename-Item src\lib\email\.README.md.bak src\lib\email\README.md
Move-Item .graphify-bak-images src\images -Force
```

Output: `graphify-out/graph.json` (~4MB). Gitignored — regeneratable from source.

**Why `GRAPHIFY_OUT` env var:** by default graphify puts the output at `<scan_path>/graphify-out/`, so `update src` writes to `src/graphify-out/`. Setting `GRAPHIFY_OUT` to the absolute root path keeps the artifact at the repo root where `/graphify-out/` is already gitignored.

## `.mcp.json` (project root)

```json
{
  "mcpServers": {
    "graphify": {
      "command": "python",
      "args": ["-m", "graphify.serve", "E:\\FinancialMarket\\graphify-out\\graph.json"],
      "type": "stdio",
      "env": {
        "GRAPHIFY_OUT": "E:\\FinancialMarket\\graphify-out"
      }
    }
  }
}
```

## 11 tools available

`query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs` (+ `initialize`/`tools/list` MCP primitives).

## Smoke test (no agent)

```python
# smoke.py — avoid PowerShell pipe which adds a BOM to stdin
import subprocess
ndjson = (
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}\n'
    '{"jsonrpc":"2.0","method":"notifications/initialized"}\n'
    '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"graph_stats","arguments":{}}}\n'
)
open(".smoke.ndjson","wb").write(ndjson.encode("utf-8"))
r = subprocess.run(
    ["python","-m","graphify.serve",r"E:\FinancialMarket\graphify-out\graph.json"],
    stdin=open(".smoke.ndjson","rb"),
    capture_output=True, timeout=60,
)
print(r.stdout.decode()); print(r.stderr.decode())
```

## Notes

- After big refactor: `$env:GRAPHIFY_OUT="E:\FinancialMarket\graphify-out"; python -m graphify update src --force` to rebuild.
- For LLM-enriched community naming: set `GEMINI_API_KEY` / `MOONSHOT_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` and run `python -m graphify label .` after build.
- npm `graphify-mcp-tools` is deprecated — use `python -m graphify.serve`.
- Existing graphs use the pre-#1504 node-ID scheme — `graph_stats` works, but path-qualified IDs require a rebuild with `python -m graphify extract --force`.

---

# Runtime MCPs (محیط Mavis)

اینا MCPهایی هستن که تو محیط mavis/Zcode AI desktop از قبل register شدن. وقتی نیاز شد فراخوانی‌شون کن:

## لیست MCPها

| MCP | کاربرد | ابزار شاخص | وضعیت |
|-----|--------|------------|-------|
| `cu` (Computer Use) | کنترل دسکتاپ (mouse/keyboard/screenshot/clipboard/windows) | `desktop_screenshot`, `desktop_left_click`, `desktop_type`, `desktop_window_list` | نیاز به فعال‌سازی toggle Computer Use |
| `matrix` | پردازش media + وب سرچ | `web_search` (native), `matrix_generate_image`, `matrix_gen_videos`, `matrix_synthesize_speech`, `matrix_transcribe_audio` | آماده |
| `playwright` | اتوماسیون مرورگر — navigate/click/fill/PDF/a11y snapshot | `playwright_navigate`, `playwright_screenshot`, `playwright_pdf` | آماده |
| `trash` | حذف recoverable (به‌جای `rm`) | `mavis-trash <path>` | آماده |

## نحوه فراخوانی

### ۱. Native tools (مستقیم)

```ts
// matrix.web_search
web_search({ query: "...", count: 10 })
```

اگه ابزار native باشه (مثل `web_search`)، مستقیم با همون اسم صدا زده می‌شه.

### ۲. CLI wrapper (غیر-native)

```bash
# لیست ابزارهای یک MCP
mavis mcp tools <server> <tool>

# فراخوانی
mavis mcp call <server> <tool> '{"key":"value"}'
```

مثلاً:
```bash
mavis mcp call matrix matrix_generate_image '{"prompt":"a cat","width":1024}'
```

### ۳. Trash (ساده‌ترین)

```bash
mavis-trash E:\path\to\file.tsx
```

به‌جای `rm` یا `Remove-Item` استفاده کن — فایل به OS Trash می‌ره و قابل بازیابیه.

## نکات

- **Computer Use**: مختصات 0-1000 normalized (نه pixel واقعی). قبل از click حتماً `desktop_screenshot` بگیر.
- **matrix**: برای media generation باید account/auth فعال باشه؛ اگه خطا داد، status رو چک کن: `mavis mcp ls`.
- **playwright**: برای تست frontend/UI در dev server خیلی به‌درد می‌خوره.
- **trash**: همیشه اولویت بده به این؛ `rm -rf` بدون recovery نیست.

## چه موقع کدوم رو صدا بزنم

| نیاز | MCP |
|------|-----|
| سرچ وب (مستندات، نمونه کد، رفع باگ) | `matrix.web_search` (native) |
| دیدن صفحه‌ی دسکتاپ / کلیک روی دکمه / paste | `cu.*` |
| باز کردن localhost در مرورگر واقعی، گرفتن PDF | `playwright.*` |
| حذف فایل/فولدر | `mavis-trash` |
| ساخت تصویر/ویدیو/موسیقی/صدا | `matrix.generate_*` |
| OCR یا transcribe فایل صوتی | `matrix.transcribe_audio` / `matrix.audios_understand` |

---

# Freebuff (این محیط) — Playwright MCP

> **در Freebuff ابزارهای MCP به agent وصل نمی‌شوند** — پس برای باز کردن مرورگر واقعی:
> 1. `npm run dev` (سرور dev)
> 2. `npm run browser:open` (مرورگر واقعی پلی‌رایت)
>
> ⛔ **هرگز از صفر کانفیگ نکن.** سند کامل + تله‌ها + بازسازی: **`AGENTS.playwright.md`**.
> درایور: `scripts/playwright-open.mjs` (خودترمیم — SDK را خودش نصب می‌کند).