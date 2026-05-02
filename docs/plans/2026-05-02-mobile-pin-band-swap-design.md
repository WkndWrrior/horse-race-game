# Mobile Pin Band Swap Design

**Problem:** The latest mobile `/how-to-play` preview is closer, but the two upper callouts are still inverted relative to the stacked cards. The `Scratched Horses` callout needs to sit lower, roughly where the dice callout is now, while the dice callout needs to move upward into the middle band. The finish-line callout is already acceptable.

**Decision:** Make a mobile-only anchor swap for the two upper callouts. Keep the desktop `sm:` positions unchanged, keep the finish-line callout unchanged on all breakpoints, and avoid any further board sizing changes in this pass.

**Scope:**
- move the mobile `Scratched Horses` callout down into the lower-middle band
- move the mobile dice callout up into the middle band
- leave the winner/finish callout exactly where it is
- update the source-level layout regression so the new anchors are locked in

**Non-Goals:** No route changes, no gameplay changes, no desktop layout changes, and no further resizing of the mobile preview unless a later visual pass requires it.
