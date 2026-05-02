# Mobile Pin Band Swap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Swap the mobile `Scratched Horses` and dice callout bands on the `/how-to-play` preview while keeping the finish-line callout and desktop layout unchanged.

**Architecture:** Reuse the existing mobile-only callout positioning in `src/components/HowToPlayPage.tsx`, but change only the mobile `top` values for the first two callouts. Protect the new positions with the source-level assertions in `src/__tests__/app-layout.test.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind utility classes, Jest

---

### Task 1: Update the regression first

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(tutorialSource).toContain(
  'className="left-[4%] top-[48%] sm:left-[4%] sm:top-[21%]" pinClassName="left-7 top-full"'
);
expect(tutorialSource).toContain(
  'className="right-[4%] top-[39%] sm:right-[8%] sm:top-[6%]" pinClassName="left-[34%] top-full"'
);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the current mobile anchors still use the older bands.

**Step 3: Write minimal implementation**

```tsx
<Callout className="left-[4%] top-[48%] sm:left-[4%] sm:top-[21%]" ... />
<Callout className="right-[4%] top-[39%] sm:right-[8%] sm:top-[6%]" ... />
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

### Task 2: Verify the focused change

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
