"""
Build the /try Open Graph share image.

Output: 1200×630 PNG at /app/client/public/og-try.png

Design: warm cream background matching Ownology's default `--ow-bg`, deep-amber
accent block on the right, big Fraunces-flavoured serif headline on the left,
subheadline, and a small brand line at bottom. Renders cleanly at any preview
size on WhatsApp/SMS/Twitter/LinkedIn/Slack.

Run once whenever the copy needs updating:
    python3 scripts/build-og-try-image.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# ── Layout ─────────────────────────────────────────────────────────────────
W, H = 1200, 630
CREAM = (247, 240, 227)       # #f7f0e3 — matches --ow-bg (light theme)
DARK = (26, 21, 18)           # #1a1512
AMBER = (181, 106, 28)        # #b56a1c
AMBER_DEEP = (140, 78, 20)
MID = (109, 90, 74)            # muted body text

img = Image.new("RGB", (W, H), CREAM)
draw = ImageDraw.Draw(img)

# ── Right-side amber accent block ──────────────────────────────────────────
# A tall vertical amber bar taking ~28% of width, evoking a wine label edge.
ACCENT_W = int(W * 0.28)
draw.rectangle([W - ACCENT_W, 0, W, H], fill=DARK)

# Inside the accent: a subtle amber vertical stripe
stripe_x = W - ACCENT_W + 48
draw.rectangle([stripe_x, 60, stripe_x + 4, H - 60], fill=AMBER)

# Wine-glass emblem (simple geometric — bowl + stem + base)
# Positioned inside the dark right block, upper section.
GLASS_CX = W - int(ACCENT_W / 2) + 30
GLASS_CY = 220
# bowl (ellipse)
draw.ellipse([GLASS_CX - 55, GLASS_CY - 70, GLASS_CX + 55, GLASS_CY + 40], outline=AMBER, width=3)
# wine fill (lower half of bowl, semi-transparent via colour blend)
draw.chord([GLASS_CX - 55, GLASS_CY - 70, GLASS_CX + 55, GLASS_CY + 40], 0, 180, fill=AMBER_DEEP, outline=AMBER, width=3)
# stem
draw.rectangle([GLASS_CX - 3, GLASS_CY + 40, GLASS_CX + 3, GLASS_CY + 130], fill=AMBER)
# base
draw.ellipse([GLASS_CX - 45, GLASS_CY + 128, GLASS_CX + 45, GLASS_CY + 148], outline=AMBER, width=3)

# Right block text — vertical brand line ("OWNOLOGY CELLARS · HUNTER VALLEY")
brand_font_size = 15
try:
    brand_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", brand_font_size)
except Exception:
    brand_font = ImageFont.load_default()

right_text_y = GLASS_CY + 180
right_lines = [
    "OWNOLOGY CELLARS",
    "HUNTER VALLEY · NSW",
]
for line in right_lines:
    bbox = draw.textbbox((0, 0), line, font=brand_font)
    text_w = bbox[2] - bbox[0]
    draw.text((W - ACCENT_W + (ACCENT_W - text_w) / 2, right_text_y), line, fill=AMBER, font=brand_font)
    right_text_y += 28

# tiny "vintage 2026"
vintage_font = brand_font
label = "VINTAGE 2026 · SANDBOX"
bbox = draw.textbbox((0, 0), label, font=vintage_font)
tw = bbox[2] - bbox[0]
draw.text((W - ACCENT_W + (ACCENT_W - tw) / 2, right_text_y + 20), label, fill=CREAM, font=vintage_font)

# ── Left-side text stack ───────────────────────────────────────────────────
LEFT_PAD = 80

# Eyebrow
try:
    eyebrow_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 20)
except Exception:
    eyebrow_font = ImageFont.load_default()
draw.text((LEFT_PAD, 80), "OWNOLOGY  ·  SANDBOX", fill=AMBER, font=eyebrow_font)

# Big serif headline — Fraunces isn't installed; use Liberation Serif Bold as
# a passable serif substitute. Renders large + confident.
try:
    headline_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", 92)
except Exception:
    headline_font = ImageFont.load_default()

# Two-line headline
draw.text((LEFT_PAD, 130), "Run a winery for", fill=DARK, font=headline_font)
draw.text((LEFT_PAD, 230), "ten minutes.", fill=DARK, font=headline_font)

# Amber underline flourish under headline
draw.rectangle([LEFT_PAD, 350, LEFT_PAD + 100, 356], fill=AMBER)

# Subheadline
try:
    sub_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 28)
except Exception:
    sub_font = ImageFont.load_default()
sub_y = 385
sub_lines = [
    "A real 12-batch cellar. Real 2026 vintage.",
    "Fix a stuck ferment. Log the action.",
    "Publish the lesson. No signup.",
]
for line in sub_lines:
    draw.text((LEFT_PAD, sub_y), line, fill=MID, font=sub_font)
    sub_y += 42

# Bottom URL bar
try:
    url_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf", 22)
except Exception:
    url_font = ImageFont.load_default()

# amber pill background behind URL
pill_x, pill_y = LEFT_PAD, H - 90
pill_text = "ownology.ai/try"
bbox = draw.textbbox((0, 0), pill_text, font=url_font)
pw = bbox[2] - bbox[0] + 40
ph = bbox[3] - bbox[1] + 22
draw.rounded_rectangle([pill_x, pill_y, pill_x + pw, pill_y + ph], radius=6, fill=AMBER)
draw.text((pill_x + 20, pill_y + 8), pill_text, fill=CREAM, font=url_font)

# Small tagline right of the pill
try:
    tag_font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf", 20)
except Exception:
    tag_font = ImageFont.load_default()
draw.text((pill_x + pw + 22, pill_y + 10), "guided sandbox · from Rich & Gel", fill=MID, font=tag_font)

# ── Save ───────────────────────────────────────────────────────────────────
out = Path("/app/client/public/og-try.png")
img.save(out, "PNG", optimize=True)
print(f"Wrote {out}  ({out.stat().st_size // 1024} KB)")
