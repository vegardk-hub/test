// De 20 byggene man kan kjøpe og sette ut på øya, tegnet i samme low-poly-stil
// som resten av brettet. Hver funksjon tegner i en rute på S × S piksler; bakken
// (kortet) er allerede tegnet. Lyset kommer fra øvre venstre.

import { FIGUR } from './palett.js';
import { poly, fasett, kasse, hus, iso, skygge, lys, mork, stein } from './lavpoly.js';

// ---------------------------------------------------------------------------
// Små hjelpere
// ---------------------------------------------------------------------------
function sirkel(ctx, x, y, r, farge) {
  ctx.fillStyle = farge;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function strek(ctx, pts, farge, bredde) {
  ctx.strokeStyle = farge;
  ctx.lineWidth = bredde;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

/** Punkter langs en ellipse fra vinkel a0 til a1. */
function ellipse(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 16) {
  const ut = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    ut.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return ut;
}

function kule(ctx, x, y, r, farge) {
  fasett(ctx, ellipse(x, y, r, r, 0, Math.PI * 2, 12).slice(0, 12), farge, { styrke: 0.8 });
}

function flagg(ctx, x, y, h, farge = '#e0393e') {
  strek(ctx, [[x, y], [x, y - h]], '#5b4a3a', Math.max(1.2, h * 0.06));
  poly(ctx, [[x, y - h], [x + h * 0.55, y - h * 0.86], [x, y - h * 0.7]], farge);
}

const STEIN = { topp: '#c2c5cc', venstre: '#a7abb5', hoyre: '#7e828d' };
const SAND = { topp: '#ecd29a', venstre: '#e2c58a', hoyre: '#bf9d62' };

/** Takker (murtinder) langs de to fremre toppkantene av en kasse. */
function tinder(ctx, ax, ay, w, d, h, farger, n = 4) {
  const p = iso(ax, ay);
  const t = Math.min(w, d) * 0.16;
  for (let k = 0; k < n; k++) {
    const u = -w / 2 + (w / n) * (k + 0.5);
    kasse(ctx, ...p(u, d / 2 - t / 2, h), t, t, t, farger);
  }
  for (let k = 0; k < n; k++) {
    const v = -d / 2 + (d / n) * (k + 0.5);
    kasse(ctx, ...p(w / 2 - t / 2, v, h), t, t, t, farger);
  }
}

/** Kjegletak (rundt tårntak) over et punkt. */
function kjegle(ctx, x, y, r, h, farger) {
  poly(ctx, [[x - r, y], [x, y - h], [x, y + r * 0.35]], farger[0]);
  poly(ctx, [[x, y - h], [x + r, y], [x, y + r * 0.35]], farger[1]);
}

// ---------------------------------------------------------------------------
// Byggene
// ---------------------------------------------------------------------------
export const PYNT = {
  baal(ctx, S, tilf) {
    const x = S * 0.5, y = S * 0.7;
    const g = ctx.createRadialGradient(x, y - S * 0.08, 0, x, y - S * 0.08, S * 0.32);
    g.addColorStop(0, 'rgba(255, 200, 90, 0.45)');
    g.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      stein(ctx, tilf, x + Math.cos(a) * S * 0.17, y + Math.sin(a) * S * 0.08, S * 0.035, FIGUR.stein);
    }
    poly(ctx, [[x - S * 0.13, y + S * 0.03], [x + S * 0.1, y - S * 0.05], [x + S * 0.12, y - S * 0.02], [x - S * 0.11, y + S * 0.06]], '#7a5236');
    poly(ctx, [[x - S * 0.1, y - S * 0.05], [x + S * 0.13, y + S * 0.03], [x + S * 0.11, y + S * 0.06], [x - S * 0.12, y - S * 0.02]], '#6a4428');
    poly(ctx, [[x - S * 0.09, y], [x - S * 0.02, y - S * 0.26], [x + S * 0.03, y - S * 0.12], [x + S * 0.09, y]], FIGUR.flamme[1]);
    poly(ctx, [[x - S * 0.05, y], [x + S * 0.01, y - S * 0.17], [x + S * 0.05, y]], FIGUR.flamme[0]);
    // To stubber å sitte på
    for (const dx of [-0.3, 0.3]) {
      poly(ctx, [[x + S * (dx - 0.05), y + S * 0.12], [x + S * (dx + 0.05), y + S * 0.12], [x + S * (dx + 0.05), y + S * 0.06], [x + S * (dx - 0.05), y + S * 0.06]], '#8a5c38');
      ctx.fillStyle = '#e8c48a';
      ctx.beginPath(); ctx.ellipse(x + S * dx, y + S * 0.06, S * 0.05, S * 0.018, 0, 0, Math.PI * 2); ctx.fill();
    }
  },

  telt(ctx, S) {
    const p = iso(S * 0.5, S * 0.68);
    const W = S * 0.24, D = S * 0.17, H = S * 0.3;
    skygge(ctx, S * 0.52, S * 0.74, S * 0.32, S * 0.08);
    poly(ctx, [p(-W, D, 0), p(W, D, 0), p(W, 0, H), p(-W, 0, H)], '#e8763c');
    poly(ctx, [p(-W, D * 0.55, H * 0.45), p(W, D * 0.55, H * 0.45), p(W, D * 0.4, H * 0.6), p(-W, D * 0.4, H * 0.6)], '#f5c431');
    poly(ctx, [p(W, -D, 0), p(W, D, 0), p(W, 0, H)], '#b5532a');
    poly(ctx, [p(W, -D * 0.35, 0), p(W, D * 0.35, 0), p(W, 0, H * 0.62)], '#4a2a18');
    const [tx, ty] = p(W, 0, H);
    flagg(ctx, tx, ty, S * 0.13, '#3a74d8');
    const [bx, by] = p(-W, 0, H);
    strek(ctx, [[bx, by], [bx, by - S * 0.04]], '#5b4a3a', S * 0.012);
  },

  snomann(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.03, S * 0.86, S * 0.18, S * 0.05);
    strek(ctx, [[x - S * 0.1, S * 0.5], [x - S * 0.25, S * 0.4], [x - S * 0.29, S * 0.35]], '#6a4428', S * 0.018);
    strek(ctx, [[x + S * 0.1, S * 0.5], [x + S * 0.24, S * 0.44], [x + S * 0.28, S * 0.47]], '#6a4428', S * 0.018);
    kule(ctx, x, S * 0.74, S * 0.15, '#f4f6f8');
    kule(ctx, x, S * 0.51, S * 0.11, '#f4f6f8');
    kule(ctx, x, S * 0.33, S * 0.08, '#f4f6f8');
    poly(ctx, [[x - S * 0.09, S * 0.4], [x + S * 0.09, S * 0.4], [x + S * 0.08, S * 0.44], [x - S * 0.08, S * 0.44]], '#e0393e');
    poly(ctx, [[x + S * 0.03, S * 0.43], [x + S * 0.08, S * 0.43], [x + S * 0.09, S * 0.54], [x + S * 0.05, S * 0.54]], '#c42e36');
    poly(ctx, [[x - S * 0.08, S * 0.27], [x + S * 0.08, S * 0.27], [x + S * 0.08, S * 0.25], [x - S * 0.08, S * 0.25]], '#2b2a2e');
    poly(ctx, [[x - S * 0.05, S * 0.25], [x + S * 0.05, S * 0.25], [x + S * 0.05, S * 0.15], [x - S * 0.05, S * 0.15]], '#2b2a2e');
    sirkel(ctx, x - S * 0.028, S * 0.31, S * 0.011, '#2b2a2e');
    sirkel(ctx, x + S * 0.028, S * 0.31, S * 0.011, '#2b2a2e');
    poly(ctx, [[x, S * 0.335], [x + S * 0.09, S * 0.35], [x, S * 0.355]], '#f08a2b');
    for (const y of [0.5, 0.56, 0.68]) sirkel(ctx, x, S * y, S * 0.012, '#2b2a2e');
  },

  bronn(ctx, S) {
    const x = S * 0.5, y = S * 0.74, r = S * 0.17;
    skygge(ctx, x + r * 0.2, y + S * 0.03, r * 1.3, r * 0.4);
    kasse(ctx, x, y, r * 1.3, r * 1.3, r * 0.6, { topp: '#3c5f80', venstre: '#a3a9b5', hoyre: '#7c8190' });
    ctx.fillStyle = '#6a4428';
    ctx.fillRect(x - r * 0.8, y - r * 1.9, r * 0.11, r * 1.4);
    ctx.fillRect(x + r * 0.7, y - r * 1.9, r * 0.11, r * 1.4);
    strek(ctx, [[x - r * 0.75, y - r * 1.55], [x + r * 0.75, y - r * 1.55]], '#5b3a24', r * 0.08);
    strek(ctx, [[x, y - r * 1.55], [x, y - r * 0.95]], '#e9dcc0', r * 0.04);
    kasse(ctx, x, y - r * 0.8, r * 0.3, r * 0.3, r * 0.25, { topp: '#5a7aa6', venstre: '#9e6d42', hoyre: '#7a5236' });
    poly(ctx, [[x - r * 1.05, y - r * 1.8], [x, y - r * 2.45], [x + r * 1.05, y - r * 1.8]], FIGUR.takRod[0]);
    poly(ctx, [[x, y - r * 2.45], [x + r * 1.05, y - r * 1.8], [x + r * 0.5, y - r * 1.8]], FIGUR.takRod[1]);
  },

  sopphus(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.03, S * 0.84, S * 0.22, S * 0.06);
    poly(ctx, [[x - S * 0.15, S * 0.84], [x - S * 0.12, S * 0.46], [x + S * 0.12, S * 0.46], [x + S * 0.15, S * 0.84]], '#f3e6c8');
    poly(ctx, [[x + S * 0.03, S * 0.84], [x + S * 0.03, S * 0.46], [x + S * 0.12, S * 0.46], [x + S * 0.15, S * 0.84]], '#d8c8a6');
    poly(ctx, [[x - S * 0.07, S * 0.84], [x - S * 0.07, S * 0.7], [x - S * 0.035, S * 0.66], [x, S * 0.7], [x, S * 0.84]], '#7a4a2a');
    sirkel(ctx, x + S * 0.075, S * 0.62, S * 0.03, '#f3d77a');
    const hatt = ellipse(x, S * 0.47, S * 0.32, S * 0.3, Math.PI, Math.PI * 2, 12);
    fasett(ctx, [...hatt, [x + S * 0.3, S * 0.5], [x - S * 0.3, S * 0.5]], '#d23b30');
    for (const [dx, dy, r] of [[-0.18, 0.4, 0.035], [0, 0.27, 0.045], [0.17, 0.38, 0.04], [-0.07, 0.36, 0.025], [0.09, 0.3, 0.025]]) {
      sirkel(ctx, x + S * dx, S * dy, S * r, '#fff6ea');
    }
  },

  hytte(ctx, S) {
    hus(ctx, S * 0.5, S * 0.66, S * 0.4, S * 0.3, S * 0.18, S * 0.16, { vegg: FIGUR.treVegg, tak: FIGUR.takGronn, pipe: true });
    for (const [dx, f] of [[-0.32, '#f3d77a'], [-0.27, '#e88ab4'], [0.3, '#ffffff']]) sirkel(ctx, S * (0.5 + dx), S * 0.86, S * 0.018, f);
  },

  iglo(ctx, S) {
    const x = S * 0.52, y = S * 0.78;
    skygge(ctx, x, y + S * 0.01, S * 0.3, S * 0.07);
    fasett(ctx, [...ellipse(x, y, S * 0.28, S * 0.3, Math.PI, Math.PI * 2, 12)], '#eef4f8', { styrke: 0.6 });
    ctx.strokeStyle = 'rgba(140, 170, 195, 0.6)';
    ctx.lineWidth = Math.max(1, S * 0.008);
    for (const f of [0.3, 0.55, 0.78]) {
      ctx.beginPath();
      ctx.ellipse(x, y, S * 0.28 * Math.sqrt(1 - (1 - f) ** 2), S * 0.3 * f * 0.2, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const u = -0.8 + k * 0.27;
      strek(ctx, [[x + u * S * 0.28, y - S * 0.02], [x + u * S * 0.27, y - S * 0.08]], 'rgba(140, 170, 195, 0.6)', Math.max(1, S * 0.008));
    }
    fasett(ctx, [...ellipse(x - S * 0.2, y + S * 0.03, S * 0.11, S * 0.11, Math.PI, Math.PI * 2, 8)], '#e2ecf3', { styrke: 0.5 });
    poly(ctx, [...ellipse(x - S * 0.2, y + S * 0.03, S * 0.06, S * 0.07, Math.PI, Math.PI * 2, 8)], '#2c3e57');
  },

  trehus(ctx, S, tilf) {
    const x = S * 0.5, y = S * 0.9;
    skygge(ctx, x + S * 0.05, y, S * 0.3, S * 0.06);
    poly(ctx, [[x - S * 0.06, y], [x - S * 0.04, y - S * 0.5], [x + S * 0.04, y - S * 0.5], [x + S * 0.06, y]], '#7a5236');
    poly(ctx, [[x + S * 0.005, y], [x + S * 0.005, y - S * 0.5], [x + S * 0.04, y - S * 0.5], [x + S * 0.06, y]], '#5e3f28');
    const farger = [mork(FIGUR.lov, 0.12), FIGUR.lov, lys(FIGUR.lov, 0.08)];
    for (const [dx, dy, r, f] of [[-0.24, -0.58, 0.17, 0], [0.24, -0.6, 0.17, 0], [0, -0.75, 0.2, 1], [-0.14, -0.48, 0.13, 2], [0.15, -0.47, 0.13, 2]]) {
      fasett(ctx, ellipse(x + S * dx, y + S * dy, S * r, S * r * 0.85, 0, Math.PI * 2, 8).slice(0, 8).map(([px, py]) => [px + (tilf.tall() - 0.5) * S * 0.02, py]), farger[f]);
    }
    hus(ctx, x, y - S * 0.42, S * 0.24, S * 0.18, S * 0.12, S * 0.1, { vegg: FIGUR.treVegg, tak: FIGUR.takRod });
    for (const dx of [-0.11, -0.06]) strek(ctx, [[x + S * dx, y], [x + S * dx, y - S * 0.4]], '#c9a26b', S * 0.01);
    for (let k = 1; k < 7; k++) strek(ctx, [[x - S * 0.11, y - S * 0.06 * k], [x - S * 0.06, y - S * 0.06 * k]], '#c9a26b', S * 0.008);
  },

  stabbur(ctx, S) {
    const x = S * 0.5, y = S * 0.82;
    const p = iso(x, y);
    skygge(ctx, x + S * 0.03, y + S * 0.02, S * 0.3, S * 0.08);
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      kasse(ctx, ...p(u * S * 0.12, v * S * 0.09, 0), S * 0.04, S * 0.04, S * 0.08, STEIN);
    }
    const vegg = ['#a35d3c', '#713f27'];
    hus(ctx, x, y - S * 0.08, S * 0.3, S * 0.22, S * 0.12, 0, { vegg, tak: vegg, vindu: '#a35d3c', dor: '#3d2416' });
    hus(ctx, x, y - S * 0.2, S * 0.38, S * 0.28, S * 0.1, S * 0.14, { vegg, tak: FIGUR.takMork, vindu: '#f3d77a', dor: '#713f27' });
  },

  fontene(ctx, S) {
    const x = S * 0.5, y = S * 0.74;
    skygge(ctx, x, y + S * 0.07, S * 0.34, S * 0.1);
    ctx.fillStyle = '#8d929e';
    ctx.beginPath(); ctx.ellipse(x, y + S * 0.04, S * 0.32, S * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c2c5cc';
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.32, S * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5fa6cf';
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.27, S * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, S * 0.008);
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.15, S * 0.05, 0, 0, Math.PI * 2); ctx.stroke();
    poly(ctx, [[x - S * 0.03, y], [x - S * 0.025, y - S * 0.25], [x + S * 0.025, y - S * 0.25], [x + S * 0.03, y]], '#b5b8c0');
    ctx.fillStyle = '#c2c5cc';
    ctx.beginPath(); ctx.ellipse(x, y - S * 0.25, S * 0.1, S * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160, 215, 245, 0.9)';
    ctx.lineWidth = Math.max(1.5, S * 0.014);
    for (const retn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y - S * 0.3);
      ctx.quadraticCurveTo(x + retn * S * 0.14, y - S * 0.46, x + retn * S * 0.2, y - S * 0.04);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, y - S * 0.26); ctx.lineTo(x, y - S * 0.42); ctx.stroke();
    for (const [dx, dy] of [[-0.22, -0.1], [0.23, -0.12], [-0.1, -0.4], [0.12, -0.38]]) sirkel(ctx, x + S * dx, y + S * dy, S * 0.012, '#d8f0ff');
  },

  sirkus(ctx, S) {
    const x = S * 0.5, y = S * 0.8, rx = S * 0.3, ry = S * 0.1, h = S * 0.2;
    skygge(ctx, x, y + S * 0.02, rx * 1.1, ry * 1.1);
    const n = 10;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI, a1 = ((k + 1) / n) * Math.PI;
      const p0 = [x + Math.cos(a0) * rx, y + Math.sin(a0) * ry], p1 = [x + Math.cos(a1) * rx, y + Math.sin(a1) * ry];
      const grunn = k % 2 ? '#ffffff' : '#e0393e';
      const farge = Math.cos((a0 + a1) / 2) > 0.2 ? mork(grunn, 0.18) : grunn;
      poly(ctx, [p0, p1, [p1[0], p1[1] - h], [p0[0], p0[1] - h]], farge);
    }
    poly(ctx, [[x - S * 0.05, y + ry], [x + S * 0.05, y + ry], [x + S * 0.04, y + ry - h * 0.7], [x - S * 0.04, y + ry - h * 0.7]], '#3a1e12');
    const topp = [x, y - h - S * 0.28];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI, a1 = ((k + 1) / n) * Math.PI;
      const p0 = [x + Math.cos(a0) * rx * 1.08, y + Math.sin(a0) * ry - h], p1 = [x + Math.cos(a1) * rx * 1.08, y + Math.sin(a1) * ry - h];
      const grunn = k % 2 ? '#f5c431' : '#e0393e';
      poly(ctx, [p0, p1, topp], Math.cos((a0 + a1) / 2) > 0.2 ? mork(grunn, 0.15) : grunn);
    }
    flagg(ctx, topp[0], topp[1], S * 0.12, '#3a74d8');
  },

  vindmolle(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.03, S * 0.86, S * 0.2, S * 0.05);
    poly(ctx, [[x - S * 0.14, S * 0.86], [x - S * 0.08, S * 0.38], [x, S * 0.38], [x, S * 0.86]], '#f0e6d2');
    poly(ctx, [[x, S * 0.86], [x, S * 0.38], [x + S * 0.08, S * 0.38], [x + S * 0.14, S * 0.86]], '#c9b997');
    poly(ctx, [[x - S * 0.035, S * 0.86], [x - S * 0.035, S * 0.76], [x, S * 0.73], [x + S * 0.035, S * 0.76], [x + S * 0.035, S * 0.86]], '#6a4428');
    sirkel(ctx, x - S * 0.03, S * 0.56, S * 0.022, '#f3d77a');
    poly(ctx, [[x - S * 0.11, S * 0.4], [x, S * 0.27], [x, S * 0.4]], FIGUR.takRod[0]);
    poly(ctx, [[x, S * 0.27], [x + S * 0.11, S * 0.4], [x, S * 0.4]], FIGUR.takRod[1]);
    const nav = [x, S * 0.36];
    for (let k = 0; k < 4; k++) {
      const a = 0.35 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
      const L = S * 0.33, b = S * 0.055;
      const pt = (u, v) => [nav[0] + c * u - s * v, nav[1] + s * u + c * v];
      poly(ctx, [pt(S * 0.04, 0), pt(L, 0), pt(L, b), pt(S * 0.06, b)], '#efe3c8');
      ctx.strokeStyle = '#8a6a4c';
      ctx.lineWidth = Math.max(1, S * 0.008);
      for (let j = 1; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(...pt(L * j / 4.4, 0)); ctx.lineTo(...pt(L * j / 4.4, b)); ctx.stroke(); }
      strek(ctx, [nav, pt(L, 0)], '#6a4428', S * 0.012);
    }
    sirkel(ctx, nav[0], nav[1], S * 0.02, '#4a372d');
  },

  luftballong(ctx, S) {
    const x = S * 0.5, y = S * 0.34, rx = S * 0.22, ry = S * 0.24;
    skygge(ctx, x + S * 0.05, S * 0.88, S * 0.16, S * 0.04, 0.15);
    const farger = ['#e0393e', '#f5c431', '#3a74d8', '#25b86a', '#f39a2b', '#9b59d0'];
    const n = 6;
    for (let k = 0; k < n; k++) {
      const u0 = -1 + (2 * k) / n, u1 = -1 + (2 * (k + 1)) / n;
      const pts = [];
      for (let j = 0; j <= 10; j++) { const v = -1 + (2 * j) / 10, w = Math.sqrt(1 - v * v) * (v > 0.3 ? 1 - (v - 0.3) * 0.75 : 1); pts.push([x + u0 * rx * w, y + v * ry]); }
      for (let j = 10; j >= 0; j--) { const v = -1 + (2 * j) / 10, w = Math.sqrt(1 - v * v) * (v > 0.3 ? 1 - (v - 0.3) * 0.75 : 1); pts.push([x + u1 * rx * w, y + v * ry]); }
      poly(ctx, pts, (u0 + u1) / 2 > 0.3 ? mork(farger[k], 0.18) : farger[k]);
    }
    const kurv = [x, S * 0.72];
    for (const dx of [-0.06, 0.06]) strek(ctx, [[x + dx * S * 0.8, y + ry * 0.92], [kurv[0] + dx * S * 0.7, kurv[1] - S * 0.04]], '#6a4428', S * 0.008);
    kasse(ctx, kurv[0], kurv[1], S * 0.1, S * 0.1, S * 0.07, { topp: '#7a5236', venstre: '#b5844f', hoyre: '#8a5c38' });
    strek(ctx, [[kurv[0] + S * 0.04, kurv[1]], [x + S * 0.12, S * 0.88]], 'rgba(233, 220, 192, 0.8)', S * 0.006);
    kasse(ctx, x + S * 0.12, S * 0.88, S * 0.025, S * 0.025, S * 0.03, { topp: '#8a5c38', venstre: '#7a5236', hoyre: '#5e3f28' });
  },

  taarn(ctx, S) {
    const x = S * 0.5, y = S * 0.82, w = S * 0.24, h = S * 0.48;
    const p = iso(x, y);
    skygge(ctx, x + S * 0.04, y + S * 0.03, S * 0.26, S * 0.08);
    kasse(ctx, x, y, w, w, h, STEIN);
    // Steinblokker
    for (let k = 0; k < 6; k++) {
      const u = ((k * 37) % 10) / 10 - 0.45, z = 0.1 + k * 0.14;
      poly(ctx, [p(u * w, w / 2, z * h), p(u * w + w * 0.18, w / 2, z * h), p(u * w + w * 0.18, w / 2, z * h + h * 0.05), p(u * w, w / 2, z * h + h * 0.05)], '#989ca7');
    }
    poly(ctx, [p(-w * 0.12, w / 2, 0), p(w * 0.12, w / 2, 0), p(w * 0.12, w / 2, h * 0.2), p(0, w / 2, h * 0.25), p(-w * 0.12, w / 2, h * 0.2)], '#4a372d');
    poly(ctx, [p(-w * 0.04, w / 2, h * 0.55), p(w * 0.04, w / 2, h * 0.55), p(w * 0.04, w / 2, h * 0.72), p(-w * 0.04, w / 2, h * 0.72)], '#2b2a2e');
    tinder(ctx, x, y, w, w, h, STEIN, 3);
    const [fx, fy] = p(0, 0, h);
    flagg(ctx, fx, fy, S * 0.16);
  },

  fyrtaarn(ctx, S, tilf) {
    const x = S * 0.5, bunn = S * 0.84, topp = S * 0.3;
    stein(ctx, tilf, x, bunn + S * 0.02, S * 0.22, FIGUR.steinMork);
    const form = [[x - S * 0.12, bunn - S * 0.05], [x - S * 0.07, topp], [x + S * 0.07, topp], [x + S * 0.12, bunn - S * 0.05]];
    ctx.save();
    ctx.beginPath();
    form.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip();
    const H = bunn - S * 0.05 - topp;
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#ffffff' : '#e0393e';
      ctx.fillRect(x - S * 0.13, topp + (H * k) / 5, S * 0.26, H / 5 + 1);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(x + S * 0.01, topp, S * 0.12, H);
    ctx.restore();
    const g = ctx.createRadialGradient(x, topp - S * 0.06, 0, x, topp - S * 0.06, S * 0.3);
    g.addColorStop(0, 'rgba(255, 236, 140, 0.6)');
    g.addColorStop(1, 'rgba(255, 236, 140, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S * 0.6);
    poly(ctx, [[x - S * 0.1, topp], [x + S * 0.1, topp], [x + S * 0.1, topp - S * 0.02], [x - S * 0.1, topp - S * 0.02]], '#2b2a2e');
    poly(ctx, [[x - S * 0.055, topp - S * 0.02], [x + S * 0.055, topp - S * 0.02], [x + S * 0.055, topp - S * 0.1], [x - S * 0.055, topp - S * 0.1]], '#ffe58a');
    kjegle(ctx, x, topp - S * 0.1, S * 0.075, S * 0.08, ['#c0392b', '#8e2a20']);
  },

  pariserhjul(ctx, S) {
    const x = S * 0.5, nav = [x, S * 0.42], R = S * 0.3;
    skygge(ctx, x, S * 0.88, S * 0.28, S * 0.05);
    for (const dx of [-0.2, 0.2]) strek(ctx, [[x + S * dx, S * 0.88], nav], '#6b7189', S * 0.022);
    ctx.strokeStyle = '#9aa1ae';
    ctx.lineWidth = Math.max(1, S * 0.008);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      ctx.beginPath(); ctx.moveTo(...nav); ctx.lineTo(nav[0] + Math.cos(a) * R, nav[1] + Math.sin(a) * R); ctx.stroke();
    }
    ctx.strokeStyle = '#e0393e';
    ctx.lineWidth = Math.max(2, S * 0.022);
    ctx.beginPath(); ctx.arc(nav[0], nav[1], R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f5c431';
    ctx.lineWidth = Math.max(1, S * 0.008);
    ctx.beginPath(); ctx.arc(nav[0], nav[1], R * 0.82, 0, Math.PI * 2); ctx.stroke();
    const farger = ['#3a74d8', '#25b86a', '#f39a2b', '#9b59d0'];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const gx = nav[0] + Math.cos(a) * R, gy = nav[1] + Math.sin(a) * R;
      poly(ctx, [[gx - S * 0.035, gy], [gx + S * 0.035, gy], [gx + S * 0.03, gy + S * 0.06], [gx - S * 0.03, gy + S * 0.06]], farger[k % 4]);
    }
    sirkel(ctx, nav[0], nav[1], S * 0.03, '#f5c431');
    poly(ctx, [[x - S * 0.27, S * 0.88], [x + S * 0.27, S * 0.88], [x + S * 0.24, S * 0.92], [x - S * 0.24, S * 0.92]], '#8d929e');
  },

  stavkirke(ctx, S) {
    const x = S * 0.5, y = S * 0.84;
    skygge(ctx, x + S * 0.03, y + S * 0.01, S * 0.3, S * 0.08);
    const vegg = ['#7a4a2a', '#55331d'], tak = ['#4f3a2e', '#33251d'];
    hus(ctx, x, y, S * 0.42, S * 0.3, S * 0.12, S * 0.1, { vegg, tak, vindu: '#f3d77a', dor: '#33251d' });
    hus(ctx, x, y - S * 0.17, S * 0.28, S * 0.2, S * 0.08, S * 0.09, { vegg, tak, vindu: '#f3d77a', dor: vegg[0] });
    hus(ctx, x, y - S * 0.3, S * 0.16, S * 0.12, S * 0.06, S * 0.07, { vegg, tak, vindu: vegg[0], dor: vegg[0] });
    const p = iso(x, y - S * 0.36);
    const [sx, sy] = p(0, 0, S * 0.06);
    poly(ctx, [[sx - S * 0.03, sy + S * 0.02], [sx, sy - S * 0.2], [sx, sy + S * 0.03]], tak[0]);
    poly(ctx, [[sx, sy - S * 0.2], [sx + S * 0.03, sy + S * 0.02], [sx, sy + S * 0.03]], tak[1]);
    // Dragehoder på mønene
    for (const [dx, dy] of [[-0.2, -0.28], [0.2, -0.13], [-0.14, -0.43]]) {
      strek(ctx, [[x + S * dx, y + S * dy], [x + S * (dx - 0.03 * Math.sign(dx)), y + S * (dy - 0.05)], [x + S * (dx - 0.05 * Math.sign(dx)), y + S * (dy - 0.04)]], '#33251d', S * 0.014);
    }
  },

  pyramide(ctx, S) {
    const p = iso(S * 0.5, S * 0.72);
    const B = S * 0.3, H = S * 0.46;
    skygge(ctx, S * 0.55, S * 0.82, S * 0.4, S * 0.08);
    const topp = p(0, 0, H);
    poly(ctx, [p(-B, B, 0), p(B, B, 0), topp], SAND.venstre);
    poly(ctx, [p(B, -B, 0), p(B, B, 0), topp], SAND.hoyre);
    ctx.strokeStyle = 'rgba(120, 90, 50, 0.35)';
    ctx.lineWidth = Math.max(1, S * 0.006);
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      ctx.beginPath();
      ctx.moveTo(...p(-B * (1 - f), B * (1 - f), H * f));
      ctx.lineTo(...p(B * (1 - f), B * (1 - f), H * f));
      ctx.lineTo(...p(B * (1 - f), -B * (1 - f), H * f));
      ctx.stroke();
    }
    poly(ctx, [p(-B * 0.12, B, 0), p(B * 0.12, B, 0), p(B * 0.1, B * 0.92, H * 0.12), p(-B * 0.1, B * 0.92, H * 0.12)], '#5b4325');
    poly(ctx, [topp, p(-B * 0.12, B * 0.12, H * 0.88), p(B * 0.12, B * 0.12, H * 0.88)], '#f5c431');
  },

  rakett(ctx, S) {
    const x = S * 0.46, bunn = S * 0.78, topp = S * 0.16, b = S * 0.08;
    kasse(ctx, S * 0.5, S * 0.8, S * 0.36, S * 0.36, S * 0.04, { topp: '#9aa1ae', venstre: '#7d7f8a', hoyre: '#5d5f6b' });
    // Tårnet ved siden av
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = Math.max(1, S * 0.01);
    for (const dx of [0.2, 0.28]) { ctx.beginPath(); ctx.moveTo(S * (0.5 + dx), S * 0.84); ctx.lineTo(S * (0.5 + dx), S * 0.3); ctx.stroke(); }
    for (let k = 0; k < 7; k++) {
      const y0 = S * (0.84 - k * 0.08);
      ctx.beginPath(); ctx.moveTo(S * 0.7, y0); ctx.lineTo(S * 0.78, y0 - S * 0.08); ctx.stroke();
    }
    poly(ctx, [[x - b * 1.9, bunn], [x - b, bunn - S * 0.16], [x - b, bunn]], '#e0393e');
    poly(ctx, [[x + b * 1.9, bunn], [x + b, bunn - S * 0.16], [x + b, bunn]], '#a82a30');
    poly(ctx, [[x - b, bunn], [x - b, topp + S * 0.14], [x, topp + S * 0.12], [x, bunn]], '#f4f6f8');
    poly(ctx, [[x, bunn], [x, topp + S * 0.12], [x + b, topp + S * 0.14], [x + b, bunn]], '#c8cfd8');
    poly(ctx, [[x - b, topp + S * 0.14], [x, topp], [x, topp + S * 0.12]], '#e0393e');
    poly(ctx, [[x, topp], [x + b, topp + S * 0.14], [x, topp + S * 0.12]], '#a82a30');
    poly(ctx, [[x - b, S * 0.56], [x + b, S * 0.56], [x + b, S * 0.6], [x - b, S * 0.6]], '#e0393e');
    sirkel(ctx, x, S * 0.42, b * 0.62, '#f4f6f8');
    sirkel(ctx, x, S * 0.42, b * 0.45, '#3a74d8');
    sirkel(ctx, x - b * 0.15, S * 0.4, b * 0.13, '#bfe4f7');
    poly(ctx, [[x - b * 0.6, bunn], [x + b * 0.6, bunn], [x + b * 0.4, bunn + S * 0.03], [x - b * 0.4, bunn + S * 0.03]], '#5d5f6b');
  },

  borg(ctx, S) {
    const x = S * 0.5, y = S * 0.8;
    const p = iso(x, y);
    skygge(ctx, x + S * 0.04, y + S * 0.03, S * 0.42, S * 0.11);
    const tak = ['#3a74d8', '#2a5299'];
    // Hovedtårnet bak
    const [kx, ky] = p(-S * 0.04, -S * 0.12, 0);
    kasse(ctx, kx, ky, S * 0.18, S * 0.18, S * 0.42, STEIN);
    tinder(ctx, kx, ky, S * 0.18, S * 0.18, S * 0.42, STEIN, 3);
    const [fx, fy] = iso(kx, ky)(0, 0, S * 0.42);
    flagg(ctx, fx, fy, S * 0.16, '#f5c431');
    // Muren foran med port
    kasse(ctx, x, y, S * 0.5, S * 0.1, S * 0.17, STEIN);
    tinder(ctx, x, y, S * 0.5, S * 0.1, S * 0.17, STEIN, 6);
    poly(ctx, [p(-S * 0.06, S * 0.05, 0), p(S * 0.06, S * 0.05, 0), p(S * 0.06, S * 0.05, S * 0.08), p(0, S * 0.05, S * 0.12), p(-S * 0.06, S * 0.05, S * 0.08)], '#4a372d');
    // Hjørnetårn med spisse tak
    for (const u of [-1, 1]) {
      const [tx, ty] = p(u * S * 0.27, 0, 0);
      kasse(ctx, tx, ty, S * 0.12, S * 0.12, S * 0.28, STEIN);
      const [kx2, ky2] = iso(tx, ty)(0, 0, S * 0.28);
      kjegle(ctx, kx2, ky2 + S * 0.02, S * 0.09, S * 0.16, tak);
      poly(ctx, [...[[-0.015, 0.12], [0.015, 0.12], [0.015, 0.18], [-0.015, 0.18]].map(([a, z]) => iso(tx, ty)(a * S, S * 0.06, z * S))], '#2b2a2e');
    }
  },
};
