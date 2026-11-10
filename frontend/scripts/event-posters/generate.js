#!/usr/bin/env node
/**
 * Renders the TicketFlow-branded event posters in `posters.json` to
 * `public/events/posters/<slug>.jpg` (1600×1200, 4:3 — the aspect the event
 * cards and the detail page crop to).
 *
 * Each poster is a photograph (Unsplash, free under the Unsplash License —
 * the photo id is in `posters.json` and credited in
 * `public/events/posters/CREDITS.md`) with a colour grade, the TicketFlow Kenya
 * logo, the event details and the motto "Good Events. Brighter People."
 *
 * Usage (from `frontend/`; needs Playwright + Chromium and network access to
 * images.unsplash.com and Google Fonts):
 *   node scripts/event-posters/generate.js [slug ...]
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'events', 'posters');
const W = 1600;
const H = 1200;

const logo = fs.readFileSync(path.join(ROOT, 'public', 'brand', 'ticketflow-logo-horizontal-light.png')).toString('base64');

const photoUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${W}&h=${H}&q=90&fm=jpg`;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function html(p) {
  const titleSize = p.title.length > 30 ? 92 : p.title.length > 20 ? 110 : 132;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,800;0,900;1,700&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Noto Sans',Arial,sans-serif;color:#fff;background:#0b0b0f;position:relative}
  .photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${p.photoPosition};transform:scale(${p.photoScale || 1});transform-origin:${p.photoOrigin || 'center'}}
  /* Colour grade in the event's palette, then shade the logo, text and motto bands. */
  .tint{position:absolute;inset:0;background:${p.tint};mix-blend-mode:multiply;opacity:.55}
  .shade{position:absolute;inset:0;background:
    linear-gradient(180deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.15) 22%,rgba(0,0,0,.1) 70%,rgba(0,0,0,.85) 100%),
    radial-gradient(ellipse 60% 42% at 50% 52%,rgba(0,0,0,.55),rgba(0,0,0,0) 100%)}
  .logo{position:absolute;top:70px;left:0;right:0;display:flex;justify-content:center}
  .logo img{height:74px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))}
  .main{position:absolute;left:170px;right:170px;top:210px;bottom:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .kicker{font-size:24px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:${p.accent};margin-bottom:22px;text-shadow:0 2px 10px rgba(0,0,0,.7)}
  h1{font-size:${titleSize}px;line-height:1.02;font-weight:900;letter-spacing:-.02em;text-shadow:0 6px 30px rgba(0,0,0,.75)}
  .sub{margin-top:24px;font-size:32px;font-weight:600;color:rgba(255,255,255,.92);max-width:1100px;line-height:1.3;text-shadow:0 2px 14px rgba(0,0,0,.8)}
  .info{margin-top:40px;display:flex;gap:18px;flex-wrap:wrap;justify-content:center}
  .chip{padding:14px 28px;border-radius:999px;background:rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.35);font-size:28px;font-weight:800;backdrop-filter:blur(8px)}
  .chip.hot{background:#e6002d;border-color:#e6002d}
  .foot{position:absolute;left:0;right:0;bottom:0;height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
  .motto{font-size:46px;font-weight:700;font-style:italic;letter-spacing:.01em;text-shadow:0 3px 16px rgba(0,0,0,.7)}
  .motto b{color:#ff3355;font-weight:700}
  .small{font-size:21px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.8)}
</style></head><body>
<img class="photo" src="${esc(photoUrl(p.photo))}" alt="">
<div class="tint"></div>
<div class="shade"></div>
<div class="logo"><img src="data:image/png;base64,${logo}" alt=""></div>
<div class="main">
  <div class="kicker">${esc(p.kicker)}</div>
  <h1>${esc(p.title)}</h1>
  <div class="sub">${esc(p.subtitle)}</div>
  <div class="info">
    <span class="chip hot">${esc(p.date)}</span>
    <span class="chip">${esc(p.time)}</span>
    <span class="chip">${esc(p.venue)}</span>
  </div>
</div>
<div class="foot">
  <div class="motto">Good Events. <b>Brighter People.</b></div>
  <div class="small">${esc(p.price)} &nbsp;·&nbsp; Tickets on TicketFlow Kenya &nbsp;·&nbsp; Pay with M-Pesa</div>
</div>
</body></html>`;
}

async function main() {
  const posters = JSON.parse(fs.readFileSync(path.join(__dirname, 'posters.json'), 'utf8'));
  const only = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const p of posters) {
    if (only.length && !only.includes(p.slug)) continue;
    await page.setContent(html(p), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.$eval('img.photo', (img) => img.complete && img.naturalWidth > 0);
    if (!loaded) throw new Error(`Photo ${p.photo} failed to load for ${p.slug}`);
    const out = path.join(OUT_DIR, `${p.slug}.jpg`);
    await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
    console.log(`poster: ${path.relative(ROOT, out)}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
