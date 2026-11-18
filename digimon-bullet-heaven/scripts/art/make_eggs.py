#!/usr/bin/env python3
"""Draws patterned Digi-Eggs: ten patterns for each starter line.

The egg's outline and shading come from the plain egg already in the game
(assets/sprites/frames/digiegg/egg_00.png); each pattern is painted over it
in the line's colours and then shaded the same way, so the new eggs sit
exactly where the old ones did.

Patterns: polka dots, big spots, wavy stripes, zigzag band, flames, stars,
patches, diagonal sash, diamonds, and a two-tone cracked-shell look.

    python3 scripts/art/make_eggs.py            # writes egg_08_p0..9 (Agumon line) and egg_09_p0..9 (Gabumon line)
    python3 scripts/art/make_eggs.py sheet.png  # also writes a preview sheet
"""
import math, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, '..', '..', 'assets', 'sprites', 'frames', 'digiegg')

def rgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

def tri(x, period):
    """Triangle wave 0..1."""
    f = (x % period) / period
    return 1 - abs(2 * f - 1)

def p_dots(x, y):
    yy = y // 6; xx = x + (3 if yy % 2 else 0)
    return ((xx % 7) - 3) ** 2 + ((y % 6) - 3) ** 2 <= 3
def p_spots(x, y):
    return any((x - cx) ** 2 + (y - cy) ** 2 <= r * r for cx, cy, r in ((8, 9, 4), (17, 14, 4.5), (9, 21, 3.6), (18, 24, 2.6), (16, 5, 2.2)))
def p_stripes(x, y): return ((y + math.sin(x / 3.0) * 1.5) % 7) < 3
def p_zigzag(x, y):
    mid = 12 + tri(x, 8) * 5
    return mid <= y < mid + 4 or (mid + 9 <= y < mid + 11)
def p_flames(x, y): return y > 21 - tri(x + 2, 7) * 8 or y > 24
def p_stars(x, y):
    for cx, cy, r in ((8, 10, 3), (16, 17, 4), (9, 23, 2), (17, 7, 2)):
        dx, dy = abs(x - cx), abs(y - cy)
        if (dx == 0 and dy <= r) or (dy == 0 and dx <= r) or (dx == dy and dx <= r // 2) or dx + dy <= 1: return True
    return False
def p_patches(x, y):
    return any(((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1 for cx, cy, a, b in ((6, 10, 5, 4), (18, 8, 4, 3), (16, 19, 6, 4), (7, 23, 4, 3)))
def p_sash(x, y): return 9 <= (x + y) % 16 < 14 or (x + y) % 16 == 6
def p_diamonds(x, y): return abs((x % 8) - 4) + abs((y % 8) - 4) <= 2
def p_cracked(x, y):
    edge = 14 + tri(x, 6) * 4
    return y >= edge

PATTERNS = [('dots', p_dots), ('spots', p_spots), ('stripes', p_stripes), ('zigzag', p_zigzag), ('flames', p_flames),
            ('stars', p_stars), ('patches', p_patches), ('sash', p_sash), ('diamonds', p_diamonds), ('cracked', p_cracked)]

LINES = {
    'egg_08': [('#f6ecd0', '#f08a28'), ('#f08a28', '#fff0c0'), ('#f8d848', '#e84a2a'), ('#f6ecd0', '#e84a2a'), ('#e86a28', '#f8d848')],   # Agumon: warm
    'egg_09': [('#eef4ff', '#4aa7ff'), ('#4aa7ff', '#eef4ff'), ('#bfe0ff', '#2a4a9a'), ('#eef4ff', '#7a6ae0'), ('#3a6ad8', '#bfe8ff')],   # Gabumon: cool
}

# Every other Baby gets an egg in its own colours, read off its sprite: the
# colour it mostly is, the strongest colour that differs from that, and a
# pale tint of the first for the shell.
BABIES = ['chibomon', 'choromon', 'cotsucomon', 'jyarimon', 'kuramon', 'leafmon', 'nyokimon', 'pabumon', 'pichimon', 'poyomon',
          'pupumon', 'pururumon', 'putimon', 'puwamon', 'relemon', 'sakumon', 'tsubumon', 'yukimibotamon', 'yuramon', 'zerimon']

def hexof(c): return '#%02x%02x%02x' % (max(0, min(255, int(c[0]))), max(0, min(255, int(c[1]))), max(0, min(255, int(c[2]))))
def toward(c, d, f): return tuple(c[i] + (d[i] - c[i]) * f for i in range(3))
def sat(c): return max(c) - min(c)

def palette_of(baby):
    path = os.path.join(HERE, '..', '..', 'assets', 'sprites', 'atlases-up-all', baby + '.png')
    im = Image.open(path).convert('RGBA'); im.thumbnail((256, 256), Image.NEAREST); px = im.load(); w, h = im.size
    bins = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 200 or lum((r, g, b)) < 55: continue                       # skip outline
            k = (r // 28, g // 28, b // 28); e = bins.setdefault(k, [0, 0, 0, 0])
            e[0] += r; e[1] += g; e[2] += b; e[3] += 1
    cols = sorted(([v[0] / v[3], v[1] / v[3], v[2] / v[3], v[3]] for v in bins.values()), key=lambda v: -v[3])
    main = tuple(cols[0][:3]); total = sum(v[3] for v in cols)
    accent = None; best = 0
    for v in cols[1:]:
        c = tuple(v[:3]); d = sum((c[i] - main[i]) ** 2 for i in range(3)) ** 0.5
        score = (v[3] / total) * (d / 120.0) * (0.5 + sat(c) / 160.0)
        if d > 70 and v[3] / total > 0.02 and score > best: best = score; accent = c
    if lum(main) > 215: main = toward(main, (150, 170, 210), 0.35)             # a white Digimon still needs a visible shell colour
    if lum(main) < 60: main = toward(main, (255, 255, 255), 0.18)
    if accent is None: accent = toward(main, (255, 255, 255), 0.55) if lum(main) < 150 else toward(main, (40, 40, 80), 0.45)
    # shells need a colour that reads against a pale egg: richer, and no lighter than mid-tone
    def rich(c, k=1.6):
        m = sum(c) / 3.0
        return tuple(max(0, min(255, m + (v - m) * k)) for v in c)
    main = rich(main)
    while lum(main) > 150: main = toward(main, tuple(v * 0.45 for v in rich(main, 1.3)), 0.25)
    accent = rich(accent, 1.3)
    if abs(lum(accent) - lum(main)) < 45: accent = toward(accent, (255, 255, 255), 0.5) if lum(main) < 110 else toward(accent, (30, 25, 60), 0.5)
    pale = toward(main, (255, 250, 238), 0.86)
    if lum(pale) - lum(main) < 40: pale = toward(pale, (255, 255, 255), 0.6)
    deep = toward(main, (20, 20, 50), 0.4)
    return [(hexof(pale), hexof(main)), (hexof(main), hexof(pale)), (hexof(pale), hexof(accent)), (hexof(main), hexof(accent)), (hexof(accent), hexof(pale)), (hexof(pale), hexof(deep))]

for _b in BABIES:
    try: LINES['egg_' + _b] = palette_of(_b)
    except Exception as _e: print('no sprite for', _b, _e)

def template():
    im = Image.open(os.path.join(DIR, 'egg_00.png')).convert('RGBA'); px = im.load(); w, h = im.size
    inside = [px[x, y] for y in range(h) for x in range(w) if px[x, y][3] and lum(px[x, y]) > 60]
    inside.sort(key=lum); base = lum(inside[len(inside) // 2])
    return im, base

def paint(tpl, base_l, basec, patc, fn, crack=False):
    w, h = tpl.size; src = tpl.load(); out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); o = out.load()
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if not c[3]: continue
            l = lum(c)
            col = patc if fn(x, y) else basec
            if l <= 60:                                  # the outline: a dark shade of whatever it wraps
                o[x, y] = (int(col[0] * 0.24 + 14), int(col[1] * 0.22 + 10), int(col[2] * 0.26 + 20), 255); continue
            f = max(0.6, min(1.3, l / base_l))
            if f > 1: o[x, y] = tuple(int(v + (255 - v) * (f - 1) * 1.6) for v in col) + (255,)
            else: o[x, y] = tuple(int(v * (0.35 + 0.65 * f)) for v in col) + (255,)
    if crack:                                            # a thin dark line where the two halves meet
        for x in range(w):
            y = int(14 + tri(x, 6) * 4)
            if 0 <= y < h and src[x, y][3] and lum(src[x, y]) > 60: o[x, y] = (40, 30, 40, 255)
    return out

def main():
    tpl, base_l = template(); made = []
    for frame, pals in LINES.items():
        for k, (name, fn) in enumerate(PATTERNS):
            b, p = pals[k % len(pals)]
            im = paint(tpl, base_l, rgb(b), rgb(p), fn, crack=(name == 'cracked'))
            im.save(os.path.join(DIR, '%s_p%d.png' % (frame, k))); made.append(im)
    if len(sys.argv) > 1:
        Z = 2; w, h = tpl.size; cols = len(PATTERNS)
        sheet = Image.new('RGBA', (cols * (w * Z + 8), len(LINES) * (h * Z + 8)), (40, 60, 50, 255))
        for k, im in enumerate(made):
            big = im.resize((w * Z, h * Z), Image.NEAREST); sheet.paste(big, ((k % cols) * (w * Z + 8) + 4, (k // cols) * (h * Z + 8) + 4), big)
        sheet.save(sys.argv[1])
    print('wrote', len(made), 'eggs')

if __name__ == '__main__':
    main()
