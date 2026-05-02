# Mobile Board Guide Pin Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the `/how-to-play` mobile preview so each tutorial callout pin points to the correct stacked card or board target, while slightly shrinking the mobile preview to fit phones better.

**Architecture:** Keep the existing desktop board guide composition unchanged. Update the shared callout component usage in `src/components/HowToPlayPage.tsx` with mobile-first coordinates and slightly tighter mobile sizing classes, then protect that behavior with the existing source-level regression in `src/__tests__/app-layout.test.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the expected mobile-only callout anchors

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(tutorialSource).toContain(
  'className="left-[4%] top-[26%] sm:left-[4%] sm:top-[21%]" pinClassName="left-7 top-full"'
);
expect(tutorialSource).toContain(
  'className="right-[3%] top-[46%] sm:right-[8%] sm:top-[6%]" pinClassName="left-[34%] top-full"'
);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the current mobile callout coordinates still point to the older layout model.

**Step 3: Write minimal implementation**

```tsx
<Callout
  className="left-[4%] top-[26%] sm:left-[4%] sm:top-[21%]"
  pinClassName="left-7 top-full"
>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/app-layout.test.tsx src/components/HowToPlayPage.tsx
git commit -m "fix: align mobile board guide callouts"
```

### Task 2: Tighten the mobile preview footprint

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(tutorialSource).toContain(
  'className="relative overflow-hidden rounded-[40px] bg-[#ead9b8] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-6"'
);
expect(tutorialSource).toContain(
  'className="mt-4 rounded-[30px] bg-[#e6d7b7] p-2.5 sm:mt-6 sm:rounded-[40px] sm:p-6"'
);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the current mobile spacing is still larger.

**Step 3: Write minimal implementation**

```tsx
<section className="relative overflow-hidden rounded-[40px] bg-[#ead9b8] p-2.5 ... sm:p-6">
```

```tsx
<div className="mt-4 rounded-[30px] bg-[#e6d7b7] p-2.5 ... sm:mt-6 sm:rounded-[40px] sm:p-6">
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/HowToPlayPage.tsx src/__tests__/app-layout.test.tsx
git commit -m "fix: tighten mobile board guide preview"
```

### Task 3: Verify the full change

**Files:**
- Verify: `src/components/HowToPlayPage.tsx`
- Verify: `src/__tests__/app-layout.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add docs/plans/2026-05-02-mobile-board-guide-pin-alignment-design.md docs/plans/2026-05-02-mobile-board-guide-pin-alignment.md
git commit -m "docs: plan mobile board guide pin alignment"
```
