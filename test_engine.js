/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_engine.js
 * Version   : 1.0.0
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
