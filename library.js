/* ---------------------------------------------------------------------------
 * File      : 1-5731n/library.js
 * Version   : 1.2.0
 * Role      : Puzzle packs: validation of a pack, registry (base pack + add-ons), pick of an unplayed puzzle of a level, puzzle of the day by level.
 * Depends on: engine.js (window.Stein)
 * Called by : lib_base.js (addBase) ; app.js (browser, window.SteinLib) ; test_library.js (Node, module.exports)
 * Produces  : window.SteinLib : addBase, install, remove, packs, byLevel, pick, daily, validatePack, DAILY_LEVEL_FROM
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * A pack is { format: 1, id, name, gen, scale, puzzles: [[code, rawScore], ...] }. It holds CODES only: the game rebuilds the puzzle
 * from the code and recomputes its level itself, so a pack can neither lie about the difficulty nor carry anything but codes.
 * A pack is refused if it was made for another generator version (gen) or another scale of levels (scale).
 * The base pack is frozen: the puzzle of the day indexes into its first DAILY_POOL puzzles of each level.
 */
(function (root) {
  'use strict';
  var E = root.Stein || (typeof require === 'function' ? require('./engine.js') : null);

  var DAILY_LEVEL_FROM = '2026-10-15';   // puzzles of the day before this date keep the old rule (a random level)
  var DAILY_POOL = 400;                  // per level, taken from the start of the base pack
  var MAX_PUZZLES = 20000;

  var base = null, addons = {}, cache = null;

  /* strict check of a pack coming from outside: { ok, pack } or { ok: false, error } */
  function validatePack(o) {
    function bad(e) { return { ok: false, error: e }; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return bad('format');
    if (o.format !== 1) return bad('format');
    if (typeof o.id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(o.id)) return bad('id');
    if (typeof o.name !== 'string' || !o.name.trim() || o.name.length > 40) return bad('name');
    if (o.gen !== E.CODE_VERSION) return bad('gen');
    if (o.scale !== E.SCALE_VERSION) return bad('scale');
    if (!Array.isArray(o.puzzles) || !o.puzzles.length || o.puzzles.length > MAX_PUZZLES) return bad('puzzles');
    var seen = {}, out = [];
    for (var i = 0; i < o.puzzles.length; i++) {
      var p = o.puzzles[i];
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string') return bad('puzzles');
      var c = E.canonicalCode(p[0]);
      if (c === null || c !== p[0]) return bad('puzzles');
      if (typeof p[1] !== 'number' || !isFinite(p[1]) || p[1] < 0 || p[1] > 1000 || Math.floor(p[1]) !== p[1]) return bad('puzzles');
      if (!seen[c]) { seen[c] = 1; out.push([c, p[1]]); }
    }
    return { ok: true, pack: { format: 1, id: o.id, name: o.name.trim(), gen: o.gen, scale: o.scale, puzzles: out } };
  }

  function addBase(o) {
    var r = validatePack(o);
    if (!r.ok || r.pack.id !== 'base') throw new Error('invalid base pack: ' + (r.error || 'id'));
    base = r.pack; cache = null;
  }
  function install(o) {
    var r = validatePack(o);
    if (!r.ok) return r;
    if (r.pack.id === 'base') return { ok: false, error: 'id' };
    addons[r.pack.id] = r.pack; cache = null;
    return r;
  }
  function remove(id) { if (addons[id]) { delete addons[id]; cache = null; return true; } return false; }

  function packs() {
    var out = [];
    if (base) out.push({ id: 'base', name: base.name, count: base.puzzles.length, base: true });
    Object.keys(addons).sort().forEach(function (id) { out.push({ id: id, name: addons[id].name, count: addons[id].puzzles.length, base: false }); });
    return out;
  }

  /* codes of every pack for each level (a code present in two packs counts once) */
  function index() {
    if (cache) return cache;
    var lv = [[], [], [], [], []], seen = {};
    var all = (base ? [base] : []).concat(Object.keys(addons).sort().map(function (id) { return addons[id]; }));
    all.forEach(function (p) {
      p.puzzles.forEach(function (x) { if (!seen[x[0]]) { seen[x[0]] = 1; lv[E.levelOf(x[1])].push(x[0]); } });
    });
    return (cache = lv);
  }
  function byLevel(level) { return index()[level].slice(); }

  /* a puzzle of the level that was not played yet; if all were played, any of them; null if the level is empty */
  function pick(level, played, rnd) {
    var all = index()[level] || [];
    if (!all.length) return null;
    var fresh = all.filter(function (c) { return !(played && played[c]); });
    var from = fresh.length ? fresh : all;
    return from[Math.floor((rnd || Math.random)() * from.length)];
  }

  /* 32-bit hash with good mixing (FNV-1a then the murmur3 finalizer) */
  function hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  /* level of the puzzle of the day for a date (YYYY-MM-DD): the same for everyone, uniform over the five levels */
  function dailyLevel(dateText) { return hash32('stein-daily-level-' + dateText) % 5; }
  /* code of the puzzle of the day: before DAILY_LEVEL_FROM (or without a base pack) the old rule; after, a puzzle of the level of the day,
   * drawn from the frozen start of the base pack, so it is the same on every device whatever add-ons are installed. */
  function daily(dateText) {
    if (!base || dateText < DAILY_LEVEL_FROM) return E.dailyCode(dateText);
    var lv = dailyLevel(dateText);
    var pool = base.puzzles.filter(function (x) { return E.levelOf(x[1]) === lv; }).slice(0, DAILY_POOL);
    if (!pool.length) return E.dailyCode(dateText);
    return pool[hash32('stein-daily-pick-' + dateText) % pool.length][0];
  }

  var api = {
    validatePack: validatePack, addBase: addBase, install: install, remove: remove, packs: packs,
    byLevel: byLevel, pick: pick, daily: daily, dailyLevel: dailyLevel, DAILY_LEVEL_FROM: DAILY_LEVEL_FROM, DAILY_POOL: DAILY_POOL
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; root.SteinLib = api; }
  else root.SteinLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
