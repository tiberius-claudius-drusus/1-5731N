/* ---------------------------------------------------------------------------
 * File      : 1-5731n/i18n.js
 * Version   : 1.0.0
 * Role      : Translation engine: language registry, lookup with fallback, browser-language detection, DOM text application, text direction.
 * Depends on: lang/<code>.js (each calls SteinI18n.add)
 * Called by : app.js (window.SteinI18n) ; test_lang.js ; index.html (script tag)
 * Produces  : window.SteinI18n : add, t, tOr, has, list, detect, apply, set, plain, lang
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Each language is a file lang/<code>.js calling SteinI18n.add(code, { name, dir, s: { key: text } }).
 * English is the default language (phone language not supported, or missing text); French (lang/fr.js) is the
 * reference for the keys: a key missing from a language falls back to English, then French.
 * Texts may contain {placeholders} (replaced by t(key, { placeholder: value })) and a little HTML (<b>, <i>).
 * In the page: data-i18n="key" (text), data-i18n-html="key" (with tags), data-i18n-title / data-i18n-aria="key".
 * Adding a language: copy lang/fr.js, translate, add the <script> to index.html and the file to sw.js / deploy_portail.sh.
 */
(function () {
  'use strict';
  var langs = {}, cur = 'en', DEFAULT = 'en';
  var PT_EU = ['pt', 'ao', 'mz', 'cv', 'gw', 'st', 'tl', 'mo'];   // regions where people write as in Portugal
  var ORDER = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'la', 'nl', 'pl', 'pt-br', 'pt-pt', 'ru', 'tr', 'uk', 'vi', 'zh'];   // order of the selector: alphabetical by language code

  function add(code, def) { langs[code] = def; }
  function has(key) { return !!(langs.fr && langs.fr.s[key] != null); }

  function t(key, params) {
    var s = langs[cur] && langs[cur].s[key];
    if (s == null) s = langs[DEFAULT] && langs[DEFAULT].s[key];
    if (s == null) s = langs.fr && langs.fr.s[key];
    if (s == null) return key;
    if (params) s = s.replace(/\{(\w+)\}/g, function (m, k) { return k in params ? params[k] : m; });
    return s;
  }
  /* Text of a key if it exists, otherwise the fallback (e.g. name of a theme added later, not yet translated). */
  function tOr(key, fallback) { return has(key) ? t(key) : fallback; }
  function plain(s) { return s.replace(/<[^>]+>/g, ''); }

  function list() {
    var codes = Object.keys(langs).sort(function (a, b) {
      var ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return codes.map(function (c) { return { code: c, name: langs[c].name }; });
  }

  /* Browser language among the ones we have; otherwise English. */
  function detect() {
    var wanted = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || DEFAULT]);
    for (var i = 0; i < wanted.length; i++) {
      var full = String(wanted[i]).toLowerCase(), parts = full.split('-'), base = parts[0];
      if (langs[full]) return full;
      // Portuguese: Portugal and Lusophone countries of Africa/Asia → pt-pt; Brazil or no region → pt-br (the most widespread)
      if (base === 'pt') { var pt = PT_EU.indexOf(parts[1]) >= 0 ? 'pt-pt' : 'pt-br'; return langs[pt] ? pt : DEFAULT; }
      if (langs[base]) return base;
    }
    return DEFAULT;
  }

  /* Writes the static texts of the page (data-i18n* attributes). */
  function apply(root) {
    root = root || document;
    var q = function (sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); };
    q('[data-i18n]', function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    q('[data-i18n-html]', function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    q('[data-i18n-title]', function (el) { el.setAttribute('title', plain(t(el.getAttribute('data-i18n-title')))); });
    q('[data-i18n-aria]', function (el) { el.setAttribute('aria-label', plain(t(el.getAttribute('data-i18n-aria')))); });
  }

  function set(code) {
    if (!langs[code]) code = DEFAULT;
    cur = code;
    document.documentElement.lang = code;
    document.documentElement.dir = langs[code].dir || 'ltr';
    apply();
    return code;
  }

  window.SteinI18n = { add: add, t: t, tOr: tOr, has: has, list: list, detect: detect, apply: apply, set: set, plain: plain, get lang() { return cur; } };
})();
