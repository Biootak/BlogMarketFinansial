# AGENTS.ui-skill.md — ui-ux-pro-max design system tool

Load only when the user asks for design system generation, style/color palette, or component recommendations. Skip for normal code work.

## Prerequisites

```bash
python3 --version || python --version
```

If missing:
- macOS: `brew install python3`
- Ubuntu: `sudo apt update && sudo apt install python3`
- Windows: `winget install Python.Python.3.12`

## Workflow

### Step 1: Analyze requirements

Extract: product type, style keywords, industry, stack (default `html-tailwind`).

### Step 2: Generate design system (REQUIRED)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

### Step 2b: Persist (Master + Overrides)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

Creates:
- `design-system/MASTER.md`
- `design-system/pages/<name>.md` (for page-specific overrides)

### Step 3: Detailed searches (as needed)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>
```

Domains: `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `prompt`.

### Step 4: Stack guidelines (default html-tailwind)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`.

## Common UI pitfalls

- **No emoji icons** — use SVG (Heroicons, Lucide).
- **Stable hover states** — color/opacity, never scale transforms.
- **Brand logos** — official SVG from Simple Icons, never guess.
- **Cursor pointer** on every interactive card.
- **Smooth transitions** 150–300ms.
- **Light mode contrast** — text ≥ `#0F172A`, muted ≥ `#475569`, borders ≥ `border-gray-200`.