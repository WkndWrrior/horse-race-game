# Homepage Teaser Row Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the full `Player Stats` and `Rules` content below a top teaser row so the first screen ends with two side-by-side headers while the expanded sections remain lower on the homepage for SEO.

**Architecture:** Keep the homepage scrollable and split the current “expanded sections” area into two layers: a first-screen teaser row with two non-interactive cards, and a second layer with the full `Player Stats` and `Rules` sections stacked below. Preserve the existing rules copy, stats cards, and `Board Guide` link inside the expanded `Rules` section.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, React Testing Library

---

### Task 1: Update the homepage regression for the teaser row

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Reference: `src/App.tsx`

**Step 1: Write the failing test**

Change the homepage layout test so it expects:
- two `Player Stats` headings
- two `Rules` headings
- the `Board Guide` link
- the visible rules copy

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`

Expected: FAIL because the homepage currently renders only one `Player Stats` heading and one `Rules` heading.

### Task 2: Separate the teaser row from the expanded sections

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Add a first-screen teaser row**

Create a layout block after the start-game hero card that renders two side-by-side non-interactive cards labeled `Player Stats` and `Rules`.

**Step 2: Move the expanded sections below the teaser row**

Keep the existing full `Player Stats` section and full `Rules` section, but place them in a separate stacked container below the teaser row so users need to scroll down to see the detailed content.

**Step 3: Keep the existing rules/stats content intact**

Preserve:
- the stats cards for `Half Day` and `Full Day`
- the reset stats button
- the full rules text
- the `Board Guide` link in the expanded rules header row

### Task 3: Verify

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/seoUtils.test.ts`

**Step 1: Run the targeted layout regression**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`

Expected: PASS

**Step 2: Run the shared verification commands**

Run:
- `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
- `npm run typecheck`
- `npm run build`

Expected:
- tests pass
- typecheck passes
- build succeeds
