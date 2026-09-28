# Samuel Shmidman — portfolio

A lightweight personal portfolio built with HTML, CSS, and JavaScript. No framework, dependencies, or build step.

Source: https://github.com/SamShmid/MyWebsite

GitHub Pages is disabled. Cloudflare hosting is prepared but has not been deployed.

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

Open http://127.0.0.1:4321/. Page-relative links work locally and on a hosted domain.

## Optional Cloudflare hosting

`wrangler.json` configures an asset-only Cloudflare Worker. No server code or build step is needed. Static asset requests and storage are free under [Cloudflare's published pricing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

The privacy page includes a Cloudflare hosting disclosure. When ready to publish, sign into your Cloudflare account and deploy from this directory:

```sh
npx wrangler login
npx wrangler deploy
```

The deploy command publishes the site to a `workers.dev` address. Merely committing this configuration does not deploy anything. GitHub Pages should remain disabled.

These commands leave the Wrangler major version unrestricted. To explicitly request the release tagged `latest`, use `npx wrangler@latest deploy`; plain `npx wrangler deploy` can reuse a locally installed version if one is added later. See [npm's npx documentation](https://docs.npmjs.com/cli/v11/commands/npx/).

For optional automatic deployments, connect only `SamShmid/MyWebsite` through [Cloudflare's GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), with these settings:

| Setting | Value |
| --- | --- |
| Worker name | `samuel-shmidman-portfolio` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | Leave empty |
| Deploy command | `npx wrangler deploy` |

Once connected, pushes to `main` publish the changes. This integration has not been enabled yet.

`.assetsignore` allows only the public pages, browser scripts, styles, icons, approved image formats, and optional `assets/resume.pdf` to be uploaded. Add new page paths there when creating more pages. Git metadata, configuration, and README files stay out of the hosted assets.

Only website files belong in this repository. Keep drafts, private research, credentials, and unapproved documents elsewhere.

## Accessibility and privacy

Includes keyboard navigation, focus indicators, reduced-motion support, a footer motion control, image alternatives, touch behavior, and responsive layouts. Tooltips support keyboard focus and Escape. Full browser, device, and assistive-technology testing is still needed; this is not a WCAG conformance certification.

The site code has no analytics, tracking cookies, browser storage, contact form, or chat. It checks for the optional résumé with a same-origin request. Public hosting is currently disabled; review the provider's request-data handling when publishing.
