# Scratched Label Fit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shift the `Scratched` label slightly left on the tutorial board so it is fully readable on mobile and desktop.

**Architecture:** Keep the change inside `src/components/HowToPlayPage.tsx` and lock it with a source-level regression in `src/__tests__/app-layout.test.tsx`. This is a pure padding and typography adjustment with no layout changes to the peg rows or lane math.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add a regression assertion that checks for the updated scratch-rail container padding class and the tightened `Scratched` label class string.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the updated scratched label fit classes"`
Expected: FAIL because `HowToPlayPage.tsx` still contains the old scratch-rail padding and label tracking classes.

### Task 2: Adjust the label fit

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the scratch rail to:
- reduce the left/right padding slightly
- tighten the `Scratched` label tracking enough to keep the label readable
- preserve the existing peg rows, lane alignment, and dollar label layout

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the updated scratched label fit classes"`
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
