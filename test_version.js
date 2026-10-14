/* ---------------------------------------------------------------------------
 * File      : 1-5731n/test_version.js
 * Version   : 1.0.1
 * Role      : Release consistency test: the version in app.js, the service-worker cache name and the top entry of CHANGELOG.md must agree; every file cached by sw.js must exist.
 * Depends on: Node.js (standard library only)
 * Called by : by hand (node test_version.js) ; GitHub Actions (.github/workflows/test.yml)
 * Produces  : stdout ; exit code 1 on any mismatch
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Why: the service worker is cache-first, so a release whose cache name was not bumped leaves installed copies on the old version.
 */
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
let bad = 0;
const fail = m => { console.log('FAIL:', m); bad++; };

const app = (read('app.js').match(/VERSION = '([0-9.]+)'/) || [])[1];
const sw = (read('sw.js').match(/const V = 'stein-([0-9.]+)'/) || [])[1];
const log = (read('CHANGELOG.md').match(/^## ([0-9.]+) /m) || [])[1];
if (!app || !sw || !log) fail('version not found (app.js: ' + app + ', sw.js: ' + sw + ', CHANGELOG.md: ' + log + ')');
else if (app !== sw || app !== log) fail('versions differ: app.js ' + app + ', sw.js cache ' + sw + ', CHANGELOG.md ' + log);

const files = JSON.parse(read('sw.js').match(/const FILES = (\[.*?\]);/s)[1].replace(/'/g, '"'));
files.filter(f => f !== './').forEach(f => { if (!fs.existsSync(path.join(__dirname, f))) fail('file cached by sw.js is missing: ' + f); });

console.log(bad ? bad + ' problem(s)' : 'version ' + app + ': app.js, sw.js and CHANGELOG.md agree; ' + files.length + ' cached files exist');
process.exit(bad ? 1 : 0);
