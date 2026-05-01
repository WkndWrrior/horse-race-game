# Rules Board Guide Pill Design

## Goal
Rename the homepage rules-panel tutorial link to `Board Guide` and place it at the top-right of the expanded `Rules` dropdown.

## Chosen Approach
Keep the link inside the `Rules` panel but move it out of the rule copy flow into its own top-right row. This makes the pill feel like a panel action rather than another rule paragraph, while preserving the existing `/how-to-play` route and behavior.

## Key Changes
- Rename `Open How To Play Page` to `Board Guide`.
- Move the link into a dedicated top-right row at the start of the expanded `Rules` panel.
- Keep the rule paragraphs below the action row.
- Update the homepage layout test so it verifies the new label and the top-right row class.

## Validation
Add a focused regression for the `Board Guide` label and the top-right rules-panel row, then run the targeted layout tests, typecheck, and production build.
