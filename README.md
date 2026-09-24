# d4rkgunn3r // portfolio

Multi-page terminal site for **Dylan Senez** (`d4rkgunn3r`).

## Pages

| File | Section |
|---|---|
| `index.html` | home |
| `whoami.html` | whoami |
| `tradecraft.html` | tradecraft |
| `ops.html` | ops |
| `research.html` | research |
| `certs.html` | certs |
| `education.html` | education |
| `write-ups.html` | write-ups |
| `contact.html` | contact |
| `404.html` | not found |

Shared: `styles.css` · `app.js` · favicons · `og.png`

## Writeups & Investigations

`write-ups.html` is the searchable article library. Individual articles have stable URLs under `articles/`, a table of contents, source links, and explicit evidence status. JavaScript enhances filtering; the article text is static HTML and works without it.

### One source, two reading surfaces

The article body lives only in its original GitHub Markdown file. `content/articles.json` selects reviewed source paths at an exact commit SHA, supplies presentation metadata, and allowlists individually reviewed images. The builder generates HTML for both root and `docs/` GitHub Pages configurations. Never edit generated article HTML as a separate draft.

### Update or publish an article

1. Edit the original source Markdown in SOC-Lab. Keep working notes and secrets private.
2. Review evidence, screenshots, technical claims, and publication eligibility. A Rooted status is not publication approval.
3. Update `content/articles.json` to the reviewed source commit, date, and article metadata. Only allowlist inspected images. The current catalog contains defensive SOC articles; unreviewed machine walkthroughs and Sherlocks are not imported.
4. Run `npm ci --ignore-scripts` and `npm run build` with Node 22 or newer.
5. Preview with the local server below; test search, filters, source links, and narrow screens.
6. Commit generated output alongside the manifest. GitHub Pages serves the committed pages through the existing hosting configuration. The read-only Check article build workflow verifies reproducibility; it does not change Pages settings or silently publish later source edits.

Offline build against a clone at the pinned commit: `npm run build -- --source-root ../SOC-Lab`. `content/build-manifest.json` records SHA-256 hashes of the source Markdown. Pinning deliberately prevents an unreviewed source change from becoming public automatically.

To add another source repository, extend the manifest/builder explicitly instead of pointing it at an unreviewed collection. Image URLs are commit-pinned public GitHub assets; Notion signed attachment URLs are not used.

## Hero line

> I map the attack so the defenders can close it.

## Local preview

```bash
python3 -m http.server 8080
# http://127.0.0.1:8080
```

## Publish (GitHub Pages)

```bash
git init
git add .
git commit -m "portfolio: multi-page terminal site"
git branch -M main
git remote add origin https://github.com/Dylans7j/portfolio.git
git push -u origin main
# Settings → Pages → main / root
```
