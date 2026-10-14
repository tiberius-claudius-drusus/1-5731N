#!/usr/bin/env python3
"""
---------------------------------------------------------------------------
File      : 1-5731n/tools/logo/build_data.py
Version   : 1.0.0
Role      : Packs the point cloud (out/neg_4000.json) into 1-5731n/logo.js: base64, 4 bytes per point, cropped to the bounding box.
Depends on: Python 3 (standard library only)
Called by : by hand: build_data.py <output logo.js>
Produces  : logo.js (generated JavaScript module for the application)
Changelog : see CHANGELOG.md
---------------------------------------------------------------------------
Packs the point cloud for the app: logo.js = one base64 string, 4 bytes per point
(x: 10 bits, y: 10 bits, r: 6 bits), cropped to the bounding box.
Usage: build_data.py <output logo.js>
"""
import json, base64, struct, sys

N = 4000


def pack(path):
    pts = json.load(open(path))['pts']
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    pad = 0.012
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    side = max(x1 - x0, y1 - y0)                       # common unit: the logo keeps its proportions
    w, h = (x1 - x0) / side, (y1 - y0) / side
    buf = bytearray()
    for x, y, r in pts:
        u = round((x - x0) / side * 1023)
        v = round((y - y0) / side * 1023)
        rr = min(63, round(r / side * 2000))
        buf += struct.pack('<I', u | (v << 10) | (rr << 20))
    return base64.b64encode(bytes(buf)).decode(), w, h


neg, w, h = pack(f'out/neg_{N}.json')   # one set only: points on the lit areas, readable on a light as well as on a dark background
js = f"""/* ---------------------------------------------------------------------------
 * File      : 1-5731n/logo.js
 * Version   : 1.0.0
 * Role      : Logo: a lifted pebble over a glowing "1" as a point cloud ({N} points), drawn on a canvas in the theme accent colour. GENERATED file.
 * Depends on: none (data embedded as base64)
 * Called by : app.js (window.SteinLogo.draw) ; index.html (script tag)
 * Produces  : window.SteinLogo : aspect, draw(canvas, color)
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Weighted-Voronoi stippling of a generated image (tools/logo/pebble.py): a lifted pebble over a glowing "1".
 * One set of {N} points, placed on the lit areas: readable on a light as well as on a dark background.
 * 4 bytes per point: x (10 bits), y (10 bits), radius (6 bits, in 1/2000 of the side).
 * Generated file: do not edit by hand (1-5731n/tools/logo/build_data.py). The Version line below is a constant of
 * the generator: bump it here (CHANGELOG.md) whenever the output changes.
 */
(function () {{
  'use strict';
  var DATA = '{neg}', ASPECT = {w / h:.4f};   // width / height
  var cache = null;
  function decode() {{
    if (cache) return cache;
    var bin = atob(DATA), n = bin.length / 4, out = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {{
      var v = (bin.charCodeAt(i * 4) | (bin.charCodeAt(i * 4 + 1) << 8) | (bin.charCodeAt(i * 4 + 2) << 16) | (bin.charCodeAt(i * 4 + 3) << 24)) >>> 0;
      out[i * 3] = (v & 1023) / 1023; out[i * 3 + 1] = ((v >>> 10) & 1023) / 1023; out[i * 3 + 2] = (v >>> 20) / 2000;
    }}
    return (cache = out);
  }}
  /* Draws the logo on a <canvas>, points in the given colour. The CSS height of the canvas sets the size. */
  window.SteinLogo = {{
    aspect: ASPECT,
    draw: function (canvas, color) {{
      var dpr = window.devicePixelRatio || 1, hCss = canvas.clientHeight || 170, wCss = hCss * ASPECT;
      canvas.style.width = wCss + 'px';
      canvas.width = Math.round(wCss * dpr); canvas.height = Math.round(hCss * dpr);
      var c = canvas.getContext('2d'), p = decode(), S = hCss * dpr;      // S: unit (side of the bounding square)
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = color; c.beginPath();
      for (var i = 0; i < p.length; i += 3) {{
        var x = p[i] * S, y = p[i + 1] * S, r = p[i + 2] * S;
        c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832);
      }}
      c.fill();
    }}
  }};
}})();
"""
open(sys.argv[1], 'w').write(js)
print('logo.js', len(js) // 1024, 'Ko ; aspect', round(w / h, 3))
