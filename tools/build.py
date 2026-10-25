#!/usr/bin/env python3
"""Assemble the site.

src/            page bodies, each starting with a <!--meta ... --> block; _head.html and _nav.html are partials
assets/         style.css, site.js (copied as they are)
media/ scores/ cv/ img/   copied as they are, if present

dist/           the finished site: full HTML documents, ready to deploy
preview/        the same site for the claude.ai preview (index.html as a bare fragment, the rest as in dist)

Run:  python3 tools/build.py
"""
import re, shutil, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC, ASSETS = ROOT / 'src', ROOT / 'assets'
DIST, PREV = ROOT / 'dist', ROOT / 'preview'
HEAD = (SRC / '_head.html').read_text(encoding='utf-8')
NAV = (SRC / '_nav.html').read_text(encoding='utf-8')
COPY_DIRS = ['assets', 'media', 'scores', 'cv', 'img', 'satb']

def meta_and_body(text, name):
    m = re.match(r'\s*<!--meta\n(.*?)\n-->\n?', text, re.S)
    if not m:
        sys.exit(f'{name}: missing <!--meta --> block')
    meta = {}
    for line in m.group(1).splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            meta[k.strip().lower()] = v.strip()
    meta.setdefault('ogtitle', meta.get('title', ''))
    meta.setdefault('url', '')
    return meta, text[m.end():]

def render_head(meta):
    out = HEAD
    for k in ('title', 'ogtitle', 'desc', 'url'):
        out = out.replace('{{' + k.upper() + '}}', meta.get(k, '').replace('"', '&quot;'))
    return out

def build():
    for d in (DIST, PREV):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir()
    for page in sorted(SRC.glob('*.html')):
        if page.name.startswith('_'):
            continue
        meta, body = meta_and_body(page.read_text(encoding='utf-8'), page.name)
        is_home = page.name == 'index.html'
        nav = NAV.replace('{{H}}', '' if is_home else 'index.html')
        head = render_head(meta)
        section = meta.get('section', '')
        body_attr = f' data-section="{section}"' if section else ''
        full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                f'{head}</head>\n<body{body_attr}>\n{body.rstrip()}\n\n{nav}\n<script src="assets/site.js"></script>\n</body>\n</html>\n')
        (DIST / page.name).write_text(full, encoding='utf-8')
        if is_home:
            frag = ('<meta name="claude:viewport-fit-sides" content="cover">\n'
                    f'{head}{body.rstrip()}\n\n{nav}\n<script src="assets/site.js"></script>\n')
            (PREV / page.name).write_text(frag, encoding='utf-8')
        else:
            (PREV / page.name).write_text(full, encoding='utf-8')
        print('built', page.name)
    for d in COPY_DIRS:
        src = ROOT / d
        if src.is_dir():
            shutil.copytree(src, DIST / d)
            shutil.copytree(src, PREV / d)
    # files that belong at the site root (_headers, robots.txt, ...)
    pub = ROOT / 'public'
    if pub.is_dir():
        for f in pub.iterdir():
            if f.is_file():
                shutil.copy2(f, DIST / f.name)
    # Cloudflare Pages serves 404.html for missing paths
    print('done:', DIST, PREV)

if __name__ == '__main__':
    build()
