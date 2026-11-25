"""Hologram projections, third pass (Nov 20): holo2's eight outfits on a real walk.

  - eight walk frames a view (contact, down, passing, up, twice), four idle frames (breathing);
  - side view: thigh and shin solved to the foot (two-bone IK), the stance foot planted and sliding
    back under the body, the swing foot lifting and reaching; the far leg and arm drawn behind in a
    deeper tone; arms swing opposite the legs with the elbow bending on the forward swing;
  - front and back: the swinging leg lifts with a bent knee and reaches toward or away from the camera,
    arms swing opposite with foreshortening, the hips settle over the standing leg;
  - the body dips at each contact and rises as the legs pass; the head and hair follow a beat later;
  - no baked glitch tears (the game adds its own shimmer at run time, js/sprites.js).

  python3 scripts/art/holo3.py preview.png      draws a sheet only
  python3 scripts/art/make_tamers.py            writes the game's frames (make_tamers uses this file)
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_tamers as T
WALK_N, IDLE_N = 8, 4
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
    'smoke': dict(hair='cap',      wear='jacket',  extra=None),          # 17z33 (drawn by holo4.py)
}

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
    return dict(walk=True, ph=ph, s=math.sin(ph), c=math.cos(ph), breath=0.0, arm=0)

def holo3_frame(ch, view, anim, i):
    st = STYLE[ch['gid']]; hair, wear, extra = st['hair'], st['wear'], st['extra']
    P = pose3(anim, i)
    c = rgb(ch['body']); rim = mix(c, (255, 255, 255, 255), 0.45); deep = mul(c, 0.55)
    ink = mix(mul(c, 0.22), (14, 12, 30, 255), 0.45)
    walk, s, co = P['walk'], P['s'], P['c']
    ph = P['ph']
    # dips at each contact (|s| = 1), rises as the legs pass (s = 0); idle: a slow breath
    bob = -int(round(1.6 * (1 - s * s))) if walk else -int(round(P['breath']))
    # hair, capes and scarves trail a beat behind the body
    sway = int(round(1.6 * math.sin(ph - 0.9))) if walk else int(round(math.sin(ph)))
    hover = 2
    M = Image.new('L', (W, H), 0); md = ImageDraw.Draw(M)      # the figure
    L = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(L)      # pen lines inside it
    G = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(G)      # bright points (eyes, lenses)
    front = view in ('down', 'up'); back = view == 'up'
    # the walk: the body rises as one leg passes the other and sinks as the feet land
    F = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(F)      # far limbs, behind the body, a deeper tone
    A = Image.new('L', (W, H), 0); ad = ImageDraw.Draw(A)      # the near arm, over the body: gets its own contour
    hip = FEET - hover - 15 + bob; sh = hip - 12
    hbob = -int(round(1.6 * (1 - math.sin(ph - 0.5) ** 2))) if walk else bob     # the head settles a beat later
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
        for sg in (-1, 1):
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
        md.polygon([(CX - 7, sh + 1), (CX - 5, sh - 1), (CX + 4, sh - 1), (CX + 6, sh + 1), (CX + 4, hip), (CX - 5, hip)], fill=255)
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
            if not back: ld.line([(CX - 1, sh + 3), (CX - 2, hip + 7)], fill=255); G.putpixel((CX - 1, sh + 2), 255)
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
            ld.line([(CX - 5, hip - 2), (CX + 4, hip - 2)], fill=255); G.putpixel((CX - 1, hip - 2), 255)
        elif wear == 'cape':
            if not back: ld.line([(CX - 5, hip - 3), (CX + 4, hip - 3)], fill=255); ld.line([(CX - 6, sh + 1), (CX - 1, sh + 4)], fill=255); ld.line([(CX + 5, sh + 1), (CX, sh + 4)], fill=255)
            else:
                md.polygon([(CX - 7, sh), (CX + 6, sh), (CX + 9, hip + 9), (CX - 10, hip + 9)], fill=255)
                ld.line([(CX - 3, sh + 4), (CX - 5, hip + 8)], fill=255); ld.line([(CX + 2, sh + 4), (CX + 4, hip + 8)], fill=255)
        # ---- arms
        if wear != 'cloak':
            for sg in (-1, 1):
                ax = CX - 8 if sg < 0 else CX + 7
                fwd = (-sg * s) if walk else 0.0                                            # opposite to the leg on that side
                swing = fwd * (1 if not back else -1)                                        # toward the camera = foreshortened, the hand comes in
                y0 = sh + 1
                ex, ey = ax + sg * 0.5 - sg * max(0.0, swing) * 0.6, sh + 6 - max(0.0, swing) * 1.5
                hx2 = ax - sg * max(0.0, swing) * 2.4 + sg * max(0.0, -swing) * 1.2
                hy2 = hip - 1 - max(0.0, swing) * 3.4 + max(0.0, -swing) * 0.4 - (P['arm'] if not walk else 0)
                md.line([(ax + 0.5, y0), (ex, ey)], fill=255, width=2)
                md.line([(ex, ey), (hx2, hy2)], fill=255, width=2)
                md.rectangle([int(round(hx2)) - 1, int(round(hy2)), int(round(hx2)) + 1, int(round(hy2)) + 1], fill=255)   # the hand
                if wear in ('jacket', 'hoodie', 'coat'): md.line([(ax + 0.5, y0), (ex, ey)], fill=255, width=3); ld.point((int(round(ex)), int(round(ey)) + 1), fill=255)
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
                G.putpixel((CX - 1, hy - 8), 255)
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
            G.putpixel((hx0 - 2, hy), 255); G.putpixel((hx1 + 2, hy), 255)
        if extra == 'goggles':
            ld.line([(hx0, hy - 5), (hx1, hy - 5)], fill=255)
            if not back:
                for ex in (CX - 5, CX + 1): md.rectangle([ex, hy - 7, ex + 3, hy - 4], fill=255); ld.rectangle([ex, hy - 7, ex + 3, hy - 4], outline=255); gd.point((ex + 1, hy - 6), fill=255)
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
            th = -0.5 * math.sin(p) if walk else 0.04 + 0.12 * P['arm']
            sx, sy = cx + (1 if far else 0), sh + 2
            ux, uy = sx + math.sin(th) * 6.0, sy + math.cos(th) * 6.0
            bend = 0.15 + 0.4 * max(0.0, math.sin(th)) / 0.48
            fx2, fy2 = ux + math.sin(th + bend) * 5.2, uy + math.cos(th + bend) * 5.2
            dr.line([(sx, sy), (ux, uy)], fill=255, width=2)
            dr.line([(ux, uy), (fx2, fy2)], fill=255, width=2)
            dr.rectangle([int(round(fx2)) - 1, int(round(fy2)) - 1, int(round(fx2)) + 1, int(round(fy2))], fill=255)
            return ux, uy, fx2, fy2
        side_leg(fd, ph + math.pi, True)                                                    # the far leg, behind
        if wear != 'cloak': side_arm(fd, ph, True)                                         # the far arm (same phase as the near leg)
        side_leg(md, ph, False)
        md.polygon([(cx - 4, sh + 1), (cx - 2, sh - 1), (cx + 3, sh - 1), (cx + 5, sh + 1), (cx + 4, hip), (cx - 4, hip)], fill=255)
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
            if extra == 'bow': md.polygon([(cx - 3, hy - 8), (cx - 8, hy - 12), (cx - 6, hy - 6)], fill=255); G.putpixel((cx - 3, hy - 8), 255)
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
            md.ellipse([cx - 3, hy - 4, cx + 3, hy + 4], fill=255); ld.ellipse([cx - 2, hy - 3, cx + 2, hy + 3], outline=255); G.putpixel((cx, hy), 255)
            md.arc([cx - 4, hy - 10, cx + 4, hy + 2], 180, 360, fill=255, width=2)
        if extra == 'goggles':
            ld.line([(hx0, hy - 5), (hx1 - 3, hy - 5)], fill=255); md.rectangle([cx + 3, hy - 8, cx + 7, hy - 4], fill=255); ld.rectangle([cx + 3, hy - 8, cx + 7, hy - 4], outline=255); gd.point((cx + 5, hy - 7), fill=255)
        if extra == 'visor': gd.rectangle([cx + 1, hy - 1, cx + 7, hy], fill=255); ld.line([(cx - 5, hy), (cx, hy)], fill=255)
        else: gd.rectangle([cx + 3, hy, cx + 4, hy + (1 if hair == 'hood' else 0)], fill=255)

    if front and walk and abs(s) > 0.85:                                                   # hips settle over the standing leg at each contact
        xs = -1 if s > 0 else 1
        M, L, G, F, A = ImageChops.offset(M, xs, 0), ImageChops.offset(L, xs, 0), ImageChops.offset(G, xs, 0), ImageChops.offset(F, xs, 0), ImageChops.offset(A, xs, 0)
    # ------------------------------------------------------------ light
    FF = ImageChops.subtract(F, ImageChops.lighter(M, A)); M = ImageChops.lighter(ImageChops.lighter(M, F), A)
    m, lm, gm, fm, am = M.load(), L.load(), G.load(), FF.load(), A.load()
    def inside(x, y): return 0 <= x < W and 0 <= y < H and m[x, y] > 0
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out = im.load()
    def put(x, y, col, a):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H: out[x, y] = (col[0], col[1], col[2], max(0, min(255, int(a))))
    for k in range(-10, 11):                                                                # the ring it is projected from
        e = 1 - abs(k) / 11.0
        put(CX + k, FEET + 1, rim if abs(k) < 6 else c, 80 + 120 * e)
        if abs(k) < 9 and k % 2 == 0: put(CX + k, FEET + 2, c, 70 * e)
        if abs(k) in (8, 9): put(CX + k, FEET, c, 90)
    for k in (-6, -1, 5):                                                                   # motes rising in the beam
        d = (i * 2 + k * 3) % 7
        put(CX + k, FEET - 1 - d, rim, 150 - d * 18)
    ys = [y for y in range(H) if any(m[x, y] for x in range(W))]; top = ys[0]; span = float(FEET - top)
    tear = False
    tear_y = top + 16 + (i * 5) % 12
    for y in range(H):
        shift = 1 if (tear and tear_y <= y < tear_y + 3) else 0
        for x in range(W):
            if not inside(x, y):
                near = inside(x - 1, y) or inside(x + 1, y) or inside(x, y - 1) or inside(x, y + 1)
                if near: put(x + shift, y, ink, 215)                                        # the inked outline
                elif inside(x - 1, y - 1) or inside(x + 1, y - 1) or inside(x - 1, y + 1) or inside(x + 1, y + 1): put(x + shift, y, ink, 90)
                elif inside(x - 2, y) or inside(x + 2, y) or inside(x, y - 2): put(x + shift, y, c, 34)   # a breath of glow outside the ink
                continue
            t = max(0.0, min(1.0, (y - top) / span))
            if gm[x, y]: put(x + shift, y, (255, 255, 255, 255), 245); continue
            if am[x, y] and any(0 <= x + ddx < W and 0 <= y + ddy < H and m[x + ddx, y + ddy] and not am[x + ddx, y + ddy] for ddx, ddy in ((1, 0), (-1, 0))):
                put(x + shift, y, mix(deep, ink, 0.5), 225 - 40 * t); continue                # the near arm's edge against the body
            if fm[x, y]:                                                                    # far limb: deeper, with its own edge against the body
                edge = inside(x - 1, y) and not fm[x - 1, y] if x > 0 else False
                put(x + shift, y, mix(deep, ink, 0.35) if edge else mix(c, deep, 0.85), 215 - 40 * t); continue
            if lm[x, y]: put(x + shift, y, mix(deep, ink, 0.55), 225 - 40 * t); continue
            lit = not inside(x - 1, y) or not inside(x, y - 1)                              # light from the upper left
            shade = not inside(x + 1, y) or not inside(x, y + 1) or not inside(x + 2, y) or (not inside(x + 3, y) and (x + y) % 2 == 0)
            if lit and not (not inside(x + 1, y) and not inside(x - 1, y)): col, a = rim, 245 - 50 * t
            elif shade: col, a = mix(c, deep, 0.75), 205 - 55 * t
            else: col, a = mix(mix(c, rim, 0.18), c, t), 200 - 70 * t * t
            if y % 3 == 0 and not lit: col = mul(col, 0.94); a -= 12                        # sparse scanlines
            if not walk and P['breath'] > 0.5: a *= 0.96
            put(x + shift, y, col, a)
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
            big = holo3_frame(ch, view, anim, i).resize((W * Z, H * Z), Image.NEAREST)
            out.alpha_composite(big, (pad + k * (W * Z + pad), pad + r * (H * Z + pad)))
    out.save(path)

def strip(path):
    Z = 5; ids = ('byte', 'nyx', 'rune'); views = ('down', 'side', 'up')
    out = Image.new('RGBA', (WALK_N * W * Z, len(ids) * len(views) * H * Z), (74, 122, 58, 255))
    for a, tid in enumerate(ids):
        for b, v in enumerate(views):
            for i in range(WALK_N):
                big = holo3_frame(T.TAMERS[tid], v, 'walk', i).resize((W * Z, H * Z), Image.NEAREST)
                out.alpha_composite(big, (i * W * Z, (a * len(views) + b) * H * Z))
    out.save(path)

if __name__ == '__main__':
    if '--walk' in sys.argv: strip(sys.argv[-1]); print('walk strip written'); sys.exit(0)
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'holo3-preview.png'); print('sheet written')
