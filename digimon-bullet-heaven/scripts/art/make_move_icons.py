#!/usr/bin/env python3
"""Draws the level-up card icons: one per move family and move type, plus the
five stat upgrades.

Each family has an emblem (flame, ice shard, droplet, dark orb, star, gear,
leaf, slime, gust, fang, bubbles) and each move type frames it differently:
  shot   the emblem in flight, speed lines behind it
  blast  the emblem inside a starburst
  claw   three rake marks in the family's colour
  aura   the emblem inside a ring of motes
  orbit  two small emblems circling on a ring
18x18 art saved at 2x (36x36), cel-shaded with a tinted outline like the
pickups.

    python3 scripts/art/make_move_icons.py            # writes assets/icons/moves/
    python3 scripts/art/make_move_icons.py sheet.png  # also writes a preview sheet
"""
import math, os, sys
from PIL import Image, ImageDraw

S = 18
INK = (26, 22, 38, 255); WHITE = (255, 255, 255, 255)
def rgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
def mul(c, f): return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), 255)
def dk(c): return mul(c, 0.6)
def mix(a, b, f): return (int(a[0] + (b[0] - a[0]) * f), int(a[1] + (b[1] - a[1]) * f), int(a[2] + (b[2] - a[2]) * f), 255)
def lt(c): return mix(c, WHITE, 0.45)

class Pen:
    def __init__(self):
        self.im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def rect(self, x0, y0, x1, y1, c, edge=True): self.d.rectangle([round(x0), round(y0), round(x1), round(y1)], fill=c, outline=dk(c) if edge else None)
    def ell(self, x0, y0, x1, y1, c, edge=True): self.d.ellipse([round(x0), round(y0), round(x1), round(y1)], fill=c, outline=dk(c) if edge else None)
    def poly(self, pts, c, edge=True): self.d.polygon([(round(x), round(y)) for x, y in pts], fill=c, outline=dk(c) if edge else None)
    def line(self, pts, c, w=1): self.d.line([(round(x), round(y)) for x, y in pts], fill=c, width=w)
    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < S and 0 <= y < S: self.im.putpixel((x, y), c)
    def finish(self):
        src = self.im.copy(); p = src.load(); out = self.im.load()
        def get(x, y): return p[x, y] if 0 <= x < S and 0 <= y < S else (0, 0, 0, 0)
        for y in range(S):
            for x in range(S):
                c = p[x, y]
                if not c[3] or c == WHITE: continue
                rim = dk(c)
                if get(x + 1, y) == rim or get(x, y + 1) == rim: out[x, y] = mix(mul(c, 0.82), (60, 40, 110, 255), 0.1)
                elif get(x - 1, y) == rim or get(x, y - 1) == rim: out[x, y] = mix(c, (255, 250, 225, 255), 0.34)
        src = self.im.copy(); p = src.load()
        for y in range(S):
            for x in range(S):
                if p[x, y][3]: continue
                for dx, dy in ((0, -1), (1, 0), (-1, 0), (0, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < S and 0 <= yy < S and p[xx, yy][3]:
                        out[x, y] = mix(mul(p[xx, yy], 0.28), INK, 0.55); break
        return self.im.resize((S * 2, S * 2), Image.NEAREST)

FAM = {  # body colour, light colour
    'fire': ('#ff6a1a', '#ffc23a'), 'ice': ('#6ab8f0', '#c8ecff'), 'water': ('#3a8af0', '#8ad0ff'), 'dark': ('#a050e0', '#e0b8ff'),
    'holy': ('#ffd84a', '#fff4b0'), 'machine': ('#8a98ac', '#dfe8f2'), 'nature': ('#58b838', '#b4ec78'), 'slime': ('#8a9a3a', '#c8d86a'),
    'wind': ('#4fd0bc', '#d8fff4'), 'beast': ('#d0a060', '#f4e4c4'), 'bubble': ('#7cc8f8', '#e8f8ff'),
}

def emblem(p, fam, cx, cy, r):
    c = rgb(FAM[fam][0]); hi = rgb(FAM[fam][1])
    if fam == 'fire':
        p.poly([(cx + r * 0.1, cy - r), (cx + r * 0.75, cy - r * 0.05), (cx + r * 0.8, cy + r * 0.5), (cx + r * 0.35, cy + r), (cx - r * 0.35, cy + r), (cx - r * 0.8, cy + r * 0.5), (cx - r * 0.55, cy - r * 0.1), (cx - r * 0.15, cy - r * 0.3)], c)
        if r >= 3.5: p.poly([(cx, cy), (cx + r * 0.35, cy + r * 0.55), (cx, cy + r * 0.9), (cx - r * 0.35, cy + r * 0.55)], hi, edge=False)
    elif fam == 'ice':
        p.poly([(cx, cy - r), (cx + r * 0.65, cy), (cx, cy + r), (cx - r * 0.65, cy)], c)
        p.line([(cx, cy - r + 1), (cx, cy + r - 1)], hi); p.px(cx - 1, cy - 1, WHITE)
    elif fam == 'water':
        p.poly([(cx, cy - r), (cx + r * 0.75, cy + r * 0.3), (cx + r * 0.5, cy + r * 0.9), (cx - r * 0.5, cy + r * 0.9), (cx - r * 0.75, cy + r * 0.3)], c)
        p.px(cx - 1, cy + 1, WHITE)
    elif fam == 'dark':
        p.ell(cx - r, cy - r, cx + r, cy + r, c)
        p.ell(cx - r * 0.2, cy - r * 0.75, cx + r * 0.95, cy + r * 0.45, rgb('#1a0a2a'), edge=False)
    elif fam == 'holy':
        k = r * 0.28
        p.poly([(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k), (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)], c)
        p.px(cx, cy, WHITE)
    elif fam == 'machine':
        for a in range(0, 360, 45):
            x, y = cx + math.cos(math.radians(a)) * r, cy + math.sin(math.radians(a)) * r
            p.rect(x - 0.6, y - 0.6, x + 0.6, y + 0.6, dk(c), edge=False)
        p.ell(cx - r * 0.8, cy - r * 0.8, cx + r * 0.8, cy + r * 0.8, c)
        p.ell(cx - r * 0.3, cy - r * 0.3, cx + r * 0.3, cy + r * 0.3, rgb('#2a3240'), edge=False)
    elif fam == 'nature':
        p.poly([(cx + r, cy - r), (cx + r * 0.6, cy + r * 0.5), (cx - r * 0.5, cy + r * 0.8), (cx - r, cy + r), (cx - r * 0.7, cy - r * 0.2), (cx, cy - r * 0.85)], c)
        p.line([(cx - r * 0.7, cy + r * 0.7), (cx + r * 0.6, cy - r * 0.6)], dk(c))
    elif fam == 'slime':
        p.ell(cx - r, cy - r * 0.8, cx + r, cy + r * 0.5, c)
        p.rect(cx - r * 0.6, cy, cx - r * 0.2, cy + r, c); p.rect(cx + r * 0.3, cy, cx + r * 0.6, cy + r * 0.7, c)
        p.px(cx - 1, cy - r * 0.4, WHITE)
    elif fam == 'wind':
        pts = [(cx + math.cos(a) * r, cy + math.sin(a) * r) for a in [math.radians(d) for d in range(-150, 91, 30)]]
        pts += [(cx + 0.9 + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55) for a in [math.radians(d) for d in range(90, -151, -40)]]
        p.poly(pts, c)
    elif fam == 'beast':
        p.poly([(cx - r * 0.7, cy - r), (cx + r * 0.7, cy - r), (cx + r * 0.45, cy + r * 0.1), (cx, cy + r), (cx - r * 0.45, cy + r * 0.1)], rgb(FAM[fam][1]))
        p.line([(cx - r * 0.7, cy - r), (cx + r * 0.7, cy - r)], c)
    else:  # bubble
        p.ell(cx - r, cy - r, cx + r, cy + r, hi); p.ell(cx - r + 1.5, cy - r + 1.5, cx + r - 1, cy + r - 1, c, edge=False)
        p.px(cx - r * 0.4, cy - r * 0.4, WHITE)

def shot(fam):
    p = Pen(); hi = rgb(FAM[fam][1])
    if fam == 'bubble':
        emblem(p, fam, 6, 11, 4); emblem(p, fam, 12, 6, 3); emblem(p, fam, 14, 13, 2)
        return p.finish()
    for y, x0, x1 in ((5, 1, 4), (9, 0, 3), (13, 1, 4)): p.line([(x0, y), (x1, y)], hi)
    emblem(p, fam, 10.5, 9, 5.5)
    return p.finish()

def blast(fam):
    p = Pen(); hi = rgb(FAM[fam][1]); pts = []
    for k in range(16):
        a = math.pi * 2 * k / 16; rr = 8.4 if k % 2 == 0 else 5
        pts.append((8.5 + math.cos(a) * rr, 8.5 + math.sin(a) * rr))
    p.poly(pts, hi)
    emblem(p, fam, 8.5, 8.5, 4.2)
    return p.finish()

def claw(fam):
    p = Pen(); c = rgb(FAM[fam][0]); hi = rgb(FAM[fam][1])
    for off in (-5, 0, 5):
        p.poly([(11 + off, 1), (13.5 + off, 2), (7.5 + off, 16), (5 + off, 13)], c)
        p.line([(11.5 + off, 3), (7.5 + off, 13)], hi)
    return p.finish()

def aura(fam):
    p = Pen(); hi = rgb(FAM[fam][1]); c = rgb(FAM[fam][0])
    for k in range(10):
        a = math.pi * 2 * k / 10
        x, y = 8.5 + math.cos(a) * 7.3, 8.5 + math.sin(a) * 7.3
        p.rect(x - 0.5, y - 0.5, x + 0.5, y + 0.5, hi if k % 2 else c, edge=False)
    emblem(p, fam, 8.5, 8.5, 4.2)
    return p.finish()

def orbit(fam):
    p = Pen(); hi = rgb(FAM[fam][1])
    p.d.ellipse([1, 5, 16, 12], outline=hi)
    emblem(p, fam, 4.5, 6, 3.2); emblem(p, fam, 12.5, 11.5, 3.2)
    return p.finish()

# ---------------------------------------------------------------- stat upgrades
def stat_speed():
    p = Pen(); c = rgb('#4ad08a')
    for x in (3, 9): p.poly([(x, 3), (x + 4, 3), (x + 8, 9), (x + 4, 15), (x, 15), (x + 4, 9)], c)
    return p.finish()
def stat_magnet():
    p = Pen(); c = rgb('#e8403a'); tip = rgb('#eef2f6')
    p.d.pieslice([2, 3, 15, 16], 0, 180, fill=c, outline=dk(c))
    p.rect(2, 4, 6, 10, c); p.rect(11, 4, 15, 10, c)
    p.d.pieslice([6, 6, 11, 12], 0, 180, fill=(0, 0, 0, 0)); p.rect(7, 4, 10, 9, (0, 0, 0, 0), edge=False)
    p.rect(2, 2, 6, 5, tip); p.rect(11, 2, 15, 5, tip)
    return p.finish()
def stat_maxHp():
    p = Pen(); c = rgb('#f04a5a')
    p.ell(1, 2, 9, 10, c); p.ell(8, 2, 16, 10, c); p.poly([(2, 8), (15, 8), (8.5, 16)], c); p.rect(4, 4, 13, 9, c, edge=False)
    p.rect(8, 5, 9, 11, WHITE, edge=False); p.rect(6, 7, 11, 8, WHITE, edge=False)
    return p.finish()
def stat_damage():
    p = Pen(); blade = rgb('#dfe8f2'); hilt = rgb('#f0b020'); pts = []
    for k in range(12):
        a = math.pi * 2 * k / 12; rr = 8.4 if k % 2 == 0 else 5.4
        pts.append((8.5 + math.cos(a) * rr, 8.5 + math.sin(a) * rr))
    p.poly(pts, rgb('#ff7a2a'))
    p.poly([(13, 2), (15, 4), (8, 11), (6, 9)], blade)
    p.poly([(4, 8), (9, 13), (8, 14), (3, 9)], hilt); p.poly([(5, 11), (6, 12), (3, 15), (2, 14)], rgb('#7a4a2a'))
    return p.finish()
def stat_cooldown():
    p = Pen(); c = rgb('#ffd84a'); hi = rgb('#fff4b0')
    for off in (-4, 1, 6):
        p.poly([(11 + off, 1), (13 + off, 2), (7.5 + off, 16), (5.5 + off, 13)], c)
        p.line([(11.3 + off, 3), (7.6 + off, 13)], hi)
    for y in (4, 8, 12): p.line([(0, y), (2, y)], hi)
    return p.finish()

def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'icons', 'moves'); os.makedirs(out, exist_ok=True)
    frames = []
    for fam in FAM:
        for kind, fn in (('shot', shot), ('blast', blast), ('claw', claw), ('aura', aura), ('orbit', orbit)):
            frames.append((fam + '_' + kind, fn(fam)))
    for name, fn in (('stat_speed', stat_speed), ('stat_magnet', stat_magnet), ('stat_maxHp', stat_maxHp), ('stat_damage', stat_damage), ('stat_cooldown', stat_cooldown)):
        frames.append((name, fn()))
    for name, im in frames: im.save(os.path.join(out, name + '.png'))
    if len(sys.argv) > 1:
        Z = 2; cols = 10; rows = (len(frames) + cols - 1) // cols; cell = 36 * Z + 8
        sheet = Image.new('RGBA', (cols * cell, rows * cell), (20, 28, 48, 255))
        for k, (name, im) in enumerate(frames):
            big = im.resize((36 * Z, 36 * Z), Image.NEAREST); sheet.paste(big, ((k % cols) * cell + 4, (k // cols) * cell + 4), big)
        sheet.save(sys.argv[1])
    print('wrote', len(frames), 'icons')

if __name__ == '__main__':
    main()
