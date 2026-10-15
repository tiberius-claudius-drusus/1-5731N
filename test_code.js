/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_code.js
 * Version   : 1.4.0
 * Role      : Tests of the puzzle code ("VV-AAAA-AAAA"): same code = same puzzle, pinned puzzles of generator version 1, uniqueness, independence of neighbouring codes, parsing, speed.
 * Depends on: engine.js ; Node.js (standard library only)
 * Called by : by hand (node test_code.js ; STEIN_HEAVY=1 for the large samples) ; GitHub Actions
 * Produces  : stdout ; exit code 1 on any failure
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * The pinned codes (GOLDEN) are the guard of the version policy: if they fail, the generation algorithm changed.
 * Do not "fix" the expected values: give the new algorithm a new generator version and keep the old one callable.
 */
const E = require('./engine.js');
const HEAVY = !!process.env.STEIN_HEAVY, N_SAME = HEAVY ? 1000 : 150, N_UNIQ = HEAVY ? 5000 : 400, N_SOLVE = HEAVY ? 1000 : 150, N_AVAL = HEAVY ? 600 : 150;
let bad = 0;
const fail = m => { console.log('FAIL:', m); bad++; };
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const fp = g => { const s = JSON.stringify({ s: g.solved, r: g.rules.map(E.ruleToJSON) }); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
let st = 12345; const lcg = () => (st = (Math.imul(st, 1664525) + 1013904223) >>> 0) / 4294967296;      // deterministic test data
const code = () => '01-' + Array.from({ length: 8 }, () => ALPHA[Math.floor(lcg() * 32)]).join('').replace(/^(.{4})/, '$1-');

// 1. same code = same puzzle, whatever happened in between (Math.random used in between)
for (let i = 0; i < N_SAME; i++) {
  const c = code(), a = E.genPuzzle(c); E.genPuzzle(); const b = E.genPuzzle(c);
  if (fp(a) !== fp(b) || a.code !== c) { fail('code ' + c + ' did not give the same puzzle twice'); break; }
}
console.log('same code, same puzzle:', N_SAME, 'codes checked twice');

// 2. pinned puzzles of generator version 1 (same on every machine and engine)
const GOLDEN = { '01-0000-0000': 'b01d77d9', '01-7K3F-9A2Q': '95fdd131', '01-ZZZZ-ZZZZ': 'd24743b3', '01-1234-5678': '4e7ac3d7', '01-ABCD-EFGH': 'e1d3e84d' };
if (process.argv[2] === '--print') { Object.keys(GOLDEN).forEach(k => console.log("'" + k + "': '" + fp(E.genPuzzle(k)) + "',")); process.exit(0); }
Object.keys(GOLDEN).forEach(k => { const got = fp(E.genPuzzle(k)); if (got !== GOLDEN[k]) fail('pinned puzzle ' + k + ': expected ' + GOLDEN[k] + ', got ' + got + ' (the generator changed: new generator version needed)'); });
console.log('pinned puzzles:', Object.keys(GOLDEN).length, 'codes');

// 3. uniqueness: different codes give different puzzles
{ const seen = new Map(); let dup = 0;
  for (let i = 0; i < N_UNIQ; i++) { const c = code(), f = fp(E.genPuzzle(c)); if (seen.has(f) && seen.get(f) !== c) dup++; seen.set(f, c); }
  if (dup) fail(dup + ' different codes gave the same puzzle'); console.log('uniqueness:', N_UNIQ, 'codes,', dup, 'duplicate puzzles'); }

// 4. neighbouring codes (last character differs) give unrelated puzzles: equal solution cells ~ 1/6
{ let eq = 0, tot = 0;
  for (let i = 0; i < N_AVAL; i++) { const base = code().slice(0, -1), a = E.genPuzzle(base + ALPHA[i % 16]), b = E.genPuzzle(base + ALPHA[16 + (i % 16)]);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { tot++; if (a.solved[r][c] === b.solved[r][c]) eq++; } }
  const p = eq / tot; if (Math.abs(p - 1 / 6) > 0.02) fail('neighbouring codes look correlated: ' + p.toFixed(4) + ' equal cells (expected 0.1667)');
  console.log('neighbouring codes: ' + (p * 100).toFixed(2) + ' % equal cells (independent = 16.67 %)'); }

// 5. random codes: well formed, all characters used, and every one of them solvable by deduction
{ const used = new Set(); let ok = 0;
  for (let i = 0; i < N_SOLVE; i++) { const g = E.genPuzzle(); if (!/^01-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(g.code)) fail('malformed code ' + g.code);
    g.code.replace(/-/g, '').slice(2).split('').forEach(ch => used.add(ch));
    const g2 = E.genPuzzle(g.code); if (E.canSolve(g2.solved, g2.rules)) ok++; else fail('puzzle ' + g.code + ' is not solvable by deduction'); }
  console.log('random codes:', N_SOLVE, 'puzzles solvable by deduction ' + ok + ',', used.size + '/32 characters seen'); }

// 6. reading a code typed by a person
{ const c = '01-7K3F-9A2Q', ref = fp(E.genPuzzle(c));
  ['01-7K3F-9A2Q', '017k3f9a2q', ' 01 7k3f 9a2q ', '01_7K3F.9A2Q', '01-7K3F-9AZQ'.replace('Z', '2')].forEach(v => { if (fp(E.genPuzzle(v)) !== ref) fail('"' + v + '" not read as ' + c); });
  if (E.parseCode('01-0O0I-1L0O').seed !== '00011100') fail('O/I/L not read as 0/1/1');
  ['', null, '01-7K3F-9A2', '01-7K3F-9A2QQ', '00-7K3F-9A2Q', '02-7K3F-9A2Q', '01-7K3U-9A2Q', '01-7K3F-9A2!', 'hello', 'AB-7K3F-9A2Q'].forEach(v => {
    if (E.parseCode(v) !== null) fail('accepted a bad code: ' + v);
    if (v !== null && v !== '') { let threw = false; try { E.genPuzzle(v); } catch (e) { threw = true; } if (!threw) fail('genPuzzle did not throw for ' + v); } });
  console.log('reading codes: lower case, spaces, missing dashes, O/I/L; 10 bad codes refused'); }

// 7. cost
{ const t = f => { const t0 = process.hrtime.bigint(); for (let i = 0; i < 300; i++) f(i); return Number(process.hrtime.bigint() - t0) / 3e8; };
  const cs = Array.from({ length: 300 }, code);
  const a = t(() => E.genPuzzle()), b = t(i => E.genPuzzle(cs[i]));
  console.log('speed: random ' + a.toFixed(1) + ' ms/puzzle, from a code ' + b.toFixed(1) + ' ms/puzzle'); }

// 8. puzzle of the day: derived from the date only
{ const d1 = E.dailyCode('2026-10-14'), d2 = E.dailyCode('2026-10-14'), d3 = E.dailyCode('2026-10-15');
  if (d1 !== d2) fail('the code of a day is not stable');
  if (d1 === d3) fail('two days have the same code');
  if (!/^01-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(d1)) fail('malformed daily code ' + d1);
  const seen = new Set(); for (let i = 0; i < 3650; i++) { const dt = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10); seen.add(E.dailyCode(dt)); }
  if (seen.size !== 3650) fail('10 years of dates gave ' + seen.size + ' different codes instead of 3650');
  const DAILY = { '2026-10-14': '01-YF8R-B4JA', '2026-12-31': '01-GR56-4TC7', '2027-01-01': '01-KCHP-ARTW' };
  if (process.argv[2] === '--print-daily') { Object.keys(DAILY).forEach(k => console.log("'" + k + "': '" + E.dailyCode(k) + "',")); process.exit(0); }
  Object.keys(DAILY).forEach(k => { if (E.dailyCode(k) !== DAILY[k]) fail('pinned daily code of ' + k + ': expected ' + DAILY[k] + ', got ' + E.dailyCode(k)); });
  ['2026-13-01x', '', 'hello', null, undefined].forEach(v => { let threw = false; try { E.dailyCode(v); } catch (e) { threw = true; } if (!threw) fail('dailyCode accepted ' + v); });
  const g = E.genPuzzle(d1); if (g.code !== d1 || !E.canSolve(g.solved, g.rules)) fail('the puzzle of the day is not a valid puzzle');
  if (E.canonicalCode(' 01 7k3f 9a2q ') !== '01-7K3F-9A2Q' || E.canonicalCode('nope') !== null) fail('canonicalCode');
  console.log('puzzle of the day: stable per date, 3650 dates give 3650 codes, pinned'); }

// 9. a saved game may carry its code, which must be a canonical one
{ const g = E.genPuzzle(), p = new E.Possibilities(); E.openInitial(p, g.rules);
  const sv = extra => Object.assign({ solved: g.solved, rules: g.rules.map(E.ruleToJSON), pos: Array.from(p.p), checked: [], history: [], elapsed: 0, errors: 0 }, extra);
  if (!E.validGame(sv({ code: g.code })) || !E.validGame(sv({}))) fail('a game with a valid code, or without code, was refused');
  ['nope', '01-7k3f-9a2q', 123, '02-7K3F-9A2Q'].forEach(v => { if (E.validGame(sv({ code: v }))) fail('a game with the code ' + v + ' was accepted'); });
  console.log('saved games with a code: canonical codes only'); }

// 10. a saved game may carry the order the player gave the clues: a permutation of each list, nothing else
{ const g = E.genPuzzle(), p = new E.Possibilities(); E.openInitial(p, g.rules);
  const rules = g.rules.map(E.ruleToJSON), H = [], V = [];
  rules.forEach((r, i) => { if (r.t === 'under') V.push(i); else if (r.t !== 'open') H.push(i); });
  const sv = extra => Object.assign({ solved: g.solved, rules, pos: Array.from(p.p), checked: [], history: [], elapsed: 0, errors: 0 }, extra);
  const rev = a => a.slice().reverse();
  if (!E.validGame(sv({ order: { H: rev(H), V: rev(V) } })) || !E.validGame(sv({ order: { H, V } })) || !E.validGame(sv({}))) fail('a valid order was refused');
  const wrong = [null && 0, { H: H.slice(1), V }, { H, V: V.concat(V[0]) }, { H: H.concat(99), V }, { H: V, V: H }, { H, V: 'x' }, [H, V], 5, { H }];
  wrong.slice(1).forEach((o, k) => { if (E.validGame(sv({ order: o }))) fail('a bad order was accepted (case ' + k + ')'); });
  console.log('saved games with an order: permutations of each list only'); }

console.log(bad ? bad + ' problem(s)' : 'puzzle code: all consistent');
process.exit(bad ? 1 : 0);
