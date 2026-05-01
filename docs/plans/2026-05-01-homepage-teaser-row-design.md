# Homepage Teaser Row Design

## Summary

The homepage should keep the first screen focused on starting the game while still exposing stronger crawlable content lower on the page. Instead of showing the full `Player Stats` and `Rules` sections immediately under the hero card, the first screen will end with two large non-interactive header cards placed side by side: `Player Stats` and `Rules`.

Below that teaser row, the page will continue into the full expanded `Player Stats` section followed by the full expanded `Rules` section. The rules copy remains normal HTML on the homepage for SEO, but it starts below the fold rather than directly inside the initial viewport.

## Layout

- Keep the green title bar and start-game hero card as the primary top-of-page content.
- Add a separate teaser row at the bottom of the first screen with two large cards:
  - `Player Stats`
  - `Rules`
- Do not attach detailed content to those teaser cards.
- Render the actual expanded `Player Stats` section below the teaser row.
- Render the actual expanded `Rules` section after the stats section.
- Keep `Board Guide` in the expanded `Rules` section header row, aligned right.

## Behavior

- The teaser row is visual only. It is not clickable and does not toggle anything.
- The homepage remains scrollable at all times while the game has not started.
- The full stats and rules content stays in the DOM as normal page content for crawlability.

## Testing

- Update the homepage layout regression to require duplicate `Player Stats` and `Rules` headings:
  - one pair in the teaser row
  - one pair in the full sections below
- Keep the existing assertions that the `Board Guide` link is present and the rules text is rendered on the homepage.
