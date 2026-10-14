/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_library.js
 * Version   : 1.2.1
 * Role      : Library test: validation of packs, base pack consistency (levels recomputed from the codes), pick, puzzle of the day by level.
 * Depends on: Node.js ; engine.js ; library.js ; lib_base.js
 * Called by : by hand: node test_library.js (exit code 1 on any problem) ; GitHub Actions
 * Produces  : summary on stdout
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Usage: node test_library.js
 */
const E = require('./engine.js');
const L = require('./library.js');
require('./lib_base.js');
let bad = 0;
const ok = (name, cond, extra) => { if (!cond) { console.log('FAIL:', name, extra === undefined ? '' : extra); bad++; } };

// base pack: 5 levels, all filled, every stored score gives the level it is filed under, and the code rebuilds a puzzle of that level
const per = [0, 1, 2, 3, 4].map(k => L.byLevel(k));
per.forEach((a, k) => ok('level ' + k + ' filled', a.length === 500, a.length));
ok('one pack: base', L.packs().length === 1 && L.packs()[0].id === 'base' && L.packs()[0].count === 2500);
let checked = 0;
per.forEach((a, k) => { for (let i = 0; i < a.length; i += 25) {          // one in 25: 100 puzzles rebuilt and graded again
  const g = E.genPuzzle(a[i]), r = E.gradeOf(g.solved, g.rules);
  ok('code ' + a[i] + ' rebuilds the same puzzle', g.code === a[i]);
  ok('code ' + a[i] + ' is level ' + k, r.level === k, r.level);
  checked++;
} });

// validation of an add-on
const good = () => ({ format: 1, id: 'test-pack', name: 'Test', gen: E.CODE_VERSION, scale: E.SCALE_VERSION, puzzles: [[per[4][0], 210], [per[4][1], 205]] });
const refused = {
  'null': null, 'array': [], 'format 2': Object.assign(good(), { format: 2 }), 'id with capitals': Object.assign(good(), { id: 'Bad' }),
  'id too long': Object.assign(good(), { id: 'a'.repeat(33) }), 'empty name': Object.assign(good(), { name: ' ' }),
  'other generator': Object.assign(good(), { gen: 99 }), 'other scale': Object.assign(good(), { scale: 99 }),
  'no puzzles': Object.assign(good(), { puzzles: [] }), 'bad code': Object.assign(good(), { puzzles: [['01-AAAA-AAA', 1]] }),
  'lower case code': Object.assign(good(), { puzzles: [[per[4][0].toLowerCase(), 1]] }), 'score as text': Object.assign(good(), { puzzles: [[per[4][0], '9']] }),
  'fractional score': Object.assign(good(), { puzzles: [[per[4][0], 1.5]] }), 'score negative': Object.assign(good(), { puzzles: [[per[4][0], -1]] }),
  'too many': Object.assign(good(), { puzzles: new Array(20001).fill([per[4][0], 1]) }), 'base id': Object.assign(good(), { id: 'base' })
};
Object.keys(refused).forEach(k => ok('refused: ' + k, !L.install(refused[k]).ok));
ok('refusal of another generator names the cause', L.install(refused['other generator']).error === 'gen' && L.install(refused['other scale']).error === 'scale');
ok('good pack accepted', L.install(good()).ok);
ok('add-on listed', L.packs().length === 2);
ok('add-on codes already in base are not counted twice', L.byLevel(4).length === 500);
const extra = per[4].length + 0;
ok('removing the add-on', L.remove('test-pack') && L.packs().length === 1);
// an add-on with a new puzzle adds it to its level
const fresh = E.genPuzzle().code, fl = (() => { const g = E.genPuzzle(fresh); return E.gradeOf(g.solved, g.rules); })();
ok('add-on with a new puzzle', L.install({ format: 1, id: 'more', name: 'More', gen: E.CODE_VERSION, scale: E.SCALE_VERSION, puzzles: [[fresh, fl.raw]] }).ok && L.byLevel(fl.level).indexOf(fresh) >= 0);
L.remove('more');

// pick: unplayed first; if everything was played, still gives one; never outside the level
const played = {}; per[2].slice(0, 499).forEach(c => { played[c] = 1; });
ok('pick: the only unplayed one', L.pick(2, played) === per[2][499]);
per[2].forEach(c => { played[c] = 1; });
ok('pick: all played, still one of the level', per[2].indexOf(L.pick(2, played)) >= 0);

// a pack that lies about the score: the puzzle is listed in a level it does not belong to, but is never offered there
{
  const easy = per[0][1], hard = per[4][2];
  const lie = L.install({ format: 1, id: 'liar', name: 'Liar', gen: E.CODE_VERSION, scale: E.SCALE_VERSION, puzzles: [[E.genPuzzle().code, 250]] });
  ok('liar pack installed', lie.ok);
  const lieCode = lie.pack.puzzles[0][0], real = (() => { const g = E.genPuzzle(lieCode); return E.gradeOf(g.solved, g.rules).level; })();
  ok('the lie lists the puzzle as extreme', L.byLevel(4).indexOf(lieCode) >= 0 || real === 4);
  const lv = c => { const g = E.genPuzzle(c); return E.gradeOf(g.solved, g.rules).level; };
  const only = {}; per[4].forEach(c => { only[c] = 1; });                         // played: only the liar puzzle is unplayed in level 4
  if (real !== 4) {
    ok('verified pick refuses the lying puzzle', L.pickVerified(4, only, () => 0, lv) === null || lv(L.pickVerified(4, only, () => 0, lv)) === 4);
    ok('the lying puzzle is dropped from the level', L.byLevel(4).indexOf(lieCode) < 0);
  }
  L.remove('liar');
}
// the date given to daily() must be YYYY-MM-DD
['2026-1-5', '15/10/2026', '', null, '2026-10-15T10:00'].forEach(d => { let threw = false; try { L.daily(d); } catch (e) { threw = true; } ok('daily refuses ' + JSON.stringify(d), threw); });

// add-ons published in addons/: the index matches the files, every pack is valid, and its puzzles are of the level they claim (1 in 10 rebuilt)
{
  const fs = require('fs'), path = require('path');
  const idx = JSON.parse(fs.readFileSync(path.join(__dirname, 'addons', 'index.json'), 'utf8'));
  ok('addons/index.json is a list', Array.isArray(idx));
  idx.forEach(a => {
    const o = JSON.parse(fs.readFileSync(path.join(__dirname, 'addons', a.file), 'utf8')), r = L.install(o);
    ok('add-on ' + a.id + ' valid', r.ok, r.error);
    if (!r.ok) return;
    ok('add-on ' + a.id + ': id and count match the index', r.pack.id === a.id && r.pack.puzzles.length === a.count, r.pack.id + ' ' + r.pack.puzzles.length);
    ok('add-on ' + a.id + ': no puzzle already in the base pack', r.pack.puzzles.every(x => per.every(l => l.indexOf(x[0]) < 0)));
    r.pack.puzzles.forEach((x, i) => { if (i % 10) return; const g = E.genPuzzle(x[0]), q = E.gradeOf(g.solved, g.rules); ok('add-on ' + a.id + ' ' + x[0] + ' raw score', q.raw === x[1], q.raw + ' vs ' + x[1]); });
    L.remove(a.id);
  });
  console.log('add-ons in the index:', idx.map(a => a.id + ' (' + a.count + ')').join(', ') || 'none');
}
// puzzle of the day: same for everyone, uniform over the 5 levels, old rule before the switch date
const day = n => new Date(Date.UTC(2026, 9, 15 + n)).toISOString().slice(0, 10);
const cnt = [0, 0, 0, 0, 0], codes = new Set();
for (let n = 0; n < 3650; n++) { const d = day(n), c = L.daily(d); cnt[L.dailyLevel(d)]++; codes.add(c); ok('daily ' + d + ' stable', L.daily(d) === c); }
ok('daily levels uniform (each between 17 % and 23 %)', cnt.every(v => v > 3650 * 0.17 && v < 3650 * 0.23), cnt.join(' '));
for (let n = 0; n < 60; n++) { const d = day(n), c = L.daily(d), g = E.genPuzzle(c); ok('daily ' + d + ' is of its level', E.gradeOf(g.solved, g.rules).level === L.dailyLevel(d)); }
ok('daily before the switch date keeps the old rule', L.daily('2026-10-14') === E.dailyCode('2026-10-14') && L.daily('2026-01-01') === E.dailyCode('2026-01-01'));
// frozen: three pinned puzzles of the day (a different base pack would change them: that needs a new switch date)
const pinned = { '2026-10-15': '01-GPBD-TJJW', '2026-10-16': '01-ZWX0-7MZT', '2026-12-25': '01-1XNE-8S7R' };
Object.keys(pinned).forEach(d => ok('pinned puzzle of the day ' + d, L.daily(d) === pinned[d], L.daily(d)));
console.log(bad ? bad + ' problem(s)' : 'library: base pack of 2500 (' + checked + ' rebuilt and graded again), ' + Object.keys(refused).length + ' refused packs, daily puzzle uniform over the levels (' + cnt.join('/') + ' in 10 years), ' + codes.size + ' distinct codes');
process.exit(bad ? 1 : 0);
