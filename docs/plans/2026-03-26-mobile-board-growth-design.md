# Mobile Board Growth Design

**Goal:** Increase the mobile 3D board size evenly so it uses more of the available beige game area while keeping the player-card dock and card sizing unchanged.

**Context**
- The mobile board slot was recently tightened so the beige app background no longer overgrew vertically.
- That solved the card visibility issue, but it also left the board looking too small relative to the available mobile space.
- The remaining visible beige space is coming from a combination of a conservative mobile board-slot height and the 3D scene fit inside a transparent canvas.

**Approaches Considered**
1. Increase only the mobile board-slot height.
   This is the safest change, but it does not fully address the remaining side-to-side beige space if the 3D scene fit stays conservative.
2. Increase only the 3D scene fit inside the current mobile slot.
   This helps width, but it leaves the board vertically constrained and does not use the available mobile space evenly.
3. Increase both the mobile board slot and the mobile scene fill.
   This gives the board an even growth path in width and height while keeping the card dock unchanged.

**Chosen Approach**
- Use a mobile-only increase to the board slot height in `src/App.css`.
- Keep the mobile board wrapper non-flex-growing so the beige area does not return to its previous oversized state.
- If the slot increase alone still leaves obvious horizontal slack, reduce the mobile scene fit margin and remove the extra mobile-only horizontal scene shrink in `src/components/RaceBoard3D.tsx`.

**Constraints**
- Mobile only. Desktop behavior stays unchanged.
- The player-card dock and card sizes remain unchanged.
- A small visual gap between the board and the dock is acceptable, but they should not appear attached.
- The rounded frame and overall gameplay/UI behavior must remain intact.

**Verification**
- Add a failing layout regression for the larger mobile board contract before changing code.
- Re-run targeted board/layout tests first, then full `npm test -- --watch=false --runInBand`, `npm run lint`, and `npm run build`.
