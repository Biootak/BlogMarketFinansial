# AGENTS.ui-design.md — UI/UX Design Direction 2026

Load for visual / UX work. Don't load for backend-only tasks.

## Vibe

Modern · Human · Premium · Minimal · Elegant · Professional.
Inspired by Linear / Resend / Stripe / Vercel / Raycast / Notion / Cursor / Attio — extract principles, don't copy.

## Every page must have

Visual Focus · Clear Hierarchy · Premium Detail · Memorable Interaction.

## Allowed

Layered Surfaces · Soft Shadows · Hairline Borders · Subtle Gradients · Ambient Light · Premium Typography · Depth.

## Forbidden

Neon · Loud colors · Heavy glow · Excessive glassmorphism · Emoji icons.

## Glass

Only in Header / Modal / Floating Panel / Toolbar. Low blur, low transparency, thin border. Glass shouldn't be the entire design.

## Motion

Hover, focus, page transition, reveal, skeleton, micro-interactions. Fast, smooth, GPU-friendly, no layout shift. Animation must have a purpose.

## Accessibility (WCAG 2.2 AA)

Semantic HTML · Keyboard nav · Screen reader · Focus management · Proper contrast.

## Performance

Lazy loading · Code splitting · Image optimization · Font optimization · Caching · Render optimization.

## Pre-delivery checklist

**Visual**: no emoji icons (use SVG/Lucide); consistent icon sizing (24×24 viewBox); hover states use color/opacity (no scale); use theme colors directly (`bg-primary`).
**Interaction**: every clickable element has `cursor-pointer`; hover feedback; transitions 150–300ms; visible focus.
**Light/dark**: text contrast ≥ 4.5:1; glass ≥ `bg-white/80` in light mode; borders visible in both.
**Layout**: floating navbar has edge spacing; content not hidden behind fixed navbar; responsive at 375/768/1024/1440.
**Accessibility**: alt text on images; labeled inputs; color isn't sole indicator; respect `prefers-reduced-motion`.