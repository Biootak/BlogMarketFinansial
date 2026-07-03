# Command Center Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current NOVA dashboard with a modern "Command Center" workspace featuring Command Bar, Timeline, Context Panel, and Quick Actions.

**Architecture:** Server Component page fetches data via server actions, passes to Client Components. Command Bar provides keyboard-first navigation. Timeline shows live activity feed. Context Panel adapts based on user selection. Quick Actions provide role-based shortcuts.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, Prisma, Radix UI, recharts

---

## File Structure

### Files to Create
```
src/components/Dashboard/DashboardPage/command/
├── CommandCenter.tsx       # Main orchestrator (Client Component)
├── CommandBar.tsx          # Smart command bar (⌘K)
├── Timeline.tsx            # Live activity timeline
├── ContextPanel.tsx        # Adaptive context panel
├── QuickActions.tsx        # Role-aware quick actions
├── tiles/
│   ├── StatsCard.tsx       # Today's stats with sparkline
│   ├── MarketPulse.tsx     # Real market rates (API-driven)
│   ├── PostsList.tsx       # Recent posts + drafts
│   ├── TasksList.tsx       # Tasks and reminders
│   └── AnalyticsChart.tsx  # Interactive analytics chart
├── hooks/
│   ├── useCommand.ts       # Command bar logic
│   ├── useTimeline.ts      # Timeline data + polling
│   └── useTasks.ts         # Tasks CRUD logic
└── index.ts                # Barrel export
```

### Files to Modify
```
src/app/dashboard/page.tsx                    # Import CommandCenter instead of NovaDeck
src/app/dashboard/dashboard.css               # Add Command Center styles
src/components/ds/styles/tokens.css           # Add --cc-* tokens
```

### Files to Delete
```
src/components/Dashboard/DashboardPage/aurora/  # Empty, dead code
src/components/Dashboard/DashboardPage/tide/    # Old generation
src/components/Dashboard/DashboardPage/overview/ # Old generation
src/components/Dashboard/DashboardPage/v2/      # Old generation
src/components/Dashboard/DashboardPage/nova/    # Current generation
```

### Files to Create (Task System)
```
prisma/schema.prisma                          # Add Task model
src/actions/taskActions.ts                    # Task CRUD server actions
```

---

## Task 1: Prisma Schema — Add Task Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Read current schema**

```bash
cat prisma/schema.prisma | grep -n "model " | head -30
```

- [ ] **Step 2: Add Task model to schema**

Append to `prisma/schema.prisma`:

```prisma
model Task {
  id          String       @id @default(cuid())
  title       String
  description String?
  status      TaskStatus   @default(PENDING)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
  @@index([status])
  @@index([dueDate])
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

- [ ] **Step 3: Add relation to User model**

Find the `User` model and add:

```prisma
tasks Task[]
```

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `Prisma Client generated successfully`

- [ ] **Step 5: Create migration**

```bash
npx prisma migrate dev --name add-tasks
```

Expected: Migration created successfully

- [ ] **Step 6: Verify schema**

```bash
npx prisma validate
```

Expected: `Valid prisma schema`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Task model to Prisma schema"
```

---

## Task 2: Task Server Actions

**Files:**
- Create: `src/actions/taskActions.ts`

- [ ] **Step 1: Create taskActions.ts**

```typescript
'use server'

import { requireUser } from '@/lib/require-auth'
import { db } from '@/lib/db'
import { revalidateTag } from '@/lib/revalidate'

export async function getTasks(limit = 10) {
  const user = await requireUser()
  
  return db.task.findMany({
    where: { userId: user.id },
    orderBy: [
      { status: 'asc' },
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
    take: limit,
  })
}

export async function createTask(data: {
  title: string
  description?: string
  dueDate?: Date
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}) {
  const user = await requireUser()
  
  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority || 'MEDIUM',
      userId: user.id,
    },
  })
  
  revalidateTag('tasks')
  return { success: true, data: task }
}

export async function updateTaskStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
) {
  const user = await requireUser()
  
  const task = await db.task.findFirst({
    where: { id, userId: user.id },
  })
  
  if (!task) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'تسک یافت نشد' } }
  }
  
  const updated = await db.task.update({
    where: { id },
    data: { status },
  })
  
  revalidateTag('tasks')
  return { success: true, data: updated }
}

export async function deleteTask(id: string) {
  const user = await requireUser()
  
  const task = await db.task.findFirst({
    where: { id, userId: user.id },
  })
  
  if (!task) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'تسک یافت نشد' } }
  }
  
  await db.task.delete({ where: { id } })
  
  revalidateTag('tasks')
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/actions/taskActions.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/taskActions.ts
git commit -m "feat: add Task server actions (CRUD)"
```

---

## Task 3: Design Tokens — Command Center

**Files:**
- Modify: `src/components/ds/styles/tokens.css`

- [ ] **Step 1: Read current tokens**

```bash
cat src/components/ds/styles/tokens.css | wc -l
```

- [ ] **Step 2: Add Command Center tokens**

Append to `src/components/ds/styles/tokens.css`:

```css
/* Command Center Tokens — 2026-07-03 */
:root {
  /* Colors */
  --cc-primary: oklch(65% 0.15 265);
  --cc-primary-hover: oklch(60% 0.18 265);
  --cc-accent: oklch(70% 0.18 155);
  --cc-accent-hover: oklch(65% 0.20 155);
  --cc-warning: oklch(75% 0.15 70);
  --cc-error: oklch(65% 0.18 25);
  --cc-surface: oklch(98% 0.005 265);
  --cc-canvas: oklch(97% 0.003 265);
  --cc-text: oklch(20% 0.01 265);
  --cc-text-muted: oklch(50% 0.01 265);
  --cc-border: oklch(90% 0.005 265);
  
  /* Typography */
  --cc-text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --cc-text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --cc-text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --cc-text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
  --cc-text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --cc-text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --cc-text-3xl: clamp(2rem, 1.5rem + 2.5vw, 3rem);
  
  /* Spacing */
  --cc-space-1: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
  --cc-space-2: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --cc-space-3: clamp(0.75rem, 0.6rem + 0.75vw, 1rem);
  --cc-space-4: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --cc-space-6: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --cc-space-8: clamp(2rem, 1.6rem + 2vw, 3rem);
  
  /* Radius */
  --cc-radius-sm: 8px;
  --cc-radius-md: 12px;
  --cc-radius-lg: 16px;
  --cc-radius-xl: 24px;
  --cc-radius-full: 9999px;
  
  /* Shadows */
  --cc-shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
  --cc-shadow-md: 0 4px 12px oklch(0% 0 0 / 0.08);
  --cc-shadow-lg: 0 8px 24px oklch(0% 0 0 / 0.12);
  --cc-shadow-xl: 0 16px 48px oklch(0% 0 0 / 0.16);
  
  /* Transitions */
  --cc-duration-fast: 150ms;
  --cc-duration-normal: 250ms;
  --cc-duration-slow: 400ms;
  --cc-easing: cubic-bezier(0.16, 1, 0.3, 1);
}

.dark {
  --cc-surface: oklch(18% 0.01 265);
  --cc-canvas: oklch(13% 0.01 265);
  --cc-text: oklch(95% 0.005 265);
  --cc-text-muted: oklch(65% 0.005 265);
  --cc-border: oklch(25% 0.01 265);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --cc-duration-fast: 0ms;
    --cc-duration-normal: 0ms;
    --cc-duration-slow: 0ms;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ds/styles/tokens.css
git commit -m "feat: add Command Center design tokens"
```

---

## Task 4: Command Center CSS

**Files:**
- Modify: `src/app/dashboard/dashboard.css`

- [ ] **Step 1: Read current CSS line count**

```bash
wc -l src/app/dashboard/dashboard.css
```

- [ ] **Step 2: Add Command Center styles**

Append to `src/app/dashboard/dashboard.css`:

```css
/* Command Center — 2026-07-03 */
@layer utilities {
  /* Main Container */
  .cc-container {
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-4);
    padding: var(--cc-space-4);
    max-width: 1440px;
    margin: 0 auto;
    min-height: 100vh;
  }
  
  /* Command Bar */
  .cc-command-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    padding: var(--cc-space-3) var(--cc-space-4);
    box-shadow: var(--cc-shadow-md);
    transition: box-shadow var(--cc-duration-normal) var(--cc-easing);
  }
  
  .cc-command-bar:focus-within {
    box-shadow: var(--cc-shadow-lg), 0 0 0 2px var(--cc-primary);
  }
  
  .cc-command-bar__input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-size: var(--cc-text-lg);
    color: var(--cc-text);
    font-family: inherit;
  }
  
  .cc-command-bar__input::placeholder {
    color: var(--cc-text-muted);
  }
  
  .cc-command-bar__shortcut {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--cc-canvas);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-sm);
    font-size: var(--cc-text-xs);
    color: var(--cc-text-muted);
    font-family: monospace;
  }
  
  .cc-command-bar__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--cc-space-2);
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    box-shadow: var(--cc-shadow-xl);
    max-height: 300px;
    overflow-y: auto;
    z-index: 60;
  }
  
  .cc-command-bar__item {
    display: flex;
    align-items: center;
    gap: var(--cc-space-3);
    padding: var(--cc-space-3) var(--cc-space-4);
    cursor: pointer;
    transition: background var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-command-bar__item:hover,
  .cc-command-bar__item--active {
    background: var(--cc-canvas);
  }
  
  .cc-command-bar__item-icon {
    font-size: var(--cc-text-xl);
  }
  
  .cc-command-bar__item-label {
    font-size: var(--cc-text-base);
    color: var(--cc-text);
  }
  
  /* Main Layout */
  .cc-main {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: var(--cc-space-4);
    flex: 1;
  }
  
  @media (max-width: 1023px) {
    .cc-main {
      grid-template-columns: 1fr;
    }
  }
  
  /* Timeline */
  .cc-timeline {
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    padding: var(--cc-space-4);
    overflow-y: auto;
    max-height: calc(100vh - 200px);
  }
  
  .cc-timeline__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--cc-space-4);
    padding-bottom: var(--cc-space-3);
    border-bottom: 1px solid var(--cc-border);
  }
  
  .cc-timeline__title {
    font-size: var(--cc-text-xl);
    font-weight: 600;
    color: var(--cc-text);
  }
  
  .cc-timeline__filters {
    display: flex;
    gap: var(--cc-space-2);
  }
  
  .cc-timeline__filter {
    padding: var(--cc-space-1) var(--cc-space-3);
    background: var(--cc-canvas);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-full);
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    cursor: pointer;
    transition: all var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-timeline__filter:hover,
  .cc-timeline__filter--active {
    background: var(--cc-primary);
    color: white;
    border-color: var(--cc-primary);
  }
  
  .cc-timeline__date {
    font-size: var(--cc-text-sm);
    font-weight: 600;
    color: var(--cc-text-muted);
    margin-top: var(--cc-space-4);
    margin-bottom: var(--cc-space-2);
  }
  
  .cc-timeline__item {
    display: flex;
    gap: var(--cc-space-3);
    padding: var(--cc-space-3);
    border-radius: var(--cc-radius-md);
    cursor: pointer;
    transition: background var(--cc-duration-fast) var(--cc-easing);
    animation: cc-fade-in var(--cc-duration-normal) var(--cc-easing);
  }
  
  .cc-timeline__item:hover {
    background: var(--cc-canvas);
  }
  
  .cc-timeline__item--selected {
    background: var(--cc-canvas);
    border: 1px solid var(--cc-primary);
  }
  
  .cc-timeline__item-icon {
    font-size: var(--cc-text-xl);
    flex-shrink: 0;
  }
  
  .cc-timeline__item-content {
    flex: 1;
    min-width: 0;
  }
  
  .cc-timeline__item-title {
    font-size: var(--cc-text-base);
    color: var(--cc-text);
    margin-bottom: var(--cc-space-1);
  }
  
  .cc-timeline__item-meta {
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
  }
  
  .cc-timeline__item-time {
    font-size: var(--cc-text-xs);
    color: var(--cc-text-muted);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  
  /* Context Panel */
  .cc-context {
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    padding: var(--cc-space-4);
    display: flex;
    flex-direction: column;
  }
  
  .cc-context__tabs {
    display: flex;
    gap: var(--cc-space-1);
    margin-bottom: var(--cc-space-4);
    padding-bottom: var(--cc-space-3);
    border-bottom: 1px solid var(--cc-border);
  }
  
  .cc-context__tab {
    padding: var(--cc-space-2) var(--cc-space-3);
    background: transparent;
    border: none;
    border-radius: var(--cc-radius-sm);
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    cursor: pointer;
    transition: all var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-context__tab:hover {
    background: var(--cc-canvas);
    color: var(--cc-text);
  }
  
  .cc-context__tab--active {
    background: var(--cc-primary);
    color: white;
  }
  
  .cc-context__content {
    flex: 1;
    overflow-y: auto;
  }
  
  /* Quick Actions */
  .cc-actions {
    display: flex;
    gap: var(--cc-space-3);
    justify-content: center;
    padding: var(--cc-space-4);
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
  }
  
  .cc-actions__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--cc-space-2);
    padding: var(--cc-space-3) var(--cc-space-6);
    background: var(--cc-canvas);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-full);
    font-size: var(--cc-text-base);
    font-weight: 500;
    color: var(--cc-text);
    cursor: pointer;
    transition: all var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-actions__btn:hover {
    background: var(--cc-primary);
    color: white;
    border-color: var(--cc-primary);
    transform: scale(1.05);
    box-shadow: var(--cc-shadow-md);
  }
  
  .cc-actions__btn:focus-visible {
    outline: 2px solid var(--cc-primary);
    outline-offset: 2px;
  }
  
  /* Tiles */
  .cc-tile {
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    padding: var(--cc-space-4);
  }
  
  .cc-tile__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--cc-space-3);
  }
  
  .cc-tile__title {
    font-size: var(--cc-text-lg);
    font-weight: 600;
    color: var(--cc-text);
  }
  
  .cc-tile__action {
    font-size: var(--cc-text-sm);
    color: var(--cc-primary);
    cursor: pointer;
    text-decoration: none;
  }
  
  .cc-tile__action:hover {
    text-decoration: underline;
  }
  
  /* Stats */
  .cc-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--cc-space-3);
  }
  
  @media (max-width: 767px) {
    .cc-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .cc-stat {
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-md);
    padding: var(--cc-space-3);
    transition: all var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-stat:hover {
    transform: translateY(-2px);
    box-shadow: var(--cc-shadow-md);
  }
  
  .cc-stat__label {
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    margin-bottom: var(--cc-space-1);
  }
  
  .cc-stat__value {
    font-size: var(--cc-text-2xl);
    font-weight: 700;
    color: var(--cc-text);
    font-variant-numeric: tabular-nums;
  }
  
  .cc-stat__delta {
    font-size: var(--cc-text-sm);
    margin-top: var(--cc-space-1);
  }
  
  .cc-stat__delta--up {
    color: var(--cc-accent);
  }
  
  .cc-stat__delta--down {
    color: var(--cc-error);
  }
  
  /* Posts List */
  .cc-posts {
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-2);
  }
  
  .cc-post {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--cc-space-3);
    background: var(--cc-canvas);
    border-radius: var(--cc-radius-md);
    transition: background var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-post:hover {
    background: var(--cc-border);
  }
  
  .cc-post__info {
    flex: 1;
    min-width: 0;
  }
  
  .cc-post__title {
    font-size: var(--cc-text-base);
    font-weight: 500;
    color: var(--cc-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .cc-post__meta {
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    margin-top: var(--cc-space-1);
  }
  
  .cc-post__actions {
    display: flex;
    gap: var(--cc-space-2);
  }
  
  .cc-post__btn {
    padding: var(--cc-space-1) var(--cc-space-2);
    background: var(--cc-surface);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-sm);
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    cursor: pointer;
    transition: all var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-post__btn:hover {
    background: var(--cc-primary);
    color: white;
    border-color: var(--cc-primary);
  }
  
  /* Tasks List */
  .cc-tasks {
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-2);
  }
  
  .cc-task {
    display: flex;
    align-items: center;
    gap: var(--cc-space-3);
    padding: var(--cc-space-3);
    background: var(--cc-canvas);
    border-radius: var(--cc-radius-md);
    transition: background var(--cc-duration-fast) var(--cc-easing);
  }
  
  .cc-task:hover {
    background: var(--cc-border);
  }
  
  .cc-task__checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--cc-border);
    border-radius: var(--cc-radius-sm);
    cursor: pointer;
    transition: all var(--cc-duration-fast) var(--cc-easing);
    flex-shrink: 0;
  }
  
  .cc-task__checkbox--checked {
    background: var(--cc-accent);
    border-color: var(--cc-accent);
  }
  
  .cc-task__info {
    flex: 1;
    min-width: 0;
  }
  
  .cc-task__title {
    font-size: var(--cc-text-base);
    color: var(--cc-text);
  }
  
  .cc-task__title--completed {
    text-decoration: line-through;
    color: var(--cc-text-muted);
  }
  
  .cc-task__meta {
    font-size: var(--cc-text-sm);
    color: var(--cc-text-muted);
    margin-top: var(--cc-space-1);
  }
  
  .cc-task__priority {
    padding: var(--cc-space-1) var(--cc-space-2);
    border-radius: var(--cc-radius-full);
    font-size: var(--cc-text-xs);
    font-weight: 500;
  }
  
  .cc-task__priority--low {
    background: oklch(90% 0.05 155 / 0.2);
    color: var(--cc-accent);
  }
  
  .cc-task__priority--medium {
    background: oklch(90% 0.05 70 / 0.2);
    color: var(--cc-warning);
  }
  
  .cc-task__priority--high {
    background: oklch(90% 0.05 25 / 0.2);
    color: var(--cc-error);
  }
  
  .cc-task__priority--urgent {
    background: var(--cc-error);
    color: white;
  }
  
  /* Market Pulse */
  .cc-market {
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-2);
  }
  
  .cc-market__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--cc-space-2) var(--cc-space-3);
    background: var(--cc-canvas);
    border-radius: var(--cc-radius-md);
  }
  
  .cc-market__name {
    font-size: var(--cc-text-base);
    color: var(--cc-text);
  }
  
  .cc-market__value {
    font-size: var(--cc-text-base);
    font-weight: 600;
    color: var(--cc-text);
    font-variant-numeric: tabular-nums;
  }
  
  .cc-market__change {
    font-size: var(--cc-text-sm);
    font-weight: 500;
  }
  
  .cc-market__change--up {
    color: var(--cc-accent);
  }
  
  .cc-market__change--down {
    color: var(--cc-error);
  }
  
  /* Animations */
  @keyframes cc-fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes cc-slide-in {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}
```

- [ ] **Step 3: Verify CSS syntax**

```bash
npx stylelint src/app/dashboard/dashboard.css --fix
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/dashboard.css
git commit -m "feat: add Command Center CSS styles"
```

---

## Task 5: useCommand Hook

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/hooks/useCommand.ts`

- [ ] **Step 1: Create useCommand.ts**

```typescript
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface Command {
  id: string
  label: string
  icon: string
  shortcut?: string
  action: () => void
  roles?: string[]
}

interface UseCommandOptions {
  commands: Command[]
  onSelect?: (command: Command) => void
}

export function useCommand({ commands, onSelect }: UseCommandOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter commands based on query
  const filteredCommands = commands.filter((cmd) => {
    if (!query) return true
    const searchQuery = query.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(searchQuery) ||
      cmd.id.toLowerCase().includes(searchQuery)
    )
  })

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        if (!isOpen) {
          setQuery('')
          setActiveIndex(0)
        }
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[activeIndex]) {
            handleSelect(filteredCommands[activeIndex])
          }
          break
      }
    },
    [activeIndex, filteredCommands]
  )

  // Handle command selection
  const handleSelect = useCallback(
    (command: Command) => {
      command.action()
      onSelect?.(command)
      setIsOpen(false)
      setQuery('')
    },
    [onSelect]
  )

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    filteredCommands,
    inputRef,
    handleKeyDown,
    handleSelect,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/hooks/useCommand.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/hooks/useCommand.ts
git commit -m "feat: add useCommand hook for Command Bar"
```

---

## Task 6: useTimeline Hook

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/hooks/useTimeline.ts`

- [ ] **Step 1: Create useTimeline.ts**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

interface TimelineItem {
  id: string
  type: 'post_published' | 'post_draft' | 'comment_new' | 'task_completed' | 'rate_updated' | 'user_action'
  title: string
  meta?: string
  timestamp: Date
  icon: string
  color: string
}

interface UseTimelineOptions {
  initialItems?: TimelineItem[]
  refreshInterval?: number // milliseconds
}

export function useTimeline({
  initialItems = [],
  refreshInterval = 30000, // 30 seconds
}: UseTimelineOptions = {}) {
  const [items, setItems] = useState<TimelineItem[]>(initialItems)
  const [filter, setFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  })

  // Group items by date
  const groupedItems = filteredItems.reduce(
    (groups, item) => {
      const date = new Date(item.timestamp).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
      return groups
    },
    {} as Record<string, TimelineItem[]>
  )

  // Refresh data
  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      // In real implementation, fetch from server
      // const data = await getRecentActivity()
      // setItems(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  return {
    items: filteredItems,
    groupedItems,
    filter,
    setFilter,
    isLoading,
    refresh,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/hooks/useTimeline.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/hooks/useTimeline.ts
git commit -m "feat: add useTimeline hook for Timeline"
```

---

## Task 7: useTasks Hook

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/hooks/useTasks.ts`

- [ ] **Step 1: Create useTasks.ts**

```typescript
'use client'

import { useState, useCallback } from 'react'
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} from '@/actions/taskActions'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: Date | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface UseTasksOptions {
  initialTasks?: Task[]
  limit?: number
}

export function useTasks({
  initialTasks = [],
  limit = 10,
}: UseTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTasks(limit)
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت تسک‌ها')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  // Create task
  const addTask = useCallback(
    async (data: {
      title: string
      description?: string
      dueDate?: Date
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    }) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await createTask(data)
        if (result.success) {
          await fetchTasks()
          return result
        } else {
          setError(result.error?.message || 'خطا در ایجاد تسک')
          return result
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در ایجاد تسک'
        setError(message)
        return { success: false, error: { code: 'ERROR', message } }
      } finally {
        setIsLoading(false)
      }
    },
    [fetchTasks]
  )

  // Toggle task status
  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return

      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
      setIsLoading(true)
      setError(null)
      try {
        const result = await updateTaskStatus(id, newStatus)
        if (result.success) {
          await fetchTasks()
          return result
        } else {
          setError(result.error?.message || 'خطا در بروزرسانی تسک')
          return result
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در بروزرسانی تسک'
        setError(message)
        return { success: false, error: { code: 'ERROR', message } }
      } finally {
        setIsLoading(false)
      }
    },
    [tasks, fetchTasks]
  )

  // Delete task
  const removeTask = useCallback(
    async (id: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await deleteTask(id)
        if (result.success) {
          await fetchTasks()
          return result
        } else {
          setError(result.error?.message || 'خطا در حذف تسک')
          return result
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در حذف تسک'
        setError(message)
        return { success: false, error: { code: 'ERROR', message } }
      } finally {
        setIsLoading(false)
      }
    },
    [fetchTasks]
  )

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    addTask,
    toggleTask,
    removeTask,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/hooks/useTasks.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/hooks/useTasks.ts
git commit -m "feat: add useTasks hook for Tasks"
```

---

## Task 8: CommandBar Component

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/CommandBar.tsx`

- [ ] **Step 1: Create CommandBar.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useCommand } from './hooks/useCommand'
import { cn } from '@/lib/utils'

interface CommandBarProps {
  role: 'AUTHOR' | 'ADMIN' | 'OWNER'
}

export function CommandBar({ role }: CommandBarProps) {
  const router = useRouter()

  // Define commands based on role
  const commands = [
    {
      id: 'new-post',
      label: 'پست جدید',
      icon: '📝',
      action: () => router.push('/dashboard/posts/new'),
    },
    {
      id: 'view-posts',
      label: 'مشاهده پست‌ها',
      icon: '📄',
      action: () => router.push('/dashboard/posts'),
    },
    {
      id: 'categories',
      label: 'دسته‌بندی‌ها',
      icon: '📁',
      action: () => router.push('/dashboard/categories'),
    },
    {
      id: 'new-task',
      label: 'تسک جدید',
      icon: '☑️',
      action: () => {
        // Open task creation modal
      },
    },
    ...(role === 'ADMIN' || role === 'OWNER'
      ? [
          {
            id: 'exchange-rates',
            label: 'نرخ ارز',
            icon: '💱',
            action: () => router.push('/dashboard/exchange-rates'),
          },
          {
            id: 'users',
            label: 'کاربران',
            icon: '👥',
            action: () => router.push('/dashboard/users'),
          },
          {
            id: 'reports',
            label: 'گزارش‌ها',
            icon: '📊',
            action: () => router.push('/dashboard/reports'),
          },
        ]
      : []),
    ...(role === 'OWNER'
      ? [
          {
            id: 'settings',
            label: 'تنظیمات',
            icon: '⚙️',
            action: () => router.push('/dashboard/settings'),
          },
        ]
      : []),
  ]

  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    activeIndex,
    filteredCommands,
    inputRef,
    handleKeyDown,
    handleSelect,
  } = useCommand({ commands })

  return (
    <div className="cc-command-bar" role="search" aria-label="جستجوی دستورات">
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden="true">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          className="cc-command-bar__input"
          placeholder="هر کاری می‌خواهی انجام بده..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="command-list"
          role="combobox"
        />
        <kbd className="cc-command-bar__shortcut" aria-label="میانبر ⌘K">
          ⌘K
        </kbd>
      </div>

      {isOpen && filteredCommands.length > 0 && (
        <ul
          id="command-list"
          className="cc-command-bar__dropdown"
          role="listbox"
          aria-label="دستورات"
        >
          {filteredCommands.map((command, index) => (
            <li
              key={command.id}
              className={cn(
                'cc-command-bar__item',
                index === activeIndex && 'cc-command-bar__item--active'
              )}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelect(command)}
              onMouseEnter={() => setIsOpen(true)}
            >
              <span className="cc-command-bar__item-icon" aria-hidden="true">
                {command.icon}
              </span>
              <span className="cc-command-bar__item-label">{command.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/CommandBar.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/CommandBar.tsx
git commit -m "feat: add CommandBar component"
```

---

## Task 9: Timeline Component

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/Timeline.tsx`

- [ ] **Step 1: Create Timeline.tsx**

```typescript
'use client'

import { useTimeline } from './hooks/useTimeline'
import { cn } from '@/lib/utils'

interface TimelineProps {
  activities: Array<{
    id: string
    type: string
    title: string
    meta?: string
    timestamp: Date
  }>
}

export function Timeline({ activities }: TimelineProps) {
  const { groupedItems, filter, setFilter, isLoading } = useTimeline({
    initialItems: activities.map((a) => ({
      ...a,
      icon: getIcon(a.type),
      color: getColor(a.type),
    })),
  })

  const filters = [
    { id: 'all', label: 'همه' },
    { id: 'post_published', label: 'پست‌ها' },
    { id: 'comment_new', label: 'نظرات' },
    { id: 'task_completed', label: 'تسک‌ها' },
    { id: 'rate_updated', label: 'نرخ‌ها' },
  ]

  return (
    <section className="cc-timeline" aria-label="خط زمانی فعالیت‌ها">
      <div className="cc-timeline__header">
        <h2 className="cc-timeline__title">فعالیت‌های اخیر</h2>
        <div className="cc-timeline__filters" role="tablist" aria-label="فیلتر فعالیت‌ها">
          {filters.map((f) => (
            <button
              key={f.id}
              className={cn(
                'cc-timeline__filter',
                filter === f.id && 'cc-timeline__filter--active'
              )}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[var(--cc-text-muted)]">
          در حال بارگذاری...
        </div>
      ) : Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-8 text-[var(--cc-text-muted)]">
          فعالیتی یافت نشد
        </div>
      ) : (
        <div role="feed" aria-live="polite">
          {Object.entries(groupedItems).map(([date, items]) => (
            <div key={date}>
              <h3 className="cc-timeline__date">{date}</h3>
              {items.map((item) => (
                <article
                  key={item.id}
                  className="cc-timeline__item"
                  role="article"
                  aria-label={item.title}
                >
                  <span className="cc-timeline__item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="cc-timeline__item-content">
                    <p className="cc-timeline__item-title">{item.title}</p>
                    {item.meta && (
                      <p className="cc-timeline__item-meta">{item.meta}</p>
                    )}
                  </div>
                  <time
                    className="cc-timeline__item-time"
                    dateTime={new Date(item.timestamp).toISOString()}
                  >
                    {new Date(item.timestamp).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </article>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    post_published: '📄',
    post_draft: '📄',
    comment_new: '💬',
    task_completed: '☑️',
    rate_updated: '💱',
    user_action: '👥',
  }
  return icons[type] || '📌'
}

function getColor(type: string): string {
  const colors: Record<string, string> = {
    post_published: 'accent',
    post_draft: 'muted',
    comment_new: 'primary',
    task_completed: 'accent',
    rate_updated: 'warning',
    user_action: 'primary',
  }
  return colors[type] || 'primary'
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/Timeline.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/Timeline.tsx
git commit -m "feat: add Timeline component"
```

---

## Task 10: ContextPanel Component

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/ContextPanel.tsx`

- [ ] **Step 1: Create ContextPanel.tsx**

```typescript
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PostsList } from './tiles/PostsList'
import { TasksList } from './tiles/TasksList'
import { MarketPulse } from './tiles/MarketPulse'
import { AnalyticsChart } from './tiles/AnalyticsChart'

interface ContextPanelProps {
  role: 'AUTHOR' | 'ADMIN' | 'OWNER'
  posts: Array<{
    id: string
    title: string
    status: string
    createdAt: Date
    viewCount: number
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
  }>
  rates: Array<{
    name: string
    value: number
    change: number
  }>
  viewStats: Array<{
    date: string
    views: number
  }>
}

export function ContextPanel({
  role,
  posts,
  tasks,
  rates,
  viewStats,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState('posts')

  const tabs = [
    { id: 'posts', label: 'پست‌ها' },
    { id: 'tasks', label: 'تسک‌ها' },
    { id: 'market', label: 'Market' },
    { id: 'analytics', label: 'آمار' },
  ]

  return (
    <section className="cc-context" aria-label="پنل زمینه‌ای">
      <div className="cc-context__tabs" role="tablist" aria-label="تب‌ها">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              'cc-context__tab',
              activeTab === tab.id && 'cc-context__tab--active'
            )}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cc-context__content" role="tabpanel">
        {activeTab === 'posts' && (
          <PostsList
            posts={posts}
            canEdit={role === 'ADMIN' || role === 'OWNER'}
          />
        )}
        {activeTab === 'tasks' && <TasksList tasks={tasks} />}
        {activeTab === 'market' && <MarketPulse rates={rates} />}
        {activeTab === 'analytics' && <AnalyticsChart data={viewStats} />}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/ContextPanel.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/ContextPanel.tsx
git commit -m "feat: add ContextPanel component"
```

---

## Task 11: QuickActions Component

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/QuickActions.tsx`

- [ ] **Step 1: Create QuickActions.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  role: 'AUTHOR' | 'ADMIN' | 'OWNER'
}

export function QuickActions({ role }: QuickActionsProps) {
  const router = useRouter()

  const actions = [
    {
      id: 'new-post',
      label: 'پست جدید',
      icon: '📝',
      action: () => router.push('/dashboard/posts/new'),
      roles: ['AUTHOR', 'ADMIN', 'OWNER'],
    },
    {
      id: 'categories',
      label: 'دسته‌بندی',
      icon: '📁',
      action: () => router.push('/dashboard/categories'),
      roles: ['AUTHOR', 'ADMIN', 'OWNER'],
    },
    {
      id: 'users',
      label: 'کاربران',
      icon: '👥',
      action: () => router.push('/dashboard/users'),
      roles: ['ADMIN', 'OWNER'],
    },
    {
      id: 'reports',
      label: 'گزارش‌ها',
      icon: '📊',
      action: () => router.push('/dashboard/reports'),
      roles: ['ADMIN', 'OWNER'],
    },
    {
      id: 'settings',
      label: 'تنظیمات',
      icon: '⚙️',
      action: () => router.push('/dashboard/settings'),
      roles: ['OWNER'],
    },
  ]

  const filteredActions = actions.filter((a) => a.roles.includes(role))

  return (
    <nav className="cc-actions" aria-label="اقدامات سریع">
      {filteredActions.map((action) => (
        <button
          key={action.id}
          className="cc-actions__btn"
          onClick={action.action}
          aria-label={action.label}
        >
          <span aria-hidden="true">{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/QuickActions.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/QuickActions.tsx
git commit -m "feat: add QuickActions component"
```

---

## Task 12: Tiles — StatsCard, PostsList, TasksList, MarketPulse, AnalyticsChart

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/tiles/StatsCard.tsx`
- Create: `src/components/Dashboard/DashboardPage/command/tiles/PostsList.tsx`
- Create: `src/components/Dashboard/DashboardPage/command/tiles/TasksList.tsx`
- Create: `src/components/Dashboard/DashboardPage/command/tiles/MarketPulse.tsx`
- Create: `src/components/Dashboard/DashboardPage/command/tiles/AnalyticsChart.tsx`

- [ ] **Step 1: Create StatsCard.tsx**

```typescript
'use client'

import { cn } from '@/lib/utils'

interface Stat {
  label: string
  value: number
  delta?: number
  icon?: string
}

interface StatsCardProps {
  stats: Stat[]
}

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="cc-stats" role="group" aria-label="آمار امروز">
      {stats.map((stat, index) => (
        <div key={index} className="cc-stat">
          <p className="cc-stat__label">{stat.label}</p>
          <p className="cc-stat__value">
            {stat.icon && <span aria-hidden="true">{stat.icon} </span>}
            {stat.value.toLocaleString('fa-IR')}
          </p>
          {stat.delta !== undefined && (
            <p
              className={cn(
                'cc-stat__delta',
                stat.delta >= 0 ? 'cc-stat__delta--up' : 'cc-stat__delta--down'
              )}
            >
              {stat.delta >= 0 ? '↑' : '↓'} {Math.abs(stat.delta)}%
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create PostsList.tsx**

```typescript
'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Post {
  id: string
  title: string
  status: string
  createdAt: Date
  viewCount: number
}

interface PostsListProps {
  posts: Post[]
  canEdit?: boolean
}

export function PostsList({ posts, canEdit = false }: PostsListProps) {
  return (
    <div className="cc-tile">
      <div className="cc-tile__header">
        <h3 className="cc-tile__title">پست‌های اخیر</h3>
        <Link href="/dashboard/posts" className="cc-tile__action">
          مشاهده همه
        </Link>
      </div>
      <div className="cc-posts">
        {posts.length === 0 ? (
          <p className="text-center py-4 text-[var(--cc-text-muted)]">
            پستی یافت نشد
          </p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="cc-post">
              <div className="cc-post__info">
                <p className="cc-post__title">{post.title}</p>
                <p className="cc-post__meta">
                  {post.status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'} •{' '}
                  {new Date(post.createdAt).toLocaleDateString('fa-IR')} •{' '}
                  {post.viewCount.toLocaleString('fa-IR')} بازدید
                </p>
              </div>
              {canEdit && (
                <div className="cc-post__actions">
                  <Link
                    href={`/dashboard/posts/${post.id}/edit`}
                    className="cc-post__btn"
                  >
                    ویرایش
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create TasksList.tsx**

```typescript
'use client'

import { useTasks } from '../hooks/useTasks'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
}

interface TasksListProps {
  tasks: Task[]
}

export function TasksList({ tasks: initialTasks }: TasksListProps) {
  const { tasks, toggleTask, removeTask, isLoading } = useTasks({
    initialTasks,
  })

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: 'کم',
      MEDIUM: 'متوسط',
      HIGH: 'زیاد',
      URGENT: 'فوری',
    }
    return labels[priority] || priority
  }

  return (
    <div className="cc-tile">
      <div className="cc-tile__header">
        <h3 className="cc-tile__title">تسک‌ها و یادآوری</h3>
      </div>
      <div className="cc-tasks">
        {tasks.length === 0 ? (
          <p className="text-center py-4 text-[var(--cc-text-muted)]">
            تسکی وجود ندارد
          </p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="cc-task">
              <button
                className={cn(
                  'cc-task__checkbox',
                  task.status === 'COMPLETED' && 'cc-task__checkbox--checked'
                )}
                onClick={() => toggleTask(task.id)}
                disabled={isLoading}
                aria-label={
                  task.status === 'COMPLETED'
                    ? 'علامت‌گذاری به عنوان انجام نشده'
                    : 'علامت‌گذاری به عنوان انجام شده'
                }
              />
              <div className="cc-task__info">
                <p
                  className={cn(
                    'cc-task__title',
                    task.status === 'COMPLETED' && 'cc-task__title--completed'
                  )}
                >
                  {task.title}
                </p>
                {task.dueDate && (
                  <p className="cc-task__meta">
                    مهلت: {new Date(task.dueDate).toLocaleDateString('fa-IR')}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  'cc-task__priority',
                  `cc-task__priority--${task.priority.toLowerCase()}`
                )}
              >
                {getPriorityLabel(task.priority)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create MarketPulse.tsx**

```typescript
'use client'

import { cn } from '@/lib/utils'

interface Rate {
  name: string
  value: number
  change: number
  icon?: string
  unit?: string
}

interface MarketPulseProps {
  rates: Rate[]
}

export function MarketPulse({ rates }: MarketPulseProps) {
  return (
    <div className="cc-tile">
      <div className="cc-tile__header">
        <h3 className="cc-tile__title">Market Pulse</h3>
      </div>
      <div className="cc-market">
        {rates.map((rate, index) => (
          <div key={index} className="cc-market__item">
            <span className="cc-market__name">
              {rate.icon && <span aria-hidden="true">{rate.icon} </span>}
              {rate.name}
            </span>
            <span className="cc-market__value">
              {rate.value.toLocaleString('fa-IR')}
              {rate.unit && <span className="text-sm"> {rate.unit}</span>}
            </span>
            <span
              className={cn(
                'cc-market__change',
                rate.change >= 0
                  ? 'cc-market__change--up'
                  : 'cc-market__change--down'
              )}
            >
              {rate.change >= 0 ? '↑' : '↓'} {Math.abs(rate.change)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create AnalyticsChart.tsx**

```typescript
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DataPoint {
  date: string
  views: number
}

interface AnalyticsChartProps {
  data: DataPoint[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const [period, setPeriod] = useState('7d')

  const periods = [
    { id: '7d', label: '۷ روز' },
    { id: '30d', label: '۳۰ روز' },
    { id: '90d', label: '۹۰ روز' },
  ]

  // Calculate max for scaling
  const maxViews = Math.max(...data.map((d) => d.views), 1)

  return (
    <div className="cc-tile">
      <div className="cc-tile__header">
        <h3 className="cc-tile__title">نمودار بازدید</h3>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                period === p.id
                  ? 'bg-[var(--cc-primary)] text-white'
                  : 'bg-[var(--cc-canvas)] text-[var(--cc-text-muted)] hover:bg-[var(--cc-border)]'
              )}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48 flex items-end gap-1">
        {data.map((point, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full bg-[var(--cc-primary)] rounded-t transition-all duration-300"
              style={{
                height: `${(point.views / maxViews) * 100}%`,
                minHeight: '4px',
              }}
              title={`${point.date}: ${point.views.toLocaleString('fa-IR')} بازدید`}
            />
            <span className="text-xs text-[var(--cc-text-muted)]">
              {new Date(point.date).toLocaleDateString('fa-IR', {
                weekday: 'short',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify all TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/tiles/*.tsx
```

Expected: No errors

- [ ] **Step 7: Commit all tiles**

```bash
git add src/components/Dashboard/DashboardPage/command/tiles/
git commit -m "feat: add Command Center tiles (Stats, Posts, Tasks, Market, Analytics)"
```

---

## Task 13: CommandCenter Main Orchestrator

**Files:**
- Create: `src/components/Dashboard/DashboardPage/command/CommandCenter.tsx`
- Create: `src/components/Dashboard/DashboardPage/command/index.ts`

- [ ] **Step 1: Create CommandCenter.tsx**

```typescript
'use client'

import { CommandBar } from './CommandBar'
import { Timeline } from './Timeline'
import { ContextPanel } from './ContextPanel'
import { QuickActions } from './QuickActions'
import { StatsCard } from './tiles/StatsCard'

interface CommandCenterProps {
  role: 'AUTHOR' | 'ADMIN' | 'OWNER'
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
    viewsDelta?: number
    likesDelta?: number
    commentsDelta?: number
    sharesDelta?: number
  }
  activities: Array<{
    id: string
    type: string
    title: string
    meta?: string
    timestamp: Date
  }>
  posts: Array<{
    id: string
    title: string
    status: string
    createdAt: Date
    viewCount: number
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
  }>
  rates: Array<{
    name: string
    value: number
    change: number
  }>
  viewStats: Array<{
    date: string
    views: number
  }>
}

export function CommandCenter({
  role,
  stats,
  activities,
  posts,
  tasks,
  rates,
  viewStats,
}: CommandCenterProps) {
  const statsData = [
    {
      label: 'بازدید امروز',
      value: stats.views,
      delta: stats.viewsDelta,
      icon: '👁️',
    },
    {
      label: 'لایک',
      value: stats.likes,
      delta: stats.likesDelta,
      icon: '❤️',
    },
    {
      label: 'نظر',
      value: stats.comments,
      delta: stats.commentsDelta,
      icon: '💬',
    },
    {
      label: 'اشتراک',
      value: stats.shares,
      delta: stats.sharesDelta,
      icon: '🔗',
    },
  ]

  return (
    <div className="cc-container">
      <CommandBar role={role} />
      
      <StatsCard stats={statsData} />
      
      <div className="cc-main">
        <Timeline activities={activities} />
        <ContextPanel
          role={role}
          posts={posts}
          tasks={tasks}
          rates={rates}
          viewStats={viewStats}
        />
      </div>
      
      <QuickActions role={role} />
    </div>
  )
}
```

- [ ] **Step 2: Create index.ts barrel**

```typescript
export { CommandCenter } from './CommandCenter'
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit src/components/Dashboard/DashboardPage/command/CommandCenter.tsx
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/DashboardPage/command/CommandCenter.tsx src/components/Dashboard/DashboardPage/command/index.ts
git commit -m "feat: add CommandCenter main orchestrator"
```

---

## Task 14: Update Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read current page.tsx**

```bash
cat src/app/dashboard/page.tsx
```

- [ ] **Step 2: Update imports**

Replace:
```typescript
import { NovaDeck } from '@/components/Dashboard/DashboardPage/nova'
```

With:
```typescript
import { CommandCenter } from '@/components/Dashboard/DashboardPage/command'
```

- [ ] **Step 3: Add getTasks import**

Add to imports:
```typescript
import { getTasks } from '@/actions/taskActions'
```

- [ ] **Step 4: Add getTasks to Promise.all**

Find the `Promise.all` block and add:
```typescript
getTasks(5),
```

- [ ] **Step 5: Update data destructuring**

Update the destructuring to include tasks:
```typescript
const [stats, popularPosts, recentDrafts, viewStats, recentActivity, tasks] =
  await Promise.all([...])
```

- [ ] **Step 6: Replace NovaDeck with CommandCenter**

Replace:
```typescript
<NovaDeck
  stats={stats}
  popularPosts={popularPosts}
  recentDrafts={recentDrafts}
  viewStats={viewStats}
  recentActivity={recentActivity}
/>
```

With:
```typescript
<CommandCenter
  role={role}
  stats={stats}
  activities={recentActivity}
  posts={[...popularPosts, ...recentDrafts]}
  tasks={tasks}
  rates={[]} // Will be populated with real rates
  viewStats={viewStats}
/>
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit src/app/dashboard/page.tsx
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: update dashboard page to use CommandCenter"
```

---

## Task 15: Delete Old Generations

**Files:**
- Delete: `src/components/Dashboard/DashboardPage/aurora/`
- Delete: `src/components/Dashboard/DashboardPage/tide/`
- Delete: `src/components/Dashboard/DashboardPage/overview/`
- Delete: `src/components/Dashboard/DashboardPage/v2/`
- Delete: `src/components/Dashboard/DashboardPage/nova/`

- [ ] **Step 1: Verify no other files import from old directories**

```bash
grep -r "from.*DashboardPage/aurora" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*DashboardPage/tide" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*DashboardPage/overview" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*DashboardPage/v2" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*DashboardPage/nova" src/ --include="*.tsx" --include="*.ts"
```

Expected: No results (except the page.tsx we just updated)

- [ ] **Step 2: Delete old directories**

```bash
rm -rf src/components/Dashboard/DashboardPage/aurora
rm -rf src/components/Dashboard/DashboardPage/tide
rm -rf src/components/Dashboard/DashboardPage/overview
rm -rf src/components/Dashboard/DashboardPage/v2
rm -rf src/components/Dashboard/DashboardPage/nova
```

- [ ] **Step 3: Verify deletion**

```bash
ls -la src/components/Dashboard/DashboardPage/
```

Expected: Only `command/` directory exists

- [ ] **Step 4: Commit**

```bash
git add -A src/components/Dashboard/DashboardPage/
git commit -m "refactor: remove old dashboard generations (aurora, tide, overview, v2, nova)"
```

---

## Task 16: Clean Up Old CSS

**Files:**
- Modify: `src/app/dashboard/dashboard.css`

- [ ] **Step 1: Read current CSS**

```bash
wc -l src/app/dashboard/dashboard.css
```

- [ ] **Step 2: Remove old CSS sections**

Remove all CSS sections except the Command Center styles we added:
- Aurora/OLED canvas (lines 1-263)
- V2 editorial bento (lines 265-2902)
- Density system (lines 2904-3023)
- Sidebar (Meridian) (lines 3025-4207)
- Atlas composition (lines 4208-5010)
- TIDE composition (lines 5012-6811)
- NOVA composition (lines 6813-end)

Keep only the Command Center styles we added in Task 4.

- [ ] **Step 3: Verify CSS**

```bash
npx stylelint src/app/dashboard/dashboard.css
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/dashboard.css
git commit -m "refactor: clean up old dashboard CSS, keep only Command Center styles"
```

---

## Task 17: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Start dev server and test**

```bash
npm run dev
```

Open http://localhost:3000/dashboard and verify:
- Command Bar opens with ⌘K
- Timeline shows activities
- Context Panel tabs work
- Quick Actions navigate correctly
- Stats show real data
- Responsive layout works

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Command Center dashboard redesign"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Prisma Schema | schema.prisma |
| 2 | Task Server Actions | taskActions.ts |
| 3 | Design Tokens | tokens.css |
| 4 | Command Center CSS | dashboard.css |
| 5 | useCommand Hook | hooks/useCommand.ts |
| 6 | useTimeline Hook | hooks/useTimeline.ts |
| 7 | useTasks Hook | hooks/useTasks.ts |
| 8 | CommandBar | CommandBar.tsx |
| 9 | Timeline | Timeline.tsx |
| 10 | ContextPanel | ContextPanel.tsx |
| 11 | QuickActions | QuickActions.tsx |
| 12 | Tiles | tiles/*.tsx |
| 13 | CommandCenter | CommandCenter.tsx, index.ts |
| 14 | Update Page | page.tsx |
| 15 | Delete Old | aurora/, tide/, overview/, v2/, nova/ |
| 16 | Clean CSS | dashboard.css |
| 17 | Verification | tsc, lint, build |

**Total Tasks:** 17
**Estimated Time:** 6-8 hours
