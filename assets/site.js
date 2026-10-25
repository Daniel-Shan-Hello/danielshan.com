/* danielshan.com: shared behaviour for every page.
   - the keyboard: scroll spy on the home page, page highlight elsewhere, optional key sounds
   - the piano roll of works (home)
   - audio players, click-to-load video embeds, copy buttons */
(function () {
  'use strict';

  /* ---------- keyboard: which key is lit ---------- */
  var keys = Array.prototype.slice.call(document.querySelectorAll('.key.white[href]'));
  var byId = {};
  keys.forEach(function (k) {
    var id = k.getAttribute('data-section');
    if (id) (byId[id] = byId[id] || []).push(k);
  });
  function setCurrent(id, value) {
    keys.forEach(function (k) { k.removeAttribute('aria-current'); });
    (byId[id] || []).forEach(function (k) { k.setAttribute('aria-current', value || 'true'); });
  }
  var pageSection = document.body.getAttribute('data-section');
  if (pageSection) {
    setCurrent(pageSection, 'page');
  } else {
    var sections = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (sections.length && 'IntersectionObserver' in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        var best = null, bestR = 0;
        sections.forEach(function (s) { var r = visible[s.id] || 0; if (r > bestR) { bestR = r; best = s.id; } });
        if (best) setCurrent(best);
      }, { rootMargin: '-25% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
      sections.forEach(function (s) { io.observe(s); });
    } else if (sections.length) {
      setCurrent('home');
    }
  }

  /* ---------- key sounds, off by default ---------- */
  var FREQ = { C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, As4: 466.16, B4: 493.88 };
  var ctx = null, soundOn = false;
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-sound]'));
  try { soundOn = localStorage.getItem('ds-key-sound') === '1'; } catch (e) {}
  function reflect() {
    toggles.forEach(function (t) {
      t.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      t.title = 'Key sounds: ' + (soundOn ? 'on' : 'off');
    });
  }
  reflect();
  function play(note) {
    if (!soundOn || !FREQ[note]) return;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      g.connect(ctx.destination);
      [[1, 'triangle', 1], [2, 'sine', 0.25], [3, 'sine', 0.08]].forEach(function (p) {
        var o = ctx.createOscillator(); o.type = p[1]; o.frequency.value = FREQ[note] * p[0];
        var og = ctx.createGain(); og.gain.value = p[2];
        o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.5);
      });
    } catch (e) {}
  }
  toggles.forEach(function (t) {
    t.addEventListener('click', function () {
      soundOn = !soundOn; reflect();
      try { localStorage.setItem('ds-key-sound', soundOn ? '1' : '0'); } catch (e) {}
      if (soundOn) play('C4');
    });
  });
  document.querySelectorAll('.key').forEach(function (k) {
    k.addEventListener('pointerdown', function () { k.classList.add('is-down'); play(k.dataset.note); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { k.addEventListener(ev, function () { k.classList.remove('is-down'); }); });
    k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') play(k.dataset.note); });
  });

  /* ---------- piano roll of all works (home) ---------- */
  var LANES = ['Orchestra and concertante', 'Chamber', 'Voice and choir', 'Solo piano'];
  var WORKS = [
    { t: 'The Second Coming',               y: 2023, d: 7,  lane: 2, i: 'SATB choir and piano, text by W. B. Yeats' },
    { t: 'Hurricane',                       y: 2023, d: 4,  lane: 3, i: 'Solo piano' },
    { t: 'A Train to Home',                 y: 2023, d: 7,  lane: 1, i: 'String quartet' },
    { t: 'Winter Fantasie',                 y: 2024, d: 5,  lane: 3, i: 'Solo piano' },
    { t: 'Pendulation',                     y: 2024, d: 5,  lane: 3, i: 'Solo piano' },
    { t: 'A Dream Within a Dream',          y: 2024, d: 5,  lane: 2, i: 'SATB choir and piano, text by Edgar Allan Poe' },
    { t: 'Piano Preludes',                  y: 2024, d: 9,  lane: 3, i: 'Solo piano, a collection, 2024–25' },
    { t: 'Haunted by Ghost',                y: 2025, d: 7,  lane: 1, i: 'Wind quintet and piano' },
    { t: 'Piano Concerto in C-sharp minor', y: 2025, d: 25, lane: 0, i: 'Piano and string quintet, 2025–26', f: true, href: 'piano-concerto.html' },
    { t: 'A Red, Red Rose',                 y: 2026, d: 4,  lane: 2, i: 'Soprano and piano, text by Robert Burns' },
    { t: 'Piano Scherzo in G',              y: 2026, d: 5,  lane: 0, i: 'Piano and orchestra, premiere March 2027', f: true, href: 'piano-scherzo.html' },
    { t: 'Viola Concertino in B minor',     y: 2026, d: 12, lane: 0, i: 'Viola and wind quintet, in progress', f: true, p: true, href: 'viola-concertino.html' }
  ];
  var svg = document.getElementById('pianoRoll');
  if (svg) {
    var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
    var left = 180, top = 18, pxYear = 215, pxMin = 7, barH = 12;
    var years = [2023, 2024, 2025, 2026, 2027];
    var laneH = [68, 42, 42, 42];
    var laneY = []; var acc = top;
    laneH.forEach(function (h, i) { laneY[i] = acc; acc += h; });
    var axisY = acc + 8;
    var W = left + 4.6 * pxYear, H = axisY + 30;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function el(name, attrs, text) { var e = document.createElementNS(NS, name); for (var a in attrs) e.setAttribute(a, attrs[a]); if (text != null) e.textContent = text; return e; }
    function xOf(year) { return left + (year - 2023) * pxYear; }
    years.forEach(function (yr) {
      var x = xOf(yr);
      svg.appendChild(el('line', { x1: x, y1: top - 6, x2: x, y2: axisY, 'class': 'year-line' }));
      svg.appendChild(el('text', { x: x + 6, y: axisY + 18, 'class': 'year' }, String(yr)));
    });
    LANES.forEach(function (name, i) {
      var yMid = laneY[i] + laneH[i] / 2;
      svg.appendChild(el('line', { x1: left, y1: yMid, x2: W, y2: yMid, 'class': 'lane-line' }));
      svg.appendChild(el('text', { x: left - 14, y: yMid + 4, 'text-anchor': 'end', 'class': 'lane' }, name));
    });
    var laneEnd = {}, flip = {};
    WORKS.forEach(function (w) {
      var x = xOf(w.y) + 10;
      if (laneEnd[w.lane] != null) x = Math.max(x, laneEnd[w.lane] + 10);
      var len = Math.max(w.d * pxMin, 10);
      laneEnd[w.lane] = x + len;
      var yMid = laneY[w.lane] + laneH[w.lane] / 2;
      var g = el('g', { 'class': 'note' });
      g.appendChild(el('title', {}, w.t + ' (' + w.y + '). ' + w.i + '. ca. ' + w.d + ' min.'));
      g.appendChild(el('rect', { x: x, y: yMid - barH / 2, width: len, height: barH, rx: 2, 'class': 'bar' + (w.f ? ' featured' : '') + (w.p ? ' progress' : '') }));
      if (w.f) {
        flip[w.lane] = !flip[w.lane];
        g.appendChild(el('text', { x: x, y: flip[w.lane] ? yMid - barH / 2 - 8 : yMid + barH / 2 + 18, 'class': 'label' }, w.t));
      }
      if (w.href) {
        var a = el('a', {}); a.setAttributeNS(XL, 'xlink:href', w.href); a.setAttribute('href', w.href);
        a.appendChild(g); svg.appendChild(a);
      } else {
        svg.appendChild(g);
      }
    });
  }

  /* ---------- audio players; sources arrive as data-src ---------- */
  function fmt(s) { if (!isFinite(s)) return '–:––'; s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  var players = [];
  function stopAll(except) {
    players.forEach(function (o) {
      if (o.audio !== except) { o.audio.pause(); o.el.classList.remove('is-playing'); o.btn.setAttribute('aria-label', 'Play'); }
    });
  }
  function initPlayer(p) {
    var src = p.getAttribute('data-src');
    var btn = p.querySelector('.pbtn'), track = p.querySelector('.ptrack'), bar = p.querySelector('.pbar'), time = p.querySelector('.ptime');
    if (!src) { p.classList.add('is-empty'); btn.disabled = true; btn.setAttribute('aria-label', 'Recording to come'); return; }
    var a = new Audio(src); a.preload = 'metadata';
    players.push({ el: p, audio: a, btn: btn });
    a.addEventListener('loadedmetadata', function () { time.textContent = fmt(a.duration); });
    a.addEventListener('timeupdate', function () {
      var r = a.duration ? a.currentTime / a.duration : 0;
      bar.style.width = (r * 100) + '%'; track.setAttribute('aria-valuenow', Math.round(r * 100));
      time.textContent = fmt(a.currentTime) + ' / ' + fmt(a.duration);
    });
    a.addEventListener('ended', function () { p.classList.remove('is-playing'); btn.setAttribute('aria-label', 'Play'); });
    btn.addEventListener('click', function () {
      if (a.paused) {
        stopAll(a);
        a.play(); p.classList.add('is-playing'); btn.setAttribute('aria-label', 'Pause');
      } else {
        a.pause(); p.classList.remove('is-playing'); btn.setAttribute('aria-label', 'Play');
      }
    });
    function seek(clientX) { var r = track.getBoundingClientRect(); if (a.duration) a.currentTime = a.duration * Math.min(1, Math.max(0, (clientX - r.left) / r.width)); }
    track.addEventListener('click', function (e) { seek(e.clientX); });
    track.addEventListener('keydown', function (e) {
      if (!a.duration) return;
      if (e.key === 'ArrowRight') { a.currentTime = Math.min(a.duration, a.currentTime + 5); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { a.currentTime = Math.max(0, a.currentTime - 5); e.preventDefault(); }
    });
  }
  document.querySelectorAll('.player').forEach(initPlayer);

  /* ---------- video: click-to-load YouTube embeds ---------- */
  function ytId(url) { var m = (url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : ''; }
  function renderVideo(box) {
    var id = ytId(box.getAttribute('data-video'));
    var title = box.getAttribute('data-title') || 'Video';
    var waiting = box.getAttribute('data-placeholder') || 'Video to come';
    box.innerHTML = '';
    box.classList.remove('audio');
    box.classList.toggle('has-video', !!id);
    box.onclick = null;
    if (!id) {
      var ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = waiting; box.appendChild(ph); return;
    }
    var ph2 = document.createElement('div'); ph2.className = 'ph vtitle'; ph2.textContent = title;
    var play = document.createElement('span'); play.className = 'play';
    var ext = document.createElement('a'); ext.className = 'ext'; ext.href = 'https://www.youtube.com/watch?v=' + id; ext.target = '_blank'; ext.rel = 'noopener'; ext.textContent = 'Open on YouTube';
    ext.addEventListener('click', function (e) { e.stopPropagation(); });
    box.style.backgroundImage = 'url("https://i.ytimg.com/vi/' + id + '/hqdefault.jpg")';
    box.appendChild(ph2); box.appendChild(play); box.appendChild(ext);
    box.setAttribute('role', 'button'); box.setAttribute('tabindex', '0'); box.setAttribute('aria-label', 'Play ' + title);
    function load() {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.title = title;
      box.innerHTML = ''; box.appendChild(f); box.onclick = null; box.removeAttribute('role'); box.removeAttribute('tabindex');
    }
    box.onclick = load;
    box.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(); } };
  }
  document.querySelectorAll('.video').forEach(renderVideo);

  /* home: the concerto card switches between movements.
     A tab with data-video shows a video; a tab with data-audio shows an audio player in the same box. */
  function renderAudio(box, src, label) {
    stopAll(null);
    box.innerHTML = '';
    box.classList.remove('has-video');
    box.classList.add('audio');
    box.style.backgroundImage = '';
    box.onclick = null; box.onkeydown = null;
    box.removeAttribute('role'); box.removeAttribute('tabindex'); box.removeAttribute('aria-label');
    box._players = box._players || {};
    var p = box._players[src];
    if (!p) {
      p = document.createElement('div');
      p.className = 'player';
      p.setAttribute('data-src', src);
      p.innerHTML = '<span class="plabel"></span>' +
        '<button type="button" class="pbtn" aria-label="Play"></button>' +
        '<div class="ptrack" role="slider" aria-label="Position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><div class="pbar"></div></div>' +
        '<span class="ptime">–:––</span>';
      p.querySelector('.plabel').textContent = label || '';
      initPlayer(p);
      box._players[src] = p;
    }
    box.appendChild(p);
  }
  var cv = document.getElementById('concerto-video');
  if (cv) {
    var tabs = cv.parentElement.querySelectorAll('.tabs button');
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        tabs.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var audio = b.getAttribute('data-audio');
        if (audio) {
          renderAudio(cv, audio, b.getAttribute('data-title'));
        } else {
          stopAll(null);
          cv.setAttribute('data-video', b.getAttribute('data-video') || '');
          cv.setAttribute('data-title', b.getAttribute('data-title') || '');
          cv.setAttribute('data-placeholder', b.getAttribute('data-placeholder') || '');
          renderVideo(cv);
        }
      });
    });
  }

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy], [data-copy-from]').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = b.getAttribute('data-copy');
      var fromSel = b.getAttribute('data-copy-from');
      var fromEl = fromSel ? document.querySelector(fromSel) : null;
      if (fromEl) txt = fromEl.innerText;
      var old = b.textContent;
      function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = old; }, 1400); }
      function fallback() {
        var target = fromEl || b.previousElementSibling;
        if (target) { var r = document.createRange(); r.selectNodeContents(target); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, fallback); } else { fallback(); }
    });
  });
})();
