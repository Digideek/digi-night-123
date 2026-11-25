"""Hologram projections, fourth pass (17z33): no legs. The projection fades out below the waist
into digital mist and glides instead of walking.

  - drawn at one and a half times the old resolution (60 x 84, shown 1:1 in the game: js/sprites.js),
    so with no legs the body gets the room and the outfits, hair and faces more pixels: a 1-px ink line, a rim light along the top and
    left edges, a two-step shade along the bottom and right, an ordered-dither gradient down the body,
    fine scanlines;
  - from the waist down the figure breaks up: rows slip sideways and pixels drop out (ordered
    dither) until nothing is left a little above the ground; a faint beam and the ring it's
    projected from stay under it. The drifting mist motes and the trail are drawn live by the game;
  - "walk" frames are a glide: no steps, a gentle float, the arms held back a little, hair and capes
    streaming behind; the idle is the same four-beat breath as before.

  python3 scripts/art/holo4.py preview.png      draws a sheet only
  python3 scripts/art/make_tamers.py            writes the game's frames (make_tamers uses this file)
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_tamers as T
import random
WALK_N, IDLE_N = 8, 4
S = 1.5                                 # drawn half as big again as before, shown 1:1 (17z33)
NOLEGS = True

class SD:
    """an ImageDraw that takes the old 1x coordinates and draws them at S x"""
    def __init__(self, im): self.d = ImageDraw.Draw(im)
    @staticmethod
    def _pts(xy):
        if xy and isinstance(xy[0], (tuple, list)): return [(x * S + S / 2.0 - 0.5, y * S + S / 2.0 - 0.5) for x, y in xy]
        return [(xy[k] * S + S / 2.0 - 0.5) for k in range(len(xy))]
    @staticmethod
    def _box(b):
        if isinstance(b[0], (tuple, list)): b = [b[0][0], b[0][1], b[1][0], b[1][1]]
        return [int(round(b[0] * S)), int(round(b[1] * S)), int(round(b[2] * S + S - 1)), int(round(b[3] * S + S - 1))]
    def line(self, xy, fill=None, width=1):
        if width > 1: self.d.line(self._pts(xy), fill=fill, width=int(round(width * S)))
        else: self.d.line([(p[0] + 0.5, p[1] + 0.5) for p in self._pts(xy)] if isinstance(self._pts(xy)[0], tuple) else self._pts(xy), fill=fill, width=1)   # pen lines: a fine 1 px
    def polygon(self, xy, fill=None, outline=None): self.d.polygon(self._pts(xy), fill=fill, outline=outline)
    def ellipse(self, b, fill=None, outline=None, width=1): self.d.ellipse(self._box(b), fill=fill, outline=outline, width=int(width * (S if outline is not None and fill is None else 1)))
    def rectangle(self, b, fill=None, outline=None, width=1): self.d.rectangle(self._box(b), fill=fill, outline=outline, width=width)
    def rounded_rectangle(self, b, r, fill=None, outline=None): self.d.rounded_rectangle(self._box(b), int(r * S), fill=fill, outline=outline)
    def arc(self, b, a0, a1, fill=None, width=1): self.d.arc(self._box(b), a0, a1, fill=fill, width=max(1, int(width * S)) if width > 1 else 1)
    def pieslice(self, b, a0, a1, fill=None): self.d.pieslice(self._box(b), a0, a1, fill=fill)
    def point(self, xy, fill=None):
        x, y = xy if isinstance(xy[0], (int, float)) else xy[0]
        self.d.rectangle([int(int(x) * S), int(int(y) * S), int(int(x) * S + S - 1), int(int(y) * S + S - 1)], fill=fill)
def gp(im, xy): ImageDraw.Draw(im).rectangle([int(xy[0] * S), int(xy[1] * S), int(xy[0] * S + S - 1), int(xy[1] * S + S - 1)], fill=255)
W, H, CX, FEET = T.W, T.H, T.CX, T.FEET
rgb, mix, mul = T.rgb, T.mix, T.mul

STYLE = {
    'byte':  dict(hair='spiky',    wear='jacket',  extra='goggles'),
    'glim':  dict(hair='twintail', wear='dress',   extra='bow'),
    'zap':   dict(hair='cap',      wear='hoodie',  extra='pack'),
    'ember': dict(hair='ponytail', wear='vest',    extra='scarf'),
    'nyx':   dict(hair='hood',     wear='cloak',   extra=None),
    'null':  dict(hair='bob',      wear='coat',    extra='visor'),
    'rune':  dict(hair='mohawk',   wear='cape',    extra='collar'),
    'echo':  dict(hair='long',     wear='jacket',  extra='phones'),
    # 17z33: a reward projection for one of the testers (secret: not on the picker until unlocked).
    # Black but never lost on a dark map: a silver-grey outline and a cool edge light; broad in the
    # shoulders; a forward cap; a black cigarette (the tip and the smoke are drawn live, js/sprites.js)
    'smoke': dict(hair='cap',      wear='jacket',  extra='cig', broad=2, dark=True, thick=1, belly=1, sleeves=True),
}
TIPS = {}

def _ik(hx, hy, fx, fy, l1, l2, fwd=1):
    """knee for a hip and a foot: the knee bends toward fwd (+1 forward/right)"""
    dx, dy = fx - hx, fy - hy; d = math.hypot(dx, dy) or 0.01
    d2 = min(d, l1 + l2 - 0.05)
    a = math.atan2(dy, dx)
    k = math.acos(max(-1.0, min(1.0, (l1 * l1 + d2 * d2 - l2 * l2) / (2 * l1 * d2))))
    ang = a - k * fwd
    return hx + math.cos(ang) * l1, hy + math.sin(ang) * l1

def pose3(anim, i):
    if anim == 'idle':
        ph = 2 * math.pi * i / IDLE_N
        # breathe in (the body rises), then the hands follow it up, then out again: four distinct poses
        return dict(walk=False, ph=ph, s=0.0, c=0.0, breath=(0, 1, 1, 0)[i % 4], arm=(0, 0, 1, 1)[i % 4])
    ph = 2 * math.pi * i / WALK_N
    # a glide (17z33): no stride; the arms barely move, held a little back
    return dict(walk=True, ph=ph, s=0.22 * math.sin(ph), c=0.0, breath=0.0, arm=0)

def holo4_frame(ch, view, anim, i):
    st = STYLE[ch['gid']]; hair, wear, extra = st['hair'], st['wear'], st['extra']
    P = pose3(anim, i)
    c = rgb(ch['body']); rim = mix(c, (255, 255, 255, 255), 0.45); deep = mul(c, 0.55)
    ink = mix(mul(c, 0.22), (14, 12, 30, 255), 0.45)
    if st.get('dark'): c, rim, deep, ink = (34, 36, 44, 255), (122, 132, 152, 255), (12, 13, 18, 255), (176, 186, 204, 255)
    bw = st.get('broad', 0); bs = 1 if bw else 0; aw = st.get('thick', 0); bl = st.get('belly', 0); slv = st.get('sleeves', False)
    walk, s, co = P['walk'], P['s'], P['c']
    ph = P['ph']; cig = None; cuffs = []; mouth = None
    # dips at each contact (|s| = 1), rises as the legs pass (s = 0); idle: a slow breath
    bob = -int(round(1.0 + math.sin(ph))) if walk else -int(round(P['breath']))   # a float, not a step
    # hair, capes and scarves trail a beat behind the body
    sway = int(round(1.6 * math.sin(ph - 0.9))) if walk else int(round(math.sin(ph)))
    hover = 2
    M = Image.new('L', (int(W * S), int(H * S)), 0); md = SD(M)      # the figure
    L = Image.new('L', (int(W * S), int(H * S)), 0); ld = SD(L)      # pen lines inside it
    G = Image.new('L', (int(W * S), int(H * S)), 0); gd = SD(G)      # bright points (eyes, lenses)
    front = view in ('down', 'up'); back = view == 'up'
    # the walk: the body rises as one leg passes the other and sinks as the feet land
    F = Image.new('L', (int(W * S), int(H * S)), 0); fd = SD(F)      # far limbs, behind the body, a deeper tone
    A = Image.new('L', (int(W * S), int(H * S)), 0); ad = SD(A)      # the near arm, over the body: gets its own contour
    hip = FEET - hover - 15 + bob; sh = hip - 12
    hbob = -int(round(1.0 + math.sin(ph - 0.5))) if walk else bob     # the head settles a beat later
    hy = sh - 8 + (hbob - bob)
    if not walk and P['breath'] > 0.5: sh -= 0                                 # (shoulders rise with the whole body)
    foot = FEET - hover

    if front:
        # ---- behind the body
        if wear == 'cape':
            fl = 2 if walk else 0
            md.polygon([(CX - 7, sh), (CX + 6, sh), (CX + 9 + fl, hip + 9), (CX - 10 - fl, hip + 9)], fill=255)
        if hair == 'long' and not back:
            md.polygon([(CX - 8, hy), (CX + 7, hy), (CX + 8, sh + 7), (CX - 9, sh + 7)], fill=255)
        if hair == 'twintail':
            for sg in (-1, 1):
                x0 = CX - 12 if sg < 0 else CX + 7
                md.ellipse([x0 + sway, hy - 3, x0 + 4 + sway, sh + 6], fill=255)
                ld.point((x0 + 2, hy - 1), fill=255)
        if hair == 'ponytail' and not back:
            md.polygon([(CX + 3, hy - 7), (CX + 9, hy - 11 + sway), (CX + 11, hy - 4 + sway), (CX + 9, hy + 1 + sway), (CX + 6, hy - 3)], fill=255)
        if extra == 'pack' and not back:
            md.rectangle([CX - 8, sh, CX + 7, sh + 3], fill=255)
        # ---- legs
        toward = 1 if not back else -1                                                     # down view: forward is down the screen
        for sg in (() if NOLEGS else (-1, 1)):
            hx = CX - 3.5 if sg < 0 else CX + 2.5
            # leg sg reaches forward when sg * s > 0 and swings (lifted) while sg * c > 0
            reach = sg * s if walk else 0.0
            lift = 3.2 * max(0.0, sg * co) if walk else 0.0
            fy = foot - lift + toward * reach * 1.3
            fx = hx + sg * 0.6 * lift / 3.2
            ky = (hip + fy) / 2.0 - lift * 0.15
            kx = hx + sg * (0.4 + lift * 0.35)                                             # the knee turns out a touch as it lifts
            md.line([(hx, hip), (kx, ky)], fill=255, width=4)
            md.line([(kx, ky), (fx, fy - 1)], fill=255, width=3 if lift > 1.5 else 4)
            if lift > 1.5: ld.line([(kx - 1.5, ky), (kx + 1.5, ky)], fill=255)                # the knee crease
            x0 = int(round(fx)) - 2; y0 = int(round(fy))
            md.rectangle([x0 - (1 if sg < 0 else 0), y0 - 1, x0 + 3 + (1 if sg > 0 else 0), y0 + (1 if (reach > 0.5 and not back) else 0)], fill=255)   # shoes, the reaching one a little bigger (nearer)
            ld.line([(x0, y0 - 2), (x0 + 3, y0 - 2)], fill=255)
        # ---- torso
        md.polygon([(CX - 7 - bw, sh + 1), (CX - 5 - bw, sh - 1), (CX + 4 + bw, sh - 1), (CX + 6 + bw, sh + 1), (CX + 5 + bs + bl, hip - 3), (CX + 4 + bs + bl, hip), (CX - 5 - bs - bl, hip), (CX - 6 - bs - bl, hip - 3)], fill=255)
        if wear == 'dress':
            md.polygon([(CX - 5, hip - 4), (CX + 4, hip - 4), (CX + 8, hip + 5), (CX - 9, hip + 5)], fill=255)
            ld.line([(CX - 5, hip - 4), (CX + 4, hip - 4)], fill=255)
            for k in (-4, 0, 3): ld.line([(CX + k, hip), (CX + k + (1 if k > 0 else -1 if k < 0 else 0), hip + 4)], fill=255)
        elif wear == 'coat':
            md.polygon([(CX - 6, sh + 1), (CX + 5, sh + 1), (CX + 7, hip + 8), (CX - 8, hip + 8)], fill=255)
            if not back:
                ld.line([(CX - 1, sh + 2), (CX - 1, hip + 7)], fill=255); ld.point((CX + 1, sh + 5), fill=255); ld.point((CX + 1, sh + 9), fill=255)
            else: ld.line([(CX - 1, hip), (CX - 1, hip + 7)], fill=255)
            ld.line([(CX - 6, hip - 2), (CX + 5, hip - 2)], fill=255)
        elif wear == 'cloak':
            md.polygon([(CX - 6, sh - 1), (CX + 5, sh - 1), (CX + 10 + sway, hip + 9), (CX + 5 + sway, hip + 11), (CX + sway, hip + 8), (CX - 6 + sway, hip + 11), (CX - 11 + sway, hip + 9)], fill=255)
            if not back: ld.line([(CX - 1, sh + 3), (CX - 2, hip + 7)], fill=255); gp(G, (CX - 1, sh + 2))
            else: ld.line([(CX - 4, sh + 5), (CX - 6, hip + 8)], fill=255); ld.line([(CX + 3, sh + 5), (CX + 5, hip + 8)], fill=255)
        elif wear == 'jacket':
            ld.line([(CX - 5, hip - 3), (CX + 4, hip - 3)], fill=255)
            if not back:
                ld.line([(CX - 1, sh), (CX - 1, hip - 3)], fill=255); ld.line([(CX - 4, sh), (CX - 2, sh + 3)], fill=255); ld.line([(CX + 3, sh), (CX + 1, sh + 3)], fill=255)
            else: ld.line([(CX - 4, sh + 3), (CX + 3, sh + 3)], fill=255)
        elif wear == 'hoodie':
            md.rectangle([CX - 6, hip - 1, CX + 5, hip + 1], fill=255)
            if not back:
                ld.rectangle([CX - 3, hip - 5, CX + 2, hip - 2], outline=255); ld.line([(CX - 2, sh), (CX - 2, sh + 3)], fill=255); ld.line([(CX + 1, sh), (CX + 1, sh + 3)], fill=255)
            else: md.ellipse([CX - 5, sh - 2, CX + 4, sh + 4], fill=255); ld.arc([CX - 5, sh - 2, CX + 4, sh + 4], 0, 180, fill=255)
        elif wear == 'vest':
            if not back: ld.line([(CX - 3, sh), (CX - 1, hip - 2)], fill=255); ld.line([(CX + 2, sh), (CX, hip - 2)], fill=255)
            ld.line([(CX - 5, hip - 2), (CX + 4, hip - 2)], fill=255); gp(G, (CX - 1, hip - 2))
        elif wear == 'cape':
            if not back: ld.line([(CX - 5, hip - 3), (CX + 4, hip - 3)], fill=255); ld.line([(CX - 6, sh + 1), (CX - 1, sh + 4)], fill=255); ld.line([(CX + 5, sh + 1), (CX, sh + 4)], fill=255)
            else:
                md.polygon([(CX - 7, sh), (CX + 6, sh), (CX + 9, hip + 9), (CX - 10, hip + 9)], fill=255)
                ld.line([(CX - 3, sh + 4), (CX - 5, hip + 8)], fill=255); ld.line([(CX + 2, sh + 4), (CX + 4, hip + 8)], fill=255)
        # ---- arms
        if wear != 'cloak':
            for sg in (-1, 1):
                ax = CX - 8 - bw if sg < 0 else CX + 7 + bw
                fwd = (-sg * s) if walk else 0.0                                            # opposite to the leg on that side
                swing = fwd * (1 if not back else -1)                                        # toward the camera = foreshortened, the hand comes in
                y0 = sh + 1
                ex, ey = ax + sg * 0.5 - sg * max(0.0, swing) * 0.6, sh + 6 - max(0.0, swing) * 1.5
                hx2 = ax - sg * max(0.0, swing) * 2.4 + sg * max(0.0, -swing) * 1.2
                hy2 = hip - 1 - max(0.0, swing) * 3.4 + max(0.0, -swing) * 0.4 - (P['arm'] if not walk else 0)
                ax += sg * aw * 0.5
                dA = ad if slv else md                                                       # sleeved arms get their own edge against the body
                ex += sg * aw * 0.5
                dA.line([(ax + 0.5, y0), (ex, ey)], fill=255, width=2 + aw)
                dA.line([(ex, ey), (hx2 + sg * aw * 0.5, hy2)], fill=255, width=2 + aw)
                hx2 += sg * aw * 0.5
                dA.rectangle([int(round(hx2)) - 1, int(round(hy2)), int(round(hx2)) + 1, int(round(hy2)) + 1], fill=255)   # the hand
                if wear in ('jacket', 'hoodie', 'coat'): dA.line([(ax + 0.5, y0), (ex, ey)], fill=255, width=3 + aw); ld.point((int(round(ex)), int(round(ey)) + 1), fill=255)
                if slv:                                                                      # jacket sleeves: a cuff at the wrist (drawn over the light)
                    wx, wy = ex + (hx2 - ex) * 0.8, ey + (hy2 - ey) * 0.8
                    cuffs.append((wx, wy, (2 + aw) / 2.0 + 0.3))
                if wear == 'vest': ld.point((int(round(ax)), y0 + 3), fill=255)
        if extra == 'pack':
            if back:
                md.rectangle([CX - 6, sh + 1, CX + 5, hip - 1], fill=255); ld.rectangle([CX - 5, sh + 2, CX + 4, hip - 2], outline=255); ld.line([(CX - 3, sh + 7), (CX + 2, sh + 7)], fill=255)
            else:
                ld.line([(CX - 5, sh), (CX - 4, hip - 5)], fill=255); ld.line([(CX + 4, sh), (CX + 3, hip - 5)], fill=255)
        # ---- neck and head
        md.rectangle([CX - 1, hy + 6, CX, sh], fill=255)
        if extra == 'scarf':
            md.rectangle([CX - 5, sh - 3, CX + 4, sh], fill=255); ld.line([(CX - 5, sh), (CX + 4, sh)], fill=255)
            fl = 2 + (2 if walk else 0)
            sx = -1
            md.polygon([(CX - 5, sh - 2), (CX - 10 - fl, sh + 2 + sway), (CX - 11 - fl, sh + 7 + sway), (CX - 7, sh + 3)], fill=255)
        if extra == 'collar':
            md.polygon([(CX - 6, sh + 1), (CX - 7, sh - 5), (CX - 3, sh - 1)], fill=255); md.polygon([(CX + 5, sh + 1), (CX + 6, sh - 5), (CX + 2, sh - 1)], fill=255)
        hx0, hx1 = CX - 7, CX + 6
        md.ellipse([hx0, hy - 7, hx1, hy + 6], fill=255)
        # ---- hair and headwear
        if hair == 'spiky':
            for k, (bx, tip, th) in enumerate(((-7, -10, 5), (-4, -5, 9), (0, 0, 7), (3, 5, 10), (6, 9, 5))):
                md.polygon([(CX + bx - 2, hy - 3), (CX + tip, hy - 4 - th), (CX + bx + 2, hy - 4)], fill=255)
            if not back: ld.line([(CX - 5, hy - 3), (CX - 3, hy - 1), (CX - 1, hy - 3), (CX + 1, hy - 1), (CX + 4, hy - 3)], fill=255)
            else: ld.line([(CX - 3, hy - 2), (CX - 2, hy + 2)], fill=255); ld.line([(CX + 2, hy - 2), (CX + 1, hy + 2)], fill=255)
        elif hair == 'twintail':
            md.ellipse([hx0 - 1, hy - 8, hx1 + 1, hy + 2], fill=255)
            if not back: ld.line([(CX - 6, hy - 2), (CX - 2, hy - 4), (CX + 5, hy - 2)], fill=255)
            else: ld.line([(CX - 1, hy - 7), (CX - 1, hy + 3)], fill=255)
            if extra == 'bow':
                md.polygon([(CX - 1, hy - 8), (CX - 6, hy - 12), (CX - 5, hy - 7)], fill=255); md.polygon([(CX, hy - 8), (CX + 5, hy - 12), (CX + 4, hy - 7)], fill=255)
                gp(G, (CX - 1, hy - 8))
        elif hair == 'cap':
            md.ellipse([hx0 - 1, hy - 9, hx1 + 1, hy], fill=255); md.rectangle([CX - 1, hy - 10, CX, hy - 9], fill=255)
            if not back:
                md.polygon([(CX - 8, hy - 3), (CX + 7, hy - 3), (CX + 5, hy - 1), (CX - 6, hy - 1)], fill=255)
                ld.line([(CX - 7, hy - 3), (CX + 6, hy - 3)], fill=255)
            else:
                ld.line([(CX - 6, hy - 1), (CX + 5, hy - 1)], fill=255); ld.arc([CX - 3, hy - 4, CX + 2, hy], 0, 180, fill=255)
        elif hair == 'ponytail':
            md.ellipse([hx0 - 1, hy - 8, hx1 + 1, hy + 1], fill=255)
            md.polygon([(CX - 6, hy - 6), (CX - 9, hy - 10), (CX - 2, hy - 8)], fill=255)        # a swept fringe
            if not back: ld.line([(CX - 6, hy - 2), (CX + 1, hy - 4), (CX + 5, hy - 1)], fill=255)
            else:
                md.polygon([(CX - 3, hy - 7), (CX + 2, hy - 7), (CX + 3 + sway, sh + 4), (CX + sway, sh + 8), (CX - 3 + sway, sh + 4)], fill=255)
                ld.line([(CX - 2, hy - 4), (CX + 1, hy - 4)], fill=255); ld.line([(CX - 1, hy - 3), (CX - 1 + sway, sh + 5)], fill=255)
        elif hair == 'hood':
            md.polygon([(CX - 8, hy + 6), (CX - 9, hy - 3), (CX - 5, hy - 9), (CX - 1, hy - 12), (CX + 4, hy - 9), (CX + 8, hy - 3), (CX + 7, hy + 6)], fill=255)
            if not back: ld.ellipse([CX - 5, hy - 5, CX + 4, hy + 5], fill=255)                  # the dark inside of the hood
            else: ld.line([(CX - 1, hy - 10), (CX - 1, hy + 4)], fill=255)
        elif hair == 'bob':
            md.rectangle([hx0 - 1, hy - 3, hx1 + 1, hy + 7], fill=255); md.ellipse([hx0 - 1, hy - 8, hx1 + 1, hy + 2], fill=255)
            if not back: ld.line([(CX - 6, hy - 3), (CX + 5, hy - 3)], fill=255); ld.line([(CX - 6, hy - 3), (CX - 6, hy + 5)], fill=255); ld.line([(CX + 5, hy - 3), (CX + 5, hy + 5)], fill=255)
            else: ld.line([(CX - 6, hy + 5), (CX + 5, hy + 5)], fill=255)
        elif hair == 'mohawk':
            md.polygon([(CX - 4, hy - 4), (CX - 4, hy - 10), (CX - 2, hy - 8), (CX - 1, hy - 13), (CX + 1, hy - 8), (CX + 3, hy - 11), (CX + 3, hy - 4)], fill=255)
            ld.line([(CX - 3, hy - 6), (CX - 3, hy - 1 if not back else hy + 4)], fill=255); ld.line([(CX + 2, hy - 6), (CX + 2, hy - 1 if not back else hy + 4)], fill=255)
        elif hair == 'long':
            md.ellipse([hx0 - 1, hy - 8, hx1 + 1, hy + 2], fill=255)
            if back:
                md.polygon([(CX - 8, hy - 2), (CX + 7, hy - 2), (CX + 7 + sway, sh + 8), (CX + 2 + sway, sh + 10), (CX - 3 + sway, sh + 8), (CX - 8 + sway, sh + 10)], fill=255)
                for k in (-4, 0, 3): ld.line([(CX + k, hy + 2), (CX + k + sway, sh + 6)], fill=255)
            else: ld.line([(CX - 6, hy - 1), (CX - 3, hy - 4), (CX - 1, hy - 2), (CX + 2, hy - 4), (CX + 5, hy - 1)], fill=255)
        if extra == 'phones':
            md.rectangle([hx0 - 3, hy - 3, hx0, hy + 3], fill=255); md.rectangle([hx1, hy - 3, hx1 + 3, hy + 3], fill=255)
            md.arc([hx0 - 2, hy - 10, hx1 + 2, hy + 4], 180, 360, fill=255, width=2)
            ld.line([(hx0, hy - 2), (hx0, hy + 2)], fill=255); ld.line([(hx1, hy - 2), (hx1, hy + 2)], fill=255)
            gp(G, (hx0 - 2, hy)); gp(G, (hx1 + 2, hy))
        if extra == 'goggles':
            ld.line([(hx0, hy - 5), (hx1, hy - 5)], fill=255)
            if not back:
                for ex in (CX - 5, CX + 1): md.rectangle([ex, hy - 7, ex + 3, hy - 4], fill=255); ld.rectangle([ex, hy - 7, ex + 3, hy - 4], outline=255); gd.point((ex + 1, hy - 6), fill=255)
        if extra == 'cig' and not back: cig = ((CX + 1.5, hy + 3.0), (CX + 6.5, hy + 4.5)); mouth = ((CX - 2.5, hy + 3.0), (CX + 1.5, hy + 3.0))   # a flat mouth, the cigarette in its corner
        # ---- a face that is only suggested
        if not back:
            if extra == 'visor': gd.rectangle([CX - 6, hy - 1, CX + 5, hy], fill=255); ld.line([(CX - 6, hy + 1), (CX + 5, hy + 1)], fill=255)
            else:
                for ex in (CX - 4, CX + 1): gd.rectangle([ex, hy, ex + 1, hy + (1 if hair == 'hood' else 0)], fill=255)
    else:
        # =================== side view, facing right ===================
        cx = CX; sw = 5 * s if walk else 0
        fl = 2 if walk else 0
        if wear == 'cape': md.polygon([(cx - 4, sh - 1), (cx + 1, sh), (cx - 1, hip + 8), (cx - 11 - fl, hip + 9 + sway), (cx - 7, hip - 2)], fill=255); ld.line([(cx - 4, sh + 4), (cx - 7 - fl, hip + 7 + sway)], fill=255)
        if hair == 'long': md.polygon([(cx - 7, hy - 3), (cx - 1, hy - 3), (cx - 3, sh + 8), (cx - 9 - fl, sh + 9 + sway), (cx - 9, hy + 4)], fill=255); ld.line([(cx - 6, hy + 5), (cx - 7 - fl, sh + 7 + sway)], fill=255)
        if hair == 'ponytail': md.polygon([(cx - 5, hy - 5), (cx - 11 - fl, hy - 8 + sway), (cx - 13 - fl, hy - 1 + sway), (cx - 10 - fl, hy + 4 + sway), (cx - 7, hy - 1)], fill=255); ld.line([(cx - 7, hy - 4), (cx - 10 - fl, hy + sway)], fill=255)
        if hair == 'twintail': md.polygon([(cx - 5, hy - 5), (cx - 9, hy - 4), (cx - 11 - fl, hy + 4 + sway), (cx - 9 - fl, sh + 7 + sway), (cx - 6, sh + 3), (cx - 4, hy + 2)], fill=255); ld.line([(cx - 7, hy - 3), (cx - 6, hy - 1)], fill=255)
        if extra == 'pack': md.rounded_rectangle([cx - 10, sh + 1, cx - 4, hip - 2], 2, fill=255); ld.line([(cx - 9, sh + 6), (cx - 5, sh + 6)], fill=255)
        if extra == 'scarf': md.polygon([(cx - 3, sh - 2), (cx - 10 - fl * 2, sh - 1 + sway), (cx - 13 - fl * 2, sh + 4 + sway), (cx - 8 - fl, sh + 3), (cx - 3, sh + 1)], fill=255)
        def side_leg(dr, p, far):
            # foot path: planted and sliding back while cos(p) < 0, lifted and reaching forward while cos(p) > 0
            if walk:
                fx = cx + 6.5 * math.sin(p); lift = 3.6 * max(0.0, math.cos(p)) ** 1.2
                if math.cos(p) < 0 and math.sin(p) > 0.6: lift = 0.0
            else: fx, lift = cx + (1.5 if far else -0.5), 0.0
            fy = foot - lift
            kx, ky = _ik(cx, hip, fx, fy - 1, 7.2, 7.4, 1)                                  # the knee points forward (right)
            dr.line([(cx, hip), (kx, ky)], fill=255, width=4); dr.line([(kx, ky), (fx, fy - 1)], fill=255, width=3)
            toe = 1 if lift < 0.5 else 0                                                    # a lifting foot points its toe down a little
            dr.rectangle([int(round(fx)) - 1, int(round(fy)) - 1, int(round(fx)) + 3, int(round(fy)) - (0 if toe else 1)], fill=255)
            if lift > 1: dr.point((int(round(fx)) + 3, int(round(fy))), fill=255)
            return kx, ky
        def side_arm(dr, p, far):
            # swings opposite its own side's leg; the elbow bends more on the forward swing
            th = (-0.3 - 0.1 * math.sin(p)) if walk else 0.04 + 0.12 * P['arm']           # gliding: held back a little
            sx, sy = cx + (1 if far else 0), sh + 2
            ux, uy = sx + math.sin(th) * 6.0, sy + math.cos(th) * 6.0
            bend = 0.15 + 0.4 * max(0.0, math.sin(th)) / 0.48
            fx2, fy2 = ux + math.sin(th + bend) * 5.2, uy + math.cos(th + bend) * 5.2
            dr.line([(sx, sy), (ux, uy)], fill=255, width=2 + aw)
            dr.line([(ux, uy), (fx2, fy2)], fill=255, width=2 + aw)
            dr.rectangle([int(round(fx2)) - 1, int(round(fy2)) - 1, int(round(fx2)) + 1, int(round(fy2))], fill=255)
            if slv and not far:                                                               # the cuff
                wx, wy = ux + (fx2 - ux) * 0.78, uy + (fy2 - uy) * 0.78
                cuffs.append((wx, wy, (2 + aw) / 2.0 + 0.3))
            return ux, uy, fx2, fy2
        if not NOLEGS: side_leg(fd, ph + math.pi, True)                                                    # the far leg, behind
        if wear != 'cloak': side_arm(fd, ph, True)                                         # the far arm (same phase as the near leg)
        if not NOLEGS: side_leg(md, ph, False)
        md.polygon([(cx - 4 - bs, sh + 1), (cx - 2 - bs, sh - 1), (cx + 3 + bs, sh - 1), (cx + 5 + bs, sh + 1), (cx + 5 + bl, hip - 4), (cx + 4 + bl, hip), (cx - 4 - bl, hip)], fill=255)
        if wear == 'dress': md.polygon([(cx - 4, hip - 4), (cx + 4, hip - 4), (cx + 7, hip + 5), (cx - 7, hip + 5)], fill=255); ld.line([(cx - 4, hip - 4), (cx + 4, hip - 4)], fill=255); ld.line([(cx, hip), (cx, hip + 4)], fill=255)
        elif wear == 'coat': md.polygon([(cx - 4, sh + 1), (cx + 5, sh + 1), (cx + 5, hip + 8), (cx - 6 - fl, hip + 8)], fill=255); ld.line([(cx - 4, hip - 2), (cx + 4, hip - 2)], fill=255); ld.line([(cx + 3, sh + 2), (cx + 3, hip + 7)], fill=255)
        elif wear == 'cloak': md.polygon([(cx - 4, sh - 1), (cx + 4, sh - 1), (cx + 6, hip + 9), (cx + 1, hip + 11), (cx - 4, hip + 9), (cx - 8 - fl, hip + 11)], fill=255); ld.line([(cx + 2, sh + 3), (cx + 3, hip + 8)], fill=255)
        elif wear == 'jacket': ld.line([(cx - 4, hip - 3), (cx + 4, hip - 3)], fill=255); ld.line([(cx + 3, sh), (cx + 3, hip - 3)], fill=255)
        elif wear == 'hoodie': md.rectangle([cx - 5, hip - 1, cx + 4, hip + 1], fill=255); md.ellipse([cx - 7, sh - 3, cx - 1, sh + 4], fill=255); ld.arc([cx - 7, sh - 3, cx - 1, sh + 4], 20, 200, fill=255)
        elif wear == 'vest': ld.line([(cx - 4, hip - 2), (cx + 4, hip - 2)], fill=255); ld.line([(cx + 1, sh), (cx + 2, hip - 2)], fill=255)
        elif wear == 'cape': ld.line([(cx - 4, hip - 3), (cx + 4, hip - 3)], fill=255)
        if wear != 'cloak':
            ux, uy, ex, ey = side_arm(ad, ph + math.pi, False)                               # the near arm, opposite the near leg
            if wear in ('jacket', 'hoodie', 'coat'): ld.point((int(round(ux)), int(round(uy))), fill=255)
        md.rectangle([cx, hy + 6, cx + 1, sh], fill=255)
        if extra == 'scarf': md.rectangle([cx - 4, sh - 3, cx + 4, sh], fill=255); ld.line([(cx - 4, sh), (cx + 4, sh)], fill=255)
        if extra == 'collar': md.polygon([(cx - 3, sh + 1), (cx - 5, sh - 5), (cx, sh - 1)], fill=255); md.polygon([(cx + 4, sh + 1), (cx + 5, sh - 4), (cx + 1, sh - 1)], fill=255)
        hx0, hx1 = cx - 6, cx + 7
        md.ellipse([hx0, hy - 7, hx1, hy + 6], fill=255)
        if hair == 'spiky':
            for bx, tip, th in ((5, 8, 6), (2, 2, 10), (-2, -5, 9), (-5, -10, 6), (-6, -11, 1)):
                md.polygon([(cx + bx - 2, hy - 3), (cx + tip, hy - 4 - th), (cx + bx + 2, hy - 3)], fill=255)
            ld.line([(cx - 4, hy - 2), (cx - 1, hy - 4), (cx + 2, hy - 2), (cx + 4, hy - 4)], fill=255)
        elif hair == 'twintail':
            md.ellipse([hx0 - 1, hy - 8, hx1, hy + 2], fill=255); ld.line([(cx - 3, hy - 3), (cx + 5, hy - 3)], fill=255)
            if extra == 'bow': md.polygon([(cx - 3, hy - 8), (cx - 8, hy - 12), (cx - 6, hy - 6)], fill=255); gp(G, (cx - 3, hy - 8))
        elif hair == 'cap':
            md.ellipse([hx0 - 1, hy - 9, hx1, hy], fill=255); md.rectangle([hx1 - 2, hy - 3, hx1 + 5, hy - 2], fill=255); md.rectangle([cx, hy - 10, cx + 1, hy - 9], fill=255)
            ld.line([(hx0, hy - 2), (hx1, hy - 2)], fill=255)
        elif hair == 'ponytail':
            md.ellipse([hx0 - 1, hy - 8, hx1, hy + 1], fill=255); md.polygon([(cx + 3, hy - 7), (cx + 9, hy - 9), (cx + 6, hy - 4)], fill=255)
            ld.line([(cx - 5, hy - 2), (cx + 2, hy - 4), (cx + 5, hy - 2)], fill=255)
        elif hair == 'hood':
            md.polygon([(cx - 7, hy + 6), (cx - 9, hy - 2), (cx - 6, hy - 9), (cx - 2, hy - 12), (cx + 4, hy - 9), (cx + 8, hy - 4), (cx + 6, hy + 6)], fill=255)
            ld.pieslice([cx + 1, hy - 5, cx + 11, hy + 5], 100, 260, fill=255)
        elif hair == 'bob':
            md.rectangle([hx0 - 1, hy - 3, cx + 2, hy + 7], fill=255); md.ellipse([hx0 - 1, hy - 8, hx1, hy + 2], fill=255)
            ld.line([(cx + 2, hy - 2), (cx + 2, hy + 6)], fill=255)
        elif hair == 'mohawk':
            for k, (bx, th) in enumerate(((5, 4), (2, 7), (-1, 8), (-4, 7), (-6, 4))):
                md.polygon([(cx + bx - 2, hy - 4), (cx + bx - 1, hy - 5 - th), (cx + bx + 2, hy - 4)], fill=255)
            ld.arc([hx0 + 1, hy - 5, hx1 - 1, hy + 6], 190, 350, fill=255)
        elif hair == 'long':
            md.ellipse([hx0 - 1, hy - 8, hx1, hy + 2], fill=255); ld.line([(cx - 2, hy - 4), (cx + 2, hy - 2), (cx + 5, hy - 4)], fill=255)
        if extra == 'phones':
            md.ellipse([cx - 3, hy - 4, cx + 3, hy + 4], fill=255); ld.ellipse([cx - 2, hy - 3, cx + 2, hy + 3], outline=255); gp(G, (cx, hy))
            md.arc([cx - 4, hy - 10, cx + 4, hy + 2], 180, 360, fill=255, width=2)
        if extra == 'goggles':
            ld.line([(hx0, hy - 5), (hx1 - 3, hy - 5)], fill=255); md.rectangle([cx + 3, hy - 8, cx + 7, hy - 4], fill=255); ld.rectangle([cx + 3, hy - 8, cx + 7, hy - 4], outline=255); gd.point((cx + 5, hy - 7), fill=255)
        if extra == 'cig': cig = ((cx + 6.0, hy + 3.0), (cx + 11.0, hy + 4.5)); mouth = ((cx + 3.5, hy + 3.0), (cx + 6.0, hy + 3.0))
        if extra == 'visor': gd.rectangle([cx + 1, hy - 1, cx + 7, hy], fill=255); ld.line([(cx - 5, hy), (cx, hy)], fill=255)
        else: gd.rectangle([cx + 3, hy, cx + 4, hy + (1 if hair == 'hood' else 0)], fill=255)

    if front and walk and abs(s) > 0.85:                                                   # hips settle over the standing leg at each contact
        xs = -1 if s > 0 else 1
        M, L, G, F, A = ImageChops.offset(M, int(xs * S), 0), ImageChops.offset(L, int(xs * S), 0), ImageChops.offset(G, int(xs * S), 0), ImageChops.offset(F, int(xs * S), 0), ImageChops.offset(A, int(xs * S), 0)
    # below the waist: a tapering column that the light pass dissolves into mist
    if NOLEGS:
        lean = 1 if (not front and walk) else 0
        md.polygon([(CX - 5 - bl, hip - 1), (CX + 4 + bl, hip - 1), (CX + 3 - lean, FEET - 5), (CX - 4 - lean * 2, FEET - 5)], fill=255)
    im = light4(ch, view, anim, i, M, L, G, F, A, c, rim, deep, ink, hip, walk, P)
    if cuffs:                                                                               # sleeve cuffs: a light band across each wrist
        pxc = im.load(); WS0, HS0 = im.size
        for (wx, wy, hw) in cuffs:
            yy = int(round(wy * S)); x0 = int(round((wx - hw) * S)); x1 = int(round((wx + hw) * S))
            for xx in range(x0, x1 + 1):
                for y2 in (yy, yy + 1):
                    if 0 <= xx < WS0 and 0 <= y2 < HS0 and pxc[xx, y2][3] > 120: pxc[xx, y2] = (112, 122, 142, 255) if y2 == yy else (60, 64, 76, 255)
    if cig:                                                                                 # drawn over the lit figure: black, outlined in silver
        (x0, y0), (x1, y1) = cig
        x0, y0, x1, y1 = x0 * S, y0 * S, x1 * S, y1 * S
        # pixel by pixel: a 2-px bar in steps (no slanted line: it jags at this size), outlined in silver
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        cells = set(); n = max(1, x1 - x0)
        for k in range(n + 1):
            yy = y0 + int((y1 - y0) * k / float(n) + 0.5)
            cells.add((x0 + k, yy)); cells.add((x0 + k, yy + 1))
        px = im.load(); WS, HS = im.size
        for (x, y) in list(cells):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q not in cells and 0 <= q[0] < WS and 0 <= q[1] < HS: px[q] = (150, 160, 182, 255)
        for (x, y) in cells:
            if 0 <= x < WS and 0 <= y < HS: px[x, y] = (12, 12, 16, 255)
        TIPS[(view, anim, i)] = (x1 + 1, y1 + 1)
        if mouth:                                                                           # the mouth: a flat line meeting the cigarette, lips pinched round it
            (m0x, m0y), (m1x, m1y) = mouth
            mx0, mx1, my = int(round(m0x * S)), int(round(m1x * S)), int(round(m0y * S))
            for xx in range(mx0, mx1 + 1):
                if 0 <= xx < WS and 0 <= my < HS and (xx, my) not in cells: px[xx, my] = (150, 160, 182, 255)
                if 0 <= xx < WS and 0 <= my + 1 < HS and (xx, my + 1) not in cells and xx < x0: px[xx, my + 1] = (16, 17, 22, 255)
            for (lx, ly) in ((x0, y0 - 1), (x0, y0 + 2), (x0 + 1, y0 - 1), (x0 + 1, y0 + 2)):  # lips above and below the cigarette
                if 0 <= lx < WS and 0 <= ly < HS: px[lx, ly] = (176, 186, 204, 255)
    return im
BAYER = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))
def light4(ch, view, anim, i, M, L, G, F, A, c, rim, deep, ink, hip, walk, P):
    WS, HS = int(W * S), int(H * S); CXS = int(round(CX * S))
    FF = ImageChops.subtract(F, ImageChops.lighter(M, A)); M = ImageChops.lighter(ImageChops.lighter(M, F), A)
    m, lm, gm, fm, am = M.load(), L.load(), G.load(), FF.load(), A.load()
    def inside(x, y): return 0 <= x < WS and 0 <= y < HS and m[x, y] > 0
    im = Image.new('RGBA', (WS, HS), (0, 0, 0, 0)); out = im.load()
    def put(x, y, col, a):
        x, y = int(x), int(y)
        if 0 <= x < WS and 0 <= y < HS: out[x, y] = (col[0], col[1], col[2], max(0, min(255, int(a))))
    def blend(x, y, col, a):
        x, y = int(x), int(y)
        if not (0 <= x < WS and 0 <= y < HS) or a <= 0: return
        o = out[x, y]
        if o[3] == 0: out[x, y] = (col[0], col[1], col[2], int(a)); return
        k = a / 255.0
        out[x, y] = (int(o[0] + (col[0] - o[0]) * k), int(o[1] + (col[1] - o[1]) * k), int(o[2] + (col[2] - o[2]) * k), max(o[3], int(a)))
    seed = sum(ord(q) for q in ch['gid'] + view + anim) * 131 + i
    R = random.Random(seed)
    ys = [y for y in range(HS) if any(m[x, y] for x in range(WS))]; top = ys[0]
    waist = int((hip + 1) * S)                                   # where it starts to come apart
    gone = int((FEET - 4) * S)                                   # and is all mist
    span = float(waist - top)
    feet = int(FEET * S)
    # the beam it stands in: faint, widest at the ring
    for y in range(waist - 3, feet + 1):
        f = (y - (waist - 3)) / float(feet - waist + 3)
        half = int(5 * S + 6 * S * f)
        for x in range(CXS - half, CXS + half + 1):
            e = 1 - abs(x - CXS) / float(half + 1)
            blend(x, y, c, 22 * e * (0.4 + 0.6 * f))
    # the ring it is projected from: two rows, brighter in the middle, a dashed outer ring
    for k in range(-16, 17):
        e = 1 - abs(k) / 17.0
        put(CXS + k, feet + 1, rim if abs(k) < 9 else c, 70 + 130 * e)
        put(CXS + k, feet + 2, c, 40 + 80 * e)
        if abs(k) < 14 and (k // 2) % 2 == 0: put(CXS + k, feet + 4, c, 55 * e)
        if abs(k) in (13, 14, 15): put(CXS + k, feet, c, 110)
    # each row below the waist slips a little sideways
    slip = {}
    for y in range(waist, HS):
        f = (y - waist) / float(gone - waist)
        slip[y] = (R.choice((-1, 0, 0, 1)) * (1 if f > 0.25 else 0)) + (R.choice((-2, 2)) if f > 0.6 and R.random() < 0.3 else 0)
    def depth(x, y, dx, dy, n):
        for k in range(1, n + 1):
            if not inside(x + dx * k, y + dy * k): return k
        return n + 1
    for y in range(HS):
        f = 0.0 if y < waist else min(1.0, (y - waist) / float(gone - waist))
        if f >= 1.0: continue
        sh = slip.get(y, 0)
        for x in range(WS):
            b = BAYER[y % 4][x % 4] / 16.0
            if f > 0 and b < f * 1.08: continue                                          # it comes apart in a dither
            fa = 1.0 - 0.45 * f
            px = x + sh
            if not inside(x, y):
                if inside(x - 1, y) or inside(x + 1, y) or inside(x, y - 1) or inside(x, y + 1): put(px, y, ink, 225 * fa)   # the 1-px ink line
                elif inside(x - 1, y - 1) or inside(x + 1, y - 1) or inside(x - 1, y + 1) or inside(x + 1, y + 1): put(px, y, ink, 110 * fa)
                elif inside(x - 2, y) or inside(x + 2, y) or inside(x, y - 2) or inside(x, y + 2): put(px, y, c, 46 * fa)    # glow
                elif inside(x - 3, y) or inside(x + 3, y) or inside(x, y - 3): put(px, y, c, 18 * fa)
                continue
            t = max(0.0, min(1.0, (y - top) / span))
            if gm[x, y]:                                                                 # eyes and lenses: a bright glint, a coloured lower half
                lower = y > 0 and gm[x, y - 1]
                put(px, y, mix(rim, (255, 255, 255, 255), 0.55) if lower else (255, 255, 255, 255), 250)
                continue
            if am[x, y] and any(0 <= x + ddx < WS and m[x + ddx, y] and not am[x + ddx, y] for ddx in (1, -1, 2, -2)):
                put(px, y, mix(deep, ink, 0.45), 230 * fa); continue                       # the near arm's edge against the body
            if fm[x, y]:
                edge = x > 0 and inside(x - 1, y) and not fm[x - 1, y]
                put(px, y, mix(deep, ink, 0.3) if edge else mix(c, deep, 0.8), (215 - 30 * t) * fa); continue
            if lm[x, y]: put(px, y, mix(deep, ink, 0.6), (232 - 30 * t) * fa); continue
            nearL = any(0 <= x + ddx < WS and 0 <= y + ddy < HS and lm[x + ddx, y + ddy] for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            dl, du, dr, dd = depth(x, y, -1, 0, 3), depth(x, y, 0, -1, 3), depth(x, y, 1, 0, 4), depth(x, y, 0, 1, 4)
            # the body: rim light up and left, a two-step shade down and right, dithered gradient between
            base = mix(mix(c, rim, 0.25), mix(c, deep, 0.35), t)
            if dl == 1 or du == 1: col, a = rim, 248
            elif (dl == 2 or du == 2) and b < 0.55: col, a = mix(rim, c, 0.4), 240
            elif dr == 1 or dd == 1: col, a = mix(c, deep, 0.85), 222
            elif dr == 2 or dd == 2: col, a = mix(c, deep, 0.6), 222
            elif (dr == 3 or dd == 3) and b > 0.5: col, a = mix(c, deep, 0.45), 220
            else:
                col = base
                a = 214 - 50 * t * t
            if nearL and dl > 1 and du > 1: col = mix(col, deep, 0.3)                       # a little shadow along every seam and fold
            elif dl in (3, 4) and du > 2 and dr > 3: col = mix(col, rim, 0.14)              # a soft second sheen
            if y % 4 == 0: col = mul(col, 0.94); a -= 8                                   # fine scanlines
            elif y % 4 == 1 and dl > 1: col = mix(col, rim, 0.06)
            if not walk and P['breath'] > 0.5: a *= 0.97
            put(px, y, col, a * fa)
    # loose pixels breaking off where it comes apart, drifting down and out
    for k in range(10):
        y = waist + int((gone - waist) * R.random())
        f = (y - waist) / float(gone - waist)
        xs = [x for x in range(WS) if inside(x, waist - 2)]
        if not xs: break
        x = R.randint(min(xs) - 2, max(xs) + 2) + R.choice((-1, 1)) * int(4 * f * S)
        put(x, y, rim if R.random() < 0.5 else c, 200 - 120 * f)
        if R.random() < 0.4: put(x + 1, y, c, 140 - 100 * f)
    return im

def sheet(path):
    Z = 5; ids = [g[0] for g in T.GHOSTS]
    cells = (('down', 'idle', 0), ('down', 'walk', 1), ('side', 'walk', 1), ('side', 'walk', 4), ('up', 'idle', 0))
    pad = 6
    out = Image.new('RGBA', (len(ids) * (W * Z + pad) + pad, len(cells) * (H * Z + pad) + pad), (20, 24, 36, 255))
    d = ImageDraw.Draw(out)
    for r in range(len(cells)):                                                             # grass and night ground, half each
        d.rectangle([0, r * (H * Z + pad), out.size[0], (r + 1) * (H * Z + pad)], fill=(74, 122, 58, 255) if r % 2 == 0 else (38, 44, 66, 255))
    for k, tid in enumerate(ids):
        ch = T.TAMERS[tid]
        for r, (view, anim, i) in enumerate(cells):
            big = holo4_frame(ch, view, anim, i).resize((W * Z, H * Z), Image.NEAREST)
            out.alpha_composite(big, (pad + k * (W * Z + pad), pad + r * (H * Z + pad)))
    out.save(path)

def strip(path):
    Z = 5; ids = ('byte', 'nyx', 'rune'); views = ('down', 'side', 'up')
    out = Image.new('RGBA', (WALK_N * W * Z, len(ids) * len(views) * H * Z), (74, 122, 58, 255))
    for a, tid in enumerate(ids):
        for b, v in enumerate(views):
            for i in range(WALK_N):
                big = holo4_frame(T.TAMERS[tid], v, 'walk', i).resize((W * Z, H * Z), Image.NEAREST)
                out.alpha_composite(big, (i * W * Z, (a * len(views) + b) * H * Z))
    out.save(path)

if __name__ == '__main__':
    if '--walk' in sys.argv: strip(sys.argv[-1]); print('walk strip written'); sys.exit(0)
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'holo4-preview.png'); print('sheet written')
