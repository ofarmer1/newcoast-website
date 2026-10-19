# Newcoast Real Estate website

Draft redesign of the Newcoast Real Estate website (newcoastre.com), a self-storage investment firm. This is a pitch draft, not the live site: every page carries a `noindex` tag until launch.

## What's here

A static site with no build step: plain HTML, CSS and JavaScript.

- Six pages in the root: `index.html`, `about.html`, `portfolio.html`, `team.html`, `contact.html` and `accessibility.html`
- `assets/` holds the shared styles (`site.css`, `home.css`), scripts, images, the Newcoast logo and the compressed web videos
- `accessibility/` holds the checks the site is held to (WCAG 2.2 AA, reduced motion)

## Run it locally

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Checks

```sh
python3 accessibility/check-static.py
node accessibility/check-interactions.cjs
```

## Notes

- Copy and figures follow newcoastre.com. Anything not yet confirmed is marked on the page with an "ask Myles" tag.
- Asset URLs carry a `?v=` version so browsers pick up new files after each update.
