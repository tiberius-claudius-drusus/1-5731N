/* ---------------------------------------------------------------------------
 * File      : 1-5731n/app.js
 * Version   : 1.0.1
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
  var VERSION = '1.0.1', BUILD_DATE = '2026-10-14';   // date as YYYY-MM-DD, shown as is at the bottom of the home screen
  var E = window.Stein, N = E.N, GL = window.SteinGlyphs, TH = window.SteinThemes, I = window.SteinI18n, t = I.t;
  var KEY_GAME = 'stein.game.v1', KEY_STATS = 'stein.stats.v1', KEY_OPT = 'stein.opt.v1';
  var $ = function (id) { return document.getElementById(id); };
  var LET = 'ABCDEF', let_ = 'abcdef';

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
    if (id === 's-home') { $('b-continue').disabled = !load(KEY_GAME, null); drawLogo(); }
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
  function dialog(text, btns) {
    $('d-text').textContent = text;
    var box = $('d-btns'); box.innerHTML = '';
    var shownAt = performance.now();   // ignore the ghost click of the last tap on the board
    btns.forEach(function (b) {
      var el = document.createElement('button'); el.textContent = b[0];
      el.onclick = function () {
        if (performance.now() - shownAt < 400) return;
        $('dialog').hidden = true; if (b[1]) b[1]();
      };
      box.appendChild(el);
    });
    $('dialog').hidden = false;
  }
  var toastT;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200);
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
  function setup(g) {
    G = g; ended = false;
    rules = G.rules.map(E.ruleFromJSON);
    pos = new E.Possibilities(G.pos);
    renderAll();
    closeZoom(); setModeButtons(); applyHand();
    show('s-game');
  }
  function newGame() {
    var g = E.genPuzzle();
    var p = new E.Possibilities();
    E.openInitial(p, g.rules);
    var st = load(KEY_STATS, { games: [], started: 0 });
    st.started = (st.started || 0) + 1; save(KEY_STATS, st);
    setup({
      solved: g.solved, rules: g.rules.map(E.ruleToJSON),
      pos: Array.prototype.slice.call(p.p), checked: [], history: [],
      elapsed: 0, errors: 0
    });
    persist();
  }
  function askNew() {
    if (load(KEY_GAME, null)) dialog(t('dlg.abandon'), [[t('dlg.no')], [t('dlg.yesNew'), newGame]]);
    else newGame();
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

  function renderBoard(errCell) {
    var b = $('board'), h = '';
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var cls = 'cell' + (errCell && errCell[0] === c && errCell[1] === r ? ' err' : ''), dat = ' data-c="' + c + '" data-r="' + r + '"';
      if (pos.isDefined(c, r)) {
        h += '<div class="' + cls + ' def"' + dat + '>' + tile(r, pos.getDefined(c, r)) + '</div>';
      } else {
        h += '<div class="' + cls + '"' + dat + '>';
        for (var e = 1; e <= N; e++) {
          h += '<div class="slot r' + r + '" data-c="' + c + '" data-r="' + r + '" data-e="' + e + '">' +
            (pos.isPossible(c, r, e) ? GL.glyph(r, e) : '') + '</div>';
        }
        h += '</div>';
      }
    }
    b.innerHTML = h;
    renderZoom();
  }

  function tile(r, e) { return '<span class="tile r' + r + '">' + GL.glyph(r, e) + '</span>'; }
  function icon(t) { return tile(t[0], t[1]); }
  function symTile(id) { return '<span class="tile sym">' + GL.hint(id) + '</span>'; }
  function renderHints() {
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
      return '<div class="' + cls + '" data-i="' + i + '">' + inner + '</div>';
    }
    // two lists: first the 3-cell clues (horizontal), below them the 2-cell ones (vertical).
    // In each list: ticked clues first (in the order they were ticked), then the others.
    var h = '';
    ['H', 'V'].forEach(function (kind) {
      var grp = items.filter(function (i) { return rules[i].show === kind; });
      var on = chk.filter(function (i) { return grp.indexOf(i) >= 0; });
      var order = on.concat(grp.filter(function (i) { return on.indexOf(i) < 0; }));
      if (order.length) h += '<div class="hgrp">' + order.map(hintHtml).join('') + '</div>';
    });
    $('hints').innerHTML = h;
  }

  $('hints').addEventListener('click', function (ev) {
    var el = ev.target.closest('.hint'); if (!el || ended) return;
    if (performance.now() - zoomShut < 450) return;      // ghost click: the zoom has just closed under the finger
    var i = +el.dataset.i, k = G.checked.indexOf(i);
    if (k >= 0) G.checked.splice(k, 1); else G.checked.push(i);
    renderHints(); play('click'); persist();
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
    renderBoard();
    if (pos.isSolved()) win(); else persist();
  }
  function undo() {
    if (ended || !G.history.length) return;
    pos.p.set(G.history.pop()); renderBoard(); persist(); play('click');
  }

  function win() {
    tick(); ended = true; stopTimer();
    var st = load(KEY_STATS, { games: [], started: 0 });
    st.games.push({ t: Math.round(G.elapsed), errors: G.errors, d: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) });
    if (st.games.length > 500) st.games.shift();
    save(KEY_STATS, st); drop(KEY_GAME);
    play('applause');
    dialog([t('win.title'), t('win.time', { time: fmt(G.elapsed) }), G.errors ? t('win.errors', { n: G.errors }) : t('win.clean')].join('\n'),
      [[t('win.menu'), function () { show('s-home'); }], [t('win.new'), newGame]]);
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
  function openZoom(c, r) {
    zoomCell = [c, r];
    $('s-game').classList.add('zooming');
    zoomEl.classList.add('on');
    fitZoom();
    renderBoard(); renderZoom();
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
    zoomCell = null; zoomEl.classList.remove('on'); $('s-game').classList.remove('zooming');
    zoomShut = performance.now();
    var s = board.querySelector('.zsel'); if (s) s.classList.remove('zsel');
  }
  function renderZoom() {
    if (!zoomCell) return;
    var c = zoomCell[0], r = zoomCell[1];
    if (ended || pos.isDefined(c, r)) { closeZoom(); return; }
    Array.prototype.forEach.call(board.querySelectorAll('.zsel'), function (x) { x.classList.remove('zsel'); });
    var cur = board.querySelector('.cell[data-c="' + c + '"][data-r="' + r + '"]'); if (cur) cur.classList.add('zsel');
    var h = '';
    for (var e = 1; e <= N; e++) {
      h += '<div class="zslot" data-c="' + c + '" data-r="' + r + '" data-e="' + e + '">' +
        (pos.isPossible(c, r, e) ? tile(r, e) : '') + '</div>';
    }
    zbox.innerHTML = h;
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

  /* ---------- barre ---------- */
  $('g-undo').onclick = undo;
  function setModeButtons() {
    var ex = opt.mode !== 'choose';
    $('g-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('g-mode').classList.toggle('excl', ex);
    $('z-mode').innerHTML = GL.icon(ex ? 'no' : 'ok');
    $('z-mode').classList.toggle('excl', ex);
    $('zcap').innerHTML = t(ex ? 'cap.excl' : 'cap.choose');
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
    setModeButtons();
    if (!zoomCell) toast(I.plain(t(opt.mode === 'choose' ? 'cap.choose' : 'cap.excl')));
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
      }).join('') + '</select></div>';
  }
  $('opt-body').addEventListener('change', function (ev) {
    if (ev.target.id === 'opt-lang') { curLang = opt.lang = I.set(ev.target.value); save(KEY_OPT, opt); applyLang(); }
  });
  $('opt-body').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var k = b.parentNode.dataset.k, v = b.dataset.v;
    if (k === 'sound') { opt.sound = v === 'on'; save(KEY_OPT, opt); play('click'); }
    else if (k === 'theme') setLook(v, opt.variant);
    else if (k === 'variant') setLook(opt.theme, v);
    renderOptions();
  });
  $('b-options').onclick = function () { renderOptions(); show('s-options'); history.pushState({}, ''); };

  /* ---------- accueil, aide, stats ---------- */
  $('b-new').onclick = askNew;
  $('b-continue').onclick = function () { var g = load(KEY_GAME, null); if (g) setup(g); };
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
      '<tr><td>' + t('stats.started') + '</td><td>' + (st.started || g.length) + '</td></tr>' +
      '<tr><td>' + t('stats.best') + '</td><td>' + fmt(Math.min.apply(null, ts)) + '</td></tr>' +
      '<tr><td>' + t('stats.avg') + '</td><td>' + fmt(avg) + '</td></tr>' +
      '<tr><td>' + t('stats.clean') + '</td><td>' + clean + '</td></tr></table><h3>' + t('stats.last') + '</h3><table>';
    g.slice(-10).reverse().forEach(function (x) {
      h += '<tr><td>' + fmtDate(x.d) + '</td><td>' + (x.errors ? t('stats.err', { n: x.errors }) : '') + '</td><td>' + fmt(x.t) + '</td></tr>';
    });
    $('stats-body').innerHTML = h + '</table>';
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
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
      out.push({ t: Math.round(tm), errors: Math.round(er), d: d });
    }
    var started = typeof obj.started === 'number' && isFinite(obj.started) && obj.started >= 0 ? Math.min(Math.round(obj.started), 1e6) : 0;
    return { games: out, started: Math.max(started, out.length) };
  }
  function gkey(g) { return g.d + '|' + g.t + '|' + g.errors; }
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
      '<p>' + fill(t('help.p4')) + '</p>';
  }

  /* ---------- language: (re)writes everything that holds text ---------- */
  function applyLang() {
    I.apply();
    renderHelp(); setModeButtons();
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
