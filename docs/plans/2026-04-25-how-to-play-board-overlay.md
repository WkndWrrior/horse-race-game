# How To Play Board Overlay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the `/how-to-play` page so it uses a screenshot-style static board with three pinned instructional callouts and no extra intro sentence in the hero box.

**Architecture:** Keep the existing route and metadata, but rebuild the page body as one static tutorial scene using arrays and styled HTML/CSS. The visual should mimic the real game screen without depending on live gameplay state or the 3D board.

**Tech Stack:** React 18, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the revised tutorial content with a failing test

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(screen.queryByText(/Learn the goal of the game/i)).not.toBeInTheDocument();
expect(screen.getByText(/Scratch 4 horses and avoid their penalty lines/i)).toBeInTheDocument();
expect(screen.getByText(/Roll the dice and move the matching horse/i)).toBeInTheDocument();
expect(screen.getByText(/Cheer for the horses that match your cards/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "renders a dedicated how-to-play page at its own url"`
Expected: FAIL because the old hero copy still exists and the new callouts are missing.

**Step 3: Write minimal implementation**

```tsx
<section aria-label="How to play tutorial board">
  <div>Scratch 4 horses and avoid their penalty lines</div>
  <div>Roll the dice and move the matching horse</div>
  <div>Cheer for the horses that match your cards</div>
</section>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "renders a dedicated how-to-play page at its own url"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/app-layout.test.tsx src/components/HowToPlayPage.tsx
git commit -m "test: cover how to play board overlay"
```

### Task 2: Rebuild the tutorial scene as a screenshot-style static layout

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`

**Step 1: Write minimal implementation**

```tsx
const lanes = [...];
const scratchChips = [...];
const callouts = [...];
```

Render:
- top summary cards
- scratched horses strip
- dice panel
- wood-tone board area
- scratch rail and finish line
- absolute callout bubbles

**Step 2: Run focused test**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "renders a dedicated how-to-play page at its own url"`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/HowToPlayPage.tsx src/__tests__/app-layout.test.tsx
git commit -m "feat: rebuild how to play board scene"
```

### Task 3: Verify the full page still ships cleanly

**Files:**
- Modify: none unless verification reveals an issue

**Step 1: Run focused route and seo tests**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add docs/plans/2026-04-25-how-to-play-board-overlay-design.md docs/plans/2026-04-25-how-to-play-board-overlay.md
git commit -m "docs: plan how to play board overlay"
```
