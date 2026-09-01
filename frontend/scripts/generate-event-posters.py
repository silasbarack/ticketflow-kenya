# -*- coding: utf-8 -*-
"""
Legacy utility for non-production art briefs in backend/prisma/poster-art.json.

Reads the per-event art direction from backend/prisma/poster-art.json, renders
each prompt through whichever image-generation provider has an API key in the
environment, then crops and optimises the result to a landscape WebP sized for
the event cards.

    cd frontend
    python scripts/generate-event-posters.py                 # only missing posters
    python scripts/generate-event-posters.py --force         # redo everything
The production catalogue intentionally has no generation briefs: artwork for a
real event must come from its organizer or official seller. With the current
empty art-direction file this command performs no generation.

Set exactly one of these before running:

    OPENAI_API_KEY       gpt-image-1        (override with OPENAI_IMAGE_MODEL)
    STABILITY_API_KEY    stable-image core  (override with STABILITY_MODEL)
    REPLICATE_API_TOKEN  needs REPLICATE_MODEL, e.g. "black-forest-labs/flux-1.1-pro"

Nothing here invents artwork locally: with no key the script explains what is
missing and exits without writing a file, so a placeholder can never slip in.
"""
import argparse
import base64
import io as _io
import json
import os
import sys
import time
import urllib.error
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))       # frontend/
REPO = os.path.dirname(ROOT)
ART = os.path.join(REPO, "backend", "prisma", "poster-art.json")
OUT_DIR = os.path.join(ROOT, "public", "events", "posters")

TIMEOUT = 300


# ----------------------------------------------------------------------
# Providers
# ----------------------------------------------------------------------

def _post(url, body, headers, raw=False):
    data = body if raw else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:600]
        raise RuntimeError(f"{url} -> HTTP {e.code}: {detail}") from None


def openai_image(prompt, key):
    """Images API. Returns PNG/JPEG bytes."""
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
    # 1536x1024 is the widest native landscape; it is re-cropped to 4:3 below.
    payload = {"model": model, "prompt": prompt, "size": "1536x1024", "n": 1}
    if model.startswith("gpt-image"):
        payload["quality"] = os.environ.get("OPENAI_IMAGE_QUALITY", "high")
    else:
        payload["response_format"] = "b64_json"
    out = json.loads(
        _post(
            "https://api.openai.com/v1/images/generations",
            payload,
            {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
    )
    item = out["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    with urllib.request.urlopen(item["url"], timeout=TIMEOUT) as r:  # dall-e-3 URL form
        return r.read()


def stability_image(prompt, key):
    """Stable Image Core. Multipart form, returns image bytes."""
    model = os.environ.get("STABILITY_MODEL", "core")
    boundary = "----ticketflow" + base64.b16encode(os.urandom(8)).decode()
    parts = []
    for name, value in (("prompt", prompt), ("aspect_ratio", "4:3"), ("output_format", "png")):
        parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return _post(
        f"https://api.stability.ai/v2beta/stable-image/generate/{model}",
        b"".join(parts),
        {
            "Authorization": f"Bearer {key}",
            "Accept": "image/*",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        raw=True,
    )


def replicate_image(prompt, key):
    """Replicate predictions API — create, then poll until it settles."""
    model = os.environ.get("REPLICATE_MODEL")
    if not model:
        raise RuntimeError("REPLICATE_API_TOKEN is set but REPLICATE_MODEL is not "
                           '(e.g. REPLICATE_MODEL="black-forest-labs/flux-1.1-pro")')
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    created = json.loads(
        _post(
            f"https://api.replicate.com/v1/models/{model}/predictions",
            {"input": {"prompt": prompt, "aspect_ratio": "4:3", "output_format": "png"}},
            headers,
        )
    )
    url = created["urls"]["get"]
    deadline = time.time() + TIMEOUT
    while time.time() < deadline:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as r:
            state = json.load(r)
        if state["status"] == "succeeded":
            out = state["output"]
            src = out[0] if isinstance(out, list) else out
            with urllib.request.urlopen(src, timeout=TIMEOUT) as r:
                return r.read()
        if state["status"] in ("failed", "canceled"):
            raise RuntimeError(f"replicate {state['status']}: {state.get('error')}")
        time.sleep(3)
    raise RuntimeError("replicate prediction timed out")


PROVIDERS = [
    ("OPENAI_API_KEY", "OpenAI", openai_image),
    ("STABILITY_API_KEY", "Stability AI", stability_image),
    ("REPLICATE_API_TOKEN", "Replicate", replicate_image),
]


def pick_provider():
    for env_var, name, fn in PROVIDERS:
        key = os.environ.get(env_var)
        if key:
            return name, env_var, key, fn
    return None


# ----------------------------------------------------------------------
# Post-processing
# ----------------------------------------------------------------------

def optimise(raw, width, height, lo, hi):
    """Centre-crop to the target aspect, resize, and encode WebP within budget."""
    img = Image.open(_io.BytesIO(raw)).convert("RGB")
    target = width / height
    w, h = img.size
    if w / h > target:                     # too wide -> trim the sides
        new_w = int(h * target)
        img = img.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
    elif w / h < target:                   # too tall -> trim top and bottom
        new_h = int(w / target)
        img = img.crop((0, (h - new_h) // 2, w, (h - new_h) // 2 + new_h))
    img = img.resize((width, height), Image.LANCZOS)

    # Walk quality down only as far as the size budget requires. The ladder runs
    # low enough that even a dense, high-frequency photograph lands under the
    # ceiling; ordinary event photography settles near the top of it.
    def encode(quality):
        buf = _io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        return buf.getvalue()

    best = None
    for quality in (95, 92, 88, 84, 80, 76, 72, 68, 62, 56, 50, 44, 38):
        best = encode(quality)
        if len(best) <= hi:
            break
    else:
        print(
            f"    warning: could not reach {hi // 1024} KB (best {len(best) // 1024} KB at q38)",
            file=sys.stderr,
        )

    if len(best) < lo:
        # Comfortably under budget — spend the headroom on quality rather than
        # ship a softer image than the page can afford.
        for quality in (98, 96):
            candidate = encode(quality)
            if len(candidate) <= hi:
                best = candidate
                break
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*", help="only these event slugs (default: all)")
    ap.add_argument("--force", action="store_true", help="regenerate posters that already exist")
    args = ap.parse_args()

    with open(ART, encoding="utf-8") as f:
        art = json.load(f)
    spec = art["spec"]
    lo, hi = spec["targetBytes"]
    events = art["events"]

    wanted = args.slugs or list(events)
    unknown = [s for s in wanted if s not in events]
    if unknown:
        sys.exit(f"No art direction for: {', '.join(unknown)} (add it to {ART})")

    chosen = pick_provider()
    if not chosen:
        print(
            "No image-generation provider is configured.\n\n"
            "Photorealistic posters need an image-generation model or supplied image assets;\n"
            "this script will not write substitute artwork. Set one of:\n"
            + "".join(f"  {v:<22} {n}\n" for v, n, _ in PROVIDERS)
            + f"\nthen re-run. Prompts live in {ART}.",
            file=sys.stderr,
        )
        sys.exit(2)

    name, env_var, key, generate = chosen
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Provider: {name} (via {env_var})")

    written = skipped = failed = 0
    for slug in wanted:
        dest = os.path.join(OUT_DIR, f"{slug}.{spec['format']}")
        if os.path.exists(dest) and not args.force:
            print(f"  skip    {slug} (exists; --force to replace)")
            skipped += 1
            continue
        try:
            raw = generate(events[slug], key)
            data = optimise(raw, spec["width"], spec["height"], lo, hi)
            with open(dest, "wb") as f:
                f.write(data)
            print(f"  wrote   {slug}.{spec['format']}  {spec['width']}x{spec['height']}  {len(data) // 1024} KB")
            written += 1
        except Exception as e:                                   # noqa: BLE001
            # Never leave a partial or stand-in file behind on failure.
            if os.path.exists(dest) and args.force:
                pass
            print(f"  FAILED  {slug}: {e}", file=sys.stderr)
            failed += 1

    print(f"\n{written} written, {skipped} skipped, {failed} failed -> {OUT_DIR}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
