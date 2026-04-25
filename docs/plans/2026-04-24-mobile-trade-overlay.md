# Mobile Trade Overlay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the mobile trading window open as a full-screen modal overlay with the board dimmed behind it.

**Architecture:** Remove the mobile-only inline trade mount and use the existing fixed modal wrapper for both desktop and mobile. Keep the mobile trade panel full-height so it fills the overlay instead of inheriting sidebar height constraints.

**Tech Stack:** React 18, TypeScript, Jest, Testing Library, Tailwind utility classes, `src/App.css`

---

### Task 1: Lock the expected mobile behavior with a failing test

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(screen.queryByRole("region", { name: /trading controls/i })).not.toBeInTheDocument();
const tradeDialog = screen.getByRole("dialog", { name: /trading window/i });
expect(tradeDialog).toHaveAttribute("aria-modal", "true");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses a modal trade overlay in mobile trade mode"`
Expected: FAIL because the mobile inline trading region still exists and the dialog is not modal.

**Step 3: Write minimal implementation**

```tsx
const showTradeOverlay = phase === "trade" && showTradeModal;
{showTradeOverlay && (
  <div role="dialog" aria-modal="true">
    {renderTradePanel(isMobile)}
  </div>
)}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses a modal trade overlay in mobile trade mode"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/app-layout.test.tsx src/App.tsx src/App.css
git commit -m "fix: use trade overlay on mobile"
```

### Task 2: Remove the mobile sizing constraint that caused clipping

**Files:**
- Modify: `src/App.css`
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(screen.getByRole("dialog", { name: /trading window/i })).toHaveAttribute(
  "aria-modal",
  "true"
);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses a modal trade overlay in mobile trade mode"`
Expected: FAIL against the old mobile render path.

**Step 3: Write minimal implementation**

```css
.mobile-trade-panel {
  height: 100%;
  max-height: none;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.css src/App.tsx src/__tests__/app-layout.test.tsx
git commit -m "fix: remove mobile trade panel clipping"
```
