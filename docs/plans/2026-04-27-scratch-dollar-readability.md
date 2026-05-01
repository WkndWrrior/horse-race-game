# Scratch Dollar Readability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the readability of the tutorial board's `$20 $15 $10 $5` row while keeping the amounts aligned under the four scratch-hole columns.

**Architecture:** Keep the change inside `src/components/HowToPlayPage.tsx` and lock it with a source-level regression in `src/__tests__/app-layout.test.tsx`. This is a narrow spacing and typography change on the scratch rail only.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add assertions that check:
- the widened scratch-rail grid width
- the larger shared scratch-column gap
- the smaller dollar-label font class

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses wider scratch columns and smaller dollar labels for readability"`
Expected: FAIL because `HowToPlayPage.tsx` still uses the narrower scratch-rail width, smaller column gap, and larger dollar-label font.

### Task 2: Improve the scratch-dollar readability

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the scratch rail to:
- widen the scratch column on mobile and desktop
- increase the shared four-column spacing
- reduce the dollar-label font slightly
- keep the amounts on one line and aligned with the peg columns

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses wider scratch columns and smaller dollar labels for readability"`
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
