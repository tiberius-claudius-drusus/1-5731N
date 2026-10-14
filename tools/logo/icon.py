#!/usr/bin/env python3
"""
---------------------------------------------------------------------------
File      : 1-5731n/tools/logo/icon.py
Version   : 1.0.0
Role      : Application icon: stippled pebble over a "1" (fewer, larger points so that it stays readable at 48 px) on a dark background.
Depends on: Python 3 with numpy, scipy, pillow ; stipple.py
Called by : by hand: icon.py <crop.png> <output dir> [N [fill]]
Produces  : icon-512.png, icon-192.png, icon-180.png (Apple touch icon) in the output dir
Changelog : see CHANGELOG.md
---------------------------------------------------------------------------
Application icon: stippled pebble over a "1" on a dark background (the Dark version colours of the Clean theme).
Usage: icon.py <crop.png> <output dir> [N] [fill]  ->  icon-512.png, icon-192.png, icon-180.png
fill = share of the height taken by the pebble (0.72 keeps it inside the Android maskable safe zone).
"""
import sys, os, numpy as np
from PIL import Image, ImageDraw
import stipple as S

BG, DOT = (18, 22, 31), (109, 155, 255)          # background of the dark version of the Clean theme, dark accent
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 3000
FILL = float(sys.argv[4]) if len(sys.argv) > 4 else 0.76
os.makedirs(out, exist_ok=True)
import pebble as P
P.source().save(src)
a = np.clip(np.asarray(Image.open(src).convert('L').resize((S.W, S.W), Image.LANCZOS), float) / 255.0 * 1.15, 0, 1); m = S.mask()
dens = S.density(a, m, 'neg', 1.35)
pts = S.stipple(dens, N, iters=60)
rad = S.radii(pts, dens, 0.26, 0.48)
xs, ys = pts[:, 0] / S.W, pts[:, 1] / S.W
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
side = max(x1 - x0, y1 - y0)


def render(size, fill=FILL):
    """fill : part de la hauteur occupée par le visage (zone de sécurité « maskable » = 80 % centraux)."""
    K = 4
    im = Image.new('RGB', (size * K, size * K), BG)
    d = ImageDraw.Draw(im)
    scale = size * K * fill / side
    ox = size * K / 2 - (x0 + x1) / 2 * scale
    oy = size * K / 2 - (y0 + y1) / 2 * scale
    for x, y, r in zip(xs, ys, rad):
        cx, cy, rr = ox + x * scale, oy + y * scale, r * scale
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=DOT)
    return im.resize((size, size), Image.LANCZOS)


for n in (512, 192, 180):
    render(n).save(f'{out}/icon-{n}.png')
print('ok', len(pts), 'points')
