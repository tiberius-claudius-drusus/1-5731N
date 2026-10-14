/* ---------------------------------------------------------------------------
 * File      : 1-5731n/app.js
 * Version   : 1.2.0
 * Role      : Application: screens (home, game, help, options, statistics), board and zoom panel, clues, undo, timer, sounds, options, statistics export/import.
 * Depends on: engine.js, glyphs.js, themes.js, i18n.js, lang/*.js, logo.js
 * Called by : index.html (script tag, last)
 * Produces  : localStorage keys stein.game.v1 / stein.stats.v1 / stein.opt.v1 ; registers sw.js
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * 1-5731N user interface (PWA). Engine: engine.js (port of Einstein Puzzle, GPL v2+).
 */
(function () {
  'use strict';
  var VERSION = '1.2.0', BUILD_DATE = '2026-10-15';   // date as YYYY-MM-DD, shown as is at the bottom of the home screen
  var E = window.Stein, N = E.N, GL = window.SteinGlyphs, TH = window.SteinThemes, I = window.SteinI18n, t = I.t;
  var KEY_GAME = 'stein.game.v1', KEY_STATS = 'stein.stats.v1', KEY_OPT = 'stein.opt.v1';
  var KEY_PLAYED = 'stein.played.v1', KEY_POOL = 'stein.pool.v1', KEY_PACKS = 'stein.packs.v1';
  var $ = function (id) { return document.getElementById(id); };
  var LET = 'ABCDEF', let_ = 'abcdef';

  /* ---------- accessibility: spoken names of the symbols, announcements ---------- */
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  function symName(r, e) {                                    // spoken name of symbol e (1..6) in row r (0..5)
    switch (r) {
      case 0: return String(e);
      case 1: return LET.charAt(e - 1);
      case 2: return ROMAN[e - 1];
      case 3: return t('sym.die', { n: e });
      case 4: return t('sym.shape' + e);
      default: return t('sym.sign' + e);
    }
  }
  var liveT;
  function say(msg) {                                         // polite announcement for screen readers (#live)
    var l = $('live'); l.textContent = '';
    clearTimeout(liveT); liveT = setTimeout(function () { l.textContent = I.plain(String(msg)); }, 40);
  }

  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var opt = load(KEY_OPT, { sound: true, mode: 'choose', theme: 'epure', variant: 'clair', hand: 'right', lang: null });
  if (opt.hand !== 'left') opt.hand = 'right';
  // old settings (before 0.6.0): themes "clair" / "sombre"
  if (opt.theme === 'clair' || opt.theme === 'sombre') { opt.variant = opt.theme === 'sombre' ? 'fonce' : 'clair'; opt.theme = 'epure'; }
  (function (n) { opt.theme = n.theme; opt.variant = n.variant; })(TH.apply(opt.theme, opt.variant));
  // language: the one the user chose (opt.lang); otherwise the browser's if supported; otherwise English.
  // opt.lang stays empty until the user chooses, so that the phone's language is followed.
  var curLang = I.set(opt.lang || I.detect());
  var G = null;            // current game
  var rules = [];          // rule objects
  var pos = null;          // Possibilities
  var lastTick = 0, timer = null, ended = false;

  /* ---------- logo: point cloud, in the theme's accent colour ---------- */
  function drawLogo() {
    window.SteinLogo.draw($('logo'), getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
  }
  window.addEventListener('resize', function () { if ($('s-home').classList.contains('on')) drawLogo(); });

  /* ---------- screens ---------- */
  function show(id) {
    ['s-home', 's-game', 's-help', 's-stats', 's-options'].forEach(function (s) { $(s).classList.toggle('on', s === id); });
    if (id === 's-home') { $('b-continue').disabled = !loadGame(); drawLogo(); }
    if (id === 's-game') startTimer(); else stopTimer();
  }
  function goHome() { persist(); show('s-home'); }

  /* ---------- sons ---------- */
  var sounds = {};
  function play(n) {
    if (!opt.sound) return;
    try {
      var a = sounds[n] || (sounds[n] = new Audio('snd/' + n + '.wav'));
      a.currentTime = 0; a.play().catch(function () {});
    } catch (e) {}
  }

  /* ---------- dialogues ---------- */
  var dialogReturn = null, dialogEsc = null;
  function hideDialog() {
    $('dialog').hidden = true; dialogEsc = null; $('d-field').hidden = true; $('d-err').hidden = true;
    var r = dialogReturn; dialogReturn = null;
    if (r && document.body.contains(r)) { try { r.focus(); } catch (e) {} }
    else if (r && $('s-game').classList.contains('on') && !zoomCell) focusBoardCell(focusCell[0], focusCell[1]);   // the element was rebuilt meanwhile
  }
  function dialogError(msg) { var e = $('d-err'); e.textContent = msg; e.hidden = false; say(msg); }
  /* btns: [[label, callback?, validator?], ...]; the validator runs before the dialog closes and keeps it open by returning false.
   * opts.field {value, placeholder, label}: a text field (its value is passed to the validator and the callback).
   * opts.escIndex: button run by Escape (default the first; -1 = none). opts.enterIndex: button run by Enter in the field.
   * Three or more buttons are stacked in a column of equal width, one or two share a row equally. */
  function dialog(text, btns, opts) {
    opts = opts || {};
    $('d-text').textContent = text;
    var box = $('d-btns'); box.innerHTML = ''; box.className = btns.length > 2 ? 'col' : 'row';
    var fld = $('d-field'); $('d-err').hidden = true; $('d-err').textContent = '';
    fld.hidden = !opts.field;
    if (opts.field) { fld.value = opts.field.value || ''; fld.placeholder = opts.field.placeholder || ''; fld.setAttribute('aria-label', opts.field.label || text); }
    var shownAt = performance.now();   // ignore the ghost click of the last tap on the board
    btns.forEach(function (b) {
      var el = document.createElement('button'); el.textContent = b[0];
      el.onclick = function () {
        if (performance.now() - shownAt < 400) return;
        var v = opts.field ? fld.value : undefined;
        if (b[2] && b[2](v) === false) return;
        hideDialog(); if (b[1]) b[1](v);
      };
      box.appendChild(el);
    });
    var ei = opts.escIndex == null ? 0 : opts.escIndex;
    dialogEsc = ei >= 0 && btns[ei] ? function () { hideDialog(); if (btns[ei][1]) btns[ei][1](); } : null;
    fld.onkeydown = function (ev) {
      if (ev.key === 'Enter' && opts.enterIndex != null) { ev.preventDefault(); box.children[opts.enterIndex].click(); }
      else if (ev.key === 'Escape' && dialogEsc) { ev.preventDefault(); dialogEsc(); }
    };
    if (!dialogReturn && document.activeElement && document.activeElement !== document.body) dialogReturn = document.activeElement;
    $('dialog').hidden = false;
    var f = opts.field ? fld : box.firstChild; if (f) f.focus();
  }
  var toastT;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.hidden = false; say(msg);
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2200);
  }

  /* ---------- game ---------- */
  function fmt(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    s = s % 60; var h = Math.floor(m / 60); m = m % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function hintItems() {
    var a = [];
    rules.forEach(function (r, i) { if (r.show) a.push(i); });
    return a;
  }
  function persist() {
    if (!G || ended) return;
    tick();
    G.pos = Array.prototype.slice.call(pos.p);
    save(KEY_GAME, G);
  }
  /* the puzzle code, small under the timer: tap to copy */
  function showCode() {
    var gc = $('g-code'); gc.hidden = !(G && G.code);
    if (G && G.code) { gc.textContent = G.code; gc.setAttribute('aria-label', t('code.aria', { code: G.code })); }
  }
  $('g-code').onclick = function () {
    if (!G || !G.code) return;
    var code = G.code, done = function () { toast(t('code.copied')); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = code; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e) {}
      ta.remove();
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(done, fallback); return; } } catch (e) {}
    fallback();
  };
  /* ---------- puzzle packs, puzzles already played, puzzles made in the background ---------- */
  var LIB = window.SteinLib, MAX_PLAYED = 2500, POOL_MAX = 40;
  function validSavedPacks() {                                   // add-ons kept on this device, re-checked each time
    var a = load(KEY_PACKS, []), ok = [];
    (Array.isArray(a) ? a : []).forEach(function (p) { var r = LIB.install(p); if (r.ok) ok.push(r.pack); });
    return ok;
  }
  var savedPacks = validSavedPacks();
  function writePacks() { try { localStorage.setItem(KEY_PACKS, JSON.stringify(savedPacks)); return true; } catch (e) { return false; } }
  function playedSet() { var o = {}, a = load(KEY_PLAYED, []); (Array.isArray(a) ? a : []).forEach(function (c) { if (typeof c === 'string') o[c] = 1; }); return o; }
  function markPlayed(code) {
    if (!code) return;
    var a = load(KEY_PLAYED, []); if (!Array.isArray(a)) a = [];
    if (a.indexOf(code) < 0) { a.push(code); if (a.length > MAX_PLAYED) a.shift(); save(KEY_PLAYED, a); }
  }
  function poolLoad() { var p = load(KEY_POOL, {}); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; }
  /* a puzzle of the level: first one made in the background on this device, then the packs (not played yet), else made on the spot */
  function codeForLevel(level) {
    var played = playedSet(), pool = poolLoad(), list = Array.isArray(pool[level]) ? pool[level] : [];
    while (list.length) {
      var c = list.shift();
      if (typeof c === 'string' && E.canonicalCode(c) === c && !played[c]) { pool[level] = list; save(KEY_POOL, pool); return c; }
    }
    pool[level] = list; save(KEY_POOL, pool);
    var code = LIB.pick(level, played);
    if (code && !played[code]) return code;
    var t0 = performance.now();                                  // library exhausted for this level: search for one (a short while)
    while (performance.now() - t0 < 2500) {
      var g = E.genPuzzle();
      if (E.gradeOf(g.solved, g.rules).level === level && !played[g.code]) return g.code;
    }
    return code;                                                 // may be null (empty level and nothing found)
  }
  /* background generation: one puzzle every 10 s while a game is on screen, graded and kept per level (at most POOL_MAX each) */
  var bgWorker = null, bgOff = false;
  function bgAsk() {
    if (bgOff || document.hidden || !$('s-game').classList.contains('on') || !G || ended) return;
    try {
      if (!bgWorker) {
        bgWorker = new Worker('worker.js');
        bgWorker.onmessage = function (ev) {
          var m = ev.data;
          if (!m || m.error || typeof m.code !== 'string' || E.canonicalCode(m.code) !== m.code || !(m.level >= 0 && m.level < E.LEVEL_COUNT)) return;
          var pool = poolLoad(), l = Array.isArray(pool[m.level]) ? pool[m.level] : [];
          if (l.length >= POOL_MAX || l.indexOf(m.code) >= 0 || playedSet()[m.code]) return;
          l.push(m.code); pool[m.level] = l; save(KEY_POOL, pool);
        };
        bgWorker.onerror = function () { bgOff = true; };
      }
      bgWorker.postMessage(1);
    } catch (e) { bgOff = true; }
  }
  setInterval(bgAsk, 10000);

  /* the level of the puzzle (name and note 0-20), small under the code */
  var grade = null;
  function showLevel() {
    var gl = $('g-level'); gl.hidden = !grade;
    if (grade) gl.textContent = t('lvl.show', { name: t('lvl.' + grade.level), note: grade.note });
  }
  /* level of a code, kept in a cache apart from the statistics (never exported; recomputed if the scale changes) */
  var KEY_LVL = 'stein.lvl.v1';
  function lvlCache() { var c = load(KEY_LVL, null); return c && c.s === E.SCALE_VERSION && c.m && typeof c.m === 'object' ? c : { s: E.SCALE_VERSION, m: {} }; }
  function cacheLevel(code, level) { if (!code) return; var c = lvlCache(); c.m[code] = level; save(KEY_LVL, c); }
  function levelForCode(code, cache) {
    if (cache.m[code] != null) return cache.m[code];
    try { var g = E.genPuzzle(code); var lv = E.gradeOf(g.solved, g.rules).level; cache.m[code] = lv; return lv; } catch (e) { cache.m[code] = -1; return -1; }
  }
  function setup(g) {
    G = g; ended = false; focusCell = [0, 0];
    rules = G.rules.map(E.ruleFromJSON);
    pos = new E.Possibilities(G.pos);
    grade = E.gradeOf(G.solved, rules);
    renderAll(); showCode(); showLevel();
    closeZoom(); setModeButtons(); applyHand();
    show('s-game');
  }
  function newGame(code) {
    var g;
    try { g = E.genPuzzle(code || undefined); } catch (e) { toast(t('code.invalid')); return; }
    var p = new E.Possibilities();
    E.openInitial(p, g.rules);
    var st = load(KEY_STATS, { games: [], started: 0 });
    st.started = (st.started || 0) + 1; save(KEY_STATS, st);
    markPlayed(g.code);
    setup({
      solved: g.solved, rules: g.rules.map(E.ruleToJSON), code: g.code,
      pos: Array.prototype.slice.call(p.p), checked: [], history: [],
      elapsed: 0, errors: 0
    });
    persist();
  }
  /* The date of the device, in its own time zone: the puzzle of the day changes at 00:00:00 local time. */
  function localDate() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function bestTimeFor(code) {
    var best = null;
    load(KEY_STATS, { games: [] }).games.forEach(function (x) { if (x.c === code && (best === null || x.t < best)) best = x.t; });
    return best;
  }
  /* code: a puzzle code, or null for a random puzzle. A game in progress is only abandoned after confirmation. */
  function startPuzzle(code) {
    if (loadGame()) dialog(t('dlg.abandon'), [[t('dlg.no')], [t('dlg.yesNew'), function () { newGame(code); }]]);
    else newGame(code);
  }
  function typeCode(s) {                      // "017k3f9a2q" -> "01-7K3F-9A2Q" while typing
    s = String(s).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10);
    return s.slice(0, 2) + (s.length > 2 ? '-' : '') + s.slice(2, 6) + (s.length > 6 ? '-' : '') + s.slice(6);
  }
  $('d-field').addEventListener('input', function () { var v = typeCode(this.value); if (v !== this.value) this.value = v; });
  $('d-field').addEventListener('paste', function (ev) {
    var cb = ev.clipboardData || window.clipboardData; if (!cb) return;
    ev.preventDefault(); var raw = cb.getData('text'); this.value = E.canonicalCode(raw) || typeCode(raw);
  });
  function askCode() {
    dialog(t('code.prompt'), [
      [t('common.cancel')],
      [t('code.play'), function (v) { startPuzzle(E.canonicalCode(v)); }, function (v) {
        if (E.canonicalCode(v)) return true;
        dialogError(t('code.invalid')); return false;
      }]
    ], { field: { value: (E.CODE_VERSION < 10 ? '0' : '') + E.CODE_VERSION + '-', placeholder: '01-AAAA-AAAA', label: t('code.prompt') }, escIndex: 0, enterIndex: 1 });
  }
  /* "New game": a random puzzle, a puzzle of a chosen level, the puzzle of the day, or a puzzle from a code */
  function askLevel() {
    var btns = [];
    for (var lv = 0; lv < E.LEVEL_COUNT; lv++) (function (l) {
      btns.push([t('lvl.' + l), function () {
        var code = codeForLevel(l);
        if (code) startPuzzle(code); else toast(t('code.invalid'));
      }]);
    })(lv);
    btns.push([t('common.cancel'), askNew]);
    dialog(t('new.level'), btns, { escIndex: btns.length - 1 });
  }
  function askNew() {
    var today = localDate(), dc = LIB.daily(today), done = bestTimeFor(dc), cache = lvlCache(), dl = levelForCode(dc, cache);
    save(KEY_LVL, cache);
    dialog(t('home.new'), [
      [t('new.random'), function () { startPuzzle(null); }],
      [t('new.level'), askLevel],
      [t('new.daily') + (dl >= 0 ? ' · ' + t('lvl.' + dl) : '') + (done != null ? ' ✓ (' + t('new.dailyDone', { time: fmt(done) }) + ')' : ''), function () { startPuzzle(dc); }],
      [t('new.code'), askCode],
      [t('common.cancel')]
    ], { escIndex: 4 });
  }

  /* ---------- chrono ---------- */
  function tick() {
    var now = performance.now();
    if (lastTick && G && !ended) G.elapsed += now - lastTick;
    lastTick = now;
    if (G) $('g-time').textContent = fmt(G.elapsed);
  }
  function startTimer() { lastTick = performance.now(); clearInterval(timer); timer = setInterval(tick, 500); }
  function stopTimer() { tick(); clearInterval(timer); lastTick = 0; }
  document.addEventListener('visibilitychange', function () {
    if (!$('s-game').classList.contains('on')) return;
    if (document.hidden) { persist(); stopTimer(); } else startTimer();
  });
  window.addEventListener('pagehide', persist);

  /* ---------- rendu ---------- */
  function renderAll() { renderBoard(); renderHints(); $('g-time').textContent = fmt(G.elapsed); }

  var focusCell = [0, 0];                                      // the cell that holds the tab stop (roving tabindex)
  function cellLabel(c, r) {
    var state;
    if (pos.isDefined(c, r)) state = symName(r, pos.getDefined(c, r));
    else {
      var names = [];
      for (var e = 1; e <= N; e++) if (pos.isPossible(c, r, e)) names.push(symName(r, e));
      state = t('a11y.cellOpen', { n: names.length, list: names.join(', ') });
    }
    return t('a11y.cell', { r: r + 1, c: c + 1, state: state });
  }
  function renderBoard(errCell) {
    var b = $('board'), h = '', hadFocus = b.contains(document.activeElement);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var cls = 'cell' + (errCell && errCell[0] === c && errCell[1] === r ? ' err' : ''), dat = ' data-c="' + c + '" data-r="' + r + '"';
      var acc = ' role="button" tabindex="' + (focusCell[0] === c && focusCell[1] === r ? 0 : -1) + '" aria-label="' + esc(cellLabel(c, r)) + '"';
      if (pos.isDefined(c, r)) {
        h += '<div class="' + cls + ' def"' + dat + acc + ' aria-disabled="true">' + tile(r, pos.getDefined(c, r)) + '</div>';
      } else {
        h += '<div class="' + cls + '"' + dat + acc + '>';
        for (var e = 1; e <= N; e++) {
          h += '<div class="slot r' + r + '" data-c="' + c + '" data-r="' + r + '" data-e="' + e + '">' +
            (pos.isPossible(c, r, e) ? GL.glyph(r, e) : '') + '</div>';
        }
        h += '</div>';
      }
    }
    b.innerHTML = h;
    if (hadFocus) { var f = b.querySelector('.cell[data-c="' + focusCell[0] + '"][data-r="' + focusCell[1] + '"]'); if (f) f.focus(); }
    renderZoom();
  }

  function tile(r, e) { return '<span class="tile r' + r + '">' + GL.glyph(r, e) + '</span>'; }
  function icon(t) { return tile(t[0], t[1]); }
  function symTile(id) { return '<span class="tile sym">' + GL.hint(id) + '</span>'; }
  function nm(cell) { return symName(cell[0], cell[1]); }
  function clueLabel(r) {
    switch (r.t) {
      case 'near': return t('clue.near', { a: nm(r.a), b: nm(r.b) });
      case 'dir': return t('clue.side', { a: nm(r.a), b: nm(r.b) });
      case 'between': return t('clue.between', { a: nm(r.a), b: nm(r.b), c: nm(r.c) });
      default: return t('clue.under', { a: nm(r.a), b: nm(r.b) });
    }
  }
  function renderHints() {
    var fa = document.activeElement, fi = fa && fa.classList && fa.classList.contains('hint') ? +fa.dataset.i : -1;
    var items = hintItems();
    var chk = G.checked.filter(function (i) { return items.indexOf(i) >= 0; });
    function hintHtml(i) {
      var r = rules[i], done = chk.indexOf(i) >= 0, inner = '', cls = 'hint' + (done ? ' done' : '');
      switch (r.t) {
        case 'near': inner = icon(r.a) + symTile('near') + icon(r.b); break;
        case 'dir': inner = icon(r.a) + symTile('side') + icon(r.b); break;
        case 'between': inner = icon(r.a) + icon(r.c) + icon(r.b); break;
        case 'under': inner = icon(r.a) + icon(r.b); cls += ' v'; break;
      }
      return '<div class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-pressed="' + (done ? 'true' : 'false') + '" aria-label="' + esc(clueLabel(r)) + '">' + inner + '</div>';
    }
    // two lists: first the 3-cell clues (horizontal), below them the 2-cell ones (vertical).
    // In each list: ticked clues first (in the order they were ticked), then the others.
    var h = '';
    ['H', 'V'].forEach(function (kind) {
      var grp = items.filter(function (i) { return rules[i].show === kind; });
      var on = chk.filter(function (i) { return grp.indexOf(i) >= 0; });
      var order = on.concat(grp.filter(function (i) { return on.indexOf(i) < 0; }));
      if (order.length) h += '<div class="hgrp" role="group" aria-label="' + esc(t('a11y.hints')) + '">' + order.map(hintHtml).join('') + '</div>';
    });
    $('hints').innerHTML = h;
    if (fi >= 0) { var hf = $('hints').querySelector('.hint[data-i="' + fi + '"]'); if (hf) hf.focus(); }
  }

  function toggleHint(el) {
    var i = +el.dataset.i, k = G.checked.indexOf(i);
    if (k >= 0) G.checked.splice(k, 1); else G.checked.push(i);
    renderHints(); play('click'); persist();
  }
  $('hints').addEventListener('click', function (ev) {
    var el = ev.target.closest('.hint'); if (!el || ended) return;
    if (performance.now() - zoomShut < 450) return;      // ghost click: the zoom has just closed under the finger
    toggleHint(el);
  });
  $('hints').addEventListener('keydown', function (ev) {
    var el = ev.target.closest && ev.target.closest('.hint');
    if (el && !ended && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); toggleHint(el); }
  });

  /* ---------- coups ---------- */
  function move(kind, c, r, e) {
    if (ended || !pos.isPossible(c, r, e) || pos.isDefined(c, r)) return;
    var before = Array.prototype.slice.call(pos.p);
    if (kind === 'set') pos.set(c, r, e); else pos.exclude(c, r, e);
    if (!pos.isValid(G.solved)) {
      pos.p.set(before); G.errors++;
      play('glasbk2'); toast(t('toast.error'));
      renderBoard([c, r]);
      setTimeout(function () { renderBoard(); }, 700);
      persist(); return;
    }
    G.history.push(before); if (G.history.length > 300) G.history.shift();
    play(kind === 'set' ? 'laser' : 'whizz');
    say(t(kind === 'set' ? 'a11y.set' : 'a11y.excl', { sym: symName(r, e), r: r + 1, c: c + 1 }));
    renderBoard();
    if (pos.isSolved()) win(); else persist();
  }
  function undo() {
    if (ended || !G.history.length) return;
    pos.p.set(G.history.pop()); renderBoard(); persist(); play('click'); say(t('a11y.undone'));
  }

  function win() {
    tick(); ended = true; stopTimer();
    var st = load(KEY_STATS, { games: [], started: 0 });
    var rec = { t: Math.round(G.elapsed), errors: G.errors, d: localDate() };
    if (G.code) rec.c = G.code;
    st.games.push(rec);
    if (st.games.length > 500) st.games.shift();
    save(KEY_STATS, st); drop(KEY_GAME);
    if (grade) cacheLevel(G.code, grade.level);
    play('applause');
    dialog([t('win.title'), t('win.time', { time: fmt(G.elapsed) }), G.errors ? t('win.errors', { n: G.errors }) : t('win.clean')].concat(G.code ? [G.code] : []).join('\n'),
      [[t('win.menu'), function () { show('s-home'); }], [t('win.new'), askNew]], { escIndex: -1 });
  }

  /* ---------- cell zoom: tapping an unsolved cell enlarges it in the centre ---------- */
  var board = $('board'), zoomEl = $('zoom'), zbox = $('zbox');
  var zoomCell = null, zoomShut = 0, lastMove = 0;
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  board.addEventListener('click', function (ev) {
    if (ended) return;
    var cell = ev.target.closest('.cell');
    if (!cell || cell.classList.contains('def')) return;
    var c = +cell.dataset.c, r = +cell.dataset.r;
    if (zoomCell && zoomCell[0] === c && zoomCell[1] === r) closeZoom();   // a second tap closes it
    else openZoom(c, r);                                                  // otherwise the zoom moves to this cell
  });
  function focusBoardCell(c, r) {
    focusCell = [c, r];
    Array.prototype.forEach.call(board.querySelectorAll('.cell'), function (x) { x.tabIndex = (+x.dataset.c === c && +x.dataset.r === r) ? 0 : -1; });
    var el = board.querySelector('.cell[data-c="' + c + '"][data-r="' + r + '"]'); if (el) el.focus();
  }
  /* viaKey: opened with the keyboard, so the focus goes into the panel (first possible symbol) */
  function openZoom(c, r, viaKey) {
    zoomCell = [c, r]; focusCell = [c, r];
    $('s-game').classList.add('zooming');
    zoomEl.classList.add('on');
    fitZoom();
    renderBoard(); renderZoom();
    if (viaKey) { var f = zbox.querySelector('.zslot[tabindex]'); if (f) f.focus(); }
    say(t('a11y.zoom', { r: r + 1, c: c + 1 }));
  }
  /* The panel takes all the room left under the board; the zoom (3:2 ratio, square tiles) fits into it. */
  function fitZoom() {
    if (!zoomCell) return;
    var bw = 64, gap = 10;                                   // button column + gap
    var availW = zoomEl.clientWidth - bw - gap, availH = zoomEl.clientHeight - $('zcap').offsetHeight - 8 - 14;
    var w = Math.min(availW, 440, availH * 1.5);
    zbox.style.width = Math.max(150, Math.floor(w)) + 'px';
  }
  window.addEventListener('resize', fitZoom);
  function closeZoom() {
    if (!zoomCell) return;
    var had = zoomEl.contains(document.activeElement), zc = zoomCell;
    zoomCell = null; zoomEl.classList.remove('on'); $('s-game').classList.remove('zooming');
    zoomShut = performance.now();
    var s = board.querySelector('.zsel'); if (s) s.classList.remove('zsel');
    if (had) focusBoardCell(zc[0], zc[1]);                    // the focus goes back to the cell the panel was open on
  }
  function renderZoom() {
    if (!zoomCell) return;
    var c = zoomCell[0], r = zoomCell[1];
    if (ended || pos.isDefined(c, r)) { closeZoom(); return; }
    Array.prototype.forEach.call(board.querySelectorAll('.zsel'), function (x) { x.classList.remove('zsel'); });
    var cur = board.querySelector('.cell[data-c="' + c + '"][data-r="' + r + '"]'); if (cur) cur.classList.add('zsel');
    var fa = document.activeElement, fe = zbox.contains(fa) && fa.dataset ? +fa.dataset.e : 0;
    var h = '';
    for (var e = 1; e <= N; e++) {
      var poss = pos.isPossible(c, r, e);
      h += '<div class="zslot" data-c="' + c + '" data-r="' + r + '" data-e="' + e + '"' +
        (poss ? ' role="button" tabindex="0" aria-label="' + esc(symName(r, e)) + '"' : '') + '>' + (poss ? tile(r, e) : '') + '</div>';
    }
    zbox.innerHTML = h;
    if (fe) { var f = zbox.querySelector('.zslot[data-e="' + fe + '"][tabindex]') || zbox.querySelector('.zslot[tabindex]'); if (f) f.focus(); }
  }
  $('z-close').onclick = closeZoom;

  var press = null;
  zbox.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  zbox.addEventListener('pointerdown', function (ev) {
    var s = ev.target.closest('.zslot'); if (!s || !s.querySelector('svg')) return;
    var c = +s.dataset.c, r = +s.dataset.r, e = +s.dataset.e;
    if (ev.button === 2) { doMove('excl', c, r, e); return; }
    press = { c: c, r: r, e: e, long: false, x: ev.clientX, y: ev.clientY };
    s.classList.add('pr');
    var p = press;
    p.t = setTimeout(function () {
      p.long = true;
      if (navigator.vibrate) navigator.vibrate(15);
      doMove(opt.mode === 'choose' ? 'excl' : 'set', p.c, p.r, p.e);
    }, 420);
  });
  zbox.addEventListener('pointermove', function (ev) {
    if (press && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 14) { clearTimeout(press.t); press = null; clearPr(); }
  });
  function clearPr() { Array.prototype.forEach.call(zbox.querySelectorAll('.pr'), function (x) { x.classList.remove('pr'); }); }
  function endPress(ev) {
    if (!press) return;
    clearTimeout(press.t);
    var p = press; press = null; clearPr();
    if (ev.type === 'pointerup' && !p.long) doMove(opt.mode === 'choose' ? 'set' : 'excl', p.c, p.r, p.e);
  }
  zbox.addEventListener('pointerup', endPress);
  zbox.addEventListener('pointercancel', endPress);
  function doMove(kind, c, r, e) { lastMove = performance.now(); move(kind, c, r, e); }

  /* ---------- keyboard (desktop) ---------- */
  function other(kind) { return kind === 'set' ? 'excl' : 'set'; }
  function modeKind() { return opt.mode === 'choose' ? 'set' : 'excl'; }
  board.addEventListener('keydown', function (ev) {
    var cell = ev.target.closest && ev.target.closest('.cell'); if (!cell || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var c = +cell.dataset.c, r = +cell.dataset.r, nc = c, nr = r;
    if (/^[1-6]$/.test(ev.key)) { ev.preventDefault(); if (!ended && !cell.classList.contains('def')) doMove(modeKind(), c, r, +ev.key); return; }
    switch (ev.key) {
      case 'ArrowLeft': nc = Math.max(0, c - 1); break;
      case 'ArrowRight': nc = Math.min(N - 1, c + 1); break;
      case 'ArrowUp': nr = Math.max(0, r - 1); break;
      case 'ArrowDown': nr = Math.min(N - 1, r + 1); break;
      case 'Home': nc = 0; break;
      case 'End': nc = N - 1; break;
      case 'Enter': case ' ':
        ev.preventDefault(); if (!ended && !cell.classList.contains('def')) openZoom(c, r, true); return;
      default: return;
    }
    ev.preventDefault(); focusBoardCell(nc, nr);
  });
  zoomEl.addEventListener('keydown', function (ev) {
    if (!zoomCell || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var c = zoomCell[0], r = zoomCell[1], s = ev.target.closest && ev.target.closest('.zslot');
    if (ev.key === 'Escape') { ev.preventDefault(); closeZoom(); return; }
    if (/^[1-6]$/.test(ev.key)) { ev.preventDefault(); if (pos.isPossible(c, r, +ev.key)) doMove(modeKind(), c, r, +ev.key); return; }
    if (s && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault(); doMove(ev.shiftKey ? other(modeKind()) : modeKind(), c, r, +s.dataset.e); return;
    }
    var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[ev.key];
    if (s && d) {                                              // the six symbols form a grid of 3 columns x 2 rows
      ev.preventDefault();
      for (var e = +s.dataset.e + d; e >= 1 && e <= N; e += d) {
        var f = zbox.querySelector('.zslot[data-e="' + e + '"][tabindex]'); if (f) { f.focus(); break; }
      }
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.defaultPrevented) return;
    var tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (!$('dialog').hidden) {
      if (ev.key === 'Escape' && dialogEsc) { ev.preventDefault(); dialogEsc(); }
      else if (ev.key === 'Tab') {                              // the focus stays inside the dialog
        var bs = Array.prototype.slice.call($('d-btns').querySelectorAll('button')); if (!bs.length) return;
        if (!$('d-field').hidden) bs.unshift($('d-field'));
        var first = bs[0], last = bs[bs.length - 1];
        if (!$('dialog').contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
        else if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
      return;
    }
    if (!$('s-game').classList.contains('on')) return;
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (ev.ctrlKey || ev.metaKey) { if (k === 'z') { ev.preventDefault(); undo(); } return; }
    if (ev.altKey) return;
    if (k === 'm') { ev.preventDefault(); toggleMode(); }
    else if (k === 'u') { ev.preventDefault(); undo(); }
    else if (k === 't') { ev.preventDefault(); say(fmt(G.elapsed)); }
    else if (k === 'Escape') { if (zoomCell) closeZoom(); else $('g-menu').click(); }
  });

  /* ---------- barre ---------- */
  $('g-undo').onclick = undo;
  function setModeButtons() {
    var ex = opt.mode !== 'choose';
    $('g-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('g-mode').classList.toggle('excl', ex); $('g-mode').classList.toggle('chs', !ex);
    $('z-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('z-mode').classList.toggle('excl', ex); $('z-mode').classList.toggle('chs', !ex);
    $('zcap').innerHTML = $('gcap').innerHTML = t(ex ? 'cap.excl' : 'cap.choose');   // the caption stays under the board (and in the zoom panel)
  }
  function applyHand() {
    var left = opt.hand === 'left';
    $('zrow').classList.toggle('lefty', left);
    // the arrow shows where the buttons will go at the next tap
    $('z-hand').innerHTML = GL.icon(left ? 'right' : 'left');
  }
  function toggleHand() { opt.hand = opt.hand === 'left' ? 'right' : 'left'; save(KEY_OPT, opt); applyHand(); fitZoom(); }
  function toggleMode() {
    opt.mode = opt.mode === 'choose' ? 'excl' : 'choose'; save(KEY_OPT, opt);
    setModeButtons(); say($('gcap').textContent);
  }
  $('g-mode').onclick = toggleMode;
  $('z-mode').onclick = toggleMode;
  $('z-hand').onclick = toggleHand;
  function curTheme() { return TH.list().filter(function (t) { return t.id === opt.theme; })[0]; }
  function variantLabel() {
    var v = curTheme().variants.filter(function (x) { return x.id === opt.variant; })[0]; return I.tOr('variant.' + opt.variant, v ? v.label : opt.variant);
  }
  function setLook(theme, variant) {
    var n = TH.apply(theme, variant); opt.theme = n.theme; opt.variant = n.variant; save(KEY_OPT, opt); drawLogo();
  }
  function toggleVariant() {                                   // light ↔ dark (next version of the theme)
    var vs = curTheme().variants, k = vs.map(function (x) { return x.id; }).indexOf(opt.variant);
    setLook(opt.theme, vs[(k + 1) % vs.length].id);
    toast(t('toast.version', { name: variantLabel() }));
  }

  $('g-menu').onclick = function () {
    dialog(t('menu.title'), [
      [t('menu.resume')],
      [t('menu.sound', { state: t(opt.sound ? 'state.yes' : 'state.no') }), function () { opt.sound = !opt.sound; save(KEY_OPT, opt); }],
      [t('menu.version', { name: variantLabel() }), toggleVariant],
      [t('menu.new'), askNew],
      [t('menu.home'), goHome]
    ]);
  };

  /* ---------- options (accueil) ---------- */
  function seg(key, items, cur) {
    return '<div class="seg" data-k="' + key + '">' + items.map(function (it) {
      return '<button data-v="' + it[0] + '"' + (it[0] === cur ? ' class="on"' : '') + '>' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function renderOptions() {
    var themes = TH.list(), th = curTheme();
    $('opt-body').innerHTML =
      '<div class="optrow"><h3>' + t('opt.sound') + '</h3>' + seg('sound', [['on', t('opt.on')], ['off', t('opt.off')]], opt.sound ? 'on' : 'off') + '</div>' +
      '<div class="optrow"><h3>' + t('opt.theme') + '</h3>' + seg('theme', themes.map(function (x) { return [x.id, I.tOr('theme.' + x.id, x.label)]; }), opt.theme) + '</div>' +
      '<div class="optrow"><h3>' + t('opt.version') + '</h3>' + seg('variant', th.variants.map(function (x) { return [x.id, I.tOr('variant.' + x.id, x.label)]; }), opt.variant) + '</div>' +
      '<div class="optrow"><h3>' + t('opt.lang') + '</h3><select id="opt-lang">' + I.list().map(function (l) {
        return '<option value="' + l.code + '"' + (l.code === curLang ? ' selected' : '') + '>' + l.name + '</option>';
      }).join('') + '</select></div>' + packsHtml();
  }
  /* ---------- puzzle packs (options) ---------- */
  var avail = null;                                              // add-ons offered by the site (addons/index.json), if any
  function packsHtml() {
    var h = '<div class="optrow"><h3>' + t('packs.title') + '</h3><table>';
    LIB.packs().forEach(function (p) {
      h += '<tr><td>' + esc(p.name) + '</td><td>' + esc(t('packs.count', { n: p.count })) + '</td><td>' +
        (p.base ? '' : '<button class="pk-del" data-id="' + esc(p.id) + '">' + esc(t('packs.remove')) + '</button>') + '</td></tr>';
    });
    h += '</table><button id="pk-install">' + esc(t('packs.install')) + '</button>';
    var have = {}; LIB.packs().forEach(function (p) { have[p.id] = 1; });
    var offer = (avail || []).filter(function (a) { return !have[a.id]; });
    if (offer.length) {
      h += '<h3>' + t('packs.avail') + '</h3><table>';
      offer.forEach(function (a) {
        h += '<tr><td>' + esc(a.name) + '</td><td>' + esc(t('packs.count', { n: a.count })) + '</td><td><button class="pk-get" data-f="' + esc(a.file) + '">' + esc(t('packs.get')) + '</button></td></tr>';
      });
      h += '</table>';
    }
    return h + '</div>';
  }
  function loadAvail() {                                         // optional: the file may not exist, nothing is shown then
    if (avail !== null) return; avail = [];
    fetch('addons/index.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
      if (!Array.isArray(a)) return;
      avail = a.filter(function (x) {
        return x && typeof x.name === 'string' && x.name.length <= 40 && typeof x.id === 'string' && /^[a-z0-9-]{1,32}$/.test(x.id) &&
          typeof x.file === 'string' && /^[a-z0-9-]{1,40}\.json$/.test(x.file) && Number.isInteger(x.count) && x.count > 0 && x.count <= 20000;
      }).slice(0, 20);
      if ($('s-options').classList.contains('on')) renderOptions();
    }).catch(function () {});
  }
  function installPack(obj) {
    var r = LIB.install(obj);
    if (!r.ok) { toast(t(r.error === 'gen' || r.error === 'scale' ? 'packs.badVersion' : 'packs.bad')); return; }
    savedPacks = savedPacks.filter(function (p) { return p.id !== r.pack.id; }); savedPacks.push(r.pack);
    if (!writePacks()) { LIB.remove(r.pack.id); savedPacks.pop(); toast(t('packs.bad')); return; }
    toast(t('packs.ok', { name: r.pack.name })); renderOptions();
  }
  $('pack-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f || f.size > 1024 * 1024) { toast(t('packs.bad')); return; }
    var fr = new FileReader();
    fr.onload = function () { var o = null; try { o = JSON.parse(String(fr.result)); } catch (e) {} installPack(o); };
    fr.onerror = function () { toast(t('packs.bad')); };
    fr.readAsText(f);
  });
  $('opt-body').addEventListener('change', function (ev) {
    if (ev.target.id === 'opt-lang') { curLang = opt.lang = I.set(ev.target.value); save(KEY_OPT, opt); applyLang(); }
  });
  $('opt-body').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'pk-install') { $('pack-file').value = ''; $('pack-file').click(); return; }
    if (b.classList.contains('pk-get')) {
      fetch('addons/' + b.dataset.f).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(installPack).catch(function () { toast(t('packs.bad')); });
      return;
    }
    if (b.classList.contains('pk-del')) {
      var id = b.dataset.id, nm = (LIB.packs().filter(function (p) { return p.id === id; })[0] || {}).name || id;
      dialog(t('packs.removeConfirm', { name: nm }), [[t('dlg.no')], [t('packs.remove'), function () {
        LIB.remove(id); savedPacks = savedPacks.filter(function (p) { return p.id !== id; }); writePacks(); renderOptions();
      }]]);
      return;
    }
    var k = b.parentNode.dataset.k, v = b.dataset.v;
    if (k === 'sound') { opt.sound = v === 'on'; save(KEY_OPT, opt); play('click'); }
    else if (k === 'theme') setLook(v, opt.variant);
    else if (k === 'variant') setLook(opt.theme, v);
    renderOptions();
  });
  $('b-options').onclick = function () { renderOptions(); show('s-options'); history.pushState({}, ''); loadAvail(); };

  /* ---------- accueil, aide, stats ---------- */
  $('b-new').onclick = askNew;
  /* The saved game, or null: a save that fails the strict check (truncated, edited, from another version) is dropped. */
  function loadGame() {
    var g = load(KEY_GAME, null);
    if (g && !E.validGame(g)) { drop(KEY_GAME); g = null; }
    return g;
  }
  $('b-continue').onclick = function () { var g = loadGame(); if (g) setup(g); else $('b-continue').disabled = true; };
  $('b-help').onclick = function () { show('s-help'); history.pushState({}, ''); };
  $('b-stats').onclick = function () { renderStats(); show('s-stats'); history.pushState({}, ''); };
  Array.prototype.forEach.call(document.querySelectorAll('.back'), function (b) { b.onclick = function () { show('s-home'); }; });
  window.addEventListener('popstate', function () {
    if (zoomCell) { closeZoom(); history.pushState({}, ''); }
    else if ($('s-game').classList.contains('on')) { goHome(); history.pushState({}, ''); }
    else show('s-home');
  });
  $('stats-reset').onclick = function () {
    dialog(t('stats.resetConfirm'), [[t('dlg.no')], [t('stats.reset'), function () { drop(KEY_STATS); renderStats(); }]]);
  };

  /* HTML-escapes a value that comes from storage before it is put in an innerHTML string. */
  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ISO date YYYY-MM-DD → format of the current language */
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(I.lang, { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return iso; }
  }
  function renderStats() {
    var st = load(KEY_STATS, { games: [], started: 0 }), g = st.games;
    if (!g.length) { $('stats-body').innerHTML = '<p>' + t('stats.none') + '</p>'; return; }
    var ts = g.map(function (x) { return x.t; });
    var avg = ts.reduce(function (a, b) { return a + b; }, 0) / ts.length;
    var clean = g.filter(function (x) { return !x.errors; }).length;
    var h = '<table><tr><td>' + t('stats.won') + '</td><td>' + g.length + '</td></tr>' +
      '<tr><td>' + t('stats.started') + '</td><td>' + esc(+st.started || g.length) + '</td></tr>' +
      '<tr><td>' + t('stats.best') + '</td><td>' + esc(fmt(Math.min.apply(null, ts))) + '</td></tr>' +
      '<tr><td>' + t('stats.avg') + '</td><td>' + esc(fmt(avg)) + '</td></tr>' +
      '<tr><td>' + t('stats.clean') + '</td><td>' + clean + '</td></tr></table><h3>' + t('stats.last') + '</h3><table>';
    g.slice(-10).reverse().forEach(function (x) {
      h += '<tr><td>' + esc(fmtDate(x.d)) + '</td><td>' + (x.errors ? esc(t('stats.err', { n: +x.errors || 0 })) : '') + '</td><td>' + esc(fmt(x.t)) + '</td><td class="cd">' + esc(E.canonicalCode(x.c) || '') + '</td></tr>';
    });
    $('stats-body').innerHTML = h + '</table>' + levelTable(g);
    fillLevels(g);
  }
  /* statistics by level: the level of a game comes from its code (cache); old games are classified a few at a time */
  function levelTable(g) {
    var cache = lvlCache(), rows = [], pending = 0, lv, i;
    var by = [[], [], [], [], []], none = 0;
    g.forEach(function (x) {
      var c = x.c ? E.canonicalCode(x.c) : null;
      if (!c) { none++; return; }
      if (cache.m[c] == null) { pending++; return; }
      if (cache.m[c] < 0) { none++; return; }
      by[cache.m[c]].push(x);
    });
    var h = '<h3>' + t('stats.bylevel') + '</h3><table><tr><th></th><th>' + t('stats.won') + '</th><th>' + t('stats.best') + '</th><th>' + t('stats.avg') + '</th></tr>';
    for (lv = 0; lv < E.LEVEL_COUNT; lv++) {
      var ts = by[lv].map(function (x) { return x.t; });
      h += '<tr><td>' + esc(t('lvl.' + lv)) + '</td><td>' + ts.length + '</td><td>' + (ts.length ? esc(fmt(Math.min.apply(null, ts))) : '–') +
        '</td><td>' + (ts.length ? esc(fmt(ts.reduce(function (a, b) { return a + b; }, 0) / ts.length)) : '–') + '</td></tr>';
    }
    if (none) h += '<tr><td>' + esc(t('stats.nolevel')) + '</td><td>' + none + '</td><td></td><td></td></tr>';
    return h + '</table>' + (pending ? '<p id="lvl-wait">…</p>' : '');
  }
  var fillT = 0;
  function fillLevels(g) {
    clearTimeout(fillT);
    var cache = lvlCache(), todo = [];
    g.forEach(function (x) { var c = x.c ? E.canonicalCode(x.c) : null; if (c && cache.m[c] == null && todo.indexOf(c) < 0) todo.push(c); });
    if (!todo.length) return;
    fillT = setTimeout(function () {
      var t0 = performance.now(), i = 0;
      while (i < todo.length && performance.now() - t0 < 40) { levelForCode(todo[i], cache); i++; }
      save(KEY_LVL, cache);
      if ($('s-stats').classList.contains('on')) renderStats();
    }, 30);
  }

  /* ---------- statistics backup: export / import of a .json file ---------- */
  var EXPORT_FORMAT = 1, MAX_GAMES = 500;
  function exportStats() {
    var st = load(KEY_STATS, { games: [], started: 0 });
    var data = { app: 'stein', format: EXPORT_FORMAT, exported: new Date().toISOString(), started: st.started || st.games.length, games: st.games };
    var name = 'stein-stats-' + new Date().toISOString().slice(0, 10) + '.json';
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var file = null;
    try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
    function download() {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast(t('stats.exported'));
    }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {          // share sheet (Drive, mail, files…)
      navigator.share({ files: [file], title: name }).then(function () { toast(t('stats.exported')); }, function (err) {
        if (!err || err.name !== 'AbortError') download();    // cancelled by the user: nothing; any other failure: plain download
      });
      return;
    }
    download();
  }
  /* YYYY-MM-DD that is a real calendar day (2026-19-42 and 2026-02-30 are rejected). */
  function isRealDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) return false;
    var y = +m[1], mo = +m[2], da = +m[3], x = new Date(Date.UTC(y, mo - 1, da));
    return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === da;
  }
  /* Strict check of a file coming from outside: nothing is kept that is not a number or a date. */
  function cleanImport(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'stein' || !Array.isArray(obj.games) || obj.games.length > 5000) return null;
    var out = [];
    for (var i = 0; i < obj.games.length; i++) {
      var g = obj.games[i];
      if (!g || typeof g !== 'object') return null;
      var tm = g.t, er = g.errors, d = g.d;
      if (typeof tm !== 'number' || !isFinite(tm) || tm < 0 || tm > 86400000 * 7) return null;
      if (typeof er !== 'number' || !isFinite(er) || er < 0 || er > 100000) return null;
      if (typeof d !== 'string' || !isRealDate(d)) return null;
      var item = { t: Math.round(tm), errors: Math.round(er), d: d };
      if (g.c != null) { var cc = E.canonicalCode(g.c); if (cc === null || cc !== g.c) return null; item.c = cc; }
      out.push(item);
    }
    var started = typeof obj.started === 'number' && isFinite(obj.started) && obj.started >= 0 ? Math.min(Math.round(obj.started), 1e6) : 0;
    return { games: out, started: Math.max(started, out.length) };
  }
  function gkey(g) { return g.d + '|' + g.t + '|' + g.errors + '|' + (g.c || ''); }
  function importStats(file) {
    if (!file || file.size > 2 * 1024 * 1024) { toast(t('stats.importBad')); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var data = null;
      try { data = cleanImport(JSON.parse(String(fr.result))); } catch (e) {}
      if (!data) { toast(t('stats.importBad')); return; }
      var cur = load(KEY_STATS, { games: [], started: 0 });
      var seen = {}; cur.games.forEach(function (g) { seen[gkey(g)] = 1; });
      var fresh = data.games.filter(function (g) { return !seen[gkey(g)]; });
      function done(n) { renderStats(); toast(t('stats.importOk', { n: n })); }
      dialog(t('stats.importAsk', { n: data.games.length }), [
        [t('common.cancel')],
        [t('stats.merge'), function () {
          var games = cur.games.concat(fresh).slice(-MAX_GAMES);
          save(KEY_STATS, { games: games, started: Math.max(cur.started || 0, data.started, games.length) });
          done(fresh.length);
        }],
        [t('stats.replace'), function () {
          var games = data.games.slice(-MAX_GAMES);
          save(KEY_STATS, { games: games, started: Math.max(data.started, games.length) });
          done(games.length);
        }]
      ]);
    };
    fr.onerror = function () { toast(t('stats.importBad')); };
    fr.readAsText(file);
  }
  $('stats-export').onclick = exportStats;
  $('stats-import').onclick = function () { $('stats-file').value = ''; $('stats-file').click(); };
  $('stats-file').addEventListener('change', function () { importStats(this.files && this.files[0]); });

  function im(r, e) { return tile(r, e); }
  function imSym(id) { return symTile(id); }
  function renderHelp() {
    function fill(s) {
      return s.replace('{up}', GL.icon('up', true)).replace('{ok}', GL.icon('ok', true)).replace('{no}', GL.icon('no', true)).replace('{undo}', GL.icon('undo', true));
    }
    function ex(tiles, key) { return '<div class="ex"><span class="tiles">' + tiles + '</span><span>' + t(key) + '</span></div>'; }
    $('help-body').innerHTML =
      '<p>' + t('help.p1') + '</p><p>' + fill(t('help.p2')) + '</p><p>' + t('help.p3') + '</p>' +
      ex(im(0, 1) + imSym('near') + im(1, 3), 'help.ex1') +
      ex(im(0, 1) + imSym('side') + im(1, 3), 'help.ex2') +
      ex(im(0, 1) + im(2, 2) + im(1, 3), 'help.ex3') +
      ex(im(0, 1) + im(2, 2), 'help.ex4') +
      '<p>' + fill(t('help.p4')) + '</p><p>' + t('help.code') + '</p><p>' + t('help.keys') + '</p>';
  }

  /* ---------- language: (re)writes everything that holds text ---------- */
  function applyLang() {
    I.apply();
    renderHelp(); setModeButtons(); showCode(); showLevel();
    $('ver').textContent = t('foot.build', { v: VERSION, date: BUILD_DATE });
    if ($('s-options').classList.contains('on')) renderOptions();
    if ($('s-stats').classList.contains('on')) renderStats();
  }

  /* ---------- start-up ---------- */
  $('g-menu').innerHTML = GL.icon('menu'); $('g-undo').innerHTML = GL.icon('undo'); $('z-close').innerHTML = GL.icon('up');
  setModeButtons(); applyHand();
  applyLang();
  show('s-home');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
