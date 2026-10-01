# Samuel Shmidman — portfolio

A lightweight personal portfolio built with HTML, CSS, and JavaScript. No framework, dependencies, or build step.

Source: https://github.com/SamShmid/MyWebsite

The live portfolio is hosted by Cloudflare at https://portfolio.shmiditech.com/. The existing Workers Builds integration deploys updates from `main` in `SamShmid/MyWebsite`.

## Update the photo and résumé

Open [`assets/`](assets/):

- Replace `samuel-shmidman.png` to change the photo.
- Replace `assets/resume.pdf` with a newer approved PDF to update the résumé download. The supplied September 2026 revision is included and linked directly from the home page, including without JavaScript.
- See [`assets/README.md`](assets/README.md) for details.

## Edit the site

- `index.html` — introduction, work/education, featured projects.
- `projects/index.html` — 16-project catalog. Most cards are informational listings; outgoing links include the EZ-TES iOS download, CDCW Devpost entry, and verified public GitHub repositories. The EZ-TES GitHub link is explicitly labeled as its website repository. Homelab documentation is marked coming soon.
- `privacy/index.html` — privacy information and accessibility controls.
- `styles.css` — shared appearance and responsive layout.
- `favicon.svg` — the selected Machined single-S mark on warm orange, shared across all pages.
- `opening.js` plays the character background once on each home page load or refresh, with lighter rendering on phones.
- `ducks.js` — one mother and four ducklings, appearing after **5 minutes of visible-page time** and scrolling down. Perches span timeline entries, roles, project cards, and the footer.
- `site.js`, `tooltips.js`, `profile-assets.js`, `reload.js` — keyboard/touch interactions, optional résumé loading, and refresh behavior.

## Preview locally

From this directory:

```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

Open http://127.0.0.1:4321/. Page-relative links work locally and on a hosted domain.

## Cloudflare deployment

`wrangler.json` configures an asset-only Cloudflare Worker. No server code or build step is needed. Static asset requests and storage are free under [Cloudflare's published pricing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

The privacy page includes a Cloudflare hosting disclosure. Normal production updates are deployed by the existing GitHub integration after a push to `main`. Check the commit's `Workers Builds` result to confirm deployment.

For a manual deployment, sign into the Cloudflare account that owns `samuel-shmidman-portfolio`, select that account when multiple accounts are available, and deploy from this directory.

```sh
npx wrangler login
npx wrangler deploy
```

The deployment updates the existing Worker and its connected portfolio domain. A local commit does not publish anything until it is pushed or manually deployed. GitHub Pages should remain disabled.

These commands leave the Wrangler major version unrestricted. To explicitly request the release tagged `latest`, use `npx wrangler@latest deploy`; plain `npx wrangler deploy` can reuse a locally installed version if one is added later. See [npm's npx documentation](https://docs.npmjs.com/cli/v11/commands/npx/).

The existing [Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) connects `SamShmid/MyWebsite`. The repository is prepared for these settings.

| Setting | Value |
| --- | --- |
| Worker name | `samuel-shmidman-portfolio` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | Leave empty |
| Deploy command | `npx wrangler deploy` |

The integration was verified through the successful `Workers Builds` check on the September 29 résumé update.

`.assetsignore` allows only the public pages, browser scripts, styles, icons, approved image formats, and optional `assets/resume.pdf` to be uploaded. Add new page paths there when creating more pages. Git metadata, configuration, and README files stay out of the hosted assets.

Only website files belong in this repository. Keep drafts, private research, credentials, and unapproved documents elsewhere.

## Accessibility and privacy

Includes keyboard navigation, focus indicators, reduced-motion support, image alternatives, touch behavior, and responsive layouts. The character background plays one 5.5-second pass per home page load. The decorative ducks remain, and there is no footer motion control. Tooltips support keyboard focus and Escape. Full browser, device, and assistive-technology testing is still needed. This is not a WCAG conformance certification.

The site code has no analytics, tracking cookies, browser storage, contact form, or chat. The résumé is a direct same-origin PDF download. Cloudflare provides the public hosting. The privacy page describes the provider's request-data handling.
