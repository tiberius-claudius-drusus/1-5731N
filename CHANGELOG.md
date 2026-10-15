# Changelog - 1-5731N

## 1.2.3 - 2026-10-16
Review of the published 1.2.2 (each point checked in a browser or in the code first).
- **Back button**: starting a game did not add a history entry, so the Back button of the phone left the application from a game (the intended "go back to the home" only worked after visiting Options, Help or Statistics). And the on-screen back buttons of those screens left their entry behind (three visits to Help left five entries). Now every screen other than the home owns exactly one history entry, pushed when it opens and removed when it closes; Back closes the zoom, then returns to the home, then leaves.
- **Level cache** (`stein.lvl.v1`): its entries are now checked like the other stored data (a code, and a level from -1 to 4); a damaged value used to break the statistics screen.

## 1.2.2 - 2026-10-15
Targeted audit by ChatGPT of the published 1.2.1 (each point checked in the code and by measurement first).
- **Dates**: one calendar check (`validDate`) shared by `dailyCode()`, `daily()` and `dailyLevel()`: `2026-19-42`, `2026-02-30`, `2025-02-29` are refused (the format alone was checked before). Also used by the statistics import.
- **Saved games** (`validGame`): every clue must be true in the solution (the five kinds), the board and each history step must keep the solution, each solution row must hold 1 to 6 once, and the code of the game must give back exactly this puzzle.
- **Generator**: the loops are bounded (20 000 rule draws per attempt, 2 000 attempts per code), then an error instead of a possible endless run; existing codes give the same puzzles (pinned by `test_code.js`). Measured on 40 000 puzzles: mean 11.6 ms, 99th percentile 22 ms, 99.99th 74 ms, maximum 192 ms. The on-the-spot search for a level is protected against a failure, and a level for which nothing is found says so (new text in the 20 languages).
- **Packs**: a verified pick tries up to 20 puzzles (was 8) before giving up.
- **Service worker**: when the installation of a new version fails (a file missing), the half-filled cache of that version is now deleted; the old version keeps serving, offline included (tested in a browser: offline start, update, failed install).
- **Tests**: `test_engine.js` now exits with an error when a generated puzzle is not solved by deduction (it only counted before, so the CI could stay green).

## 1.2.1 - 2026-10-15
Fourth review by Kimi K3 (each point checked in the code first; one was wrong and is not changed: `theme-color` already follows the theme), and the first add-on pack.
- **Packs**: the score written in a pack only decides where a puzzle is *listed*. Before a puzzle is offered for a level, the game now rebuilds and grades it (`pickVerified`); one that does not match is dropped for the session. The documentation said a pack "cannot lie about difficulty": it now says exactly what is guaranteed.
- **Puzzle of the day**: `daily()` refuses a date that is not `YYYY-MM-DD` (it compares strings).
- **Saved games**: `validGame` also refuses a save whose board (or any history step) excludes its own solution, and a solution row that is not a permutation of 1-6 (17 corrupted saves are rejected in the tests, instead of 14).
- **Add-on "Ultimate"** (`addons/ultimate.json`, 500 puzzles, 4 KB compressed): the 500 hardest of 540 new extreme puzzles found among about 97 000 generated (raw score 203 to 261; the extreme puzzles of the base pack stop at 242). Listed in `addons/index.json`, installable from Options. `test_library.js` checks the index, the packs and a tenth of their puzzles.
- **Tools**: `grade_distribution.js --keep-min N --until K` (keeps only the puzzles of a high score: how the extreme puzzles are found); `make_pack.js --exclude-base`, and `--base` now refuses to overwrite `lib_base.js` without `--force` (the puzzle of the day indexes into its order).

## 1.2.0 - 2026-10-15
Levels, puzzle packs, background generation.
- **Difficulty**: `gradeSolve()` replays the solution like a systematic player (easiest kind of clue first); its score becomes a **note 0-20** (rank among 100 002 generated puzzles) and one of **five levels**: Facile, Normal, Difficile, Expert, Extrême (the top 0.5 %, 1 puzzle in 200). The level is shown under the code on the board; it is recomputed from the puzzle, so it needs no new field in codes or saves. The scale is versioned (`SCALE_VERSION = 1`).
- **New game** offers "Choose a level" (five levels); the **puzzle of the day** now has a level drawn uniformly from the date, from 2026-10-15 (earlier dates keep the old rule). Its level is shown in the menu.
- **Statistics by level** (won, best time, average time); games already played with a code are classified afterwards, a few at a time. No change to the export/import file.
- **Puzzle packs**: base pack of 2 500 puzzles (`lib_base.js`, 500 per level, 22 KB compressed); add-ons are JSON lists of codes (`addons/`, or "Install a pack (file)" in Options), validated strictly and refused if made for another generator or scale. Puzzles already played are not offered again.
- **Background generation**: while a game is on screen, one puzzle every 10 s is made, graded and kept for its level (40 per level at most), in a Web Worker.
- Tools: `tools/grade_distribution.js`, `tools/make_pack.js`; test `test_library.js`. 20 new texts in the 20 languages (same reservation as the others: not proofread by native speakers).

## 1.1.0 - 2026-10-14
Puzzle codes, puzzle of the day, and a tidier menu.
- Every puzzle has a **code** `01-AAAA-AAAA` (generator version + 8-character seed, 40 bits): the same code always gives the same puzzle. It is shown in small characters under the timer (tap it to copy it), on the victory screen, and kept with each game in the statistics (also in the export/import file, where it must be well formed).
- **New game** now offers three choices: a random puzzle, the **puzzle of the day** (derived from the date of the device, from 00:00:00 to 23:59:59 in its time zone; marked "done in m:ss" once solved), and **Enter a puzzle code** (the field fills in the dashes while you type, accepts a pasted code, reads o/i/l as 0/1/1, and refuses an invalid code without closing). Starting any of them while a game is in progress still asks for confirmation.
- Menu and dialog buttons are aligned and standardised: three or more buttons are stacked in a column of equal width, one or two share a row equally, same font and size as the home menu.
- The generator draws from a seeded generator when a code is given (`engine.js`); `test_code.js` pins five puzzles and three daily codes so that an accidental change of the algorithm is caught (it would need a new generator version). The saved-game check accepts an optional canonical code.
- 10 new texts in the 20 languages.

## 1.0.4 - 2026-10-14
Accessibility and keyboard play, following the suggestions of a fourth external review.
- Keyboard (desktop): arrow keys / Home / End move over the board, Enter opens a cell (the focus goes into the zoom panel), 1 to 6 apply the current mode (choose or exclude) to a symbol, Shift+Enter applies the other one, arrows move inside the panel, M switches the mode, U or Ctrl+Z undoes, T reads the time, Esc closes the panel (or opens the menu). Digits work directly on the focused cell too.
- Screen readers: each cell has a spoken description ("Row 2, column 3: unsolved, 4 possible: ..."), the symbols have names (shapes, signs and dice are translated), clues are buttons with a description ("3 next to square") and a pressed state, and a polite live region announces moves, errors, mode changes, undo and the time on request.
- Focus management: one tab stop on the board (roving), the focus goes into the zoom panel and comes back to the cell, dialogs take the focus, trap it, close with Esc and give it back; visible focus ring for keyboard users only.
- 26 new texts in the 20 languages (same reservation as the other translations: not proofread by native speakers).

## 1.0.3 - 2026-10-14
Robustness, following a second external review of the repository.
- A saved game read back from `localStorage` is now checked strictly (`validGame` in `engine.js`: structure, sizes, value ranges, rule coordinates, history) before it reaches the engine or the interface. A truncated, edited or incompatible save is discarded instead of leaving "Continue" active and failing on every click, or opening a broken game. Covered by tests (200 generated games accepted, 14 kinds of corrupted saves rejected).
- Imported statistics: a date must be a real calendar day (`2026-19-42` and `2026-02-30` were accepted).
- `test_version.js` also checks the sound files cached separately by `sw.js`.
- Look: the "choose" button (check mark) is now green on a green background in every theme, the counterpart of the red cross on a red background (`--mode-ok-bg/fg/bd`, documented in `THEMES.md`).
- The short tap / long press reminder now stays permanently at the bottom of the screen, as it already did in the zoom panel (the toast that replaced it is gone). It is hidden while the zoom panel, which has its own, is open.

## 1.0.2 - 2026-10-14
Hardening, following an external security review of the repository.
- Content Security Policy (`<meta http-equiv>` in `index.html`): scripts, workers, manifest, images, media and connections only from the application's own origin; no plugins, no `<base>`, no form submission. Inline styles stay allowed (the style sheet is inlined, the symbols use style attributes).
- Values read back from `localStorage` are HTML-escaped before being put in the statistics table (`esc()`; the date fallback of `fmtDate` and the error counter were the only paths that could carry a raw string).
- README: the Python server is for local tests only; link to the installable version on GitHub Pages.

## 1.0.1 - 2026-10-14
Fixes following an external review of the repository.
- Statistics export: if the share sheet fails for any reason other than the user cancelling it, the file is now downloaded instead of being silently lost.
- `ruleToJSON` throws an explicit error for an unknown rule type (it returned `undefined` and crashed later); the remaining French error messages are in English.
- `has()` in `i18n.js` follows the same fallback chain as `t()` (current language, English, French).
- New `test_version.js` (app version, service-worker cache name and changelog must agree; every cached file must exist) and a GitHub Actions workflow running the three test scripts on every push.

## 1.0.0 - 2026-10-14
- First public release of **1-5731N** (display name "1-5+31IV"): an installable web app port of the free game *Einstein Puzzle* 2.0 (Flowix Games, GPL v2+).
- Engine ported from the original generator and solver; every puzzle is solvable by pure deduction (checked on 40 generated puzzles).
- 20 languages, 4 themes in light and dark versions, sounds of the original, offline use, export/import of the statistics.
- Logo and icon: a lifted pebble over a glowing "1" (stippled point cloud generated by `tools/logo/`).
- Title "1-5+31IV" drawn with the game's own symbols; slogan "Lift the stone…".
