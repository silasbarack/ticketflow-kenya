# -*- coding: utf-8 -*-
"""
Composites TicketFlow Kenya branding onto the six seed event poster photos:
official logo + wordmark, event title, date/venue line, the event's real
KES price-tier ladder, and an M-PESA/QR footer bar.

The tier names and prices here MUST match backend/prisma/seed.ts — the seed
file comment points back at this script.

Run from frontend/:  python scripts/generate-posters.py
Overwrites frontend/public/posters/<slug>.jpg in place (originals are plain
photos; keep a backup before re-running if you care about them).
"""
import os
from datetime import date
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # frontend/
POSTERS = os.path.join(ROOT, "public", "posters")
LOGO = os.path.join(ROOT, "public", "logo.png")
FONTS = r"C:\Windows\Fonts"

W, H = 1200, 1600

NAVY = (14, 27, 42)
EMERALD = (8, 127, 91)
CORAL = (242, 95, 76)
WHITE = (255, 255, 255)

EVENTS = [
    {
        "file": "watamu-ocean-seafood-festival.jpg",
        "title": ["WATAMU OCEAN &", "SEAFOOD FESTIVAL"],
        "date": date(2026, 8, 1),
        "when": "10 AM – 10 PM",
        "where": "Watamu Beach • Watamu",
        "tiers": [
            ("STUDENT", 500),
            ("EARLY BIRD", 800),
            ("REGULAR", 1200),
            ("VIP DECK", 2500),
            ("VVIP CABANA", 5000),
        ],
    },
    {
        "file": "august-nights-afro-fusion-live.jpg",
        "title": ["AUGUST NIGHTS", "AFRO-FUSION LIVE"],
        "date": date(2026, 8, 8),
        "when": "GATES 6 PM – LATE",
        "where": "Uhuru Gardens • Nairobi",
        "tiers": [
            ("STUDENT", 1000),
            ("EARLY BIRD", 1500),
            ("REGULAR", 2000),
            ("VIP", 5000),
            ("VVIP STAGE", 10000),
        ],
    },
    {
        "file": "coast-sevens-rugby-festival.jpg",
        "title": ["COAST SEVENS", "RUGBY FESTIVAL"],
        "date": date(2026, 8, 15),
        "when": "KICK-OFF 9 AM",
        "where": "Mombasa Sports Club • Mombasa",
        "tiers": [
            ("STUDENT", 300),
            ("EARLY BIRD", 500),
            ("TERRACES", 800),
            ("VIP STAND", 2000),
            ("HOSPITALITY", 4500),
        ],
    },
    {
        "file": "nairobi-fintech-ai-summit-2026.jpg",
        "title": ["NAIROBI FINTECH", "& AI SUMMIT 2026"],
        "date": date(2026, 8, 19),
        "when": "9 AM – 5 PM",
        "where": "Sarit Expo Centre • Nairobi",
        "tiers": [
            ("STUDENT", 1500),
            ("EARLY BIRD", 3500),
            ("DELEGATE", 5500),
            ("EXECUTIVE", 9500),
            ("INVESTOR", 15000),
        ],
    },
    {
        "file": "sanaa-live-spoken-word-theatre-night.jpg",
        "title": ["SANAA LIVE", "SPOKEN WORD & THEATRE"],
        "date": date(2026, 8, 23),
        "when": "DOORS 5 PM",
        "where": "Kenya National Theatre • Nairobi",
        "tiers": [
            ("STUDENT", 500),
            ("EARLY BIRD", 700),
            ("REGULAR", 1000),
            ("VIP FRONT ROW", 2000),
        ],
    },
    {
        "file": "nairobi-coffee-culture-festival.jpg",
        "title": ["NAIROBI COFFEE &", "CULTURE FESTIVAL"],
        "date": date(2026, 8, 29),
        "when": "10 AM – 8 PM",
        "where": "Ngong Racecourse • Nairobi",
        "tiers": [
            ("STUDENT", 600),
            ("EARLY BIRD", 900),
            ("REGULAR", 1300),
            ("VIP TASTING", 2800),
        ],
    },
]


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def kes(amount):
    return f"KES {amount:,}"


def text_w(draw, text, fnt):
    left, _, right, _ = draw.textbbox((0, 0), text, font=fnt)
    return right - left


def vertical_gradient(width, height, top_alpha, bottom_alpha, color=NAVY):
    """RGBA strip fading from top_alpha to bottom_alpha."""
    grad = Image.new("L", (1, height))
    for y in range(height):
        a = top_alpha + (bottom_alpha - top_alpha) * (y / max(1, height - 1))
        grad.putpixel((0, y), int(a))
    grad = grad.resize((width, height))
    strip = Image.new("RGBA", (width, height), color + (0,))
    strip.putalpha(grad)
    return strip


def rounded_panel(size, radius, fill):
    panel = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(panel)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill)
    return panel


def compose(ev):
    base = Image.open(os.path.join(POSTERS, ev["file"])).convert("RGB").resize((W, H))
    img = base.convert("RGBA")

    # ------- legibility gradients -------
    img.alpha_composite(vertical_gradient(W, 340, 190, 0), (0, 0))           # top band
    img.alpha_composite(vertical_gradient(W, 760, 0, 255), (0, H - 760))     # bottom band

    draw = ImageDraw.Draw(img)

    # ------- header: official logo + wordmark -------
    logo = Image.open(LOGO).convert("RGBA")
    logo_h = 132
    logo_w = int(logo.width * logo_h / logo.height)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    # White chip behind the logo so it reads on any photo
    chip = rounded_panel((logo_w + 36, logo_h + 24), 26, (255, 255, 255, 235))
    img.alpha_composite(chip, (48, 44))
    img.alpha_composite(logo, (48 + 18, 44 + 12))

    f_word = font("arialbd.ttf", 44)
    f_presents = font("arialbd.ttf", 26)
    wx = 48 + logo_w + 36 + 26
    draw.text((wx, 66), "TICKETFLOW", font=f_word, fill=WHITE)
    draw.text((wx, 66 + 48), "KENYA", font=f_word, fill=(111, 219, 185, 255))
    draw.text((wx, 66 + 100), "P R E S E N T S", font=f_presents, fill=(255, 255, 255, 210))

    # ------- date badge (top-right) -------
    d = ev["date"]
    day_name = d.strftime("%a").upper()
    badge_lines = [day_name, d.strftime("%d"), d.strftime("%b %Y").upper()]
    f_badge_sm = font("arialbd.ttf", 30)
    f_badge_lg = font("ariblk.ttf", 64)
    bw, bh = 190, 190
    badge = rounded_panel((bw, bh), 24, (255, 255, 255, 240))
    bd = ImageDraw.Draw(badge)
    bd.rounded_rectangle([0, 0, bw - 1, 44], radius=24, fill=EMERALD + (255,))
    bd.rectangle([0, 24, bw - 1, 44], fill=EMERALD + (255,))
    bd.text(((bw - text_w(bd, badge_lines[0], f_badge_sm)) / 2, 6), badge_lines[0], font=f_badge_sm, fill=WHITE)
    bd.text(((bw - text_w(bd, badge_lines[1], f_badge_lg)) / 2, 52), badge_lines[1], font=f_badge_lg, fill=NAVY)
    bd.text(((bw - text_w(bd, badge_lines[2], f_badge_sm)) / 2, 136), badge_lines[2], font=f_badge_sm, fill=NAVY)
    img.alpha_composite(badge, (W - bw - 48, 44))

    # ------- bottom block -------
    # Footer bar first (fixed at the very bottom), then price strip above it,
    # then title above that.
    f_footer = font("arialbd.ttf", 30)
    footer_h = 78
    draw.rectangle([0, H - footer_h, W, H], fill=EMERALD + (255,))
    footer_text = "TICKETS ON  TICKETFLOW.CO.KE   •   PAY WITH M-PESA   •   INSTANT QR TICKET"
    draw.text(((W - text_w(draw, footer_text, f_footer)) / 2, H - footer_h + 22), footer_text, font=f_footer, fill=WHITE)

    # Price tier strip
    tiers = ev["tiers"]
    n = len(tiers)
    strip_margin = 48
    gap = 14
    tile_w = (W - 2 * strip_margin - gap * (n - 1)) // n
    tile_h = 120
    strip_y = H - footer_h - 24 - tile_h

    f_tier_label = font("arialbd.ttf", 25 if n == 5 else 28)
    f_tier_price = font("ariblk.ttf", 34 if n == 5 else 40)
    for i, (label, price) in enumerate(tiers):
        x = strip_margin + i * (tile_w + gap)
        is_top = i == n - 1
        tile_fill = (CORAL + (255,)) if is_top else (255, 255, 255, 238)
        label_fill = WHITE if is_top else EMERALD
        price_fill = WHITE if is_top else NAVY
        img.alpha_composite(rounded_panel((tile_w, tile_h), 18, tile_fill), (x, strip_y))
        # Shrink the label font until it fits its tile
        lf = f_tier_label
        size = lf.size
        while text_w(draw, label, lf) > tile_w - 18 and size > 16:
            size -= 1
            lf = font("arialbd.ttf", size)
        pf = f_tier_price
        size = pf.size
        while text_w(draw, kes(price), pf) > tile_w - 14 and size > 20:
            size -= 1
            pf = font("ariblk.ttf", size)
        draw.text((x + (tile_w - text_w(draw, label, lf)) / 2, strip_y + 20), label, font=lf, fill=label_fill)
        draw.text((x + (tile_w - text_w(draw, kes(price), pf)) / 2, strip_y + 58), kes(price), font=pf, fill=price_fill)

    # "TICKETS" kicker above the strip
    f_kicker = font("arialbd.ttf", 28)
    kicker = "T I C K E T S"
    draw.text(((W - text_w(draw, kicker, f_kicker)) / 2, strip_y - 44), kicker, font=f_kicker, fill=(255, 255, 255, 220))

    # Venue / time line
    f_meta = font("arialbd.ttf", 40)
    meta = f"{ev['where']}   •   {ev['when']}"
    lf = f_meta
    size = lf.size
    while text_w(draw, meta, lf) > W - 96 and size > 24:
        size -= 1
        lf = font("arialbd.ttf", size)
    meta_y = strip_y - 44 - 62
    draw.text(((W - text_w(draw, meta, lf)) / 2, meta_y), meta, font=lf, fill=(255, 255, 255, 235))

    # Coral accent rule
    rule_y = meta_y - 26
    draw.rounded_rectangle([(W - 220) / 2, rule_y, (W + 220) / 2, rule_y + 8], radius=4, fill=CORAL + (255,))

    # Title (2 lines, auto-shrunk to fit)
    title_lines = ev["title"]
    f_title = font("ariblk.ttf", 92)
    for line in title_lines:
        size = f_title.size
        lf = font("ariblk.ttf", size)
        while text_w(draw, line, lf) > W - 96 and size > 40:
            size -= 2
            lf = font("ariblk.ttf", size)
        if lf.size < f_title.size:
            f_title = lf
    line_h = f_title.size + 14
    title_y = rule_y - 30 - line_h * len(title_lines)
    for i, line in enumerate(title_lines):
        y = title_y + i * line_h
        # soft shadow for pop
        draw.text(((W - text_w(draw, line, f_title)) / 2 + 3, y + 3), line, font=f_title, fill=(0, 0, 0, 160))
        draw.text(((W - text_w(draw, line, f_title)) / 2, y), line, font=f_title, fill=WHITE)

    out = img.convert("RGB")
    out.save(os.path.join(POSTERS, ev["file"]), "JPEG", quality=88, optimize=True)
    print(f"wrote {ev['file']}  (title from y={title_y})")


if __name__ == "__main__":
    for ev in EVENTS:
        compose(ev)
    print("All 6 posters generated.")
