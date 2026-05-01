# How-To-Play Board Fit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tighten the `/how-to-play` tutorial board so the peg-hole spacing fits better and the tutorial callouts point at the intended peg targets.

**Architecture:** Keep the existing static tutorial scene in `HowToPlayPage.tsx` and adjust only the sizing constants and callout anchors. Use a regression test in `app-layout.test.tsx` to lock the removal of the old top-row peg override and the new layout constants.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add a source-level regression test that asserts:
- `HowToPlayPage.tsx` no longer contains `badge.lane === 2`
- the tighter peg-dot class string exists
- the updated right callout anchor exists
- the tighter board width and track-height classes exist

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the tighter tutorial board layout without the old top-row peg override"`
Expected: FAIL because `HowToPlayPage.tsx` still contains the old top-row override and old sizing classes.

### Task 2: Tighten the tutorial board

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the tutorial board to:
- remove the top-lane absolute peg override
- reduce peg-dot size slightly
- reduce scratch-rail width and track height slightly
- tighten finish-line spacing modestly
- move the right callout pin so it lines up with the winning peg target

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the tighter tutorial board layout without the old top-row peg override"`
Expected: PASS

### Task 3: Verify the whole change

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Run targeted regression coverage**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS
