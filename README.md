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
| `satb/` | The SATB harmony grader and solver, served at `/satb/`. See below. |
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

## The SATB tool (`satb/`)

A copy of the teacher interface from [satb-harmony-solver-grader](https://github.com/Daniel-Shan-Hello/satb-harmony-solver-grader), running with no server. The Python engine runs in the browser with Pyodide (self-hosted in `satb/pyodide/`, version 0.26.4, Apache-2.0).

- `satb/engine/voice_grader.py`, `voice_solver.py`: copied unchanged from the SATB repository. After changing the engine there, copy these two files here again, build, and push.
- `satb/engine/web_api.py`: stands in for the two Flask routes in `app.py` (`/api/grade`, `/api/solve`), with the same request and response shapes.
- `satb/engine-worker.js`: loads Pyodide and the engine in a Web Worker.
- `satb/api-shim.js`: answers the app's `fetch("/api/grade")` and `fetch("/api/solve")` calls from the worker; everything else goes to the network.
- `satb/static/`: the app's own CSS and JS. Two small changes from the repository, both marked `site copy`: the soundfont path is relative, and `teacher.js` reads `window.SATB_LANG` and `window.SATB_EXAMPLE` so the page opens in English with an example loaded.
- `satb/index.html`: the teacher template with relative paths, a site header, and the two examples.

## Keyboard navigation

On wide screens the octave stands along the left edge; on narrow screens it lies along the bottom. White keys are links; black keys only sound. Key sounds are off by default and remembered per browser.
