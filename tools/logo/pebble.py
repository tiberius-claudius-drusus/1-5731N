#!/usr/bin/env python3
"""
---------------------------------------------------------------------------
File      : 1-5731n/tools/logo/pebble.py
Version   : 1.0.0
Role      : Draws the source image (lifted pebble, glowing "1" underneath) and stipples it with stipple.py.
Depends on: Python 3 with numpy, scipy, pillow ; stipple.py ; DejaVu Sans Bold font
Called by : by hand: pebble.py <output dir> [N]
Produces  : <output dir>/source.png, neg_<N>.json, neg_<N>.png
Changelog : see CHANGELOG.md
---------------------------------------------------------------------------
Usage: pebble.py <output dir> [N]
"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import stipple as S

SIZE = 560
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def source():
    im = Image.new('L', (SIZE, SIZE), 0)
    # glowing "1" under the stone
    one = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(one).text((SIZE * 0.60, SIZE * 0.66), '1', font=ImageFont.truetype(FONT, 360), fill=255, anchor='mm')
    glow = one.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.55))
    im = Image.fromarray(np.clip(np.asarray(im, float) + np.asarray(glow, float), 0, 255).astype('uint8'))
    im = Image.fromarray(np.maximum(np.asarray(im), np.asarray(one)))
    # ground line (flat shadow)
    a = np.asarray(im, float)
    # pebble: ellipse, tilted, lifted up-left, shaded from the top-left
    pw, ph, ang = 330, 235, -24
    cx, cy = SIZE * 0.34, SIZE * 0.30
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(float)
    t = np.radians(ang)
    u = (xx - cx) * np.cos(t) + (yy - cy) * np.sin(t)
    v = -(xx - cx) * np.sin(t) + (yy - cy) * np.cos(t)
    th = np.arctan2(v / (ph / 2), u / (pw / 2))
    wob = 1 + 0.05 * np.sin(3 * th + 0.8) + 0.035 * np.sin(5 * th + 2.1) + 0.02 * np.sin(7 * th)
    r2 = ((u / (pw / 2)) ** 2 + (v / (ph / 2)) ** 2) / wob ** 2
    inside = r2 <= 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))                       # dome
    lx, ly = -0.45, -0.7
    nx, ny = u / (pw / 2) * 0.9, v / (ph / 2) * 0.9
    shade = np.clip(0.52 + 0.32 * (-(nx * lx + ny * ly)) + 0.25 * z, 0, 1)
    rng = np.random.default_rng(5)
    from scipy.ndimage import gaussian_filter
    grain = gaussian_filter(rng.standard_normal((SIZE, SIZE)), 3) * 0.9
    stone = np.clip(shade * 255 * 0.82 + grain * 30, 0, 255)
    edge = np.clip((1 - r2) * 9, 0, 1)                       # dark rim
    # cast shadow under the stone, on the "1" and the ground
    sh = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(sh).ellipse((cx - pw * 0.42 + 40, cy + ph * 0.18 + 36, cx + pw * 0.42 + 40, cy + ph * 0.18 + 36 + ph * 0.8), fill=255)
    shadow = np.asarray(sh.rotate(ang, center=(cx + 40, cy + 70)).filter(ImageFilter.GaussianBlur(14)), float) / 255
    a = a * (1 - 0.35 * shadow)
    a = np.where(inside, a * (1 - edge) + stone * edge, a)
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'))


def main():
    out = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
    os.makedirs(out, exist_ok=True)
    src = source()
    src.save(f'{out}/source.png')
    S.mask = lambda: np.ones((S.W, S.W))
    a = np.asarray(Image.open(f'{out}/source.png').convert('L').resize((S.W, S.W), Image.LANCZOS), float) / 255.0
    a = np.clip(a * 1.15, 0, 1)
    dens = S.density(a, S.mask(), 'neg', 1.2)
    pts = S.stipple(dens, n)
    rad = S.radii(pts, dens, 0.20, 0.47)
    import json
    json.dump({'n': n, 'pol': 'neg', 'pts': [[round(float(x) / S.W, 4), round(float(y) / S.W, 4), round(float(r), 4)] for (x, y), r in zip(pts, rad)]}, open(f'{out}/neg_{n}.json', 'w'))
    S.preview(pts, rad, 'neg', 360, f'{out}/neg_{n}.png')
    print('ok', n)


if __name__ == '__main__':
    main()
