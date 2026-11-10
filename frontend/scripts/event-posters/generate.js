#!/usr/bin/env node
/**
 * Renders the TicketFlow-branded event posters in `posters.json` to
 * `public/events/posters/<slug>.jpg` (1600×1200, 4:3 — the aspect the event
 * cards and the detail page crop to).
 *
 * Every poster carries the TicketFlow Kenya logo and the motto
 * "Good Events. Brighter People." Artwork is drawn here (gradients + SVG), so
 * there is no third-party imagery to license.
 *
 * Usage (from `frontend/`, needs Playwright + Chromium and network access for
 * Noto Sans from Google Fonts):
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

/** Seeded PRNG so a re-render produces the same artwork. */
function rng(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const THEMES = {
  sunset: {
    bg: 'linear-gradient(180deg,#2a0b3d 0%,#7a1450 38%,#e6002d 68%,#ff8a1f 100%)',
    accent: '#ffb347',
    art: () => {
      let s = `<circle cx="800" cy="760" r="330" fill="url(#sun)"/>`;
      for (let i = 0; i < 9; i++) s += `<rect x="440" y="${780 + i * 34}" width="720" height="${6 + i * 2}" fill="#7a1450" opacity=".9"/>`;
      s += `<path d="M0 1010 C300 940 520 1060 800 1000 S1300 930 1600 1000 V1200 H0Z" fill="#1a0726" opacity=".85"/>`;
      return `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#ff4d3d"/></linearGradient></defs>${s}`;
    },
  },
  tech: {
    bg: 'radial-gradient(circle at 75% 20%,#1d4ed8 0%,#0b1d4a 45%,#050b1f 100%)',
    accent: '#38bdf8',
    art: (r) => {
      let s = '';
      for (let x = 0; x <= W; x += 80) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#38bdf8" stroke-opacity=".08"/>`;
      for (let y = 0; y <= H; y += 80) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#38bdf8" stroke-opacity=".08"/>`;
      const pts = Array.from({ length: 26 }, () => [Math.round(r() * 20) * 80, Math.round(r() * 15) * 80]);
      pts.forEach(([x, y], i) => {
        const [x2, y2] = pts[(i + 3) % pts.length];
        s += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-opacity=".18" stroke-width="2"/>`;
      });
      pts.forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="7" fill="#38bdf8" opacity=".55"/>`));
      return s;
    },
  },
  jazz: {
    bg: 'radial-gradient(circle at 20% 80%,#0f766e 0%,#073b3a 45%,#03161a 100%)',
    accent: '#f5c451',
    art: () => {
      let s = '';
      for (let i = 0; i < 16; i++) s += `<circle cx="1330" cy="260" r="${60 + i * 22}" fill="none" stroke="#f5c451" stroke-opacity="${0.32 - i * 0.017}" stroke-width="3"/>`;
      s += `<circle cx="1330" cy="260" r="56" fill="#f5c451" opacity=".85"/><circle cx="1330" cy="260" r="10" fill="#03161a"/>`;
      for (let i = 0; i < 5; i++) {
        const y = 1000 + i * 26;
        s += `<path d="M0 ${y} C 200 ${y - 60}, 400 ${y + 60}, 600 ${y} S 1000 ${y - 60}, 1200 ${y} S 1500 ${y + 50}, 1600 ${y}" fill="none" stroke="#f5c451" stroke-opacity="${0.35 - i * 0.05}" stroke-width="3"/>`;
      }
      return s;
    },
  },
  flag: {
    bg: 'linear-gradient(160deg,#0b0b0b 0%,#151515 100%)',
    accent: '#22c55e',
    art: (r) => {
      let s = `<g transform="translate(0 560) rotate(-10 800 600)" opacity=".9">
        <rect x="-400" y="-240" width="2400" height="250" fill="#000"/>
        <rect x="-400" y="10" width="2400" height="26" fill="#fff"/>
        <rect x="-400" y="36" width="2400" height="250" fill="#bb0a1e"/>
        <rect x="-400" y="286" width="2400" height="26" fill="#fff"/>
        <rect x="-400" y="312" width="2400" height="250" fill="#006b3f"/>
      </g>`;
      // Confetti
      for (let i = 0; i < 70; i++) {
        const c = ['#ffffff', '#bb0a1e', '#22c55e', '#ffd36b'][i % 4];
        s += `<rect x="${r() * W}" y="${r() * H}" width="14" height="6" fill="${c}" opacity=".7" transform="rotate(${r() * 180} ${r() * W} ${r() * H})"/>`;
      }
      return s + `<rect width="${W}" height="${H}" fill="#000" opacity=".45"/>`;
    },
  },
  christmas: {
    bg: 'radial-gradient(circle at 50% 0%,#14532d 0%,#0a2e1a 50%,#04140b 100%)',
    accent: '#facc15',
    art: (r) => {
      let s = '';
      for (let i = 0; i < 140; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${1 + r() * 3.5}" fill="#fff" opacity="${0.2 + r() * 0.5}"/>`;
      const star = (cx, cy, R, o) => {
        const p = Array.from({ length: 10 }, (_, k) => {
          const rad = k % 2 ? R * 0.42 : R;
          const a = (Math.PI / 5) * k - Math.PI / 2;
          return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
        }).join(' ');
        return `<polygon points="${p}" fill="#facc15" opacity="${o}"/>`;
      };
      s += star(230, 300, 70, 0.8) + star(1380, 330, 46, 0.6) + star(1250, 960, 30, 0.5) + star(330, 980, 36, 0.5);
      s += `<path d="M0 0 Q 400 120 800 40 T 1600 60" fill="none" stroke="#dc2626" stroke-width="10" opacity=".6"/>`;
      for (let i = 0; i < 12; i++) s += `<circle cx="${70 + i * 133}" cy="${50 + Math.sin(i) * 30}" r="13" fill="${i % 2 ? '#facc15' : '#ef4444'}" opacity=".85"/>`;
      return s;
    },
  },
  nye: {
    bg: 'radial-gradient(circle at 50% 110%,#7c3aed 0%,#2e1065 45%,#0b0420 100%)',
    accent: '#fcd34d',
    art: (r) => {
      let s = '';
      const burst = (cx, cy, R, c) => {
        let g = '';
        for (let k = 0; k < 28; k++) {
          const a = (Math.PI * 2 * k) / 28;
          g += `<line x1="${cx + Math.cos(a) * R * 0.25}" y1="${cy + Math.sin(a) * R * 0.25}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
          g += `<circle cx="${cx + Math.cos(a) * R * 1.08}" cy="${cy + Math.sin(a) * R * 1.08}" r="4" fill="${c}"/>`;
        }
        return g;
      };
      s += burst(240, 290, 170, '#fcd34d') + burst(1360, 260, 200, '#f472b6') + burst(1250, 900, 110, '#60a5fa') + burst(330, 930, 120, '#e6002d');
      for (let i = 0; i < 90; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${1 + r() * 2.5}" fill="#fff" opacity="${0.2 + r() * 0.6}"/>`;
      return s;
    },
  },
  run: {
    bg: 'linear-gradient(135deg,#052e16 0%,#14532d 50%,#3f6212 100%)',
    accent: '#a3e635',
    art: () => {
      let s = '';
      for (let i = 0; i < 6; i++) {
        s += `<path d="M-200 ${1220 - i * 70} C 400 ${1000 - i * 70}, 1100 ${1160 - i * 90}, 1800 ${760 - i * 70}" fill="none" stroke="#a3e635" stroke-width="5" stroke-opacity="${0.42 - i * 0.05}" stroke-dasharray="${i % 2 ? '0' : '40 22'}"/>`;
      }
      for (let i = 0; i < 9; i++) s += `<rect x="${1080 + i * 46}" y="${140 + i * 16}" width="300" height="10" rx="5" fill="#a3e635" opacity="${0.5 - i * 0.05}" transform="skewX(-30)"/>`;
      return s;
    },
  },
  comedy: {
    bg: 'radial-gradient(circle at 50% 0%,#be185d 0%,#4c0519 55%,#1a0209 100%)',
    accent: '#fda4af',
    art: (r) => {
      let s = `<defs><radialGradient id="spot" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
      s += `<polygon points="680,0 920,0 1240,${H} 360,${H}" fill="url(#spot)"/>`;
      const heart = (x, y, k, o) =>
        `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -8 C -10 -24 -34 -14 -26 6 C -20 20 0 30 0 34 C 0 30 20 20 26 6 C 34 -14 10 -24 0 -8Z" fill="#fb7185" opacity="${o}"/>`;
      for (let i = 0; i < 22; i++) s += heart(r() * W, r() * H, 0.8 + r() * 2.4, 0.15 + r() * 0.35);
      return s;
    },
  },
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function html(p) {
  const t = THEMES[p.theme];
  const titleSize = p.title.length > 30 ? 92 : p.title.length > 20 ? 110 : 132;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,800;0,900;1,700&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Noto Sans',Arial,sans-serif;color:#fff;background:${t.bg};position:relative}
  svg.art{position:absolute;inset:0}
  .veil{position:absolute;inset:0;background:radial-gradient(ellipse 62% 52% at 50% 52%,rgba(0,0,0,.42),rgba(0,0,0,0) 100%)}
  .logo{position:absolute;top:70px;left:0;right:0;display:flex;justify-content:center}
  .logo img{height:74px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.45))}
  .main{position:absolute;left:170px;right:170px;top:210px;bottom:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .kicker{font-size:24px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:${t.accent};margin-bottom:22px}
  h1{font-size:${titleSize}px;line-height:1.02;font-weight:900;letter-spacing:-.02em;text-shadow:0 8px 30px rgba(0,0,0,.45)}
  .sub{margin-top:24px;font-size:32px;font-weight:600;color:rgba(255,255,255,.88);max-width:1100px;line-height:1.3}
  .info{margin-top:40px;display:flex;gap:18px;flex-wrap:wrap;justify-content:center}
  .chip{padding:14px 28px;border-radius:999px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.28);font-size:28px;font-weight:800;backdrop-filter:blur(6px)}
  .chip.hot{background:#e6002d;border-color:#e6002d}
  .foot{position:absolute;left:0;right:0;bottom:0;height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.6) 45%)}
  .motto{font-size:46px;font-weight:700;font-style:italic;letter-spacing:.01em}
  .motto b{color:#ff3355;font-weight:700}
  .small{font-size:21px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.75)}
</style></head><body>
<svg class="art" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${t.art(rng(p.slug))}</svg>
<div class="veil"></div>
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
    if (!THEMES[p.theme]) throw new Error(`Unknown theme "${p.theme}" for ${p.slug}`);
    await page.setContent(html(p), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
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
