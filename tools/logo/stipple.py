#!/usr/bin/env python3
"""
---------------------------------------------------------------------------
File      : 1-5731n/tools/logo/stipple.py
Version   : 1.0.0
Role      : Weighted-Voronoi stippling (Secord 2002) of an image, in two polarities, with point radii bounded by the nearest neighbour.
Depends on: Python 3 with numpy, scipy, pillow (virtual environment .venv)
Called by : by hand: stipple.py <image> <output dir> [N ...] ; imported by icon.py
Produces  : <output dir>/{pos,neg}_<N>.json (normalised x, y, r) and PNG previews
Changelog : see CHANGELOG.md
---------------------------------------------------------------------------
Two polarities:
  pos: points where the image is DARK  -> dark points on a light background
  neg: points where the image is LIGHT -> light points on a dark background
Output: normalised points (x, y, r) in 0..1, plus PNG previews.
Usage: stipple.py <image> <output dir> [N ...]
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial import cKDTree

W = 400                       # working resolution
rng = np.random.default_rng(7)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def load(path):
    im = Image.open(path).convert('L').resize((W, W), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255.0
    lo, hi = np.percentile(a, 2), np.percentile(a, 98)
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    from scipy.ndimage import gaussian_filter
    mu = gaussian_filter(a, 38)
    sd = np.sqrt(gaussian_filter((a - mu) ** 2, 38)) + 0.06
    loc = np.clip(0.5 + 0.30 * (a - mu) / sd, 0, 1)
    return np.clip(0.45 * a + 0.55 * loc, 0, 1)


def mask():
    """No outline: the whole image is stippled (the source image is generated, with a black background)."""
    return np.ones((W, W))


def density(a, m, polarity, gamma):
    base = (1 - a) if polarity == 'pos' else a
    return (base ** gamma) * m


def stipple(dens, n, iters=45):
    flat = dens.ravel()
    p = flat / flat.sum()
    idx = rng.choice(flat.size, size=n, p=p)
    ys, xs = np.divmod(idx, W)
    pts = np.stack([xs, ys], 1).astype(np.float64) + rng.random((n, 2))
    gy, gx = np.mgrid[0:W, 0:W]
    P = np.stack([gx.ravel() + 0.5, gy.ravel() + 0.5], 1)
    w = flat
    for _ in range(iters):
        tree = cKDTree(pts)
        _, cell = tree.query(P, workers=-1)
        ws = np.bincount(cell, weights=w, minlength=n)
        cx = np.bincount(cell, weights=w * P[:, 0], minlength=n)
        cy = np.bincount(cell, weights=w * P[:, 1], minlength=n)
        ok = ws > 1e-12
        pts[ok, 0] = cx[ok] / ws[ok]
        pts[ok, 1] = cy[ok] / ws[ok]
        pts = np.clip(pts, 0, W - 1e-6)
    return pts


def radii(pts, dens, k_min, k_max):
    xi = np.clip(pts[:, 0].astype(int), 0, W - 1)
    yi = np.clip(pts[:, 1].astype(int), 0, W - 1)
    d = dens[yi, xi]
    d = (d - d.min()) / (d.max() - d.min() + 1e-9)
    nn = cKDTree(pts).query(pts, k=2)[0][:, 1] / W          # distance to the nearest neighbour (0..1)
    return nn * (k_min + (k_max - k_min) * d)


def preview(pts, rad, polarity, size, path):
    bg, fg = ((245, 246, 248), (29, 35, 48)) if polarity == 'pos' else ((18, 22, 31), (232, 235, 242))
    S = 3
    im = Image.new('RGB', (size * S, size * S), bg)
    dr = ImageDraw.Draw(im)
    for (x, y), r in zip(pts, rad):
        cx, cy, rr = x / W * size * S, y / W * size * S, r * size * S
        dr.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=fg)
    im.resize((size, size), Image.LANCZOS).save(path)


def main():
    src, out = sys.argv[1], sys.argv[2]
    ns = [int(x) for x in sys.argv[3:]] or [1200, 2500, 4000]
    os.makedirs(out, exist_ok=True)
    a, m = load(src), mask()
    for pol, gamma in (('pos', 1.25), ('neg', 1.35)):
        dens = density(a, m, pol, gamma)
        for n in ns:
            pts = stipple(dens, n)
            # point size: a little smaller when there are many
            rad = radii(pts, dens, 0.20, 0.47)
            data = {'n': n, 'pol': pol, 'pts': [[round(float(x) / W, 4), round(float(y) / W, 4), round(float(r), 4)] for (x, y), r in zip(pts, rad)]}
            json.dump(data, open(f'{out}/{pol}_{n}.json', 'w'))
            preview(pts, rad, pol, 360, f'{out}/{pol}_{n}.png')
            print(pol, n, 'ok')


if __name__ == "__main__":
    main()
