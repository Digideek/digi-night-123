#!/usr/bin/env python3
"""Draws the pickups enemies drop: XP gem, DigiBits coin, meat, fish, berry
and the six seed packets.  (The green health cross is drawn by the game and
is left as it is.)

28x28 frames, three-tone cel shading and a tinted dark outline, the same
treatment as the playable ghosts, so drops sit with the Digimon sprites.

    python3 scripts/art/make_items.py            # writes assets/items/pickups/
    python3 scripts/art/make_items.py sheet.png  # also writes a preview sheet
"""
import math, os, sys
from PIL import Image, ImageDraw

S = 28
INK = (26, 22, 38, 255)
WHITE = (255, 255, 255, 255)

def rgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
def mul(c, f): return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), 255)
def dk(c): return mul(c, 0.6)
def mix(a, b, f): return (int(a[0] + (b[0] - a[0]) * f), int(a[1] + (b[1] - a[1]) * f), int(a[2] + (b[2] - a[2]) * f), 255)
def lt(c): return mix(c, WHITE, 0.4)

class Pen:
    def __init__(self):
        self.im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def rect(self, x0, y0, x1, y1, c, edge=True): self.d.rectangle([x0, y0, x1, y1], fill=c, outline=dk(c) if edge else None)
    def ell(self, x0, y0, x1, y1, c, edge=True): self.d.ellipse([x0, y0, x1, y1], fill=c, outline=dk(c) if edge else None)
    def poly(self, pts, c, edge=True): self.d.polygon(pts, fill=c, outline=dk(c) if edge else None)
    def line(self, pts, c, w=1): self.d.line(pts, fill=c, width=w)
    def px(self, x, y, c):
        if 0 <= x < S and 0 <= y < S: self.im.putpixel((int(x), int(y)), c)
    def oval(self, cx, cy, a, b, rot, c, edge=True):
        """An ellipse turned by rot radians."""
        pts = []
        for k in range(28):
            t = 2 * math.pi * k / 28
            x, y = a * math.cos(t), b * math.sin(t)
            pts.append((round(cx + x * math.cos(rot) - y * math.sin(rot)), round(cy + x * math.sin(rot) + y * math.cos(rot))))
        self.poly(pts, c, edge)
    def finish(self):
        src = self.im.copy(); p = src.load(); out = self.im.load()
        def get(x, y): return p[x, y] if 0 <= x < S and 0 <= y < S else (0, 0, 0, 0)
        for y in range(S):
            for x in range(S):
                c = p[x, y]
                if not c[3] or c == WHITE: continue
                rim = dk(c)
                if get(x + 1, y) == rim or get(x, y + 1) == rim: out[x, y] = mix(mul(c, 0.8), (60, 40, 110, 255), 0.12)
                elif get(x - 1, y) == rim or get(x, y - 1) == rim: out[x, y] = mix(c, (255, 250, 225, 255), 0.32)
        src = self.im.copy(); p = src.load()
        for y in range(S):
            for x in range(S):
                if p[x, y][3]: continue
                for dx, dy in ((0, -1), (1, 0), (-1, 0), (0, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < S and 0 <= yy < S and p[xx, yy][3]:
                        out[x, y] = mix(mul(p[xx, yy], 0.28), INK, 0.55); break
        return self.im

def sparkle(p, x, y, big=True):
    p.px(x, y, WHITE)
    if big:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): p.px(x + dx, y + dy, WHITE)

# ---------------------------------------------------------------- items
def meat():
    """Bone-in roast: a fat haunch on a bone, seared stripes, a glossy highlight."""
    p = Pen(); bone = rgb('#f6ecd2'); m = rgb('#d2612c'); sear = rgb('#8e3414')
    p.line([(6, 22), (22, 6)], dk(bone), 5); p.line([(6, 22), (22, 6)], bone, 3)
    for cx, cy in ((4, 21), (7, 24), (21, 4), (24, 7)): p.ell(cx - 2, cy - 2, cx + 2, cy + 2, bone)
    p.oval(14, 14, 8.6, 6.6, -math.pi / 4, m)
    p.oval(12, 12, 4.4, 2.2, -math.pi / 4, rgb('#f09a52'), edge=False)       # juicy highlight
    p.line([(13, 19), (19, 13)], sear, 1); p.line([(16, 20), (20, 16)], sear, 1)
    sparkle(p, 10, 10, False); p.px(11, 9, WHITE)
    return p.finish()

def fish():
    """A plump blue fish: pale belly, forked tail, a fin and a bright eye."""
    p = Pen(); b = rgb('#2f9be6'); tail = rgb('#1f6fc0'); belly = rgb('#cdeffc')
    p.poly([(8, 14), (1, 7), (3, 14), (1, 21)], tail)
    p.poly([(11, 9), (16, 4), (20, 8)], tail)                                 # dorsal fin
    p.poly([(13, 19), (15, 23), (18, 19)], tail)                              # belly fin
    p.oval(15, 14, 9.4, 6, 0, b)
    p.poly([(8, 15), (12, 18), (17, 19), (21, 17), (23, 15)], belly, edge=False)
    p.line([(18, 10), (17, 14), (18, 18)], dk(b))                             # gill
    for sx in (10, 13): p.line([(sx, 12), (sx + 1, 14)], lt(b))
    p.rect(20, 11, 22, 13, WHITE, edge=False); p.px(21, 12, INK); p.px(22, 12, INK)
    p.line([(10, 10), (15, 9)], lt(b))
    return p.finish()

def berry():
    """Three glossy berries under a pair of leaves."""
    p = Pen(); c = rgb('#e23c98'); leaf = rgb('#4fb83c'); stem = rgb('#3a7a2a')
    p.line([(14, 7), (9, 14)], stem); p.line([(14, 7), (19, 13)], stem); p.line([(14, 7), (14, 16)], stem)
    for cx, cy, r in ((8, 16, 5), (20, 15, 5), (14, 21, 5)):
        p.ell(cx - r, cy - r, cx + r, cy + r, c)
        p.px(cx - 2, cy - 2, WHITE); p.px(cx - 1, cy - 3, WHITE); p.px(cx - 3, cy - 1, lt(c))
        p.px(cx + 1, cy + 2, dk(c))
    p.poly([(14, 7), (19, 2), (24, 4), (21, 8), (16, 9)], leaf); p.line([(15, 7), (22, 4)], dk(leaf))
    p.poly([(14, 7), (9, 2), (5, 5), (8, 8), (12, 9)], leaf); p.line([(13, 7), (7, 5)], dk(leaf))
    return p.finish()

def xp(frame):
    """A cut data crystal. Two frames: the glint moves."""
    p = Pen(); c = rgb('#27d9b8'); hi = rgb('#a8fff0'); deep = rgb('#118a8a')
    out = [(14, 4), (20, 10), (20, 18), (14, 24), (8, 18), (8, 10)]
    p.poly(out, c)
    p.poly([(14, 4), (14, 12), (8, 10)], hi, edge=False)                      # lit facet
    p.poly([(14, 24), (14, 16), (20, 18)], deep, edge=False)                  # deep facet
    p.poly([(14, 12), (18, 14), (14, 16), (10, 14)], lt(c), edge=False)       # table
    for a, b in (((14, 4), (14, 12)), ((8, 10), (10, 14)), ((20, 10), (18, 14)), ((8, 18), (10, 14)), ((20, 18), (18, 14)), ((14, 24), (14, 16))): p.line([a, b], dk(c))
    if frame == 0: sparkle(p, 11, 9)
    else: sparkle(p, 17, 12, False); sparkle(p, 12, 7, False)
    return p.finish()

def bits(frame):
    """A gold DigiBit that turns: four frames of a spin."""
    p = Pen(); g = rgb('#f6c320'); pale = rgb('#fff0a0'); w = (10, 7, 3, 7)[frame]
    p.ell(14 - w, 4, 14 + w, 24, g)
    if w >= 7:
        p.d.ellipse([14 - w + 3, 7, 14 + w - 3, 21], outline=dk(g))
        s = 3 if w == 10 else 2
        p.rect(14 - s, 14 - 3, 14 + s, 14 + 3, pale); p.px(14, 14, dk(g))     # the chip stamped on it
        p.line([(14 - s - 2, 14), (14 - s - 1, 14)], dk(g)); p.line([(14 + s + 1, 14), (14 + s + 2, 14)], dk(g))
        sparkle(p, 14 - w + 3, 9, w == 10)
    else:
        p.line([(14, 6), (14, 22)], pale); p.px(13, 8, WHITE)
    return p.finish()

# ---------------------------------------------------------------- rare foods (spire chests, 17z33)
def sweet_nut():
    """A big glazed nut with a drip of honey and a heart glint."""
    p = Pen(); shell = rgb('#c07a3a'); glaze = rgb('#ffcf5a')
    p.oval(14, 15, 9, 8, 0.3, shell)
    p.line([(8, 13), (19, 20)], dk(shell)); p.line([(10, 10), (21, 16)], dk(shell))
    p.oval(13, 10, 7, 3.4, 0.3, glaze); p.poly([(16, 12), (18, 12), (17, 17)], glaze, edge=False)
    p.ell(16, 16, 18, 18, glaze, edge=False)
    for x, y in ((21, 4), (23, 4), (20, 5), (21, 5), (22, 5), (23, 5), (24, 5), (21, 6), (22, 6), (23, 6), (22, 7)): p.px(x, y, rgb('#ff6aa8'))
    sparkle(p, 10, 9, False)
    return p.finish()

def protein_steak():
    """A thick T-bone steak with grill marks."""
    p = Pen(); m = rgb('#b8322c'); fat = rgb('#f4dcc8'); sear = rgb('#5a1810')
    p.oval(14, 15, 11, 8, -0.2, fat)
    p.oval(14, 15, 9.4, 6.6, -0.2, m)
    p.line([(13, 9), (15, 21)], rgb('#f6ecd2'), 2)
    for a in (6, 10, 18, 22): p.line([(a, 11), (a + 3, 19)], sear, 1)
    p.px(9, 11, lt(m)); p.px(10, 10, WHITE)
    return p.finish()

def golden_meat():
    """The classic haunch, but solid gold and glittering."""
    p = Pen(); bone = rgb('#fff6d8'); m = rgb('#f0b820'); sear = rgb('#a86a10')
    p.line([(6, 22), (22, 6)], dk(bone), 5); p.line([(6, 22), (22, 6)], bone, 3)
    for cx, cy in ((4, 21), (7, 24), (21, 4), (24, 7)): p.ell(cx - 2, cy - 2, cx + 2, cy + 2, bone)
    p.oval(14, 14, 8.6, 6.6, -math.pi / 4, m)
    p.oval(12, 12, 4.4, 2.2, -math.pi / 4, rgb('#fff0a0'), edge=False)
    p.line([(13, 19), (19, 13)], sear, 1)
    sparkle(p, 10, 10); sparkle(p, 19, 17, False); sparkle(p, 24, 12, False)
    return p.finish()

def digi_seed():
    """A glowing seed with circuit lines and a sprout of data."""
    p = Pen(); c = rgb('#3ad8a8'); hi = rgb('#b8fff0'); line = rgb('#0e6a5a')
    p.oval(14, 17, 6.5, 8, 0.2, c)
    p.line([(12, 12), (12, 17), (15, 17), (15, 21)], line); p.px(12, 12, hi); p.px(15, 21, hi)
    p.line([(14, 9), (14, 4)], rgb('#4fb83c')); p.poly([(14, 6), (9, 2), (10, 6)], rgb('#4fb83c')); p.poly([(14, 5), (19, 1), (18, 6)], rgb('#4fb83c'))
    p.px(11, 13, WHITE); sparkle(p, 21, 11, False)
    return p.finish()

def evo_fruit():
    """A rainbow-striped fruit with a star leaf: something strange inside."""
    p = Pen(); body = rgb('#a050ff')
    p.ell(5, 7, 23, 25, body)
    bands = [rgb('#ff5a7a'), rgb('#ffb84a'), rgb('#fff05a'), rgb('#5aff9a'), rgb('#5ac8ff')]
    for i, b in enumerate(bands):
        y = 10 + i * 3
        p.line([(7 + (1 if i in (0, 4) else 0), y), (21 - (1 if i in (0, 4) else 0), y)], b, 1)
    p.poly([(14, 7), (16, 1), (18, 5), (23, 4), (19, 8)], rgb('#4fb83c'))
    p.px(9, 11, WHITE); p.px(10, 10, WHITE); sparkle(p, 22, 21, False)
    return p.finish()

def moldy_meat():
    """The haunch gone bad: grey-green, spotted, with a stink line."""
    p = Pen(); bone = rgb('#c8c0a0'); m = rgb('#7a8a4a'); spot = rgb('#4a5a2a'); fuzz = rgb('#b8e070')
    p.line([(6, 22), (22, 6)], dk(bone), 5); p.line([(6, 22), (22, 6)], bone, 3)
    for cx, cy in ((4, 21), (7, 24), (21, 4), (24, 7)): p.ell(cx - 2, cy - 2, cx + 2, cy + 2, bone)
    p.oval(14, 14, 8.6, 6.6, -math.pi / 4, m)
    for x, y in ((11, 13), (15, 11), (17, 16), (13, 17)): p.ell(x - 1, y - 1, x + 1, y + 1, spot, edge=False)
    for x, y in ((12, 10), (18, 13), (10, 16)): p.px(x, y, fuzz)
    p.line([(3, 6), (5, 4), (3, 2)], rgb('#9ab060')); p.line([(7, 5), (9, 3), (7, 1)], rgb('#9ab060'))
    return p.finish()

def wood():
    """Night Siege (17z33): a little bundle of three logs, tied with a cord, their cut ends showing rings."""
    p = Pen(); bark = rgb('#7a4a24'); cut = rgb('#e0b878'); ring = rgb('#a87840'); cord = rgb('#c83a2a')
    for y0, x0, x1 in ((15, 4, 22), (9, 6, 24), (19, 7, 25)):
        p.rect(x0, y0, x1, y0 + 5, bark)
        p.line([(x0 + 3, y0 + 2), (x1 - 4, y0 + 2)], dk(bark))
        p.ell(x1 - 3, y0, x1 + 2, y0 + 5, cut)
        p.px(x1 - 1, y0 + 2, ring); p.px(x1, y0 + 2, ring)
    p.line([(13, 8), (13, 26)], cord, 2)
    return p.finish()

def evo():
    """Versus (17z33): a DIGIVOLVE orb: a round amber token with a white double chevron pointing up."""
    p = Pen(); c = rgb('#ff9a2a'); rim = rgb('#ffd060'); w = WHITE
    p.ell(4, 4, 23, 23, c)
    p.ell(7, 7, 20, 20, rim, edge=False)
    p.ell(8, 8, 19, 19, c, edge=False)
    for dy in (0, 5):
        p.poly([(13.5, 8 + dy), (19, 13 + dy), (17, 15 + dy), (13.5, 11.5 + dy), (10, 15 + dy), (8, 13 + dy)], w, edge=False)
    return p.finish()

RARE = (('sweet_nut', sweet_nut), ('protein_steak', protein_steak), ('golden_meat', golden_meat), ('digi_seed', digi_seed), ('evo_fruit', evo_fruit), ('moldy_meat', moldy_meat))

SEEDS = (('carrot', '#f08a28'), ('cucumber', '#5cb848'), ('tomato', '#e83a30'), ('corn', '#f4d040'), ('cabbage', '#9ad860'), ('potato', '#c8a060'))

def seed(col):
    """A folded paper seed packet with the crop's colour on the label."""
    p = Pen(); paper = rgb('#f3e6c0'); c = rgb(col); sprout = rgb('#1f4a1a')
    p.poly([(7, 8), (21, 8), (22, 25), (6, 25)], paper)
    p.poly([(6, 4), (22, 4), (21, 9), (7, 9)], c)                              # folded top
    p.line([(8, 6), (20, 6)], lt(c))
    p.ell(9, 12, 19, 22, c)                                                    # label
    p.line([(14, 20), (14, 15)], sprout); p.poly([(14, 16), (11, 13), (13, 13)], sprout, edge=False); p.poly([(14, 15), (17, 12), (16, 15)], sprout, edge=False)
    p.px(11, 14, WHITE)
    return p.finish()

def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'items', 'pickups'); os.makedirs(out, exist_ok=True)
    frames = [('meat', meat()), ('fish', fish()), ('berry', berry()), ('xp_0', xp(0)), ('xp_1', xp(1))]
    frames += [('bits_%d' % i, bits(i)) for i in range(4)]
    frames += [('seed_' + n, seed(c)) for n, c in SEEDS]
    frames += [(n, f()) for n, f in RARE]
    frames += [('wood', wood()), ('evo', evo())]
    for name, im in frames: im.save(os.path.join(out, name + '.png'))
    if len(sys.argv) > 1:
        Z = 6; sheet = Image.new('RGBA', (len(frames) * S * Z, S * Z), (74, 122, 58, 255))
        for k, (name, im) in enumerate(frames):
            big = im.resize((S * Z, S * Z), Image.NEAREST); sheet.paste(big, (k * S * Z, 0), big)
        sheet.save(sys.argv[1])
    print('wrote', len(frames), 'frames:', ' '.join(n for n, _ in frames))

if __name__ == '__main__':
    main()
