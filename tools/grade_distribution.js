/* ---------------------------------------------------------------------------
 * File      : 1-5731n/tools/grade_distribution.js
 * Version   : 1.2.0
 * Role      : Authoring aid: generates many puzzles, grades each with gradeSolve() and prints the distribution of the raw score (histogram, quantiles, tiers) to calibrate a 0-20 scale.
 * Depends on: Node.js ; ../engine.js
 * Called by : by hand: node tools/grade_distribution.js [count] [--out samples.json]
 * Produces  : summary on stdout ; with --out, a JSON list of { code, raw, maxTier, steps, h, v } (a library of graded puzzles)
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Usage: node tools/grade_distribution.js 10000 --out /path/outside/the/repo/samples.json
 */
'use strict';
const path = require('path');
const fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const count = parseInt(args.find((a, i) => /^\d+$/.test(a) && i !== outIdx + 1) || '2000', 10);

const samples = [];
let unsolved = 0;
const t0 = Date.now();
for (let i = 0; i < count; i++) {
  const g = E.genPuzzle();
  const r = E.gradeSolve(g.solved, g.rules);
  if (!r.solved) { unsolved++; continue; }
  const q = E.hintsQty(g.rules);
  samples.push({ code: g.code, raw: r.raw, maxTier: r.maxTier, steps: r.steps, tiers: r.tiers, h: q.h, v: q.v, clues: g.rules.length });
}
const ms = Date.now() - t0;

const raws = samples.map(s => s.raw).sort((a, b) => a - b);
const pct = p => raws[Math.min(raws.length - 1, Math.floor(p / 100 * raws.length))];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`puzzles: ${count}, graded: ${samples.length}, not solved by the grader: ${unsolved}, ${(ms / count).toFixed(1)} ms per puzzle (generation + grading)`);
console.log(`raw score: min ${raws[0]}, median ${pct(50)}, mean ${mean(raws).toFixed(1)}, max ${raws[raws.length - 1]}`);
console.log('quantiles (5% steps):', Array.from({ length: 21 }, (_, i) => pct(Math.min(i * 5, 99.99))).join(' '));

console.log('\nhistogram of the raw score:');
const hist = {};
raws.forEach(r => { hist[r] = (hist[r] || 0) + 1; });
const maxH = Math.max.apply(null, Object.values(hist));
Object.keys(hist).map(Number).sort((a, b) => a - b).forEach(k => {
  console.log(String(k).padStart(4), String(hist[k]).padStart(6), '#'.repeat(Math.round(hist[k] / maxH * 50)));
});

console.log('\nby hardest tier needed (1 under, 2 dir, 3 near, 4 between):');
[1, 2, 3, 4].forEach(t => {
  const s = samples.filter(x => x.maxTier === t);
  if (s.length) console.log(`  tier ${t}: ${s.length} puzzles (${(100 * s.length / samples.length).toFixed(1)}%), raw mean ${mean(s.map(x => x.raw)).toFixed(1)}`);
});
console.log('mean steps per tier [under dir near between]:', [0, 1, 2, 3].map(t => mean(samples.map(s => s.tiers[t])).toFixed(1)).join(' '));
console.log('mean clues:', mean(samples.map(s => s.clues)).toFixed(1), ', mean steps:', mean(samples.map(s => s.steps)).toFixed(1));

if (outFile) {
  fs.writeFileSync(outFile, JSON.stringify(samples));
  console.log('\nwritten:', outFile, `(${samples.length} puzzles)`);
}
