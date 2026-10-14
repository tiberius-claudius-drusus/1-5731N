/* ---------------------------------------------------------------------------
 * File      : 1-5731n/engine.js
 * Version   : 1.0.3
 * Role      : Game engine: puzzle generator, deduction solver and the five clue rules (near, direction, open, under, between).
 * Depends on: none (plain JavaScript; also loadable by Node for tests)
 * Called by : app.js (browser, window.Stein) ; test_engine.js (Node, module.exports)
 * Produces  : window.Stein : N, Possibilities, genPuzzle, openInitial, canSolve, hintsQty, ruleToJSON, ruleFromJSON, validGame
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * JavaScript port of puzgen.cpp / rules.cpp from "Einstein Puzzle" 2.0
 * (c) 2003-2005 Alexander Babichev / Flowix - GNU GPL v2 or later.
 * Elements: 1..6 ; rows (types): 0..5 ; columns: 0..5.
 */
(function (root) {
  'use strict';
  var N = 6;

  /* ---------- Puzzle code ----------
   * A puzzle is generated from a seed, so that a short code gives the same puzzle back: "VV-AAAA-AAAA" = generator
   * version (2 digits) + seed (8 characters of the alphabet below, 40 bits). The single source of randomness of the
   * generator is rnd(); inside genPuzzle(code) it is fed by a seeded generator (integer arithmetic only: same
   * sequence in every JavaScript engine). The version tells WHICH generation algorithm the seed belongs to: if the
   * algorithm ever changes, give it a new number and keep the old one callable, otherwise old codes would give other puzzles. */
  var CODE_VERSION = 1;
  var CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';       // Crockford base32: no I, L, O, U (no look-alikes)
  var rng = Math.random;                                         // replaced by the seeded generator while a puzzle is generated

  function rnd(n) { return Math.floor(rng() * n); }

  function cyrb128(str) {                                        // string -> four 32-bit words (public domain, bryc)
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }
  function seeded(text) {                                        // sfc32 generator, values in [0, 1)
    var w = cyrb128(text), a = w[0], b = w[1], c = w[2], d = w[3];
    function next() {
      var t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
      t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    }
    for (var i = 0; i < 15; i++) next();                         // warm-up
    return next;
  }
  function randomSeed() {
    var out = '', buf = null;
    try { buf = new Uint8Array(8); (root.crypto || {}).getRandomValues(buf); } catch (e) { buf = null; }
    for (var i = 0; i < 8; i++) out += CODE_ALPHABET.charAt((buf ? buf[i] : Math.floor(Math.random() * 32)) & 31);
    return out;
  }
  function formatCode(version, seed) { return (version < 10 ? '0' : '') + version + '-' + seed.slice(0, 4) + '-' + seed.slice(4); }
  /* "01-7K3F-9A2Q" (also lower case, without dashes, with spaces; O read as 0, I and L as 1) -> { version, seed } or null */
  function parseCode(text) {
    var s = String(text == null ? '' : text).toUpperCase().replace(/[\s\-_.]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (!/^[0-9]{2}[0-9A-Z]{8}$/.test(s)) return null;
    var seed = s.slice(2);
    for (var i = 0; i < 8; i++) if (CODE_ALPHABET.indexOf(seed.charAt(i)) < 0) return null;
    var version = +s.slice(0, 2);
    return version === CODE_VERSION ? { version: version, seed: seed } : null;     // only the generator versions we still have
  }

  /* ---------- Possibilities ---------- */
  function Possibilities(src) {
    // p[(col*N + row)*N + (el-1)] = 1 if element el is still possible
    this.p = new Uint8Array(N * N * N);
    if (src) this.p.set(src); else this.p.fill(1);
  }
  Possibilities.prototype.clone = function () { return new Possibilities(this.p); };
  Possibilities.prototype.idx = function (col, row, el) { return (col * N + row) * N + (el - 1); };
  Possibilities.prototype.isPossible = function (col, row, el) { return this.p[this.idx(col, row, el)] === 1; };

  Possibilities.prototype.checkSingles = function (row) {
    for (;;) {
      var cellsCnt = [0, 0, 0, 0, 0, 0], elsCnt = [0, 0, 0, 0, 0, 0];
      var elements = [0, 0, 0, 0, 0, 0], elCells = [0, 0, 0, 0, 0, 0];
      var col, i, el;
      for (col = 0; col < N; col++)
        for (i = 0; i < N; i++)
          if (this.p[(col * N + row) * N + i]) {
            elsCnt[i]++; elCells[i] = col; cellsCnt[col]++; elements[col] = i + 1;
          }
      var changed = false;
      for (col = 0; col < N; col++) {
        if (cellsCnt[col] === 1 && elsCnt[elements[col] - 1] !== 1) {
          var e = elements[col] - 1;
          for (i = 0; i < N; i++) if (i !== col) this.p[(i * N + row) * N + e] = 0;
          changed = true;
        }
      }
      for (el = 0; el < N; el++) {
        if (elsCnt[el] === 1 && cellsCnt[elCells[el]] !== 1) {
          col = elCells[el];
          for (i = 0; i < N; i++) if (i !== el) this.p[(col * N + row) * N + i] = 0;
          changed = true;
        }
      }
      if (!changed) return;
    }
  };

  Possibilities.prototype.exclude = function (col, row, el) {
    if (!this.isPossible(col, row, el)) return;
    this.p[this.idx(col, row, el)] = 0;
    this.checkSingles(row);
  };

  Possibilities.prototype.set = function (col, row, el) {
    var i;
    for (i = 0; i < N; i++) this.p[(col * N + row) * N + i] = (i === el - 1) ? 1 : 0;
    for (var j = 0; j < N; j++) if (j !== col) this.p[(j * N + row) * N + (el - 1)] = 0;
    this.checkSingles(row);
  };

  Possibilities.prototype.count = function (col, row) {
    var c = 0;
    for (var i = 0; i < N; i++) c += this.p[(col * N + row) * N + i];
    return c;
  };
  Possibilities.prototype.isDefined = function (col, row) { return this.count(col, row) === 1; };
  Possibilities.prototype.getDefined = function (col, row) {
    for (var i = 0; i < N; i++) if (this.p[(col * N + row) * N + i]) return i + 1;
    return 0;
  };
  Possibilities.prototype.isSolved = function () {
    for (var c = 0; c < N; c++) for (var r = 0; r < N; r++) if (!this.isDefined(c, r)) return false;
    return true;
  };
  Possibilities.prototype.isValid = function (puzzle) {
    for (var r = 0; r < N; r++)
      for (var c = 0; c < N; c++)
        if (!this.isPossible(c, r, puzzle[r][c])) return false;
    return true;
  };

  /* ---------- Rules ---------- */
  function Near(a, b) { this.t = 'near'; this.a = a; this.b = b; }   // a,b = [row, element]
  Near.prototype.show = 'H';
  Near.prototype.key = function () { return 'near' + this.a + '|' + this.b; };
  Near.prototype.applyToCol = function (pos, col, nr, nn, tr, tn) {
    var hasLeft = col === 0 ? false : pos.isPossible(col - 1, nr, nn);
    var hasRight = col === N - 1 ? false : pos.isPossible(col + 1, nr, nn);
    if (!hasRight && !hasLeft && pos.isPossible(col, tr, tn)) { pos.exclude(col, tr, tn); return true; }
    return false;
  };
  Near.prototype.apply = function (pos) {
    var any = false, changed;
    do {
      changed = false;
      for (var i = 0; i < N; i++) {
        if (this.applyToCol(pos, i, this.a[0], this.a[1], this.b[0], this.b[1])) changed = true;
        if (this.applyToCol(pos, i, this.b[0], this.b[1], this.a[0], this.a[1])) changed = true;
      }
      if (changed) any = true;
    } while (changed);
    return any;
  };

  function Dir(a, b) { this.t = 'dir'; this.a = a; this.b = b; }     // a is to the left of b
  Dir.prototype.show = 'H';
  Dir.prototype.key = function () { return 'dir' + this.a + '|' + this.b; };
  Dir.prototype.apply = function (pos) {
    var changed = false, i;
    for (i = 0; i < N; i++) {
      if (pos.isPossible(i, this.b[0], this.b[1])) { pos.exclude(i, this.b[0], this.b[1]); changed = true; }
      if (pos.isPossible(i, this.a[0], this.a[1])) break;
    }
    for (i = N - 1; i >= 0; i--) {
      if (pos.isPossible(i, this.a[0], this.a[1])) { pos.exclude(i, this.a[0], this.a[1]); changed = true; }
      if (pos.isPossible(i, this.b[0], this.b[1])) break;
    }
    return changed;
  };

  function Open(col, row, el) { this.t = 'open'; this.col = col; this.row = row; this.el = el; }
  Open.prototype.show = '';
  Open.prototype.key = function () { return 'open' + this.col + '|' + this.row + '|' + this.el; };
  Open.prototype.onStart = true;
  Open.prototype.apply = function (pos) {
    if (!pos.isDefined(this.col, this.row)) { pos.set(this.col, this.row, this.el); return true; }
    return false;
  };

  function Under(a, b) { this.t = 'under'; this.a = a; this.b = b; }  // same column
  Under.prototype.show = 'V';
  Under.prototype.key = function () { return 'under' + this.a + '|' + this.b; };
  Under.prototype.apply = function (pos) {
    var changed = false;
    for (var i = 0; i < N; i++) {
      var pa = pos.isPossible(i, this.a[0], this.a[1]);
      var pb = pos.isPossible(i, this.b[0], this.b[1]);
      if (!pa && pb) { pos.exclude(i, this.b[0], this.b[1]); changed = true; }
      pa = pos.isPossible(i, this.a[0], this.a[1]);
      pb = pos.isPossible(i, this.b[0], this.b[1]);
      if (!pb && pa) { pos.exclude(i, this.a[0], this.a[1]); changed = true; }
    }
    return changed;
  };

  function Between(a, b, c) { this.t = 'between'; this.a = a; this.b = b; this.c = c; } // c between a and b
  Between.prototype.show = 'H';
  Between.prototype.key = function () { return 'between' + this.a + '|' + this.b + '|' + this.c; };
  Between.prototype.apply = function (pos) {
    var changed = false, goodLoop, i;
    var a = this.a, b = this.b, c = this.c;
    if (pos.isPossible(0, c[0], c[1])) { changed = true; pos.exclude(0, c[0], c[1]); }
    if (pos.isPossible(N - 1, c[0], c[1])) { changed = true; pos.exclude(N - 1, c[0], c[1]); }
    do {
      goodLoop = false;
      for (i = 1; i < N - 1; i++) {
        if (pos.isPossible(i, c[0], c[1])) {
          if (!((pos.isPossible(i - 1, a[0], a[1]) && pos.isPossible(i + 1, b[0], b[1])) ||
                (pos.isPossible(i - 1, b[0], b[1]) && pos.isPossible(i + 1, a[0], a[1])))) {
            pos.exclude(i, c[0], c[1]); goodLoop = true;
          }
        }
      }
      for (i = 0; i < N; i++) {
        var l, r;
        if (pos.isPossible(i, b[0], b[1])) {
          l = i < 2 ? false : (pos.isPossible(i - 1, c[0], c[1]) && pos.isPossible(i - 2, a[0], a[1]));
          r = i >= N - 2 ? false : (pos.isPossible(i + 1, c[0], c[1]) && pos.isPossible(i + 2, a[0], a[1]));
          if (!l && !r) { pos.exclude(i, b[0], b[1]); goodLoop = true; }
        }
        if (pos.isPossible(i, a[0], a[1])) {
          l = i < 2 ? false : (pos.isPossible(i - 1, c[0], c[1]) && pos.isPossible(i - 2, b[0], b[1]));
          r = i >= N - 2 ? false : (pos.isPossible(i + 1, c[0], c[1]) && pos.isPossible(i + 2, b[0], b[1]));
          if (!l && !r) { pos.exclude(i, a[0], a[1]); goodLoop = true; }
        }
      }
      if (goodLoop) changed = true;
    } while (goodLoop);
    return changed;
  };

  /* ---------- Rule generation ---------- */
  function newNear(pz) {
    var col1 = rnd(N), r1 = rnd(N), e1 = pz[r1][col1], col2;
    if (col1 === 0) col2 = 1;
    else if (col1 === N - 1) col2 = N - 2;
    else col2 = rnd(2) ? col1 + 1 : col1 - 1;
    var r2 = rnd(N);
    return new Near([r1, e1], [r2, pz[r2][col2]]);
  }
  function newDir(pz) {
    var row1 = rnd(N), row2 = rnd(N);
    var col1 = rnd(N - 1), col2 = rnd(N - col1 - 1) + col1 + 1;
    return new Dir([row1, pz[row1][col1]], [row2, pz[row2][col2]]);
  }
  function newOpen(pz) {
    var col = rnd(N), row = rnd(N);
    return new Open(col, row, pz[row][col]);
  }
  function newUnder(pz) {
    var col = rnd(N), r1 = rnd(N), r2;
    do { r2 = rnd(N); } while (r2 === r1);
    return new Under([r1, pz[r1][col]], [r2, pz[r2][col]]);
  }
  function newBetween(pz) {
    var cr = rnd(N), r1 = rnd(N), r2 = rnd(N);
    var cc = rnd(N - 2) + 1, ce = pz[cr][cc], t1, t2;
    if (rnd(2)) { t1 = pz[r1][cc - 1]; t2 = pz[r2][cc + 1]; }
    else { t1 = pz[r1][cc + 1]; t2 = pz[r2][cc - 1]; }
    return new Between([r1, t1], [r2, t2], [cr, ce]);
  }
  function genRule(pz) {
    var a = rnd(14);
    if (a < 4) return newNear(pz);
    if (a === 4) return newOpen(pz);
    if (a < 7) return newUnder(pz);
    if (a < 11) return newDir(pz);
    return newBetween(pz);
  }

  function canSolve(pz, rules) {
    var pos = new Possibilities(), changed;
    do {
      changed = false;
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].apply(pos)) {
          changed = true;
          if (!pos.isValid(pz)) throw new Error('Invalid possibilities after ' + rules[i].key());
        }
      }
    } while (changed);
    return pos.isSolved();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  function genPuzzleOnce() {
    var pz = [];
    for (var i = 0; i < N; i++) {
      var row = [1, 2, 3, 4, 5, 6];
      shuffle(row);
      pz.push(row);
    }
    var rules = [], seen = {}, done = false;
    while (!done) {
      var r = genRule(pz), k = r.key();
      if (seen[k]) continue;
      seen[k] = true;
      rules.push(r);
      done = canSolve(pz, rules);
    }
    // remove the redundant rules
    var possible;
    do {
      possible = false;
      for (var j = 0; j < rules.length; j++) {
        var rest = rules.slice(0, j).concat(rules.slice(j + 1));
        if (canSolve(pz, rest)) { rules = rest; possible = true; break; }
      }
    } while (possible);
    return { solved: pz, rules: rules };
  }

  function hintsQty(rules) {
    var v = 0, h = 0;
    rules.forEach(function (r) { if (r.show === 'V') v++; else if (r.show === 'H') h++; });
    return { v: v, h: h };
  }

  /* As in Game::genPuzzle: games with too many clues are rejected. */
  /* genPuzzle() gives a new random puzzle; genPuzzle("01-7K3F-9A2Q") gives the puzzle of that code again.
   * The result carries its code (g.code). An invalid or unsupported code throws. */
  function genPuzzle(code) {
    var c = null;
    if (code != null) { c = parseCode(code); if (!c) throw new Error('invalid puzzle code: ' + code); }
    var version = c ? c.version : CODE_VERSION, seed = c ? c.seed : randomSeed();
    rng = seeded('stein-puzzle-' + version + '-' + seed);
    try {
      for (;;) {
        var g = genPuzzleOnce(), q = hintsQty(g.rules);
        if (q.h <= 24 && q.v <= 15) { g.code = formatCode(version, seed); return g; }
      }
    } finally { rng = Math.random; }
  }

  function openInitial(pos, rules) {
    rules.forEach(function (r) { if (r.onStart) r.apply(pos); });
  }

  /* ---------- Serialization ---------- */
  function ruleToJSON(r) {
    switch (r.t) {
      case 'near': case 'dir': case 'under': return { t: r.t, a: r.a, b: r.b };
      case 'between': return { t: r.t, a: r.a, b: r.b, c: r.c };
      case 'open': return { t: r.t, col: r.col, row: r.row, el: r.el };
    }
    throw new Error('unknown rule type: ' + r.t);
  }
  function ruleFromJSON(o) {
    switch (o.t) {
      case 'near': return new Near(o.a, o.b);
      case 'dir': return new Dir(o.a, o.b);
      case 'under': return new Under(o.a, o.b);
      case 'between': return new Between(o.a, o.b, o.c);
      case 'open': return new Open(o.col, o.row, o.el);
    }
    throw new Error('unknown rule type: ' + o.t);
  }

  /* Strict check of a saved game (from localStorage) before it is given to the engine or the interface.
   * Returns true only for the exact structure written by the application: nothing is repaired, a doubtful save is rejected. */
  function validGame(g) {
    var isInt = function (v, lo, hi) { return typeof v === 'number' && v % 1 === 0 && v >= lo && v <= hi; };
    var isBits = function (a) { return Array.isArray(a) && a.length === N * N * N && a.every(function (v) { return v === 0 || v === 1; }); };
    var isCell = function (c) { return Array.isArray(c) && c.length === 2 && isInt(c[0], 0, N - 1) && isInt(c[1], 1, N); };
    if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
    if (!Array.isArray(g.solved) || g.solved.length !== N) return false;
    if (!g.solved.every(function (row) { return Array.isArray(row) && row.length === N && row.every(function (v) { return isInt(v, 1, N); }); })) return false;
    if (!isBits(g.pos)) return false;
    if (!Array.isArray(g.rules) || g.rules.length > 200) return false;
    var okRule = g.rules.every(function (r) {
      if (!r || typeof r !== 'object') return false;
      switch (r.t) {
        case 'near': case 'dir': case 'under': return isCell(r.a) && isCell(r.b);
        case 'between': return isCell(r.a) && isCell(r.b) && isCell(r.c);
        case 'open': return isInt(r.col, 0, N - 1) && isInt(r.row, 0, N - 1) && isInt(r.el, 1, N);
        default: return false;
      }
    });
    if (!okRule) return false;
    if (!Array.isArray(g.checked) || g.checked.length > g.rules.length || !g.checked.every(function (i) { return isInt(i, 0, g.rules.length - 1); })) return false;
    if (!Array.isArray(g.history) || g.history.length > 300 || !g.history.every(isBits)) return false;
    if (typeof g.elapsed !== 'number' || !isFinite(g.elapsed) || g.elapsed < 0) return false;
    if (!isInt(g.errors, 0, 1e6)) return false;
    return true;
  }

  var api = {
    N: N, Possibilities: Possibilities, genPuzzle: genPuzzle, openInitial: openInitial,
    canSolve: canSolve, hintsQty: hintsQty, parseCode: parseCode, CODE_VERSION: CODE_VERSION, ruleToJSON: ruleToJSON, ruleFromJSON: ruleFromJSON, validGame: validGame
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stein = api;
})(typeof window !== 'undefined' ? window : globalThis);
