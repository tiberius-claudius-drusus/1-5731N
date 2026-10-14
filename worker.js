/* ---------------------------------------------------------------------------
 * File      : 1-5731n/worker.js
 * Version   : 1.2.0
 * Role      : Background worker: generates one puzzle on request, grades it and sends back its code, raw score and level.
 * Depends on: engine.js (importScripts)
 * Called by : app.js (new Worker('worker.js'))
 * Produces  : messages { code, raw, level } to the page
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * The page asks for one puzzle at a time (every 10 s while a game is on screen); generation and grading (about 12 ms)
 * stay off the interface thread.
 */
'use strict';
importScripts('engine.js');
self.onmessage = function () {
  try {
    var g = self.Stein.genPuzzle(), r = self.Stein.gradeOf(g.solved, g.rules);
    self.postMessage({ code: g.code, raw: r.raw, level: r.level });
  } catch (e) { self.postMessage({ error: String(e && e.message || e).slice(0, 100) }); }
};
