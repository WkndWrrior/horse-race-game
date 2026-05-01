# Homepage Anchor Column Design

## Summary

The homepage should keep a clean first screen while making the teaser controls more useful. The `Player Stats` and `Rules` teaser cards will become slimmer in-page links that sit at the bottom of the first screen. Clicking either one will smoothly scroll to its matching expanded section below.

On desktop and tablet, the expanded content should align directly beneath the corresponding teaser link in a two-column layout. On mobile, the teaser links should stack vertically with `Rules` first and `Player Stats` second, and the expanded sections should follow that same stacked order below.

## Layout

- Keep the hero/start-game card unchanged.
- Keep the first-screen layout full-height so the teaser row sits at the bottom when there is room.
- Reduce the teaser link padding and heading size slightly so the row is more likely to stay visible on shorter screens.
- Replace the teaser labels with real links:
  - `Player Stats` links to `#player-stats-section`
  - `Rules` links to `#rules-section`
- Desktop/tablet:
  - teaser links appear side by side
  - below-the-fold content appears in two aligned columns
  - `Player Stats` remains on the left
  - `Rules` remains on the right
- Mobile:
  - teaser links stack vertically
  - `Rules` appears first
  - `Player Stats` appears second
  - the expanded sections below stack in that same order

## Behavior

- Teaser links should scroll smoothly to the matching section.
- The expanded sections should keep the current detailed content.
- `Board Guide` stays in the expanded `Rules` section header row only.
- The homepage remains scrollable at all times while the game has not started.

## Testing

- Update the homepage regression so it expects:
  - teaser `Rules` and `Player Stats` links with anchor `href`s
  - one expanded `Player Stats` heading
  - one expanded `Rules` heading
  - the existing rules copy and `Board Guide` link
