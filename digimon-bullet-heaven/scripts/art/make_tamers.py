#!/usr/bin/env python3
"""Draws the four original tamers (Kai, Ren, Mika, Nori) as pixel-art frames.

Each tamer gets idle (2 frames) and a 6-step walk in three views (down, up,
side; the game mirrors "side" for left).  Frames are 40x56 with the feet on
row 52, the same footprint the game already expects.

    python3 scripts/art/make_tamers.py            # writes assets/sprites/frames/tamers/<id>/
    python3 scripts/art/make_tamers.py sheet.png  # also writes a preview sheet
"""
import math, os, sys
from PIL import Image, ImageDraw

W, H, CX, FEET = 40, 56, 20, 52
WALK_N, IDLE_N = 8, 4   # Nov 20: eight-frame walk, four-frame breathing idle (holo3.py)
INK = (26, 22, 38, 255)

def rgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
def mul(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), 255)
def dk(c): return mul(c, 0.6)
def mix(a, b, f): return (int(a[0] + (b[0] - a[0]) * f), int(a[1] + (b[1] - a[1]) * f), int(a[2] + (b[2] - a[2]) * f), 255)
def lt(c): return (min(255, int(c[0] + (255 - c[0]) * 0.35)), min(255, int(c[1] + (255 - c[1]) * 0.35)), min(255, int(c[2] + (255 - c[2]) * 0.35)), 255)

TAMERS = {
    'kai': dict(name='Kai', skin='#f2c49a', hair='#2a2a3a', streak='#3ad0c0', hairstyle='spiky', eye='#3a2a20',
                top='#f4d23a', top2='#f8f4ea', sleeves='long', bottom='shorts', bottomc='#2c3e6e', shoes='#e0503a',
                gear='goggles', gearc='#ff9a2a', pack=None, legs=13, blush=False),
    'ren': dict(name='Ren', skin='#d9a070', hair='#e4e6ee', streak=None, hairstyle='swept', eye='#2a4a7a',
                top='#6a4ab0', top2='#6a4ab0', sleeves='long', bottom='pants', bottomc='#30323e', shoes='#f0f0f0',
                gear='headphones', gearc='#4ad0e8', pack='#d06a2a', legs=15, blush=False, hood=True),
    'mika': dict(name='Mika', skin='#f6cfae', hair='#d8702a', streak=None, hairstyle='ponytail', eye='#2a6a3a',
                 top='#f6ecd8', top2='#f6ecd8', sleeves='short', bottom='skirt', bottomc='#d83a4a', shoes='#6a4630',
                 gear='visor', gearc='#f8f8ff', pack=None, legs=13, blush=True, scarf='#58b8f0', boots=True),
    'nori': dict(name='Nori', skin='#8a5a3c', hair='#2aa89a', streak=None, hairstyle='bob', eye='#201a2a',
                 top='#f2b01e', top2='#fff6d8', sleeves='long', bottom='leggings', bottomc='#26263a', shoes='#e85a8a',
                 gear='clip', gearc='#fff06a', pack=None, legs=13, blush=True, satchel='#7a4a2a', coat=True),
    'tobi': dict(name='Tobi', skin='#f0c8a0', hair='#e8c24a', streak=None, hairstyle='cap', eye='#2a5aa8',
                 top='#3a8ae0', top2='#3a8ae0', sleeves='short', bottom='shorts', bottomc='#5a7a3a', shoes='#f4f4f4',
                 gear='cap', gearc='#e03a3a', pack='#3a3a4a', legs=13, blush=False),
    'suki': dict(name='Suki', skin='#f8d8c0', hair='#f07ab0', streak=None, hairstyle='twintails', eye='#7a3ab0',
                 top='#2ab8b0', top2='#f8f4ea', sleeves='long', bottom='shorts', bottomc='#3a3a52', shoes='#f4d23a',
                 gear='bows', gearc='#f4d23a', pack=None, legs=13, blush=True),
    'juno': dict(name='Juno', skin='#c98a5a', hair='#27336e', streak=None, hairstyle='long', eye='#c8582a',
                 top='#f4f0f8', top2='#f4f0f8', sleeves='long', bottom='pants', bottomc='#8a5ac0', shoes='#3a2a4a',
                 gear='headband', gearc='#ff6a4a', pack=None, legs=14, blush=True, hood=True),
    'dax': dict(name='Dax', skin='#a9714a', hair='#2e1c14', streak=None, hairstyle='afro', eye='#3a2a6a',
                top='#3aa85a', top2='#22242e', sleeves='short', bottom='pants', bottomc='#c8a86a', shoes='#a03a2a',
                gear='bandana', gearc='#e8402a', pack=None, legs=14, blush=False),
}

# Digital ghosts: floating blobs of loose data. One shape, six colours.
GHOSTS = (('byte', 'Byte', '#3ad8f0', 'Cyan'), ('glim', 'Glim', '#ff6ab8', 'Pink'), ('zap', 'Zap', '#9be83a', 'Lime'),
          ('ember', 'Ember', '#ff9a2a', 'Amber'), ('nyx', 'Nyx', '#9a6af0', 'Violet'), ('null', 'Null', '#e8ecf4', 'White'),
          ('rune', 'Rune', '#ff5a4a', 'Red'), ('echo', 'Echo', '#4a8aff', 'Blue'))
# kind 'holo' = the hologram projections (holo_frame); pass --ghosts to draw the old blob ghosts instead
for _id, _name, _col, _ in GHOSTS:
    TAMERS[_id] = dict(name=_name, kind=('ghost' if '--ghosts' in sys.argv else 'holo'), gid=_id, body=_col, skin='#010101', hair='#010102')

class Pen:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def rect(self, x0, y0, x1, y1, c, edge=True):
        if x1 < x0 or y1 < y0: return
        self.d.rectangle([x0, y0, x1, y1], fill=c, outline=dk(c) if edge else None)
    def ell(self, x0, y0, x1, y1, c, edge=True):
        self.d.ellipse([x0, y0, x1, y1], fill=c, outline=dk(c) if edge else None)
    def poly(self, pts, c, edge=True):
        self.d.polygon(pts, fill=c, outline=dk(c) if edge else None)
    def px(self, x, y, c):
        if 0 <= x < W and 0 <= y < H: self.im.putpixel((int(x), int(y)), c)
    def limb(self, x0, y0, x1, y1, w, c):
        """A straight limb of width w with a darker rim."""
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for pas, col, ww in ((0, dk(c), w), (1, c, w - 2)):
            for i in range(int(n) + 1):
                x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
                if pas == 0: self.d.rectangle([round(x - ww / 2), round(y), round(x - ww / 2) + ww - 1, round(y)], fill=col)
                elif ww > 0: self.d.rectangle([round(x - w / 2) + 1, round(y), round(x - w / 2) + ww, round(y)], fill=col)
    def finish(self, ch=None):
        """Cel shading, then a dark outline tinted by what it wraps.

        Every part was filled flat with a darker rim.  Light comes from the top
        left: pixels just inside a part's top/left rim are lifted, pixels just
        inside its bottom/right rim are dropped, and skin under a fringe of
        hair falls into shadow.  That is the three-tone look of the Digimon
        sprites the tamers stand next to."""
        src = self.im.copy(); p = src.load(); out = self.im.load()
        def get(x, y): return p[x, y] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)
        skin = rgb(ch['skin']) if ch else None
        hairs = (rgb(ch['hair']), dk(rgb(ch['hair']))) if ch else ()
        white = (255, 255, 255, 255)
        for y in range(H):
            for x in range(W):
                c = p[x, y]
                if not c[3] or c == white: continue
                rim = dk(c)
                if c == skin and (get(x, y - 1) in hairs or get(x, y - 2) in hairs): out[x, y] = mix(c, (150, 70, 90, 255), 0.22)
                elif get(x + 1, y) == rim or get(x, y + 1) == rim: out[x, y] = mix(mul(c, 0.8), (60, 40, 110, 255), 0.12)
                elif get(x - 1, y) == rim or get(x, y - 1) == rim: out[x, y] = mix(c, (255, 250, 225, 255), 0.3)
                elif get(x + 2, y) == rim and get(x - 3, y) == c and get(x - 5, y) == c: out[x, y] = mul(c, 0.9)
        src = self.im.copy(); p = src.load()
        for y in range(H):
            for x in range(W):
                if p[x, y][3]: continue
                for dx, dy in ((0, -1), (1, 0), (-1, 0), (0, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and p[xx, yy][3]:
                        out[x, y] = mix(mul(p[xx, yy], 0.28), INK, 0.55); break
        return self.im

def pose(anim, i):
    """Everything that moves, for frame i."""
    if anim == 'idle':
        b = 1 if i % 2 else 0
        return dict(bob=b, ph=0.0, s=0.0, c=0.0, walk=False, sway=0)
    ph = 2 * math.pi * i / WALK_N
    return dict(bob=0, ph=ph, s=math.sin(ph), c=math.cos(ph), walk=True, sway=int(round(math.sin(ph))))

# ---------------------------------------------------------------- pieces
def leg_front(p, ch, x0, lift, ly, back=False):
    """One leg seen from the front or back. x0 = left edge, 5 wide."""
    skin = rgb(ch['skin']); bc = rgb(ch['bottomc']); sh = rgb(ch['shoes'])
    foot = FEET - 3 - lift
    kind = ch['bottom']
    legc = bc if kind in ('pants', 'leggings') else skin
    p.rect(x0, ly, x0 + 4, foot, legc)
    if kind == 'shorts': p.rect(x0, ly, x0 + 4, ly + 5, bc)
    if ch.get('boots'): p.rect(x0, foot - 4, x0 + 4, foot, sh)
    if back: p.rect(x0, foot, x0 + 4, foot + 3, sh)
    else:
        p.rect(x0 - (1 if x0 < CX else 0), foot, x0 + 4 + (0 if x0 < CX else 1), foot + 3, sh)
        p.px(x0 + 1, foot + 1, lt(sh)); p.px(x0 + 2, foot + 1, lt(sh))

def skirt(p, ch, ly, side=False, sway=0):
    c = rgb(ch['bottomc'])
    if side: p.poly([(CX - 5, ly - 2), (CX + 4, ly - 2), (CX + 6 + sway, ly + 6), (CX - 7 + sway, ly + 6)], c)
    else:
        p.poly([(CX - 7, ly - 2), (CX + 7, ly - 2), (CX + 9, ly + 6), (CX - 9, ly + 6)], c)
        for x in (CX - 4, CX, CX + 4): p.d.line([x, ly, x + (1 if x > CX else (-1 if x < CX else 0)), ly + 5], fill=dk(c))

def torso_front(p, ch, ty, back=False):
    top = rgb(ch['top']); top2 = rgb(ch['top2']); skin = rgb(ch['skin'])
    hem = 13 if not ch.get('coat') else 16
    p.rect(CX - 2, ty - 2, CX + 1, ty, skin)                       # neck
    p.poly([(CX - 7, ty), (CX + 6, ty), (CX + 6, ty + hem), (CX - 7, ty + hem)], top)
    if not back:
        if top2 != top:                                            # open jacket over a tee
            p.rect(CX - 2, ty, CX + 1, ty + hem, top2, edge=False)
            p.d.line([CX - 3, ty, CX - 3, ty + hem], fill=dk(top)); p.d.line([CX + 2, ty, CX + 2, ty + hem], fill=dk(top))
        else:
            p.d.line([CX - 3, ty + 1, CX, ty + 3], fill=dk(top)); p.d.line([CX, ty + 3, CX + 2, ty + 1], fill=dk(top))
        if ch.get('hood'):
            p.px(CX - 2, ty + 3, lt(top)); p.px(CX - 2, ty + 5, lt(top)); p.px(CX + 1, ty + 3, lt(top)); p.px(CX + 1, ty + 5, lt(top))
            p.rect(CX - 4, ty + 8, CX + 3, ty + 11, dk(top), edge=False)      # pouch pocket
        if ch.get('coat'):
            for y in (ty + 4, ty + 8, ty + 12): p.px(CX + 3, y, rgb('#7a5a1a'))
        p.d.line([CX - 6, ty + 1, CX - 6, ty + hem - 1], fill=lt(top))
    else:
        if ch.get('hood'): p.ell(CX - 6, ty - 2, CX + 5, ty + 5, dk(top))
        p.d.line([CX - 1, ty + 2, CX - 1, ty + hem - 1], fill=dk(top))

def arm_front(p, ch, left, ty, ext):
    top = rgb(ch['top']); skin = rgb(ch['skin'])
    x0 = CX - 11 if left else CX + 7
    end = ty + 10 + ext
    p.rect(x0, ty + 1, x0 + 3, end, top if ch['sleeves'] == 'long' else skin)
    if ch['sleeves'] == 'short': p.rect(x0, ty + 1, x0 + 3, ty + 5, top)
    p.rect(x0, end, x0 + 3, end + 2, skin)

def head_base(p, ch, hy):
    p.ell(CX - 10, hy - 10, CX + 9, hy + 10, rgb(ch['hair']))

def face_front(p, ch, hy):
    skin = rgb(ch['skin']); eye = rgb(ch['eye'])
    p.ell(CX - 8, hy - 4, CX + 7, hy + 10, skin)
    p.rect(CX - 10, hy + 1, CX - 9, hy + 4, skin); p.rect(CX + 8, hy + 1, CX + 9, hy + 4, skin)   # ears
    for ex in (CX - 6, CX + 3):
        p.d.rectangle([ex, hy + 2, ex + 2, hy + 5], fill=eye)
        p.d.rectangle([ex + 1, hy + 3, ex + 1, hy + 4], fill=mul(eye, 0.45))
        p.px(ex, hy + 2, (255, 255, 255, 255)); p.px(ex + 2, hy + 5, lt(lt(eye))); p.px(ex + 1, hy + 5, lt(eye))
        p.d.line([ex - (1 if ex < CX else 0), hy + 1, ex + 2 + (0 if ex < CX else 1), hy + 1], fill=INK)
    p.d.line([CX - 1, hy + 8, CX, hy + 8], fill=mul(skin, 0.6))
    if ch.get('blush'):
        b = (240, 130, 130, 255)
        p.px(CX - 7, hy + 6, b); p.px(CX - 6, hy + 6, b); p.px(CX + 5, hy + 6, b); p.px(CX + 6, hy + 6, b)

def face_side(p, ch, hy):
    skin = rgb(ch['skin']); eye = rgb(ch['eye'])
    p.ell(CX - 3, hy - 4, CX + 9, hy + 10, skin)
    p.px(CX + 10, hy + 5, skin); p.px(CX + 10, hy + 6, dk(skin))                 # nose
    p.rect(CX - 3, hy + 1, CX - 1, hy + 4, skin)                                  # ear
    p.d.rectangle([CX + 5, hy + 2, CX + 7, hy + 5], fill=eye); p.d.rectangle([CX + 6, hy + 3, CX + 6, hy + 4], fill=mul(eye, 0.45))
    p.px(CX + 7, hy + 2, (255, 255, 255, 255)); p.px(CX + 5, hy + 5, lt(lt(eye)))
    p.d.line([CX + 4, hy + 1, CX + 8, hy + 1], fill=INK)
    p.px(CX + 7, hy + 8, mul(skin, 0.6))
    if ch.get('blush'): p.px(CX + 3, hy + 6, (240, 130, 130, 255)); p.px(CX + 4, hy + 6, (240, 130, 130, 255))

def hair_front(p, ch, hy, sway):
    h = rgb(ch['hair']); st = ch['hairstyle']
    if st == 'spiky':
        for sx, tip in ((-8, -13), (-3, -15), (2, -15), (7, -12)):
            p.poly([(CX + sx - 3, hy - 7), (CX + sx + (1 if sx > 0 else -1), hy + tip), (CX + sx + 3, hy - 7)], h)
        p.poly([(CX - 9, hy - 6), (CX + 8, hy - 6), (CX + 8, hy - 2), (CX + 5, hy + 1), (CX + 3, hy - 2), (CX, hy + 2), (CX - 3, hy - 2), (CX - 6, hy + 1), (CX - 9, hy - 2)], h)
        if ch.get('streak'):
            s = rgb(ch['streak']); p.poly([(CX + 1, hy - 7), (CX + 3, hy - 14), (CX + 4, hy - 7)], s, edge=False); p.d.line([CX, hy - 1, CX, hy + 1], fill=s)
    elif st == 'swept':
        p.poly([(CX - 9, hy - 7), (CX + 8, hy - 7), (CX + 8, hy + 2), (CX + 6, hy - 2), (CX + 1, hy - 3), (CX - 5, hy + 2), (CX - 9, hy + 3)], h)
        p.d.line([CX - 6, hy - 6, CX + 2, hy - 9], fill=lt(h)); p.d.line([CX - 4, hy - 3, CX + 3, hy - 6], fill=dk(h))
    elif st == 'ponytail':
        p.poly([(CX - 9, hy - 6), (CX + 8, hy - 6), (CX + 8, hy + 4), (CX + 6, hy - 1), (CX + 2, hy - 3), (CX - 2, hy), (CX - 6, hy - 2), (CX - 9, hy + 4)], h)
        p.d.line([CX - 3, hy - 8, CX + 3, hy - 9], fill=lt(h))
    elif st == 'cap':
        p.poly([(CX - 9, hy - 3), (CX + 8, hy - 3), (CX + 8, hy + 2), (CX + 6, hy - 1), (CX - 7, hy - 1), (CX - 9, hy + 2)], h)
    elif st == 'twintails':
        p.poly([(CX - 9, hy - 6), (CX + 8, hy - 6), (CX + 8, hy + 3), (CX + 5, hy - 1), (CX + 2, hy + 1), (CX - 1, hy - 2), (CX - 4, hy + 1), (CX - 7, hy - 1), (CX - 9, hy + 3)], h)
        p.d.line([CX - 4, hy - 8, CX + 3, hy - 9], fill=lt(h))
    elif st == 'long':
        p.poly([(CX - 9, hy - 6), (CX + 8, hy - 6), (CX + 8, hy + 6), (CX + 6, hy), (CX + 1, hy - 3), (CX - 1, hy - 3), (CX - 7, hy), (CX - 9, hy + 6)], h)
        p.d.line([CX - 5, hy - 8, CX + 2, hy - 9], fill=lt(h))
    elif st == 'afro':
        p.ell(CX - 13, hy - 14, CX + 12, hy + 3, h)
        for bx, by in ((-9, -9), (-3, -12), (4, -11), (8, -6), (-11, -3), (0, -7)): p.d.arc([CX + bx - 2, hy + by - 2, CX + bx + 3, hy + by + 3], 180, 360, fill=lt(h))
        p.poly([(CX - 8, hy - 2), (CX + 7, hy - 2), (CX + 7, hy + 1), (CX + 4, hy - 1), (CX, hy + 1), (CX - 4, hy - 1), (CX - 8, hy + 1)], h)
    elif st == 'bob':
        p.rect(CX - 10, hy - 2, CX - 8, hy + 9, h); p.rect(CX + 7, hy - 2, CX + 9, hy + 9, h)
        p.poly([(CX - 9, hy - 6), (CX + 8, hy - 6), (CX + 8, hy + 1), (CX - 9, hy + 1)], h)
        for x in range(CX - 7, CX + 7, 3): p.px(x, hy + 1, dk(h))
        p.d.line([CX - 5, hy - 8, CX + 2, hy - 9], fill=lt(h))

def gear_front(p, ch, hy):
    g = ch['gear']; c = rgb(ch['gearc'])
    if g == 'goggles':
        p.rect(CX - 10, hy - 6, CX + 9, hy - 4, rgb('#3a3a48'), edge=False)
        for gx in (CX - 7, CX + 1):
            p.rect(gx, hy - 8, gx + 5, hy - 3, rgb('#e8e8f0')); p.rect(gx + 1, hy - 7, gx + 4, hy - 4, c, edge=False); p.px(gx + 1, hy - 7, lt(lt(c)))
    elif g == 'visor':
        p.rect(CX - 10, hy - 7, CX + 9, hy - 5, c)
        p.poly([(CX - 9, hy - 5), (CX + 8, hy - 5), (CX + 6, hy - 2), (CX - 7, hy - 2)], rgb('#e84a5a'))
    elif g == 'clip':
        x, y = CX + 6, hy - 3
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): p.px(x + dx, y + dy, c)
    elif g == 'cap':
        p.d.chord([CX - 10, hy - 11, CX + 9, hy + 3], 180, 360, fill=c, outline=dk(c))
        p.rect(CX - 10, hy - 5, CX + 9, hy - 3, c)
        p.poly([(CX - 8, hy - 3), (CX + 7, hy - 3), (CX + 5, hy), (CX - 6, hy)], dk(c))
        p.rect(CX - 2, hy - 9, CX + 1, hy - 6, rgb('#f8f4ea'))
    elif g in ('headband', 'bandana'):
        p.rect(CX - 10, hy - 6, CX + 9, hy - 4, c)
    elif g == 'bows':
        for bx in (CX - 11, CX + 8): p.rect(bx, hy - 6, bx + 2, hy - 3, c)

def gear_side(p, ch, hy):
    g = ch['gear']; c = rgb(ch['gearc'])
    if g == 'goggles':
        p.rect(CX - 10, hy - 6, CX + 9, hy - 4, rgb('#3a3a48'), edge=False)
        p.rect(CX + 4, hy - 8, CX + 9, hy - 3, rgb('#e8e8f0')); p.rect(CX + 5, hy - 7, CX + 8, hy - 4, c, edge=False); p.px(CX + 5, hy - 7, lt(lt(c)))
    elif g == 'visor':
        p.rect(CX - 10, hy - 7, CX + 9, hy - 5, c)
        p.poly([(CX + 4, hy - 5), (CX + 14, hy - 4), (CX + 14, hy - 3), (CX + 4, hy - 2)], rgb('#e84a5a'))
    elif g == 'clip':
        x, y = CX + 2, hy - 4
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): p.px(x + dx, y + dy, c)
    elif g == 'cap':
        p.d.chord([CX - 10, hy - 11, CX + 9, hy + 3], 180, 360, fill=c, outline=dk(c))
        p.rect(CX - 10, hy - 5, CX + 9, hy - 3, c)
        p.poly([(CX + 5, hy - 4), (CX + 15, hy - 3), (CX + 15, hy - 2), (CX + 5, hy - 1)], dk(c))
    elif g in ('headband', 'bandana'):
        p.rect(CX - 10, hy - 6, CX + 9, hy - 4, c)
        if g == 'bandana': p.poly([(CX - 10, hy - 6), (CX - 15, hy - 4), (CX - 16, hy + 2), (CX - 13, hy), (CX - 10, hy - 3)], c)
    elif g == 'bows':
        p.rect(CX - 9, hy - 6, CX - 6, hy - 3, c)

def hair_side(p, ch, hy, sway):
    h = rgb(ch['hair']); st = ch['hairstyle']
    if st == 'spiky':
        for sx, tip, lean in ((-7, -12, -3), (-2, -15, -2), (3, -15, 0), (7, -12, 2)):
            p.poly([(CX + sx - 3, hy - 7), (CX + sx + lean, hy + tip), (CX + sx + 3, hy - 7)], h)
        p.poly([(CX - 9, hy - 6), (CX + 9, hy - 6), (CX + 9, hy - 2), (CX + 6, hy + 1), (CX + 3, hy - 3), (CX - 1, hy - 3), (CX - 3, hy + 6), (CX - 9, hy + 6)], h)
        if ch.get('streak'): p.poly([(CX + 2, hy - 7), (CX + 3, hy - 14), (CX + 5, hy - 7)], rgb(ch['streak']), edge=False)
    elif st == 'swept':
        p.poly([(CX - 9, hy - 7), (CX + 9, hy - 7), (CX + 10, hy), (CX + 5, hy - 3), (CX - 1, hy - 3), (CX - 3, hy + 5), (CX - 9, hy + 6)], h)
        p.d.line([CX - 5, hy - 6, CX + 4, hy - 9], fill=lt(h))
    elif st == 'ponytail':
        p.poly([(CX - 9, hy - 6), (CX + 9, hy - 6), (CX + 8, hy + 3), (CX + 5, hy - 3), (CX - 1, hy - 3), (CX - 3, hy + 6), (CX - 9, hy + 5)], h)
        p.poly([(CX - 9, hy - 4), (CX - 13 - sway, hy - 2), (CX - 15 - sway * 2, hy + 8), (CX - 12 - sway * 2, hy + 13), (CX - 10 - sway, hy + 6), (CX - 8, hy + 1)], h)
        p.rect(CX - 10, hy - 4, CX - 9, hy - 1, rgb('#e84a5a'), edge=False)
    elif st == 'cap':
        p.poly([(CX - 9, hy - 3), (CX + 8, hy - 3), (CX + 8, hy), (CX - 1, hy - 1), (CX - 3, hy + 6), (CX - 9, hy + 6)], h)
    elif st == 'twintails':
        p.poly([(CX - 9, hy - 6), (CX + 9, hy - 6), (CX + 8, hy + 3), (CX + 5, hy - 3), (CX - 1, hy - 3), (CX - 3, hy + 6), (CX - 9, hy + 5)], h)
        p.poly([(CX - 8, hy - 5), (CX - 13 - sway, hy - 4), (CX - 16 - sway * 2, hy + 6), (CX - 14 - sway * 2, hy + 15), (CX - 10 - sway, hy + 9), (CX - 8, hy + 1)], h)
    elif st == 'long':
        p.poly([(CX - 10, hy - 6), (CX + 9, hy - 6), (CX + 9, hy + 2), (CX + 5, hy - 3), (CX - 1, hy - 3), (CX - 2, hy + 8), (CX - 4 - sway, hy + 20), (CX - 11 - sway, hy + 20), (CX - 10, hy + 6)], h)
        p.d.line([CX - 5, hy - 8, CX + 3, hy - 9], fill=lt(h)); p.d.line([CX - 7, hy + 4, CX - 8 - sway, hy + 18], fill=dk(h))
    elif st == 'afro':
        p.ell(CX - 13, hy - 14, CX + 11, hy + 5, h)
        for bx, by in ((-9, -9), (-3, -12), (4, -11), (-11, -3), (0, -7), (-7, 0)): p.d.arc([CX + bx - 2, hy + by - 2, CX + bx + 3, hy + by + 3], 180, 360, fill=lt(h))
        p.poly([(CX - 2, hy - 3), (CX + 9, hy - 3), (CX + 9, hy), (CX + 4, hy - 1), (CX - 1, hy + 1)], h)
    elif st == 'bob':
        p.poly([(CX - 10, hy - 6), (CX + 9, hy - 6), (CX + 9, hy + 1), (CX + 3, hy + 1), (CX + 1, hy - 2), (CX - 1, hy - 2), (CX - 2, hy + 10), (CX - 10, hy + 10)], h)
        p.d.line([CX - 5, hy - 8, CX + 3, hy - 9], fill=lt(h))

def hair_back(p, ch, hy, sway):
    """Back of the head (up view)."""
    h = rgb(ch['hair']); st = ch['hairstyle']
    p.ell(CX - 10, hy - 10, CX + 9, hy + 10, h)
    p.d.arc([CX - 7, hy - 8, CX + 6, hy + 4], 200, 340, fill=lt(h))
    if st == 'spiky':
        for sx, tip in ((-8, -13), (-3, -15), (2, -15), (7, -12)):
            p.poly([(CX + sx - 3, hy - 7), (CX + sx, hy + tip), (CX + sx + 3, hy - 7)], h)
        for sx in (-6, -1, 4): p.poly([(CX + sx - 2, hy + 8), (CX + sx, hy + 12), (CX + sx + 2, hy + 8)], h)
        if ch.get('streak'): p.poly([(CX + 1, hy - 7), (CX + 2, hy - 14), (CX + 4, hy - 7)], rgb(ch['streak']), edge=False)
    elif st == 'ponytail':
        p.rect(CX - 2, hy - 2, CX + 1, hy, rgb('#e84a5a'))
        p.poly([(CX - 3, hy), (CX + 2, hy), (CX + 3 + sway, hy + 12), (CX + sway, hy + 16), (CX - 4 + sway, hy + 12)], h)
    elif st == 'twintails':
        for sgn in (-1, 1):
            x = CX + sgn * 10
            p.poly([(x - 2, hy - 4), (x + 2, hy - 4), (x + 3 + sway, hy + 12), (x + sway, hy + 16), (x - 3 + sway, hy + 12)], h)
    elif st == 'long':
        p.poly([(CX - 10, hy), (CX + 9, hy), (CX + 9 + sway, hy + 20), (CX - 10 + sway, hy + 20)], h)
        for x in (CX - 6, CX - 2, CX + 2, CX + 6): p.d.line([x, hy + 4, x + sway, hy + 19], fill=dk(h))
    elif st == 'afro':
        p.ell(CX - 13, hy - 14, CX + 12, hy + 11, h)
        for bx, by in ((-9, -9), (-3, -12), (4, -11), (8, -6), (-11, -3), (0, -6), (-6, 2), (5, 3), (-1, 6)): p.d.arc([CX + bx - 2, hy + by - 2, CX + bx + 3, hy + by + 3], 180, 360, fill=lt(h))
    elif st == 'bob':
        p.poly([(CX - 10, hy), (CX + 9, hy), (CX + 9, hy + 9), (CX + 7, hy + 11), (CX - 8, hy + 11), (CX - 10, hy + 9)], h)
        for x in (CX - 6, CX - 2, CX + 2, CX + 6): p.d.line([x, hy + 4, x, hy + 10], fill=dk(h))
        p.d.line([CX - 6, hy - 7, CX + 1, hy - 8], fill=lt(h))
    elif st == 'swept':
        for x, y0, y1 in ((-6, -2, 9), (-3, -6, 10), (0, -7, 10), (3, -6, 10), (6, -2, 9)): p.d.line([CX + x, hy + y0, CX + x + 1, hy + y1], fill=dk(h))
        for sx in (-6, -2, 2, 6): p.poly([(CX + sx - 2, hy + 8), (CX + sx, hy + 11), (CX + sx + 2, hy + 8)], h)
        p.d.line([CX - 5, hy - 7, CX + 2, hy - 8], fill=lt(h))
    g = ch['gear']
    if g == 'goggles': p.rect(CX - 10, hy - 6, CX + 9, hy - 4, rgb('#3a3a48'), edge=False)
    elif g == 'visor': p.rect(CX - 10, hy - 7, CX + 9, hy - 5, rgb(ch['gearc']))
    elif g == 'cap':
        c = rgb(ch['gearc']); p.d.chord([CX - 10, hy - 11, CX + 9, hy + 5], 180, 360, fill=c, outline=dk(c)); p.rect(CX - 10, hy - 4, CX + 9, hy - 2, c)
        p.rect(CX - 2, hy - 2, CX + 1, hy - 1, dk(c), edge=False)
    elif g in ('headband', 'bandana'):
        c = rgb(ch['gearc']); p.rect(CX - 10, hy - 6, CX + 9, hy - 4, c)
        if g == 'bandana': p.poly([(CX - 2, hy - 4), (CX + 1, hy - 4), (CX + 3 + sway, hy + 4), (CX + sway, hy + 2), (CX - 3 + sway, hy + 5)], c)
    elif g == 'bows':
        c = rgb(ch['gearc'])
        for bx in (CX - 12, CX + 8): p.rect(bx, hy - 6, bx + 3, hy - 3, c)

def headphones(p, ch, ty, side=False):
    c = rgb(ch['gearc'])
    if side: p.rect(CX - 4, ty - 2, CX + 3, ty, rgb('#3a3a48')); p.rect(CX - 1, ty - 3, CX + 2, ty + 1, c)
    else:
        p.rect(CX - 6, ty - 2, CX + 5, ty - 1, rgb('#3a3a48'), edge=False)
        p.rect(CX - 8, ty - 3, CX - 5, ty + 1, c); p.rect(CX + 4, ty - 3, CX + 7, ty + 1, c)

# ---------------------------------------------------------------- ghosts
# Hologram ghosts: a see-through body that is brightest at the crown and
# thins out toward the hem, a saturated rim instead of a black outline, a
# soft halo, faint scanlines, and a face of its own for each ghost.
GHOST_FACE = {'byte': 'smile', 'glim': 'ooh', 'zap': 'grin', 'ember': 'frown', 'nyx': 'flat', 'null': 'smirk'}

def _rgba(c, a): return (c[0], c[1], c[2], max(0, min(255, int(a))))

def ghost_mouth(put, kind, mx, my, side=False):
    """mx,my = centre of the mouth row. side view draws a narrower mouth."""
    if side:
        pts = {'smile': ((-1, 0), (0, 1), (1, 1), (2, 0)), 'frown': ((-1, 1), (0, 0), (1, 0), (2, 1)), 'flat': ((-1, 0), (0, 0), (1, 0), (2, 0)),
               'ooh': ((0, 0), (1, 0), (0, 1), (1, 1)), 'grin': ((-1, 0), (0, 0), (1, 0), (2, 0), (0, 1), (1, 1)), 'smirk': ((-1, 1), (0, 1), (1, 0), (2, -1))}[kind]
    else:
        pts = {'smile': ((-3, 0), (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 0)),
               'frown': ((-3, 1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 1)),
               'flat': ((-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0)),
               'ooh': ((-1, -1), (0, -1), (-2, 0), (1, 0), (-2, 1), (1, 1), (-1, 2), (0, 2)),
               'grin': ((-4, -1), (-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, -1), (-2, 1), (-1, 1), (0, 1), (1, 1), (-1, 2), (0, 2)),
               'smirk': ((-2, 1), (-1, 1), (0, 1), (1, 0), (2, 0), (3, -1))}[kind]
    for dx, dy in pts: put(mx + dx, my + dy)

def ghost_frame(ch, view, anim, i):
    P = pose(anim, i)
    c = rgb(ch['body']); hi = lt(lt(c)); core = mix(lt(lt(lt(c))), (255, 255, 255, 255), 0.35)
    rim = mix(mul(c, 0.5), (70, 40, 150, 255), 0.3); deep = mix(mul(c, 0.3), (30, 16, 60, 255), 0.45)
    face = GHOST_FACE.get(ch.get('gid'), 'smile')
    walk = P['walk']; co = P['c']
    fl = 0 if walk else -P['bob']
    cy = 24 + fl; rx, ry = 11, 12
    wig = int(round(2 * co)) if walk else (1 if P['bob'] else 0)
    ph = P['ph'] if walk else (math.pi / 2 if P['bob'] else 0)
    mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mask)
    def dome(cx):
        return [(round(cx + rx * math.cos(a)), round(cy + ry * math.sin(a))) for a in [math.pi + k * math.pi / 14 for k in range(15)]]
    bits = []; ant = None
    if view in ('down', 'up'):
        bcx = CX; hem = cy + 12
        pts = dome(CX)
        for k in range(0, 23):                                  # wispy hem: three tapering tails that ripple
            x = CX + rx - k
            pts.append((x, hem + int(round(1 + 5.0 * abs(math.sin(k * math.pi / 7.4 + ph * 0.5)) ** 0.7))))
        md.polygon(pts, fill=255)
        for sgn in (-1, 1):                                     # little nub arms
            ax = CX + sgn * (rx + 1) - (1 if sgn < 0 else 0)
            md.rectangle([ax - 1, cy + 3 - sgn * wig, ax + 1, cy + 6 - sgn * wig], fill=255)
        bits = [(CX - 10, hem + 8), (CX - 1, hem + 9), (CX + 7, hem + 7), (CX + 13, cy - 6)]
        ant = (CX + 2, 2 + (P['sway'] if walk else 0))
    else:
        bcx = CX + 1; cx = bcx
        pts = dome(cx)
        pts += [(cx + rx, cy + 6), (cx + rx - 2, cy + 11), (cx + 5, cy + 14), (cx - 2, cy + 14 + wig // 2),
                (cx - 8, cy + 16 + wig), (cx - 14, cy + 15 + wig), (cx - 19, cy + 12 + wig), (cx - 18, cy + 11 + wig), (cx - 12, cy + 12), (cx - rx, cy + 7)]
        md.polygon(pts, fill=255)
        md.rectangle([cx - 3 + wig // 2, cy + 8, cx + wig // 2, cy + 10], fill=255)
        bits = [(cx - 21, cy + 8), (cx - 16, cy + 19), (cx - 9, cy + 20), (cx - 14, cy - 5)]
        ant = (cx - 1, -2 - (1 if walk else 0))
    m = mask.load()
    def inside(x, y): return 0 <= x < W and 0 <= y < H and m[x, y] > 0
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out = im.load()
    top = cy - ry; span = 30.0
    for y in range(H):
        for x in range(W):
            if not inside(x, y):
                n4 = inside(x - 1, y) or inside(x + 1, y) or inside(x, y - 1) or inside(x, y + 1)
                n8 = n4 or inside(x - 1, y - 1) or inside(x + 1, y - 1) or inside(x - 1, y + 1) or inside(x + 1, y + 1) or inside(x - 2, y) or inside(x + 2, y) or inside(x, y - 2) or inside(x, y + 2)
                if n4: out[x, y] = _rgba(c, 78)                     # halo
                elif n8: out[x, y] = _rgba(c, 30)
                continue
            t = max(0.0, min(1.0, (y - top) / span))
            edge = not (inside(x - 1, y) and inside(x + 1, y) and inside(x, y - 1) and inside(x, y + 1))
            if edge:
                out[x, y] = _rgba(mix(rim, c, 0.25 + 0.45 * t), 240 - 80 * t)
                continue
            # glow core near the crown, upper left
            dx = (x - (bcx - 3)) / 9.0; dy = (y - (cy - 5)) / 9.0; g = max(0.0, 1.0 - (dx * dx + dy * dy))
            col = mix(c, core, 0.46 * g)
            col = mix(col, mix(c, (90, 60, 190, 255), 0.35), 0.55 * t * t)      # cools off toward the hem
            a = 218 - 108 * t * t - 14 * (1 - g) * (1 - t)
            lit = not (inside(x - 2, y) and inside(x, y - 2))                    # inner rim light, top left
            shade = not (inside(x + 2, y) and inside(x, y + 2))
            if lit and not shade: col = mix(col, (255, 255, 255, 255), 0.42); a += 14
            elif shade and not lit: col = mix(col, rim, 0.3)
            if (y + (i if walk else 0)) % 3 == 0: col = mul(col, 0.95); a -= 10   # scanline, drifting while it moves
            out[x, y] = _rgba(col, a)
    def put(x, y, col, a=255):
        if 0 <= x < W and 0 <= y < H: out[int(x), int(y)] = _rgba(col, a)
    # sheen: a short bright stroke and a spark
    sx = bcx - 7
    for k in range(4): put(sx + k, cy - 8 - (k // 2), (255, 255, 255, 255), 200)
    put(sx - 1, cy - 5, (255, 255, 255, 255), 170)
    # antenna: a thin stem with a bright data spark
    ax, lean = ant
    for k in range(4): put(ax + round(lean * k / 3.0), cy - ry - 1 - k, rim, 220)
    for dx2, dy2 in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): put(ax + lean + dx2, cy - ry - 6 + dy2, c, 150)
    put(ax + lean, cy - ry - 6, (255, 255, 255, 255), 255)
    # loose data flecks drifting off the body
    for k, (bx, by) in enumerate(bits):
        d = (k * 2 + (i if walk else P['bob'] * 2)) % 6
        a = 190 - d * 30
        put(bx, by + d - 2, hi if k % 2 else c, a); put(bx + 1, by + d - 2, hi if k % 2 else c, a)
        if k % 2 == 0: put(bx, by + d - 1, c, a * 0.7); put(bx + 1, by + d - 1, c, a * 0.7)
    eye = (18, 14, 34, 255)
    if view == 'down':
        for ex in (CX - 6, CX + 3):
            if face == 'flat':                                   # sleepy, half-lidded
                for xx in range(3):
                    for yy in (1, 2): put(ex + xx, cy - 2 + yy, eye)
                for xx in range(-1, 4): put(ex + xx, cy - 2, deep, 230)
            elif face == 'grin':                                 # tall, wide awake
                for xx in range(3):
                    for yy in range(4): put(ex + xx, cy - 3 + yy, eye)
                put(ex, cy - 3, (255, 255, 255, 255))
            else:
                for xx in range(3):
                    for yy in range(3): put(ex + xx, cy - 2 + yy, eye)
                put(ex, cy - 2, (255, 255, 255, 255))
        if face == 'frown':                                      # slanted brows
            for k in range(3): put(CX - 7 + k, cy - 5 + k // 2 + (1 if k == 2 else 0), deep); put(CX + 6 - k, cy - 5 + k // 2 + (1 if k == 2 else 0), deep)
        if face == 'smirk':                                      # one raised brow
            for k in range(3): put(CX + 3 + k, cy - 5, deep)
        if face == 'ooh':
            for bx in (CX - 9, CX + 7): put(bx, cy + 3, (255, 150, 190, 255), 210); put(bx + 1, cy + 3, (255, 150, 190, 255), 210)
        ghost_mouth(lambda x, y: put(x, y, deep), face, CX, cy + 5)
        if face == 'grin':
            for xx in (-2, -1, 0, 1): put(CX + xx, cy + 5, (255, 255, 255, 255), 235)   # teeth
    elif view == 'up':
        for k, (gx, gy) in enumerate(((-3, -2), (0, -2), (3, -2), (-3, 2), (3, 2), (0, 5))):
            col = rim if k % 2 else core
            for xx in (0, 1):
                for yy in (0, 1): put(CX + gx + xx, cy + gy + yy, col, 200)
    else:
        cx = bcx
        h = 4 if face == 'grin' else 3; y0 = cy - 3 if face == 'grin' else cy - 2
        for yy in range(h):
            if face == 'flat' and yy == 0:
                for xx in range(2, 7): put(cx + xx, cy - 2, deep, 230)
                put(cx + 8, cy - 2, deep, 230); put(cx + 9, cy - 2, deep, 230); continue
            for xx in range(3): put(cx + 3 + xx, y0 + yy, eye)
            for xx in range(2): put(cx + 8 + xx, y0 + yy, eye)
        if face != 'flat': put(cx + 3, y0, (255, 255, 255, 255))
        if face == 'frown':
            for k in range(3): put(cx + 2 + k, cy - 5 + (1 if k == 2 else 0), deep)
            put(cx + 8, cy - 4, deep); put(cx + 9, cy - 5, deep)
        if face == 'smirk':
            for k in range(3): put(cx + 3 + k, cy - 5, deep)
        if face == 'ooh': put(cx + 2, cy + 3, (255, 150, 190, 255), 210); put(cx + 3, cy + 3, (255, 150, 190, 255), 210)
        ghost_mouth(lambda x, y: put(x, y, deep), face, cx + 7, cy + 5, side=True)
        if face == 'grin': put(cx + 7, cy + 5, (255, 255, 255, 255), 235); put(cx + 8, cy + 5, (255, 255, 255, 255), 235)
    return im

# ---------------------------------------------------------------- views
# ---------------------------------------------------------------- holograms
# The playable characters (Nov 16, third look): projections of a tamer who is
# really sitting at a computer on the other side. All eight are the same slim
# figure on purpose, told apart by colour alone: see-through light with a
# bright rim, scanlines, a face that is only two faint points, a glitch tear
# now and then, and a ring of light on the ground where it is being projected.
def holo_frame(ch, view, anim, i):
    P = pose(anim, i)
    c = rgb(ch['body']); rim = mix(c, (255, 255, 255, 255), 0.32); deep = mul(c, 0.62)
    walk, s, co = P['walk'], P['s'], P['c']
    bob = 0 if walk else -P['bob']
    hover = 2                                   # the figure floats just off its ring
    mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mask)
    hip = FEET - hover - 15 + bob               # where the legs start
    sh = hip - 12                               # shoulder line
    hy = sh - 8                                 # head centre
    step = int(round(3 * s)) if walk else 0
    if view in ('down', 'up'):
        md.ellipse([CX - 7, hy - 7, CX + 6, hy + 6], fill=255)                              # head
        md.rectangle([CX - 1, hy + 6, CX, sh], fill=255)                                    # neck
        md.polygon([(CX - 7, sh + 1), (CX - 5, sh - 1), (CX + 4, sh - 1), (CX + 6, sh + 1), (CX + 4, hip), (CX - 5, hip)], fill=255)    # torso, sloped shoulders
        for sgn in (-1, 1):                                                                 # arms, swinging against the legs
            ax = CX - 9 if sgn < 0 else CX + 7
            a = -sgn * step
            md.rectangle([ax, sh + 1 + max(0, a), ax + 1, hip - 1 + min(0, a) + (1 if a > 0 else 0)], fill=255)
        for sgn in (-1, 1):                                                                 # legs
            lx = CX - 5 if sgn < 0 else CX + 1
            lift = max(0, sgn * step)
            md.rectangle([lx, hip, lx + 3, FEET - hover - lift], fill=255)
    else:
        cx = CX
        md.ellipse([cx - 6, hy - 7, cx + 7, hy + 6], fill=255)
        md.rectangle([cx, hy + 6, cx + 1, sh], fill=255)
        md.polygon([(cx - 4, sh + 1), (cx - 2, sh - 1), (cx + 3, sh - 1), (cx + 5, sh + 1), (cx + 4, hip), (cx - 4, hip)], fill=255)
        sw = 5 * s if walk else 0
        md.line([(cx, sh + 2), (cx - sw * 0.9, hip - 1)], fill=255, width=3)                # the near arm
        for sgn in (-1, 1):                                                                 # legs scissoring
            fx = cx + sgn * sw
            lift = 2 if (walk and sgn * co > 0.3) else 0
            md.line([(cx, hip), (fx, FEET - hover - lift)], fill=255, width=4)
            md.rectangle([int(round(fx)) - 1, FEET - hover - lift - 1, int(round(fx)) + 2, FEET - hover - lift], fill=255)
    m = mask.load()
    def inside(x, y): return 0 <= x < W and 0 <= y < H and m[x, y] > 0
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out = im.load()
    def put(x, y, col, a):
        if 0 <= x < W and 0 <= y < H: out[int(x), int(y)] = (col[0], col[1], col[2], max(0, min(255, int(a))))
    # the ring on the ground it is projected from (it does not bob)
    for k in range(-9, 10):
        e = 1 - abs(k) / 10.0
        put(CX + k, FEET + 1, rim if abs(k) < 6 else c, 70 + 110 * e)
        if abs(k) < 8 and k % 2 == 0: put(CX + k, FEET + 2, c, 60 * e)
    for k in (-5, 0, 4):                                                                    # motes rising in the beam
        d = (i * 2 + k * 3) % 7
        put(CX + k, FEET - 1 - d, rim, 150 - d * 18)
    top = hy - 7; span = float(FEET - top)
    tear = (i % 4 == 3) if walk else (i % 2 == 1 and False)                                 # a glitch tear on one walk frame
    tear_y = top + 14 + (i * 5) % 12
    for y in range(H):
        shift = 1 if (tear and tear_y <= y < tear_y + 3) else 0
        for x in range(W):
            if not inside(x, y):
                if inside(x - 1, y) or inside(x + 1, y) or inside(x, y - 1) or inside(x, y + 1): put(x + shift, y, c, 55)   # halo
                continue
            t = max(0.0, min(1.0, (y - top) / span))
            edge = not (inside(x - 1, y) and inside(x + 1, y) and inside(x, y - 1) and inside(x, y + 1))
            if edge: col, a = rim, 250 - 70 * t
            else:
                col = mix(c, deep, 0.5 * t); a = 185 - 70 * t * t
                if y % 2 == 0: col = mul(col, 0.82); a -= 30                                # scanlines
                if not inside(x - 2, y) or not inside(x, y - 2): col = mix(col, rim, 0.35)  # light from the upper left
            if not walk and P['bob']: a *= 0.93                                             # a slow shimmer while it stands
            put(x + shift, y, col, a)
    # a face that is only suggested: two faint points of light
    if view == 'down':
        for ex in (CX - 4, CX + 1): put(ex, hy, (255, 255, 255, 255), 170); put(ex + 1, hy, (255, 255, 255, 255), 170)
    elif view != 'up':
        put(CX + 3, hy, (255, 255, 255, 255), 150); put(CX + 4, hy, (255, 255, 255, 255), 150)
    return im

def frame(ch, view, anim, i):
    if ch.get('kind') == 'holo':
        if '--holo1' in sys.argv: return holo_frame(ch, view, anim, i)      # the first, all-alike projections
        if '--holo2' in sys.argv:
            import holo2                                                    # Nov 16: each projection has its own outline
            return holo2.holo2_frame(ch, view, anim, i)
        import holo3                                                        # Nov 20: the same outfits on a rigged eight-frame walk
        return holo3.holo3_frame(ch, view, anim, i)
    if ch.get('kind') == 'ghost': return ghost_frame(ch, view, anim, i)
    P = pose(anim, i); p = Pen()
    s, c, walk = P['s'], P['c'], P['walk']
    bob = P['bob']
    legs = ch['legs']
    ly = FEET - 2 - legs                   # hip row
    hem = 13
    if view in ('down', 'up'):
        liftL = int(round(3 * max(0, s))) if walk else 0
        liftR = int(round(3 * max(0, -s))) if walk else 0
        if walk: bob = 1 if abs(s) < 0.5 else 0
        ty = ly - hem + bob; hy = ty - 11
        back = view == 'up'
        sway = P['sway']
        extL = int(round(-1.6 * s)) if walk else 0
        extR = -extL
        if not back and ch['hairstyle'] == 'ponytail':
            h = rgb(ch['hair']); p.poly([(CX + 6, hy - 6), (CX + 12 + sway, hy - 3), (CX + 13 + sway, hy + 8), (CX + 9, hy + 11), (CX + 7, hy + 2)], h)
        if not back and ch['hairstyle'] == 'twintails':
            h = rgb(ch['hair'])
            for sgn in (-1, 1):
                x = CX + sgn * 11 - (1 if sgn < 0 else 0)
                p.poly([(x - 2, hy - 5), (x + 2, hy - 5), (x + 3 + sway, hy + 10), (x + sway, hy + 15), (x - 3 + sway, hy + 10)], h)
        if not back and ch['hairstyle'] == 'long':
            h = rgb(ch['hair']); p.poly([(CX - 10, hy), (CX + 9, hy), (CX + 10 + sway, hy + 20), (CX - 11 + sway, hy + 20)], h)
        if not back and ch.get('pack'):
            pk = rgb(ch['pack']); p.rect(CX - 9, ty + 1, CX - 7, ty + 9, pk); p.rect(CX + 6, ty + 1, CX + 8, ty + 9, pk)
        leg_front(p, ch, CX - 6, liftL, ly + bob, back); leg_front(p, ch, CX + 1, liftR, ly + bob, back)
        if ch['bottom'] == 'skirt': skirt(p, ch, ly + bob)
        arm_front(p, ch, True, ty, extL); arm_front(p, ch, False, ty, extR)
        torso_front(p, ch, ty, back)
        if ch['bottom'] == 'skirt': p.rect(CX - 7, ly + bob - 3, CX + 6, ly + bob - 2, dk(rgb(ch['bottomc'])), edge=False)
        if ch.get('satchel'):
            sc = rgb(ch['satchel'])
            if back: p.d.line([CX - 6, ty + 1, CX + 6, ty + 12], fill=sc, width=2); p.rect(CX + 5, ty + 10, CX + 10, ty + 15, sc)
            else: p.d.line([CX + 5, ty + 1, CX - 6, ty + 12], fill=sc, width=2); p.rect(CX - 11, ty + 10, CX - 6, ty + 15, sc); p.px(CX - 9, ty + 12, lt(sc))
        if back and ch.get('pack'):
            pk = rgb(ch['pack']); p.rect(CX - 6, ty + 1, CX + 5, ty + 11, pk); p.rect(CX - 4, ty + 6, CX + 3, ty + 9, dk(pk), edge=False); p.d.line([CX - 5, ty + 2, CX + 4, ty + 2], fill=lt(pk))
        if ch.get('scarf'):
            sc = rgb(ch['scarf']); p.rect(CX - 6, ty - 2, CX + 5, ty + 1, sc)
            if back: p.poly([(CX + 1, ty + 1), (CX + 4, ty + 1), (CX + 5 + sway, ty + 10), (CX + 2 + sway, ty + 10)], sc)
            else: p.poly([(CX - 6, ty + 1), (CX - 3, ty + 1), (CX - 3 - sway, ty + 9), (CX - 6 - sway, ty + 9)], sc)
        if ch['gear'] == 'headphones': headphones(p, ch, ty)
        if back: hair_back(p, ch, hy, sway)
        else:
            head_base(p, ch, hy); face_front(p, ch, hy); hair_front(p, ch, hy, sway); gear_front(p, ch, hy)
    else:  # side, facing right
        if walk: bob = 1 if abs(s) > 0.8 else 0
        ty = ly - hem + bob; hy = ty - 11
        sway = int(round(c)) if walk else 0
        skin = rgb(ch['skin']); bc = rgb(ch['bottomc']); sh = rgb(ch['shoes']); top = rgb(ch['top'])
        kind = ch['bottom']; legc = bc if kind in ('pants', 'leggings') else skin
        def leg(phase_s, phase_c, far):
            dx = int(round(5 * phase_s)) if walk else (1 if not far else -1)
            lift = int(round(2.6 * max(0, phase_c))) if walk else 0
            fy = FEET - 3 - lift; fx = CX + dx
            col = mul(legc, 0.82) if far else legc
            p.limb(CX, ly + bob, fx, fy, 7, col)
            if kind == 'shorts': p.limb(CX, ly + bob, CX + dx * 0.4, ly + bob + 5, 6, mul(bc, 0.85) if far else bc)
            scol = mul(sh, 0.82) if far else sh
            if ch.get('boots'): p.limb(CX + dx * 0.65, fy - 4, fx, fy, 6, scol)
            p.rect(fx - 3, fy, fx + 4, fy + 3, scol)
        def arm(phase_s, far):
            hdx = int(round(-4.5 * phase_s)) if walk else 0
            col = top if ch['sleeves'] == 'long' else skin
            if far: col = mul(col, 0.82)
            sx, sy = CX - 1, ty + 2
            hx, hyy = sx + hdx, ty + 11 - abs(hdx) // 3
            p.limb(sx, sy, hx, hyy, 5, col)
            if ch['sleeves'] == 'short': p.limb(sx, sy, sx + hdx * 0.4, sy + 4, 5, mul(top, 0.82) if far else top)
            p.rect(hx - 2, hyy, hx + 1, hyy + 2, mul(skin, 0.85) if far else skin)
        arm(-s, True)
        leg(-s, -c, True)
        leg(s, c, False)
        if ch.get('pack'):
            pk = rgb(ch['pack']); p.rect(CX - 11, ty + 1, CX - 5, ty + 11, pk); p.d.line([CX - 10, ty + 2, CX - 6, ty + 2], fill=lt(pk))
        if ch.get('scarf'):
            sc = rgb(ch['scarf'])
            fl = 2 if walk else 0
            p.poly([(CX - 4, ty - 1), (CX - 12 - fl, ty + 1 + sway), (CX - 14 - fl, ty + 6 + sway), (CX - 11 - fl, ty + 5 + sway), (CX - 4, ty + 3)], sc)
        hemh = 16 if ch.get('coat') else 13
        p.poly([(CX - 6, ty), (CX + 4, ty), (CX + 5, ty + hemh), (CX - 6, ty + hemh)], top)
        p.rect(CX - 2, ty - 2, CX + 1, ty, skin)
        if ch['top2'] != ch['top']: p.rect(CX + 3, ty + 1, CX + 4, ty + hemh - 1, rgb(ch['top2']), edge=False)
        if ch.get('hood'): p.ell(CX - 8, ty - 3, CX - 1, ty + 4, dk(top))
        if kind == 'skirt': skirt(p, ch, ly + bob, True, -sway if walk else 0)
        if ch.get('satchel'):
            sc = rgb(ch['satchel']); p.d.line([CX + 3, ty + 1, CX - 4, ty + 12], fill=sc, width=2); p.rect(CX - 6, ty + 11, CX, ty + 16, sc); p.px(CX - 4, ty + 13, lt(sc))
        if ch.get('scarf'): p.rect(CX - 5, ty - 2, CX + 5, ty + 1, rgb(ch['scarf']))
        arm(s, False)
        if ch['gear'] == 'headphones': headphones(p, ch, ty, True)
        head_base(p, ch, hy); face_side(p, ch, hy); hair_side(p, ch, hy, sway); gear_side(p, ch, hy)
    return p.finish(ch)

def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sprites', 'frames', 'tamers')
    rows = []
    for tid, ch in TAMERS.items():
        if ch.get('kind') not in ('ghost', 'holo') and '--humans' not in sys.argv: continue   # humans are retired; pass --humans to draw them
        out = os.path.join(root, tid); os.makedirs(out, exist_ok=True)
        for view in ('down', 'up', 'side'):
            fr = []
            for anim, n in (('idle', IDLE_N), ('walk', WALK_N)):
                for i in range(n):
                    im = frame(ch, view, anim, i); im.save(os.path.join(out, '%s_%s_%d.png' % (view, anim, i))); fr.append(im)
            rows.append(fr)
    if len(sys.argv) > 1 and not sys.argv[1].startswith('--'):
        Z = 4; n = IDLE_N + WALK_N
        sheet = Image.new('RGBA', (n * W * Z, len(rows) * H * Z), (74, 122, 58, 255))
        for r, fr in enumerate(rows):
            for k, im in enumerate(fr):
                big = im.resize((W * Z, H * Z), Image.NEAREST); sheet.paste(big, (k * W * Z, r * H * Z), big)
        sheet.save(sys.argv[1])
    print('wrote', len(rows) * (IDLE_N + WALK_N), 'frames')

if __name__ == '__main__':
    main()
