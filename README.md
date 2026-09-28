# Samuel Shmidman — portfolio

A lightweight personal portfolio built with HTML, CSS, and JavaScript. No framework, dependencies, or build step.

Live site: https://samshmid.github.io/MyWebsite/

## Update the photo and résumé

Open [`assets/`](assets/):

- Replace `samuel-shmidman.png` to change the photo.
- Add `resume.pdf` to enable the résumé download. The link remains “Coming soon” when the file is absent.
- See [`assets/README.md`](assets/README.md) for details.

## Edit the site

- `index.html` — introduction, work/education, featured projects.
- `projects/index.html` — complete project catalog.
- `privacy/index.html` — privacy information and accessibility controls.
- `styles.css` — shared appearance and responsive layout.
- `opening.js` — looping character background, with lighter rendering on phones.
- `ducks.js` — one mother and four ducklings, appearing after **60 seconds of visible-page time** and scrolling down. Perches span timeline entries, roles, project cards, and the footer.
- `site.js`, `tooltips.js`, `profile-assets.js`, `reload.js` — keyboard/touch interactions, optional résumé loading, and refresh behavior.

## Preview locally

From this directory:

```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

Open http://127.0.0.1:4321/. Page-relative links work both locally and under `/MyWebsite/` on GitHub Pages.

## Publish

Commit and push changes to `main`. GitHub Pages is configured to publish from the repository root. `.nojekyll` keeps this a plain static site. No deployment secrets or additional workflow are needed.

Only website files belong in this repository. Keep drafts, private research, credentials, and unapproved documents elsewhere.

## Accessibility and privacy

Includes keyboard navigation, focus indicators, reduced-motion support, a footer motion control, image alternatives, touch behavior, and responsive layouts. Tooltips support keyboard focus and Escape. Full browser, device, and assistive-technology testing is still needed; this is not a WCAG conformance certification.

The site code has no analytics, tracking cookies, browser storage, contact form, or chat. It checks for the optional résumé with a same-origin request. GitHub Pages processes hosting request data as described on the privacy page.
