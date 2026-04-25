# Mobile Trade Overlay Design

**Problem:** On mobile, the trading window is mounted inline in the left-side stack and capped to a small viewport height, so only the top of the panel remains visible after the board spacing changes.

**Decision:** Reuse the fixed modal overlay pattern on mobile instead of rendering a separate inline trade section. Keep the board and card dock mounted behind the overlay so the trade phase remains visually connected to the game state.

**Render Approach:** Move the `role="dialog"` and `aria-modal="true"` semantics to the fixed overlay wrapper for all viewports. Render the mobile trade panel as a full-height sheet inside that wrapper so it occupies the viewport instead of competing with the board stack.

**Styling:** Remove the mobile `max-height` caps from `.mobile-trade-panel`. The mobile panel should size to the overlay container, while desktop retains the centered card-style dialog.

**Testing:** Update the mobile trade-mode layout test to require the modal dialog path and assert that the old `Trading controls` inline region is gone.
