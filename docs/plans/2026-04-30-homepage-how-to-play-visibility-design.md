# Homepage How-To-Play Visibility Design

## Goal
Show the homepage's `How To Play` route link only when the user expands the `Rules` panel.

## Chosen Approach
Remove the standalone `How To Play` pill from the hero card and keep the existing `Open How To Play Page` link inside the `Rules` dropdown. This matches the requested behavior without changing routing, page metadata, or the tutorial page itself.

## Key Changes
- Delete the always-visible `How To Play` link under the start buttons.
- Preserve the existing `Open How To Play Page` link inside the expanded `Rules` panel.
- Update the homepage layout test so it verifies the link is hidden by default and appears after opening `Rules`.

## Validation
Add a failing homepage regression for the new visibility rule, then run the targeted layout tests, typecheck, and production build.
