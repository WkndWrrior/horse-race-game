# Lane Count And Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the tutorial board peg-hole counts and move the track rows down so they align with the numbered scratch column on mobile and desktop.

**Architecture:** Keep the change inside `src/components/HowToPlayPage.tsx` and lock it with a source-level regression in `src/__tests__/app-layout.test.tsx`. This is a static tutorial-board correction only, with no gameplay impact.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add a regression that asserts:
- `HowToPlayPage.tsx` contains the corrected lane-based peg-count formula
- the track column includes the new cross-viewport top spacer above the lane rows

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the corrected lane peg counts and track alignment offset"`
Expected: FAIL because the current source still uses the inverted peg-count formula and has no track-top spacer.

### Task 2: Correct the tutorial board

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the tutorial board to:
- derive peg counts from the actual lane number
- add a top spacer above the track rows so the first lane aligns with the first scratch badge row
- preserve the current tutorial board styling everywhere else

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the corrected lane peg counts and track alignment offset"`
Expected: PASS

### Task 3: Verify the whole change

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/seoUtils.test.ts`

**Step 1: Run targeted regression coverage**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS
