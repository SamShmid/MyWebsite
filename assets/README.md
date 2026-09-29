# Replace the photo or résumé

Upload files directly into this `assets` folder in GitHub, or replace them in your local checkout and push the changes.

| File | What happens |
| --- | --- |
| `samuel-shmidman.png` | Replaces the headshot. Use a PNG image; a square crop around 600–1000 pixels wide is sufficient. The current file is the original 304×304 headshot. |
| `resume.pdf` | The approved résumé linked directly from the home page. Replace this file with a newer approved public PDF to update the download. |

Keep these filenames exactly, including lowercase letters. Reload the local site after replacing a file. Push changes to `main` to save them on GitHub. Public hosting is currently disabled; once Cloudflare hosting is enabled, deploy the changes there to update the public site.

To use a JPEG or WebP photo instead, upload it here and change the portrait's `src` in `index.html` to that filename. The displayed crop and hover/tap expansion are controlled by the site.

The résumé is the owner-supplied September 2026 revision, added on September 29, 2026. Files uploaded to this public repository are public.

The other SVG files are interface icons. Their license is in `bootstrap-icons-LICENSE.txt`.
