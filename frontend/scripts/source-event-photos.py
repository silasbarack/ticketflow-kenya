# -*- coding: utf-8 -*-
"""
Sources real photographs for the event posters from Wikimedia Commons.

This is the "external image assets" path: no image-generation model is
available in this environment, and locally drawn artwork is not acceptable, so
the posters are genuine photographs carrying an explicit free licence.

Commons is used rather than a stock site because every file states its licence
in machine-readable form. Only public-domain, CC0 and CC BY / CC BY-SA files
are accepted -- never NC or ND -- and the author and licence of each pick are
recorded in public/events/posters/CREDITS.md.

Each photo is centre-cropped to 4:3, resized to 1600x1200 and encoded as WebP
inside the size budget. No text is drawn onto the artwork: the card already
renders the title, date, venue and price tiers as live UI.

Run from frontend/:  python scripts/source-event-photos.py [slug ...]
"""
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "events", "posters")
CREDITS = os.path.join(OUT_DIR, "CREDITS.md")
API = "https://commons.wikimedia.org/w/api.php"
UA = "ticketflow-kenya-dev/1.0 (event poster sourcing; contact dev@ticketflow.co.ke)"

W, H = 1600, 1200
MIN_SOURCE_WIDTH = 1400
QUALITY_STEPS = [88, 82, 76, 70, 62]
MAX_BYTES = 500 * 1024

ACCEPTED = ("cc0", "public domain", "cc by", "cc-by", "pd-", "pdm")
REJECTED = ("nc", "nd", "fair use", "non-free")

# No active event uses substitute photography. Real-event artwork must come
# from the organiser or official seller and be recorded in CREDITS.md.
QUERIES = {}


def strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def get_json(url, attempts=4):
    delay = 2
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as exc:
            if exc.code not in (403, 429, 503) or attempt == attempts - 1:
                raise
            time.sleep(delay)
            delay *= 2
    return {}


def search(query, limit=8):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": "6",
        "gsrlimit": str(limit), "prop": "imageinfo",
        "iiprop": "url|size|extmetadata", "iiurlwidth": "2000",
    }
    data = get_json(f"{API}?{urllib.parse.urlencode(params)}")
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        licence = (meta.get("LicenseShortName", {}).get("value") or "").strip()
        low = licence.lower()
        if any(b in low for b in REJECTED) or not any(a in low for a in ACCEPTED):
            continue
        if info.get("width", 0) < MIN_SOURCE_WIDTH:
            continue
        out.append({
            "file": page["title"],
            "licence": licence,
            "author": strip_html(meta.get("Artist", {}).get("value", "")) or "Unknown",
            "page": info.get("descriptionurl", ""),
            "url": info.get("thumburl") or info.get("url"),
            "size": (info.get("width"), info.get("height")),
        })
    return out


def encode(img):
    img = ImageOps.exif_transpose(img).convert("RGB")
    img = ImageOps.fit(img, (W, H), method=Image.LANCZOS, centering=(0.5, 0.42))
    buf = io.BytesIO()
    for q in QUALITY_STEPS:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= MAX_BYTES:
            return buf.getvalue(), q
    return buf.getvalue(), QUALITY_STEPS[-1]


def source_one(slug, queries):
    for query in queries:
        for cand in search(query):
            try:
                req = urllib.request.Request(cand["url"], headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=90) as r:
                    raw = r.read()
                img = Image.open(io.BytesIO(raw))
                img.load()
            except Exception as exc:
                print(f"    skip ({type(exc).__name__}) {cand['file'][5:50]}")
                continue

            data, q = encode(img)
            with open(os.path.join(OUT_DIR, f"{slug}.webp"), "wb") as f:
                f.write(data)
            print(f"    {len(data)//1024} KB  q{q}  <- {cand['file'][5:58]}  [{cand['licence']}]")
            return cand
        time.sleep(1)
    return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    wanted = sys.argv[1:] or list(QUERIES)
    picks, missing = {}, []
    for index, slug in enumerate(wanted):
        if index:
            time.sleep(1)
        print(f"{slug}:")
        got = source_one(slug, QUERIES[slug])
        if got:
            picks[slug] = got
        else:
            missing.append(slug)
            print("    !! no usable photo found")

    if picks:
        existing = ""
        if os.path.exists(CREDITS):
            existing = io.open(CREDITS, encoding="utf-8").read()
        lines = [
            "# Event poster photograph credits",
            "",
            "Photographs sourced from Wikimedia Commons by",
            "`scripts/source-event-photos.py`. Only public-domain, CC0, CC BY and CC BY-SA",
            "files are used; NC and ND licences are rejected. Attribution below satisfies",
            "the CC BY / CC BY-SA licences of the files that require it.",
            "",
        ]
        for slug, p in sorted(picks.items()):
            lines += [
                f"## {slug}",
                f"- File: {p['file']}",
                f"- Author: {p['author']}",
                f"- Licence: {p['licence']}",
                f"- Source: {p['page']}",
                "",
            ]
        io.open(CREDITS, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
        print(f"\nWrote {CREDITS}")
        if existing and len(picks) < len(QUERIES):
            print("  (rewritten for this run only -- rerun without arguments to credit every poster)")

    print(f"\n{len(picks)}/{len(wanted)} sourced" + (f"; missing: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main()
