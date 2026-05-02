# Mobile Board Guide Pin Alignment Design

**Problem:** The `/how-to-play` preview uses one set of callout anchors for both mobile and desktop, but the mobile preview is vertically stacked. On phones, the cards flow as `Current Player`, `Pot`, `Scratched Horses`, `Dice`, then `Game Board`, so the existing pin stems no longer point to the intended targets.

**Decision:** Treat the mobile preview as its own composition. Keep the desktop callout placement intact, but add mobile-only callout positions and pin anchors that follow the stacked order of the preview cards and the smaller board footprint.

**Mobile Layout Scope:** The fix should stay visual-only and low risk:
- move the scratch callout so its stem lands on the `Scratched Horses` card area
- move the dice callout so its stem lands on the dice card
- keep the winner callout pinned to the finish/winner area on the board
- shrink the mobile preview spacing and board wrapper slightly so the full tutorial scene fits the viewport better

**Testing Approach:** Lock the mobile-only callout coordinates and smaller mobile preview classes in the existing source-level layout regression. Keep the focused test surface on `src/__tests__/app-layout.test.tsx` so the desktop board guide remains unchanged unless intended.

**Non-Goals:** No gameplay changes, no route changes, no SEO changes, and no attempt to force the mobile preview into a horizontal desktop-style layout.
