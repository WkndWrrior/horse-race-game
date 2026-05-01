# How To Play Page Design

**Problem:** The site is currently a single-page React app with only one indexed URL and limited search-facing explanatory content. The most descriptive gameplay copy is buried inside the collapsible Rules panel on the homepage.

**Decision:** Add a lightweight, static `/how-to-play` page that explains the goal and turn flow in plain HTML without changing gameplay logic. Keep the existing homepage as the main play entry point and add internal links between the homepage and the new page.

**Page Scope:** The new page should be simple and low risk:
- a clear heading
- a short tutorial-style visual using the existing board artwork
- plain-language sections for the goal, race flow, and what cards do
- a link back to the homepage

**Routing Approach:** Keep the app dependency-light and avoid introducing a router package. Render either the homepage/game experience or the static how-to-play page based on `window.location.pathname`, and update metadata on route changes.

**SEO Approach:** Keep both `/` and `/how-to-play` indexable. Add route-aware title/description/Open Graph/Twitter/canonical metadata and include `/how-to-play` in the generated sitemap.

**Non-Goals:** No gameplay changes, no backend work, no fake SEO content, no keyword stuffing, and no changes to the official rules beyond clearer presentation.
