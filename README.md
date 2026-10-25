# danielshan.com

Static site, no framework. Hosted on Cloudflare Pages, which serves the `dist/` folder as it is.

## Layout

| Folder | What is in it |
| --- | --- |
| `src/` | One file per page. Each starts with a `<!--meta ... -->` block (title, description, section) followed by the page body only. `_head.html` and `_nav.html` are shared by every page. |
| `assets/` | `style.css` and `site.js`, shared by every page. |
| `media/` | Audio (mp3). |
| `scores/` | Score PDFs. |
| `cv/` | CV PDFs. Replace a file here to update the download; the pages do not change. |
| `img/` | Photographs. `og.jpg` is the link-preview image. |
| `public/` | Files copied to the site root (`_headers`, `robots.txt`). |
| `tools/build.py` | Assembles `dist/` from the above. |
| `dist/` | The finished site. Committed, so Cloudflare needs no build step. |

## Editing

1. Edit a page in `src/`, a stylesheet in `assets/`, or drop a file into `media/`, `scores/`, `cv/`, or `img/`.
2. Run `python3 tools/build.py` (Python 3, no packages needed).
3. Commit and push. Cloudflare Pages deploys in about a minute.

Common edits:

- A new recording: put the mp3 in `media/`, then set `data-src="media/<file>.mp3"` on the matching `.player` in `src/`.
- A new video: set `data-video="https://youtu.be/<id>"` on the matching `.media.video` element.
- A new score: put the PDF in `scores/`, point the `score-link` at it.
- A new CV: replace the file in `cv/` and update the "Last updated" line in `src/index.html`.
- A new work in the piano roll: add a line to `WORKS` in `assets/site.js` (title, year, duration in minutes, lane, description).
- Keyboard navigation: `src/_nav.html`; it is inserted into every page at build time.

## Keyboard navigation

On wide screens the octave stands along the left edge; on narrow screens it lies along the bottom. White keys are links; black keys only sound. Key sounds are off by default and remembered per browser.
