# Homepage Always-Expanded Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the homepage dropdown cards with always-expanded `Player Stats` and `Rules` sections and keep `Board Guide` visible in the rules section header.

**Architecture:** Keep the change inside `src/App.tsx` and lock it with focused homepage assertions in `src/__tests__/app-layout.test.tsx`. This is a homepage layout and scrolling change only; it does not change gameplay, routing, or the tutorial page content.

**Tech Stack:** React, TypeScript, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Replace the current rules-pill test with one that checks:
- `Board Guide` is visible on initial homepage load
- the `Rules` copy is visible on initial homepage load
- the stats content is visible on initial homepage load
- `src/App.tsx` no longer contains `openHomePanel`

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`
Expected: FAIL because the homepage still uses dropdown state and hides the section content until interaction.

### Task 2: Replace the dropdown homepage layout

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the homepage to:
- remove `openHomePanel` state and conditional home scroll logic
- make the home screen scroll naturally when the game is not started
- replace the interactive `Player Stats` and `Rules` cards with always-expanded stacked sections
- keep `Board Guide` in the rules header row, aligned to the right
- preserve the existing content inside both sections

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`
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
