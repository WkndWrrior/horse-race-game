# Scratch Dollar Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the tutorial board's dollar amounts directly under the four scratch-hole columns on mobile and desktop.

**Architecture:** Keep the change inside `src/components/HowToPlayPage.tsx` and lock it with a source-level regression in `src/__tests__/app-layout.test.tsx`. The fix is a shared column-layout change only and does not modify the track lanes or peg-count math.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add assertions that check:
- a shared scratch-column grid class exists
- the amount row uses a two-column shell that reserves the badge column
- the old standalone dollar-label grid class string is gone

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses a shared scratch column layout for holes and dollar amounts"`
Expected: FAIL because `HowToPlayPage.tsx` still renders the scratch holes and dollar labels with different layout rules.

### Task 2: Share the scratch-column layout

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the scratch rail to:
- use one shared four-column grid for the hole cluster
- render the dollar amounts inside a matching grid width
- reserve the badge column with a spacer in the amount row
- preserve the rest of the scratch rail layout

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses a shared scratch column layout for holes and dollar amounts"`
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
