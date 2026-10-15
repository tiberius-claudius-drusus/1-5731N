/* ---------------------------------------------------------------------------
 * File      : 1-5731n/app.js
 * Version   : 1.4.1
 * Role      : Application: screens (home, game, help, options, statistics), board and zoom panel, column mode, clues, undo, timer, sounds, options, statistics export/import.
 * Depends on: engine.js, glyphs.js, themes.js, i18n.js, lang/*.js, logo.js
 * Called by : index.html (script tag, last)
 * Produces  : localStorage keys stein.game.v1 / stein.stats.v1 / stein.opt.v1 ; registers sw.js
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * 1-5731N user interface (PWA). Engine: engine.js (port of Einstein Puzzle, GPL v2+).
 */
(function () {
  'use strict';
  var VERSION = '1.4.1', BUILD_DATE = '2026-10-16';   // date as YYYY-MM-DD, shown as is at the bottom of the home screen
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
  /* History: while a screen other than the home is open there is exactly ONE extra history entry (pushed), so that the Back button of
   * the phone returns to the home first and only then leaves the application; the on-screen back buttons remove that entry too. */
  var pushed = false;
  function show(id) {
    if (id !== 's-game') { colReset(); if (lift) { lift = null; hpStop(); } }
    if (id === 's-home') { if (pushed) { pushed = false; if (zoomCell) closeZoom(); history.back(); } }
    else if (!pushed) { pushed = true; history.pushState({}, ''); }
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
  /* the reserve is { s: scale version, <level>: [codes] }: a reserve made under another scale of levels (or before 1.3.1, which did not write it) is dropped */
  function poolLoad() {
    var p = load(KEY_POOL, null);
    return p && typeof p === 'object' && !Array.isArray(p) && p.s === E.SCALE_VERSION ? p : { s: E.SCALE_VERSION };
  }
  /* a puzzle of the level: first one made in the background on this device, then the packs (not played yet), else one searched for in
   * slices of 30 ms (the interface stays usable; at most 2.5 s), else a puzzle already played. cb(code) gets null if the level is empty. */
  var searching = false;
  function codeForLevel(level, cb) {
    var played = playedSet(), pool = poolLoad(), list = Array.isArray(pool[level]) ? pool[level] : [];
    while (list.length) {
      var c = list.shift();
      if (typeof c === 'string' && E.canonicalCode(c) === c && !played[c]) { pool[level] = list; save(KEY_POOL, pool); cb(c); return; }
    }
    pool[level] = list; save(KEY_POOL, pool);
    var code = LIB.pickVerified(level, played, null, function (c) {      // the level written in a pack is not trusted: grade the puzzle
      try { var g = E.genPuzzle(c); return E.gradeOf(g.solved, g.rules).level; } catch (e) { return -1; }
    });
    if (code && !played[code]) { cb(code); return; }
    if (searching) return;                                       // a search is already running: the tap is ignored
    searching = true; toast(t('new.searching'));                 // library exhausted for this level: search for one (a short while)
    var t0 = performance.now();
    (function step() {
      var s0 = performance.now(), found = null, failed = false;
      while (!found && !failed && performance.now() - s0 < 30) {
        try {
          var g = E.genPuzzle();
          if (E.gradeOf(g.solved, g.rules).level === level && !played[g.code]) found = g.code;
        } catch (e) { failed = true; }                           // generation failed (bounded loops): give up on this level
      }
      if (found || failed || performance.now() - t0 > 2500) { searching = false; cb(found || code); return; }   // code may be null (empty level, nothing found)
      setTimeout(step, 0);
    })();
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
  function lvlCache() {                                         // entries are checked: a level is an integer from -1 (unknown) to 4
    var c = load(KEY_LVL, null), m = {};
    if (!c || c.s !== E.SCALE_VERSION || !c.m || typeof c.m !== 'object' || Array.isArray(c.m)) return { s: E.SCALE_VERSION, m: m };
    Object.keys(c.m).forEach(function (k) { var v = c.m[k]; if (E.canonicalCode(k) === k && Number.isInteger(v) && v >= -1 && v < E.LEVEL_COUNT) m[k] = v; });
    return { s: E.SCALE_VERSION, m: m };
  }
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
    colReset(); lift = null;
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
        codeForLevel(l, function (code) { if (code) startPuzzle(code); else toast(t('new.noPuzzle')); });
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
      var cls = 'cell' + (errCell && errCell[0] === c && errCell[1] === r ? ' err' : '') + (colMode ? (colMode.cols.indexOf(c) >= 0 ? ' csel' : '') + (r === colMode.row ? ' crow' : '') : ''), dat = ' data-c="' + c + '" data-r="' + r + '"';
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
  /* Order of the clues of one list ('H' three cells, 'V' two cells): the order the player gave them (G.order, saved with the game),
   * else the order of the generator. A ticked clue stays where it is (it is only greyed). */
  function orderFor(kind) {
    var natural = hintItems().filter(function (i) { return rules[i].show === kind; }), o = G.order && G.order[kind];
    if (Array.isArray(o) && o.length === natural.length && natural.every(function (i) { return o.indexOf(i) >= 0; })) return o.slice();
    return natural;
  }
  function renderHints() {
    var fa = document.activeElement, fi = fa && fa.classList && fa.classList.contains('hint') ? +fa.dataset.i : -1;
    var chk = G.checked;
    function hintHtml(i) {
      var r = rules[i], done = chk.indexOf(i) >= 0, inner = '', cls = 'hint' + (done ? ' done' : '') + (lift && lift.i === i ? ' lifted' : '');
      switch (r.t) {
        case 'near': inner = icon(r.a) + symTile('near') + icon(r.b); break;
        case 'dir': inner = icon(r.a) + symTile('side') + icon(r.b); break;
        case 'between': inner = icon(r.a) + icon(r.c) + icon(r.b); break;
        case 'under': inner = icon(r.a) + icon(r.b); cls += ' v'; break;
      }
      return '<div class="' + cls + '" data-i="' + i + '" data-kind="' + r.show + '" role="button" tabindex="0" aria-pressed="' + (done ? 'true' : 'false') + '" aria-label="' + esc(clueLabel(r)) + '">' + inner + '</div>';
    }
    // two lists: first the 3-cell clues (horizontal), below them the 2-cell ones (vertical)
    var h = '';
    ['H', 'V'].forEach(function (kind) {
      var order = orderFor(kind);
      if (order.length) h += '<div class="hgrp' + (lift && lift.kind === kind ? ' lifting' : '') + '" data-kind="' + kind + '" role="group" aria-label="' + esc(t('a11y.hints')) + '">' + order.map(hintHtml).join('') + '</div>';
    });
    $('hints').innerHTML = h;
    if (fi >= 0) { var hf = $('hints').querySelector('.hint[data-i="' + fi + '"]'); if (hf) hf.focus(); }
  }

  function toggleHint(el) {
    var i = +el.dataset.i, k = G.checked.indexOf(i);
    if (k >= 0) G.checked.splice(k, 1); else G.checked.push(i);
    renderHints(); play('click'); persist();
  }

  /* ---------- reordering the clues ----------
   * A long press on a clue lifts it. Then either keep the finger down and drag it (the others make room), or lift the finger and touch the
   * clue whose place it should take (the empty space after the last one = last place); touching it again cancels. Each list keeps its own
   * order (G.order, saved with the game). Keyboard: Shift+Enter lifts, arrows move, Enter puts down, Escape cancels. */
  var lift = null;                                              // { i: rule index, kind: 'H' | 'V', start: [order before], moved: bool }
  var hp = null, hintSuppress = false;                          // press in progress on a clue
  function setOrder(kind, arr) {
    if (!G.order) G.order = { H: orderFor('H'), V: orderFor('V') };
    G.order[kind] = arr;
  }
  function liftStart(i) {
    if (ended || colMode || zoomCell || lift) return;
    var el = $('hints').querySelector('.hint[data-i="' + i + '"]'); if (!el) return;
    lift = { i: i, kind: rules[i].show, start: orderFor(rules[i].show), moved: false };
    el.classList.add('lifted'); el.parentNode.classList.add('lifting');       // no redraw: the touched element must stay in the page
    toast(t('hint.lift'));
  }
  /* moves the lifted clue to position idx of its list (the others shift) */
  function liftMoveTo(idx) {
    var o = orderFor(lift.kind), from = o.indexOf(lift.i);
    idx = Math.max(0, Math.min(o.length - 1, idx));
    if (from < 0 || from === idx) return;
    o.splice(from, 1); o.splice(idx, 0, lift.i); setOrder(lift.kind, o); lift.moved = true;
    var grp = $('hints').querySelector('.hgrp[data-kind="' + lift.kind + '"]'), el = grp.querySelector('.hint[data-i="' + lift.i + '"]');
    var next = idx + 1 < o.length ? grp.querySelector('.hint[data-i="' + o[idx + 1] + '"]') : null;
    grp.insertBefore(el, next);
  }
  /* is the point after the last clue of the list (rest of its last row, or below)? Only there does "empty space" mean "last place":
   * the gaps between the columns of the grid must not move a clue by accident. */
  function inEndZone(grp, x, y) {
    var last = grp.lastElementChild; if (!last) return true;
    var r = last.getBoundingClientRect();
    return y > r.bottom || (y >= r.top && x > r.right);
  }
  function liftEnd(commit) {
    if (!lift) return;
    var l = lift; lift = null;
    if (!commit && l.moved) setOrder(l.kind, l.start);
    renderHints();
    if (commit && l.moved) { persist(); play('click'); say(t('hint.moved', { n: orderFor(l.kind).indexOf(l.i) + 1 })); }
  }
  function hpStop() {
    if (hp) clearTimeout(hp.t);
    hp = null;
    window.removeEventListener('pointermove', hpMove); window.removeEventListener('pointerup', hpEnd); window.removeEventListener('pointercancel', hpEnd);
  }
  function hpMove(ev) {
    if (!hp) return;
    if (!lift) { if (Math.hypot(ev.clientX - hp.x, ev.clientY - hp.y) > 14) hpStop(); return; }   // the finger moved before the long press: it is a scroll
    var under = document.elementFromPoint(ev.clientX, ev.clientY); if (!under) return;
    var el = under.closest('.hint'), grp = under.closest('.hgrp');
    if (el && el.dataset.kind === lift.kind && +el.dataset.i !== lift.i) liftMoveTo(orderFor(lift.kind).indexOf(+el.dataset.i));
    else if (!el && grp && grp.dataset.kind === lift.kind && inEndZone(grp, ev.clientX, ev.clientY)) liftMoveTo(1e9);
  }
  function hpEnd() {
    var dragged = hp && hp.lifted && lift && lift.moved;
    hpStop();
    if (dragged) liftEnd(true);                                  // dropped after a drag; without a drag the clue stays lifted, waiting for a touch
  }
  $('hints').addEventListener('pointerdown', function (ev) {
    hintSuppress = false;
    if (ended || lift || colMode || ev.button) return;
    var el = ev.target.closest('.hint'); if (!el) return;
    hp = { x: ev.clientX, y: ev.clientY, i: +el.dataset.i, lifted: false };
    var me = hp;
    me.t = setTimeout(function () { if (hp !== me) return; liftStart(me.i); me.lifted = !!lift; hintSuppress = true; if (navigator.vibrate) navigator.vibrate(15); }, 500);
    window.addEventListener('pointermove', hpMove); window.addEventListener('pointerup', hpEnd); window.addEventListener('pointercancel', hpEnd);
  });
  document.addEventListener('touchmove', function (ev) { if (lift && hp) ev.preventDefault(); }, { passive: false });   // dragging a clue does not scroll the list
  $('hints').addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  $('hints').addEventListener('click', function (ev) {
    if (ended) return;
    if (hintSuppress) { hintSuppress = false; return; }          // the release of the long press that lifted the clue
    var el = ev.target.closest('.hint');
    if (lift) {                                                  // a clue is lifted: this touch says where it goes
      var grp = ev.target.closest('.hgrp');
      if (el && +el.dataset.i === lift.i) liftEnd(false);
      else if (el && el.dataset.kind === lift.kind) { liftMoveTo(orderFor(lift.kind).indexOf(+el.dataset.i)); liftEnd(true); }
      else if (!el && grp && grp.dataset.kind === lift.kind) { if (inEndZone(grp, ev.clientX, ev.clientY)) { liftMoveTo(1e9); liftEnd(true); } }   // a gap between two columns: nothing happens
      else liftEnd(false);
      return;
    }
    if (!el) return;
    if (performance.now() - zoomShut < 450) return;      // ghost click: the zoom has just closed under the finger
    toggleHint(el);
  });
  $('hints').addEventListener('keydown', function (ev) {
    var el = ev.target.closest && ev.target.closest('.hint');
    if (!el || ended) return;
    var i = +el.dataset.i;
    if (lift) {
      if (lift.i !== i) return;
      var d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[ev.key];
      if (d) { ev.preventDefault(); var o = orderFor(lift.kind); liftMoveTo(o.indexOf(i) + d); el.focus(); }
      else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); liftEnd(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); liftEnd(false); }
      return;
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (ev.shiftKey) liftStart(i); else toggleHint(el);
    }
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
    if (colMode) colExit();
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
    if (lpSuppress) { lpSuppress = false; return; }         // the release of a long press that started the column mode
    var cell = ev.target.closest('.cell');
    if (colMode) { if (cell) colToggle(+cell.dataset.c); return; }
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
    if (lift) liftEnd(false);
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
    if (!zoomCell && !colMode) return;
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
    if (colMode) { if (ended) colExit(); else renderCol(); return; }
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
  $('z-close').onclick = function () { if (colMode) colExit(); else closeZoom(); };

  var press = null;
  zbox.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  zbox.addEventListener('pointerdown', function (ev) {
    var s = ev.target.closest('.zslot'); if (!s || !s.querySelector('svg')) return;
    if (colMode) {                                          // column mode: a tap on a tile that is possible in every column excludes it from all of them
      if (ev.button === 2 || s.classList.contains('dis')) return;
      press = { e: +s.dataset.e, long: false, x: ev.clientX, y: ev.clientY }; s.classList.add('pr'); return;
    }
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
    if (ev.type === 'pointerup' && !p.long) { if (colMode) colExclude(p.e); else doMove(opt.mode === 'choose' ? 'set' : 'excl', p.c, p.r, p.e); }
  }
  zbox.addEventListener('pointerup', endPress);
  zbox.addEventListener('pointercancel', endPress);
  function doMove(kind, c, r, e) { lastMove = performance.now(); move(kind, c, r, e); }

  /* ---------- column mode: exclude one symbol from several columns at once ----------
   * Entered from a cell that is not solved (long press on a touch screen, double-click with a mouse, key C): that cell's row becomes the
   * working row, its column is selected and the zoom panel opens with the usual three side buttons (the choose/exclude switch is greyed:
   * the mode is exclude). Touching a cell adds or removes its column; a column whose cell in the working row is already solved cannot be
   * selected. The panel shows the six symbols of the row, greyed and disabled unless possible in EVERY selected column; a tap on one
   * excludes it from all the selected columns at once, directly (one undo step; if it removes the true answer anywhere, the whole move is
   * refused and counted as an error). The game is left in exclude mode. */
  var colMode = null;                                          // { row, cols: [selected columns] }
  var lp = null, lpSuppress = false, lastPtr = '';             // long press on the board
  function colList() { return colMode.cols.map(function (c) { return c + 1; }).join(', '); }
  function colEnter(c, r) {
    if (ended || !G || pos.isDefined(c, r)) return;
    if (lift) liftEnd(false);
    closeZoom();
    colMode = { row: r, cols: [c] }; focusCell = [c, r];
    if (opt.mode !== 'excl') { opt.mode = 'excl'; save(KEY_OPT, opt); }
    setModeButtons();
    $('s-game').classList.add('zooming'); zoomEl.classList.add('on'); fitZoom();
    renderBoard();
    say(t('col.enter', { r: r + 1, c: c + 1 }));
  }
  function colReset() {                                        // leaves the column mode without redrawing the board
    if (!colMode) return;
    colMode = null;
    zoomEl.classList.remove('on'); $('s-game').classList.remove('zooming'); zbox.innerHTML = '';
    $('z-mode').disabled = false;
    setModeButtons();
  }
  function colExit() {
    var had = zoomEl.contains(document.activeElement);
    colReset(); zoomShut = performance.now();
    renderBoard();
    if (had) focusBoardCell(focusCell[0], focusCell[1]);
  }
  function colToggle(c) {
    if (!colMode) return;
    if (pos.isDefined(c, colMode.row)) { toast(t('col.known', { c: c + 1 })); return; }
    var i = colMode.cols.indexOf(c);
    if (i >= 0) colMode.cols.splice(i, 1); else { colMode.cols.push(c); colMode.cols.sort(); }
    renderBoard(); say(colMode.cols.length ? colList() : t('col.none'));
  }
  function colTileOk(e) { return colMode.cols.every(function (c) { return pos.isPossible(c, colMode.row, e); }); }
  function renderCol() {                                       // content of the zoom panel: the six symbols of the working row
    var m = colMode, r = m.row, h = '', e, anyOk = false, list = m.cols.length ? colList() : '–';
    var fa = document.activeElement, fe = zbox.contains(fa) && fa.dataset ? +fa.dataset.e : 0;
    for (e = 1; e <= N; e++) {                                   // greyed (and disabled) unless possible in EVERY selected column
      var ok = m.cols.length > 0 && colTileOk(e); if (ok) anyOk = true;
      h += '<div class="zslot' + (ok ? '' : ' dis') + '" data-e="' + e + '"' + (ok ? ' role="button" tabindex="0" aria-label="' + esc(symName(r, e)) + '"' : ' aria-hidden="true"') + '>' + tile(r, e) + '</div>';
    }
    $('z-mode').disabled = true;                                 // the choose/exclude switch is greyed: this mode only excludes
    $('zcap').textContent = anyOk || !m.cols.length ? t('col.act', { list: list }) : t('col.none');
    zbox.innerHTML = h;
    if (fe) { var f = zbox.querySelector('.zslot[data-e="' + fe + '"][tabindex]') || zbox.querySelector('.zslot[tabindex]'); if (f) f.focus(); }
  }
  function colExclude(e) {
    var m = colMode; if (!m || ended || !colTileOk(e)) return;
    var r = m.row, cols = m.cols.slice(), before = Array.prototype.slice.call(pos.p);
    cols.forEach(function (c) { if (pos.isPossible(c, r, e)) pos.exclude(c, r, e); });
    if (!pos.isValid(G.solved)) {                               // one of the columns holds the true answer: nothing is changed
      pos.p.set(before); G.errors++;
      play('glasbk2'); toast(t('toast.error'));
      renderBoard([cols[0], r]);
      setTimeout(function () { renderBoard(); }, 700);
      persist(); return;
    }
    G.history.push(before); if (G.history.length > 300) G.history.shift();
    play('whizz'); say(t('col.done', { sym: symName(r, e), n: cols.length }));
    m.cols = m.cols.filter(function (c) { return !pos.isDefined(c, r); });   // a column that became solved leaves the selection
    renderBoard();
    if (pos.isSolved()) { win(); return; }
    if (!m.cols.length) colExit();
    persist();
  }
  function colKey(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var s = ev.target.closest && ev.target.closest('.zslot'), k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); colExit(); return; }
    if (/^[1-6]$/.test(k)) { ev.preventDefault(); colExclude(+k); return; }
    if (s && (k === 'Enter' || k === ' ')) { ev.preventDefault(); colExclude(+s.dataset.e); return; }
    var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[k];
    if (s && d) {
      ev.preventDefault();
      for (var e = +s.dataset.e + d; e >= 1 && e <= N; e += d) { var g = zbox.querySelector('.zslot[data-e="' + e + '"][tabindex]'); if (g) { g.focus(); break; } }
    }
  }
  board.addEventListener('pointerdown', function (ev) {         // long press (finger or pen) starts the column mode
    lastPtr = ev.pointerType; lpSuppress = false;
    if (ended || colMode || ev.pointerType === 'mouse' || ev.button) return;
    var cell = ev.target.closest('.cell'); if (!cell || cell.classList.contains('def')) return;
    var c = +cell.dataset.c, r = +cell.dataset.r;
    lp = { x: ev.clientX, y: ev.clientY };
    lp.t = setTimeout(function () { lp = null; lpSuppress = true; if (navigator.vibrate) navigator.vibrate(15); colEnter(c, r); }, 500);
  });
  board.addEventListener('pointermove', function (ev) {
    if (lp && Math.hypot(ev.clientX - lp.x, ev.clientY - lp.y) > 14) { clearTimeout(lp.t); lp = null; }
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { board.addEventListener(n, function () { if (lp) { clearTimeout(lp.t); lp = null; } }); });
  board.addEventListener('dblclick', function (ev) {            // mouse: double-click (touch screens use the long press)
    if (ended || colMode || lastPtr !== 'mouse') return;
    var cell = ev.target.closest('.cell'); if (!cell || cell.classList.contains('def')) return;
    colEnter(+cell.dataset.c, +cell.dataset.r);
  });

  /* ---------- keyboard (desktop) ---------- */
  function other(kind) { return kind === 'set' ? 'excl' : 'set'; }
  function modeKind() { return opt.mode === 'choose' ? 'set' : 'excl'; }
  board.addEventListener('keydown', function (ev) {
    var cell = ev.target.closest && ev.target.closest('.cell'); if (!cell || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var c = +cell.dataset.c, r = +cell.dataset.r, nc = c, nr = r;
    if (colMode) {                                             // column mode: Space adds/removes the column, 1-6 exclude a symbol
      if (ev.key === ' ') { ev.preventDefault(); colToggle(c); return; }
      if (ev.key === 'Enter') { ev.preventDefault(); return; }
      if (/^[1-6]$/.test(ev.key)) { ev.preventDefault(); colExclude(+ev.key); return; }
    }
    if (/^[1-6]$/.test(ev.key)) { ev.preventDefault(); if (!ended && !cell.classList.contains('def')) doMove(modeKind(), c, r, +ev.key); return; }
    switch (ev.key) {
      case 'ArrowLeft': nc = Math.max(0, c - 1); break;
      case 'ArrowRight': nc = Math.min(N - 1, c + 1); break;
      case 'ArrowUp': nr = Math.max(0, r - 1); break;
      case 'ArrowDown': nr = Math.min(N - 1, r + 1); break;
      case 'Home': nc = 0; break;
      case 'End': nc = N - 1; break;
      case 'c': case 'C':
        ev.preventDefault(); if (!ended && !colMode && !cell.classList.contains('def')) colEnter(c, r); return;
      case 'Enter': case ' ':
        ev.preventDefault(); if (!ended && !cell.classList.contains('def')) openZoom(c, r, true); return;
      default: return;
    }
    ev.preventDefault(); focusBoardCell(nc, nr);
  });
  zoomEl.addEventListener('keydown', function (ev) {
    if (colMode) { colKey(ev); return; }
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
    else if (k === 'Escape') { if (lift) liftEnd(false); else if (colMode) colExit(); else if (zoomCell) closeZoom(); else $('g-menu').click(); }
  });

  /* ---------- barre ---------- */
  $('g-undo').onclick = undo;
  function setModeButtons() {
    var ex = opt.mode !== 'choose';
    $('g-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('g-mode').classList.toggle('excl', ex); $('g-mode').classList.toggle('chs', !ex);
    $('z-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('z-mode').classList.toggle('excl', ex); $('z-mode').classList.toggle('chs', !ex);
    $('zcap').innerHTML = t(ex ? 'cap.excl' : 'cap.choose');   // in the zoom panel: what a press on a symbol does
    $('gcap').innerHTML = t('cap.board');                       // under the board: what a press on a cell does
  }
  function applyHand() {
    var left = opt.hand === 'left';
    $('zrow').classList.toggle('lefty', left);
    // the arrow shows where the buttons will go at the next tap
    $('z-hand').innerHTML = GL.icon(left ? 'right' : 'left');
  }
  function toggleHand() { opt.hand = opt.hand === 'left' ? 'right' : 'left'; save(KEY_OPT, opt); applyHand(); fitZoom(); }
  function toggleMode() {
    if (colMode) return;
    opt.mode = opt.mode === 'choose' ? 'excl' : 'choose'; save(KEY_OPT, opt);
    setModeButtons(); say($('zcap').textContent);
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
    var previous = savedPacks.filter(function (p) { return p.id === r.pack.id; })[0];       // same id: the older version must survive a failed write
    savedPacks = savedPacks.filter(function (p) { return p.id !== r.pack.id; }); savedPacks.push(r.pack);
    if (!writePacks()) {
      savedPacks.pop();
      if (previous) { savedPacks.push(previous); LIB.install(previous); } else LIB.remove(r.pack.id);
      toast(t('packs.bad')); return;
    }
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
  $('b-options').onclick = function () { renderOptions(); show('s-options'); loadAvail(); };

  /* ---------- accueil, aide, stats ---------- */
  $('b-new').onclick = askNew;
  /* The saved game, or null: a save that fails the strict check (truncated, edited, from another version) is dropped. */
  function loadGame() {
    var g = load(KEY_GAME, null);
    if (g && !E.validGame(g)) { drop(KEY_GAME); g = null; }
    return g;
  }
  $('b-continue').onclick = function () { var g = loadGame(); if (g) setup(g); else $('b-continue').disabled = true; };
  $('b-help').onclick = function () { show('s-help'); };
  $('b-stats').onclick = function () { renderStats(); show('s-stats'); };
  Array.prototype.forEach.call(document.querySelectorAll('.back'), function (b) { b.onclick = function () { show('s-home'); }; });
  window.addEventListener('popstate', function () {
    if (colMode || zoomCell) { if (colMode) colExit(); else closeZoom(); history.pushState({}, ''); return; }   // Back closes the column mode or the zoom first; the entry is put back
    pushed = false;                                                            // the browser has just removed our entry
    if ($('s-game').classList.contains('on')) goHome(); else show('s-home');
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
  function isRealDate(d) { return E.validDate(d); }
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
  /* link to the translation-correction form of the GitHub project, already filled with the current language and version */
  function translateUrl() {
    return 'https://github.com/tiberius-claudius-drusus/1-5731N/issues/new?template=translation.yml&language=' + encodeURIComponent(I.lang) +
      '&title=' + encodeURIComponent('[translation] ' + I.lang + ' (v' + VERSION + ') ');
  }
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
      '<p>' + fill(t('help.p4')) + '</p><p>' + t('help.code') + '</p><p>' + t('help.cols') + '</p><p>' + t('help.reorder') + '</p><p>' + t('help.keys') + '</p>' +
      '<p class="helplink"><a href="' + esc(translateUrl()) + '" target="_blank" rel="noopener noreferrer">' + esc(t('help.translate')) + '</a></p>';
  }

  /* ---------- language: (re)writes everything that holds text ---------- */
  function applyLang() {
    I.apply();
    renderHelp(); setModeButtons(); showCode(); showLevel(); if (colMode) renderCol();
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
