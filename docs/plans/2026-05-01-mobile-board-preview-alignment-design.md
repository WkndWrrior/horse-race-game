# Mobile Board Preview Alignment Design

## Summary

The `/how-to-play` board preview works well on desktop, but on mobile the callout pins do not land on the right targets and the tutorial board is still too large for the viewport. This pass should only adjust the mobile presentation while preserving the current desktop layout.

## Layout

- Keep the desktop callout positions unchanged.
- Add tighter mobile-specific positions for all three callouts:
  - scratch callout pin lands on the scratched rail
  - dice callout pin lands on the dice area
  - winning callout pin lands closer to the winner peg area
- Reduce the mobile scale of the tutorial preview:
  - tighten outer padding
  - slightly reduce the top cards and dice panel spacing
  - slightly reduce the mobile board wrapper padding and board track sizing

## Behavior

- No gameplay behavior changes.
- No desktop route or metadata changes.
- The tutorial remains static; only the mobile composition changes.

## Testing

- Update the source-based tutorial layout regression in `src/__tests__/app-layout.test.tsx` to expect the new mobile callout coordinates and the tighter mobile board sizing classes.
