# Rules Board Guide Pill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the homepage rules-panel tutorial link to `Board Guide` and place it at the top-right of the expanded `Rules` panel.

**Architecture:** Keep the change inside `src/App.tsx` and lock it with a focused regression in `src/__tests__/app-layout.test.tsx`. This is a rules-panel label and placement adjustment only; it does not change routing or the tutorial page itself.

**Tech Stack:** React, TypeScript, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Update the homepage rules-panel test so it checks:
- no `Board Guide` link is visible by default
- opening `Rules` reveals a `Board Guide` link with `href="/how-to-play"`
- `src/App.tsx` contains the dedicated top-right rules-panel row class

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows the board guide pill at the top-right of the expanded rules panel"`
Expected: FAIL because the current rules-panel link still uses the old label and is still placed below the rule paragraphs.

### Task 2: Rename and move the pill

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the expanded `Rules` panel to:
- render a top-right action row for the tutorial link
- rename the link text to `Board Guide`
- keep the existing `href="/how-to-play"`
- leave the rest of the rule copy unchanged

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows the board guide pill at the top-right of the expanded rules panel"`
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
