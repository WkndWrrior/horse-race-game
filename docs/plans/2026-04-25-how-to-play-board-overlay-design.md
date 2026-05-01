# How To Play Board Overlay Design

**Problem:** The first version of `/how-to-play` explains the game, but the sample board does not resemble the in-app board closely enough and the hero box includes extra copy the user wants removed.

**Decision:** Keep the real `/how-to-play` route, but replace the fake sample-board section with one large static screenshot-style tutorial layout built in HTML/CSS. Use the in-game screen as the visual reference and pin three short instructional callouts directly over the layout.

**Layout Direction:**
- keep the page title box
- remove the explanatory sentence from the title box
- build a static game-style tutorial scene:
  - current player card
  - pot card
  - scratched horses strip
  - roll total/dice panel
  - large board with scratch lane and finish line
- overlay three short pinned callouts on the tutorial scene:
  - scratch horses and avoid penalties
  - roll dice and move the matching horse
  - cheer for the horses that match your cards

**Risk Control:** This stays static and does not reuse live gameplay logic or the 3D board. The update is isolated to `HowToPlayPage.tsx` plus one or two small tests.
