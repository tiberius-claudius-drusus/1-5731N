/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_library.js
 * Version   : 1.2.0
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
