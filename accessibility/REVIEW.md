# Newcoast accessibility review

Date: October 5, 2026. Technical target: [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).

Scope: current `index.html` and local assets. Linked third-party sites were not updated. This is a remediation review, not ADA legal certification or a complete WCAG conformance evaluation.

## Changes

- Increased secondary text contrast on light and dark backgrounds. Applied solid navigation backgrounds and stronger media scrims so text contrast does not depend on the image frame.
- Made the skip-link destination focusable and moved keyboard focus to in-page navigation destinations, with clearance for the fixed header.
- Kept mobile menu states in sync, reset on responsive changes, retained Escape and focus return, and closed the menu when keyboard focus leaves navigation.
- Kept all three approach articles visible in reading order; removed scroll-dependent content replacement and canvas animation.
- Kept copy, all three data chips and final statistic values available without JavaScript. Added stable accessible names for animated statistics.
- Included all 13 facilities in HTML, preserved Active/Realized text labels, announced filter counts and supported touch activation. Filters also apply to asynchronously loaded map markers.
- Removed redundant map hover tooltips; equivalent facility details remain in the list.
- Used a native button for the Riverwalk clip, explicit play/pause, a visible pause control and offscreen pause.
- Honored reduced motion and paused background media when that preference changes or the film dialog opens.
- Improved film-dialog focus and cleanup; included a visible description of its scenic purpose.
- Enlarged small link/button targets, adjusted narrow-screen layouts, preserved all data chips on mobile, allowed long email wrapping, and improved focus outlines and forced-color support.
- Added accessibility-help email and a JavaScript-disabled navigation/content fallback.

## Verification

Run from the project root:

```
python3 accessibility/check-static.py
node accessibility/check-interactions.cjs
```

Passed: HTML nesting, unique IDs, ARIA references, anchor targets, image alt attributes, local asset existence, source statistics and all 13 facilities (11 active, 2 realized).

Passed: 19 calculated color pairs, including worst-case white imagery under the hero/approach scrims. Text pairs meet 4.5:1 and tested focus colors meet 3:1. See `static-results.json`.

Passed: JavaScript syntax and event-handler tests for menu disclosure/Escape, anchor focus, facility filters/count announcements, row activation, clip play/pause, dialog focus/cleanup, background pause and reduced motion. See `interaction-results.txt`. These tests use DOM test doubles and do not exercise browser layout, native key activation or assistive technology.

Local MP4 files have video tracks only, with no audio tracks.

## Rendered audit (October 6, 2026)

Served the page and ran axe-core 4 (WCAG 2.0/2.1/2.2 A and AA plus best practice) in Chromium at 1440px, 375px and 320px, with the mobile menu open, with the portfolio filtered and with reduced motion. Also tabbed through every focus stop at desktop and phone widths, and applied the WCAG 1.4.12 text-spacing overrides.

Found and fixed:

- Riverwalk clip button: its spoken name didn't contain its visible text ("Chicago Riverwalk / Play clip"), which breaks voice control (2.5.3 Label in Name). The name now comes from the visible caption; removed the conflicting `aria-pressed`.
- Side rail text ("/ Newcoast Real Estate", "Contact") took its colour from the section under the nav, so it could sit dark-on-dark at 2.2:1 (1.4.3). Each rail item now takes the colour of the section directly beneath it.
- Smallest text raised: mono labels, buttons and nav links from 11px to 12px; data-chip and map-tip captions from 10px to 11px.

Now passing: zero axe violations in every state; no horizontal scrolling at 320px; no clipped text under text-spacing overrides; every focus stop visible and not hidden behind the fixed header.

Also changed: the map scripts and US outline, the storage photo and the full aerial film now load from local copies first (run `sh tools/fetch-old-site-assets.sh` once to download them; until then the CDN and old site serve them as fallbacks); added a favicon, link-preview metadata and an accessibility statement page (`accessibility.html`).

## Scroll-driven hero (October 6, 2026)

The hero's looping Chicago video was replaced by a scroll-scrubbed build sequence (96 frames in `assets/build/`, cut from `assets/video/cinema-scroll.mp4`). Nothing moves unless the visitor scrolls, so no pause control is needed (2.2.2); the source audio is never played. Reduced-motion, Data Saver and screens shorter than 500px get the finished frame (`assets/build/poster.jpg`) as a still and download no frames. The animation is described in a visually hidden sentence, and the four stage labels are real list text. Re-ran axe in every state (0 violations), text spacing and keyboard order.

## Remaining verification

Local-file browser preview was blocked by the browser URL security policy. The sandbox prevented starting a preview server. Package-registry DNS access failed, so installing an automated scanner was unavailable. Browser-rendered auditing and screen-reader testing were not completed.

Before claiming full conformance:

1. Done for desktop/mobile, open menu, filtered portfolio and reduced motion (see above). The film dialog still needs a pass once the film is self-hosted.
2. Verify keyboard use, native video controls, scrollable facility list, visible/unobscured focus, Escape and modal focus return.
3. Test VoiceOver/Safari and NVDA/Firefox or Chrome for reading order, headings, statistics, filter announcements and modal behavior.
4. Test 320 CSS pixel reflow, 400% zoom, 200% text enlargement, and text-spacing overrides for clipping and horizontal page scrolling.
5. Review the externally hosted full aerial film. Confirm the description covers meaningful visuals and that any speech, informative sound or on-screen text has required captions/transcript/audio description. Full content/audio were not verified here.
6. Check the deployed page and linked investor portal, full portfolio, bios and privacy destinations. Repeat relevant checks after content or integration changes.

These open checks mean full WCAG conformance and ADA compliance have not been established.

## Approach video (October 2026)

The approach section's scroll-scrubbed frame sequence was replaced by a plain, silent 12-second loop (`assets/video/approach-720.mp4`) behind the three investment levers, which are now always visible as normal text. The loop autoplays muted only while the section is on screen, and never with reduced motion or Data Saver. A visible "Pause/Play background video" button controls it at all times (2.2.2), and a visitor's choice sticks. The text column sits on a ≥ .84-alpha scrim, as before. axe reports 0 violations in the section at desktop, phone and reduced-motion settings, and the button works by keyboard.

## Design pass (October 9, 2026)

One dark theme (no light sections), Geist for all type (Google Fonts only), section-number labels removed, current section shown in the nav (`aria-current="location"`), pressed states on controls, one radius scale. axe: 0 violations at desktop, phone, reduced motion and 320px (400% zoom), with no horizontal scroll. Keyboard: 20 stops, visible 3px focus on each. The source checks were rewritten for the redesigned page and pass.
