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
