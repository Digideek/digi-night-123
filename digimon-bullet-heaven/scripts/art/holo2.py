"""Hologram projections, second pass (Nov 16): the same see-through light, but
each of the eight has its own outline (hair, headwear, clothes), a dark inked
edge, two-tone shading and a few inner pen lines, so they read as drawn
characters and not as one stencil. Faces stay vague.

  python3 scripts/art/holo2.py preview.png      draws a sheet only (nothing in the game changes)
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_tamers as T
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
}

def holo2_frame(ch, view, anim, i):
    st = STYLE[ch['gid']]; hair, wear, extra = st['hair'], st['wear'], st['extra']
    P = T.pose(anim, i)
    c = rgb(ch['body']); rim = mix(c, (255, 255, 255, 255), 0.45); deep = mul(c, 0.55)
    ink = mix(mul(c, 0.22), (14, 12, 30, 255), 0.45)
    walk, s, co = P['walk'], P['s'], P['c']
    bob = 0 if walk else -P['bob']
    sway = int(round(s)) if walk else 0
    hover = 2
    M = Image.new('L', (W, H), 0); md = ImageDraw.Draw(M)      # the figure
    L = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(L)      # pen lines inside it
    G = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(G)      # bright points (eyes, lenses)
    front = view in ('down', 'up'); back = view == 'up'
    # the walk: the body rises as one leg passes the other and sinks as the feet land
    if walk: bob = (-1 if abs(s) > 0.5 else 0) if front else (-1 if abs(s) < 0.5 else 0)
    hip = FEET - hover - 15 + bob; sh = hip - 12; hy = sh - 8
    step = int(round(3 * s)) if walk else 0
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
        for sg in (-1, 1):
            lx = CX - 5 if sg < 0 else CX + 1
            lift = 4 if (walk and sg * s > 0.5) else 0                                      # a knee comes up, the other leg carries the weight
            md.rectangle([lx, hip, lx + 3, foot - lift], fill=255)
            if lift: ld.line([(lx, hip + 5), (lx + 3, hip + 5)], fill=255)
            md.rectangle([lx - (1 if sg < 0 else 0), foot - lift - 1, lx + 3 + (1 if sg > 0 else 0), foot - lift], fill=255)   # shoes
            ld.line([(lx, foot - lift - 3), (lx + 3, foot - lift - 3)], fill=255)
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
            md.polygon([(CX - 6, sh - 1), (CX + 5, sh - 1), (CX + 10, hip + 9), (CX + 5, hip + 11), (CX, hip + 8), (CX - 6, hip + 11), (CX - 11, hip + 9)], fill=255)
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
                ax = CX - 9 if sg < 0 else CX + 7
                a = -sg * step
                y0, y1 = sh + 1 + max(0, a), hip - 1 + min(0, a) + (1 if a > 0 else 0)
                md.rectangle([ax, y0, ax + 1, y1], fill=255)
                if wear in ('jacket', 'hoodie', 'coat'): md.rectangle([ax - (1 if sg < 0 else 0), y0, ax + 1 + (1 if sg > 0 else 0), y1 - 3], fill=255); ld.line([(ax, y1 - 3), (ax + 1, y1 - 3)], fill=255)
                if wear == 'vest': ld.line([(ax, y0 + 3), (ax + 1, y0 + 3)], fill=255)
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
        for sg in (-1, 1):                                                                  # legs: thigh and shin, the knee bends as the foot swings through
            if walk:
                fx = cx + sg * 6 * s; lift = 4 * max(0.0, sg * co)
                kx = (cx + fx) / 2.0 + 1.5 + lift * 0.7; ky = (hip + foot - lift) / 2.0 - lift * 0.3
            else: fx, lift, kx, ky = cx, 0, cx, (hip + foot) / 2.0
            md.line([(cx, hip), (kx, ky)], fill=255, width=4); md.line([(kx, ky), (fx, foot - lift - 1)], fill=255, width=3)
            md.rectangle([int(round(fx)) - 1, int(round(foot - lift)) - 1, int(round(fx)) + 3, int(round(foot - lift))], fill=255)
        if walk and wear != 'cloak': md.line([(cx + 1, sh + 2), (cx + 5 * s, hip - 2)], fill=255, width=2)   # the far arm, swinging the other way
        md.polygon([(cx - 4, sh + 1), (cx - 2, sh - 1), (cx + 3, sh - 1), (cx + 5, sh + 1), (cx + 4, hip), (cx - 4, hip)], fill=255)
        if wear == 'dress': md.polygon([(cx - 4, hip - 4), (cx + 4, hip - 4), (cx + 7, hip + 5), (cx - 7, hip + 5)], fill=255); ld.line([(cx - 4, hip - 4), (cx + 4, hip - 4)], fill=255); ld.line([(cx, hip), (cx, hip + 4)], fill=255)
        elif wear == 'coat': md.polygon([(cx - 4, sh + 1), (cx + 5, sh + 1), (cx + 5, hip + 8), (cx - 6 - fl, hip + 8)], fill=255); ld.line([(cx - 4, hip - 2), (cx + 4, hip - 2)], fill=255); ld.line([(cx + 3, sh + 2), (cx + 3, hip + 7)], fill=255)
        elif wear == 'cloak': md.polygon([(cx - 4, sh - 1), (cx + 4, sh - 1), (cx + 6, hip + 9), (cx + 1, hip + 11), (cx - 4, hip + 9), (cx - 8 - fl, hip + 11)], fill=255); ld.line([(cx + 2, sh + 3), (cx + 3, hip + 8)], fill=255)
        elif wear == 'jacket': ld.line([(cx - 4, hip - 3), (cx + 4, hip - 3)], fill=255); ld.line([(cx + 3, sh), (cx + 3, hip - 3)], fill=255)
        elif wear == 'hoodie': md.rectangle([cx - 5, hip - 1, cx + 4, hip + 1], fill=255); md.ellipse([cx - 7, sh - 3, cx - 1, sh + 4], fill=255); ld.arc([cx - 7, sh - 3, cx - 1, sh + 4], 20, 200, fill=255)
        elif wear == 'vest': ld.line([(cx - 4, hip - 2), (cx + 4, hip - 2)], fill=255); ld.line([(cx + 1, sh), (cx + 2, hip - 2)], fill=255)
        elif wear == 'cape': ld.line([(cx - 4, hip - 3), (cx + 4, hip - 3)], fill=255)
        if wear != 'cloak':
            fwd = max(0.0, -s) if walk else 0                                               # the near arm: an elbow, and the hand lifts as it swings forward
            elx, ely = cx - 2.5 * s - (1 if walk else 0), sh + 7
            ex, ey = cx - 5.5 * s + 1.5 * fwd, hip - 1 - 2.5 * fwd
            md.line([(cx, sh + 2), (elx, ely)], fill=255, width=3); md.line([(elx, ely), (ex, ey)], fill=255, width=3)
            if wear in ('jacket', 'hoodie', 'coat'): ld.point((int(round(cx + (ex - cx) * 0.75)), int(ey - 3)), fill=255)
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

    if front and walk and abs(s) > 0.5:                                                    # weight shifts over the standing leg
        xs = -1 if s > 0 else 1
        M, L, G = ImageChops.offset(M, xs, 0), ImageChops.offset(L, xs, 0), ImageChops.offset(G, xs, 0)
    # ------------------------------------------------------------ light
    m, lm, gm = M.load(), L.load(), G.load()
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
    tear = walk and i % 4 == 3
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
            if lm[x, y]: put(x + shift, y, mix(deep, ink, 0.55), 225 - 40 * t); continue
            lit = not inside(x - 1, y) or not inside(x, y - 1)                              # light from the upper left
            shade = not inside(x + 1, y) or not inside(x, y + 1) or not inside(x + 2, y) or (not inside(x + 3, y) and (x + y) % 2 == 0)
            if lit and not (not inside(x + 1, y) and not inside(x - 1, y)): col, a = rim, 245 - 50 * t
            elif shade: col, a = mix(c, deep, 0.75), 205 - 55 * t
            else: col, a = mix(mix(c, rim, 0.18), c, t), 200 - 70 * t * t
            if y % 3 == 0 and not lit: col = mul(col, 0.94); a -= 12                        # sparse scanlines
            if not walk and P['bob']: a *= 0.94
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
            big = holo2_frame(ch, view, anim, i).resize((W * Z, H * Z), Image.NEAREST)
            out.alpha_composite(big, (pad + k * (W * Z + pad), pad + r * (H * Z + pad)))
    out.save(path)

def strip(path):
    Z = 5; ids = ('byte', 'nyx', 'rune'); views = ('down', 'side', 'up')
    out = Image.new('RGBA', (6 * W * Z, len(ids) * len(views) * H * Z), (74, 122, 58, 255))
    for a, tid in enumerate(ids):
        for b, v in enumerate(views):
            for i in range(6):
                big = holo2_frame(T.TAMERS[tid], v, 'walk', i).resize((W * Z, H * Z), Image.NEAREST)
                out.alpha_composite(big, (i * W * Z, (a * len(views) + b) * H * Z))
    out.save(path)

if __name__ == '__main__':
    if '--walk' in sys.argv: strip(sys.argv[-1]); print('walk strip written'); sys.exit(0)
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'holo2-preview.png'); print('sheet written')
