/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_engine.js
 * Version   : 1.2.2
 * Role      : Engine test: generates puzzles and checks each is solved by deduction alone, with a JSON round trip of the rules.
 * Depends on: Node.js ; engine.js
 * Called by : by hand: node test_engine.js
 * Produces  : summary on stdout (puzzles, failures, ms per puzzle, average clues)
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Usage: node test_engine.js
 */
const E=require('./engine.js');
let t0=Date.now(), nH=0,nV=0,nO=0,bad=0,n=40;
for(let i=0;i<n;i++){
  const g=E.genPuzzle();
  const pos=new E.Possibilities(); E.openInitial(pos,g.rules);
  let ch; do{ch=false; for(const r of g.rules) if(r.apply(pos)) ch=true;}while(ch);
  const q=E.hintsQty(g.rules); nH+=q.h;nV+=q.v;nO+=g.rules.filter(r=>r.t==='open').length;
  if(!pos.isSolved()||!pos.isValid(g.solved)) bad++;
  // JSON round trip
  const r2=g.rules.map(r=>E.ruleFromJSON(JSON.parse(JSON.stringify(E.ruleToJSON(r)))));
  if(!E.canSolve(g.solved,r2)) bad++;
}
console.log({n,bad,msPerGame:(Date.now()-t0)/n,H:nH/n,V:nV/n,open:nO/n});
if (bad) { console.log('FAIL: ' + bad + ' generated puzzle(s) not solved by deduction or not kept by the JSON round trip'); process.exit(1); }

// an unknown rule type must fail loudly, not give undefined
{
  let threw = 0;
  try { E.ruleToJSON({ t: 'nope' }); } catch (e) { threw++; }
  try { E.ruleFromJSON({ t: 'nope' }); } catch (e) { threw++; }
  if (threw !== 2) { console.log('FAIL: unknown rule type did not throw in both directions'); process.exit(1); }
  console.log('unknown rule type: throws in both directions');
}

// a saved game is accepted only if it has exactly the structure the application writes
{
  const g = E.genPuzzle(), p = new E.Possibilities();
  E.openInitial(p, g.rules);
  const good = () => ({ solved: g.solved.map(r => r.slice()), rules: g.rules.map(E.ruleToJSON), pos: Array.from(p.p), checked: [0, 1], history: [Array.from(p.p)], elapsed: 12.5, errors: 0 });
  const mut = f => { const x = good(); f(x); return x; };
  const bad = {
    'null': null, 'array': [], 'no rules': mut(x => delete x.rules), 'unknown rule type': mut(x => { x.rules[0] = { t: 'nope' }; }),
    'rule out of board': mut(x => { x.rules[0] = { t: 'near', a: [99, 99], b: [-1, 7] }; }),
    'truncated pos': mut(x => { x.pos = x.pos.slice(0, 10); }), 'pos with a 2': mut(x => { x.pos[3] = 2; }),
    'solved with a 9': mut(x => { x.solved[0][0] = 9; }), 'checked out of range': mut(x => { x.checked = [999]; }),
    'history too long': mut(x => { x.history = new Array(301).fill(x.pos); }), 'history item truncated': mut(x => { x.history = [[1, 0]]; }),
    'pos without the solution': mut(x => { x.pos[(0 * 6 + 0) * 6 + x.solved[0][0] - 1] = 0; }), 'history without the solution': mut(x => { x.history = [x.pos.slice()]; x.history[0][(2 * 6 + 3) * 6 + x.solved[3][2] - 1] = 0; }), 'solved row not a permutation': mut(x => { x.solved[1][0] = x.solved[1][1]; }),
    'clue false in the solution': mut(x => { const i = x.rules.findIndex(r => r.t === 'dir'); const r = x.rules[i]; x.rules[i] = { t: 'dir', a: r.b, b: r.a }; }),
    'open clue that contradicts the solution': mut(x => { x.rules.push({ t: 'open', col: 0, row: 0, el: x.solved[0][0] % 6 + 1 }); }),
    'code of another puzzle': mut(x => { x.code = E.genPuzzle().code; }),
    'elapsed text': mut(x => { x.elapsed = '12'; }), 'elapsed negative': mut(x => { x.elapsed = -1; }), 'errors fractional': mut(x => { x.errors = 1.5; })
  };
  // a game started from a code keeps working with it: the code gives back exactly this puzzle
  { const h = E.genPuzzle(), q = new E.Possibilities(); E.openInitial(q, h.rules);
    const withCode = { solved: h.solved, rules: h.rules.map(E.ruleToJSON), code: h.code, pos: Array.from(q.p), checked: [], history: [], elapsed: 0, errors: 0 };
    if (!E.validGame(withCode)) { console.log('FAIL: a save with its own code was refused'); process.exit(1); } }
  let bads = 0;
  if (!E.validGame(good())) { console.log('FAIL: a valid saved game was rejected'); bads++; }
  for (let i = 0; i < 200; i++) { const h = E.genPuzzle(); const q = new E.Possibilities(); E.openInitial(q, h.rules);
    if (!E.validGame({ solved: h.solved, rules: h.rules.map(E.ruleToJSON), pos: Array.from(q.p), checked: [], history: [], elapsed: 0, errors: 0 })) { console.log('FAIL: generated game rejected'); bads++; break; } }
  Object.keys(bad).forEach(k => { if (E.validGame(bad[k])) { console.log('FAIL: accepted a bad save:', k); bads++; } });
  if (bads) process.exit(1);
  console.log('saved games: 200 generated games accepted,', Object.keys(bad).length, 'corrupted ones rejected');
}

// the calendar: a date must be a real day (the puzzle of the day is drawn from it)
{
  let b = 0;
  ['2026-10-15', '2024-02-29', '2000-02-29'].forEach(d => { if (!E.validDate(d)) { console.log('FAIL: real date refused', d); b++; } });
  ['2026-19-42', '2026-02-30', '2025-02-29', '1900-02-29', '2026-00-10', '2026-10-00', '2026-1-5', '', null, 20261015, '2026-10-15T10:00'].forEach(d => {
    if (E.validDate(d)) { console.log('FAIL: false date accepted', d); b++; }
    let threw = false; try { E.dailyCode(d); } catch (e) { threw = true; }
    if (!threw) { console.log('FAIL: dailyCode accepted', d); b++; }
  });
  if (b) process.exit(1);
  console.log('dates: real days accepted, 11 false dates refused by validDate and by dailyCode');
}
