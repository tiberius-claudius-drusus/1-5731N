/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_lang.js
 * Version   : 1.0.0
 * Role      : Translation check: every language has exactly the keys of French, the same {placeholders} and the same HTML tags.
 * Depends on: Node.js ; i18n.js ; lang/*.js
 * Called by : by hand: node test_lang.js (exit code 1 on any problem)
 * Produces  : summary on stdout
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Usage: node test_lang.js
 */
const fs = require('fs'), path = require('path');
global.window = global; global.document = { documentElement: {}, querySelectorAll: () => [] };
global.navigator = { language: 'fr' };
require('./i18n.js');
const files = fs.readdirSync(path.join(__dirname, 'lang')).filter(f => f.endsWith('.js')).sort();
files.forEach(f => require('./lang/' + f));
const I = window.SteinI18n, langs = I.list().map(l => l.code);
const get = (code) => { I.set(code); return I; };
// direct access to the tables: each file is read again with a dummy SteinI18n
const tables = {};
files.forEach(f => { const src = fs.readFileSync(path.join(__dirname, 'lang', f), 'utf8'); const o = {}; new Function('SteinI18n', src)({ add: (c, d) => { o[c] = d; } }); Object.assign(tables, o); });
const ref = tables.fr.s, keys = Object.keys(ref), ph = s => (s.match(/\{\w+\}/g) || []).sort().join(), tg = s => (s.match(/<\/?[a-z]+>/g) || []).sort().join();
let bad = 0;
for (const [c, d] of Object.entries(tables)) {
  const miss = keys.filter(k => d.s[k] == null), extra = Object.keys(d.s).filter(k => !(k in ref));
  if (miss.length || extra.length) { console.log(c, 'missing keys:', miss, 'extra:', extra); bad++; }
  for (const k of keys) if (d.s[k] != null) {
    if (ph(d.s[k]) !== ph(ref[k])) { console.log(c, k, 'marqueurs', ph(d.s[k]), '≠', ph(ref[k])); bad++; }
    if (tg(d.s[k]) !== tg(ref[k])) { console.log(c, k, 'balises', tg(d.s[k]), '≠', tg(ref[k])); bad++; }
    if (!d.s[k].trim()) { console.log(c, k, 'vide'); bad++; }
  }
  if (!d.name || (d.dir !== 'ltr' && d.dir !== 'rtl')) { console.log(c, 'name/dir invalides'); bad++; }
}
console.log(Object.keys(tables).length, 'languages,', keys.length, 'keys,', bad ? bad + ' problem(s)' : 'all consistent');
process.exit(bad ? 1 : 0);
