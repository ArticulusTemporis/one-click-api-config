# App icon: Material glyph, cyan->blue gradient, dark card, soft glow.
#
#   <python> assets/make_icon.py [glyph] [c1] [c2]
#   e.g. python assets/make_icon.py terminal "#22D3EE" "#2563EB"
#
# Small sizes get a simplified frame (no glow, thicker ink) because a 16px icon
# cannot show both a ring and a glyph.

import os
import re
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "assets", "MaterialIcons.ttf")
CODEPOINTS = os.path.join(ROOT, "node_modules", "material-icons", "css", "_codepoints.scss")

glyph_name = sys.argv[1] if len(sys.argv) > 1 else "terminal"
C1 = sys.argv[2] if len(sys.argv) > 2 else "#22D3EE"
C2 = sys.argv[3] if len(sys.argv) > 3 else "#2563EB"
BG = "#0B1118"
S = 512
R = 112


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def linear(size, c1, c2, angle=0.62):
    w, h = size
    img = Image.new("RGB", (w, h))
    px = img.load()
    a, b = rgb(c1), rgb(c2)
    for y in range(h):
        for x in range(w):
            t = x / (w - 1) * (1 - angle) + y / (h - 1) * angle
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return img.convert("RGBA")


def glyph_mask(name, box):
    ch = chr(int(cp[name], 16))
    f = ImageFont.truetype(FONT, box * 2)
    probe = Image.new("L", (box * 3, box * 3), 0)
    ImageDraw.Draw(probe).text((box, box), ch, font=f, fill=255)
    g = probe.crop(probe.getbbox())
    sc = box / max(g.size)
    return g.resize((max(1, round(g.width * sc)), max(1, round(g.height * sc))), Image.LANCZOS)


def rounded(radius):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=radius, fill=255)
    return m


cp = dict(re.findall(r'"([a-z0-9_]+)":\s*([0-9a-fA-F]{4,6})', open(CODEPOINTS, encoding="utf-8").read()))
if glyph_name not in cp:
    raise SystemExit("unknown glyph: " + glyph_name)

mask = rounded(R)
grad = linear((S, S), C1, C2)


def compose(ink_box, glow=True):
    g = glyph_mask(glyph_name, ink_box)
    pos = ((S - g.width) // 2, (S - g.height) // 2)
    icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    icon.paste(linear((S, S), "#101A24", BG), (0, 0), mask)

    if glow:
        halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(halo).bitmap((0, 0), g, fill=rgb(C1) + (110,))
        halo = halo.point(lambda v: v) if False else halo.filter(ImageFilter.GaussianBlur(60))
        icon = Image.alpha_composite(icon, Image.composite(halo, Image.new("RGBA", (S, S), (0, 0, 0, 0)), mask))

    sub = grad.crop((pos[0], pos[1], pos[0] + g.width, pos[1] + g.height))
    icon.paste(sub, pos, g)
    return icon


big = compose(320)                                     # full detail
small = compose(360, glow=False)                       # readable at 16-24px

big.save(os.path.join(ROOT, "assets", f"icon-{glyph_name}.png"))

frames = []
for s in (16, 24, 32, 48, 64, 128, 256):
    src = small if s <= 24 else big
    frames.append(src.resize((s, s), Image.LANCZOS))
frames[-1].save(
    os.path.join(ROOT, "assets", "app.ico"),
    format="ICO",
    sizes=[(f.width, f.height) for f in frames],
    append_images=frames[:-1],
)

# preview: light + dark + small sizes
sheet = Image.new("RGBA", (1000, 640), (245, 245, 245, 255))
bigv = big.resize((380, 380), Image.LANCZOS)
sheet.paste(bigv, (40, 50), bigv)
dark = Image.new("RGBA", (380, 380), (18, 18, 18, 255))
dark.alpha_composite(bigv)
sheet.paste(dark, (480, 50))
x = 40
for s in (16, 24, 32, 48, 64):
    t = (small if s <= 24 else big).resize((s, s), Image.LANCZOS)
    up = t.resize((s * 3, s * 3), Image.NEAREST)
    sheet.paste(up, (x, 470), up)
    x += up.width + 24
sheet.save(os.path.join(ROOT, "assets", "preview.png"))
print("ok:", glyph_name, C1, "->", C2)
