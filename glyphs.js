/* ---------------------------------------------------------------------------
 * File      : 1-5731n/glyphs.js
 * Version   : 1.0.0
 * Role      : The 36 game symbols and the 2 clue symbols, drawn as SVG (vector), plus the UI pictograms used by the buttons.
 * Depends on: none
 * Called by : index.html (script tag) ; app.js (window.SteinGlyphs)
 * Produces  : SVG <symbol> sprite injected in the page ; window.SteinGlyphs.glyph / hint / icon
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Symbols are injected into the page as <symbol> and displayed with
 *   <svg viewBox="0 0 48 48"><use href="#g-A1"/></svg>
 * Everything uses currentColor: colour, stroke weight (--glyph-weight, --glyph-stroke, --glyph-stroke-bold)
 * and font (--glyph-font) come from the theme, never from this file.
 * Theme variables used: --glyph-font, --glyph-weight (text: rows A and B), --glyph-stroke, --glyph-stroke-bold (strokes);
 * --icon-stroke (button pictograms).
 * Rows: A digits, B letters, C Roman numerals, D dice, E shapes, F signs.
 * Identifiers: g-<row><1..6> ; clue symbols: h-near (neighbour, double arrow), h-side (dots: "to the left of").
 */
(function () {
  'use strict';
  var S = [];                                     // symbols
  function sym(id, body) { S.push('<symbol id="' + id + '" viewBox="0 0 48 48">' + body + '</symbol>'); }
  // text: font and weight come from the theme
  function txt(s, size, y) {
    return '<text x="24" y="' + y + '" text-anchor="middle" fill="currentColor" font-size="' + size +
      '" style="font-family:var(--glyph-font);font-weight:var(--glyph-weight)">' + s + '</text>';
  }
  // strokes: weight comes from the theme
  function line(inner) {
    return '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:var(--glyph-stroke)">' + inner + '</g>';
  }
  function dot(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="currentColor"/>'; }

  var i;
  // A — digits
  for (i = 1; i <= 6; i++) sym('g-A' + i, txt(i, 34, 36.5));
  // B — letters
  'ABCDEF'.split('').forEach(function (l, k) { sym('g-B' + (k + 1), txt(l, 32, 35.5)); });
  // C — Roman numerals: drawn as paths (no text, so they do not depend on the phone's font)
  function bold(inner) {
    return '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:var(--glyph-stroke-bold)">' + inner + '</g>';
  }
  var ROM = [
    'M24 12V36',
    'M18 12V36M30 12V36',
    'M13 12V36M24 12V36M35 12V36',
    'M10 12V36M18 12L28 36L38 12',
    'M12 12L24 36L36 12',
    'M8 12L17.5 36L27 12M38 12V36'
  ];
  ROM.forEach(function (d, k) { sym('g-C' + (k + 1), bold('<path d="' + d + '"/>')); });
  // D — dice
  var P = { c: [24, 24], tl: [13, 13], tr: [35, 13], bl: [13, 35], br: [35, 35] };
  var dice = [
    ['c'], ['tr', 'bl'], ['tr', 'c', 'bl'], ['tl', 'tr', 'bl', 'br'], ['tl', 'tr', 'c', 'bl', 'br'],
    [[14, 12], [14, 24], [14, 36], [34, 12], [34, 24], [34, 36]]
  ];
  dice.forEach(function (d, k) {
    sym('g-D' + (k + 1), d.map(function (p) { p = typeof p === 'string' ? P[p] : p; return dot(p[0], p[1], 5.4); }).join(''));
  });
  // E — shapes
  var E = [
    '<polygon points="24,9 40,38 8,38"/>',
    '<polygon points="8,10 40,10 24,39"/>',
    '<rect x="10" y="10" width="28" height="28" rx="1.5"/>',
    '<polygon points="24,7 41,24 24,41 7,24"/>',
    '<polygon points="24,8 40.6,20.1 34.3,39.7 13.7,39.7 7.4,20.1"/>',
    '<polygon points="24,40 40.6,27.9 34.3,8.3 13.7,8.3 7.4,27.9"/>'
  ];
  E.forEach(function (s, k) { sym('g-E' + (k + 1), line(s)); });
  // F — signs
  var F = [
    line('<path d="M24 10V38M10 24H38"/>'),
    line('<path d="M9 24H39"/>'),
    line('<path d="M9 24H39"/>') + dot(24, 12, 3) + dot(24, 36, 3),
    line('<path d="M13 13L35 35M35 13L13 35"/>'),
    line('<path d="M10 17H38M10 31H38"/>'),
    line('<path d="M6 27L12.5 22.5L20 38L30 9H43"/>')
  ];
  F.forEach(function (s, k) { sym('g-F' + (k + 1), s); });
  // title "1-5+31IV": same height (12..36) and same bold stroke for every character, whatever the theme font
  var TITLE = {
    '1': 'M16.5 18L24 12V36',
    '3': 'M14 15C17 10.5 31 10.5 32.5 17.5C33.5 23 27 24 22 24C28 24 34.5 25.5 33.5 31C32 38.5 18 38.5 13.5 33.5',
    '5': 'M32 12H16.5L15 22.5C19 19.5 30 19.5 32.5 28C34 38 20 39.5 13.5 33.5',
    'minus': 'M12 24H36',
    'plus': 'M24 12V36M12 24H36',
    'IV': 'M9.5 12V36M17.5 12L27.5 36L37.5 12'
  };
  Object.keys(TITLE).forEach(function (k) { sym('t-' + k, bold('<path d="' + TITLE[k] + '"/>')); });
  // clues
  sym('h-near', line('<path d="M8 24H40M15 17L8 24L15 31M33 17L40 24L33 31"/>'));
  sym('h-side', dot(11, 24, 3.4) + dot(24, 24, 3.4) + dot(37, 24, 3.4));

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">' + S.join('') + '</svg>';
  function inject() { document.body.insertAdjacentHTML('afterbegin', svg); }
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);

  /* UI pictograms (buttons): strokes on a 24×24 grid, weight --icon-stroke from the theme. */
  var ICONS = {
    menu: 'M4 7h16M4 12h16M4 17h16',
    undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H8',
    ok: 'M5 12.5l4.5 4.5L19 7.5',
    no: 'M6 6l12 12M18 6L6 18',
    up: 'M12 20V5M5 11.5l7-7 7 7',
    left: 'M20 12H5M11.5 5l-7 7 7 7',
    right: 'M4 12h15M12.5 5l7 7-7 7'
  };

  /* A ready-to-use symbol: glyph(row 0..5, element 1..6) */
  window.SteinGlyphs = {
    glyph: function (row, el) {
      return '<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><use href="#g-' + 'ABCDEF'[row] + el + '"/></svg>';
    },
    icon: function (name, inline) {
      return '<svg class="ic' + (inline ? ' in' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
    },
    hint: function (id) {
      return '<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><use href="#h-' + id + '"/></svg>';
    }
  };
})();
