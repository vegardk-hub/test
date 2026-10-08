// Skolen og oppfinnelsene til Theo. Samme oppbygning som pynt.js:
// PYNT tegner det som står stille (lagres i kortet), LIV det som beveger seg
// (t = sekunder, fest = sekunder siden noen trykket på det i nærbildet).

import { poly, fasett, kasse, hus, iso, skygge, lys, mork } from './lavpoly.js';
import { FIGUR } from './palett.js';
import { tegnMenneske } from '../figurer.js';
import { spillerfarge } from './spillerfarge.js';

// ---------------------------------------------------------------------------
// Små hjelpere
// ---------------------------------------------------------------------------
function sirkel(ctx, x, y, r, farge) {
  ctx.fillStyle = farge;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
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

function ellipse(ctx, x, y, rx, ry, farge) {
  ctx.fillStyle = farge;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Punkt på en kubisk Bézier-kurve. */
function bez([x0, y0], [x1, y1], [x2, y2], [x3, y3], u) {
  const v = 1 - u;
  return [v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
    v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3];
}

/** Et lite flagg som blafrer (samme farge som taket på leiren). */
function flagg(ctx, x, y, h, t) {
  strek(ctx, [[x, y], [x, y - h]], '#5b4a3a', Math.max(1.2, h * 0.06));
  const L = h * 0.55, n = 6, topp = [], bunn = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, b = Math.sin(t * 5 - u * 4.5) * h * 0.13 * u;
    topp.push([x + L * u, y - h + b]);
    bunn.push([x + L * u * 0.98, y - h * 0.7 + b - u * h * 0.14]);
  }
  poly(ctx, [...topp, ...bunn.reverse()], spillerfarge());
}

function glitter(ctx, x, y, r, a, farge = '#fffbe6') {
  if (a <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  poly(ctx, [[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r],
    [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]], farge);
  ctx.globalAlpha = 1;
}

/** En musikknote ♪ (sirkel og stilk). */
function note(ctx, x, y, s, farge) {
  ellipse(ctx, x, y, s * 0.5, s * 0.38, farge);
  strek(ctx, [[x + s * 0.45, y], [x + s * 0.45, y - s * 1.5], [x + s * 1.05, y - s * 1.2]], farge, s * 0.22);
}

const ekstra = (fest) => 1 + 2.5 * Math.exp(-(fest ?? Infinity) * 0.8);
const REGNBUE = ['#e0393e', '#f39a2b', '#ffd23f', '#25b86a', '#3a74d8', '#5b4fc9', '#9b59d0'];
const GODTERI = ['#e0393e', '#ffd23f', '#25b86a', '#3a74d8', '#f06aa8', '#f39a2b', '#9b59d0', '#ffffff'];

// ---------------------------------------------------------------------------
// Skolen
// ---------------------------------------------------------------------------
const SKOLE_TAARN = (S) => iso(S * 0.48, S * 0.72)(0, 0, S * 0.2 + S * 0.13);

// Museet: midten av gavlen (der edelsteinen sitter) og toppen av mønet foran.
const MUSEUM_P = (S) => iso(S * 0.52, S * 0.62);
const MUSEUM_STEIN = (S) => MUSEUM_P(S)(0, S * 0.17, S * 0.271);
const MUSEUM_MONE = (S) => MUSEUM_P(S)(0, S * 0.17, S * 0.335);

const PYNT_O = {
  // Et lite tempel i lys stein med søyler, kobbertak og en edelstein i gavlen.
  museum(ctx, S) {
    const ax = S * 0.52, ay = S * 0.62, tr = S * 0.025;
    const W = S * 0.21, D = S * 0.15, h = S * 0.2, e = S * 0.035, r = S * 0.1, o = S * 0.02;
    skygge(ctx, ax + S * 0.03, ay + S * 0.12, S * 0.42, S * 0.11);
    // Trappa: to trinn
    kasse(ctx, ax, ay + tr * 2, W * 2 + S * 0.1, D * 2 + S * 0.1, tr, { topp: '#e9e2d2', venstre: '#d8cfbc', hoyre: '#b3aa98' });
    kasse(ctx, ax, ay + tr, W * 2 + S * 0.05, D * 2 + S * 0.05, tr, { topp: '#f1ebdd', venstre: '#e2d9c6', hoyre: '#bdb4a2' });
    const p = MUSEUM_P(S);
    // Høyre vegg med pilastre
    poly(ctx, [p(W, -D, 0), p(W, D, 0), p(W, D, h), p(W, -D, h)], '#c4bba8');
    for (const u of [0.2, 0.5, 0.8]) {
      const y = -D + u * 2 * D, c = S * 0.012;
      poly(ctx, [p(W, y - c, 0), p(W, y + c, 0), p(W, y + c, h), p(W, y - c, h)], '#d6cebc');
    }
    // Forsiden: en mørk søylehall med lys i døra
    poly(ctx, [p(-W, D, 0), p(W, D, 0), p(W, D, h), p(-W, D, h)], '#4a4258');
    const fr = (u, z) => p(-W + u * 2 * W, D, z);
    poly(ctx, [fr(0.4, 0), fr(0.6, 0), fr(0.6, h * 0.74), fr(0.5, h * 0.88), fr(0.4, h * 0.74)], '#ffd98a');
    for (const u of [0.06, 0.34, 0.66, 0.94]) {
      const c = 0.045;
      poly(ctx, [fr(u - c, 0), fr(u + c, 0), fr(u + c, h), fr(u - c, h)], '#f6f1e6');
      poly(ctx, [fr(u + c * 0.3, 0), fr(u + c, 0), fr(u + c, h), fr(u + c * 0.3, h)], '#dcd4c2');
      poly(ctx, [fr(u - c * 1.35, h * 0.9), fr(u + c * 1.35, h * 0.9), fr(u + c * 1.35, h), fr(u - c * 1.35, h)], '#fffaf0');
      poly(ctx, [fr(u - c * 1.35, 0), fr(u + c * 1.35, 0), fr(u + c * 1.35, h * 0.07), fr(u - c * 1.35, h * 0.07)], '#e9e2d2');
    }
    // Bjelken over søylene
    poly(ctx, [p(W + o, -D - o, h), p(W + o, D + o, h), p(W + o, D + o, h + e), p(W + o, -D - o, h + e)], '#cfc6b4');
    poly(ctx, [p(-W - o, D + o, h), p(W + o, D + o, h), p(W + o, D + o, h + e), p(-W - o, D + o, h + e)], '#fbf7ee');
    // Taket (irret kobber) og gavlen
    poly(ctx, [p(-W - o, D + o, h + e), p(-W - o, -D - o, h + e), p(0, -D - o, h + e + r), p(0, D + o, h + e + r)], '#63bfae');
    poly(ctx, [p(0, D + o, h + e + r), p(W + o, D + o, h + e), p(W + o, -D - o, h + e), p(0, -D - o, h + e + r)], '#3f9c8c');
    poly(ctx, [p(-W - o, D + o, h + e), p(W + o, D + o, h + e), p(0, D + o, h + e + r)], '#f1eadb');
    poly(ctx, [p(-W * 0.72, D + o, h + e * 1.25), p(W * 0.72, D + o, h + e * 1.25), p(0, D + o, h + e + r * 0.8)], '#ddd3bf');
    strek(ctx, [p(0, D + o, h + e + r), p(0, -D - o, h + e + r)], '#8fdccd', S * 0.012);
    // Edelsteinen i gavlen
    const [gx, gy] = MUSEUM_STEIN(S), g = S * 0.034;
    poly(ctx, [[gx - g, gy - g * 0.25], [gx - g * 0.5, gy - g * 0.8], [gx + g * 0.5, gy - g * 0.8], [gx + g, gy - g * 0.25], [gx, gy + g]], '#2fb4f0');
    poly(ctx, [[gx - g * 0.5, gy - g * 0.8], [gx + g * 0.5, gy - g * 0.8], [gx + g * 0.3, gy - g * 0.25], [gx - g * 0.3, gy - g * 0.25]], '#b8ecff');
  },

  skole(ctx, S) {
    const x = S * 0.48, y = S * 0.72;
    skygge(ctx, x + S * 0.04, y + S * 0.03, S * 0.36, S * 0.1);
    hus(ctx, x, y, S * 0.5, S * 0.3, S * 0.2, S * 0.13, { vegg: ['#c94f3d', '#9a3a2c'], tak: FIGUR.takMork, vindu: '#fff3c4' });
    // Hvite vinduskarmer langs veggen
    const p = iso(x, y), W = S * 0.25, D = S * 0.15;
    for (const u of [0.55, 0.8]) {
      const fl = (a, b) => p(-W + a * S * 0.5, D, b * S * 0.2);
      poly(ctx, [fl(u - 0.06, 0.38), fl(u + 0.06, 0.38), fl(u + 0.06, 0.72), fl(u - 0.06, 0.72)], '#fff3c4');
      strek(ctx, [fl(u, 0.38), fl(u, 0.72)], '#ffffff', S * 0.008);
    }
    // Klokketårnet midt på mønet
    const [tx, ty] = SKOLE_TAARN(S);
    kasse(ctx, tx, ty + S * 0.02, S * 0.1, S * 0.1, S * 0.08, { topp: '#efe3c8', venstre: '#e6d6b4', hoyre: '#bfae8c' });
    poly(ctx, [[tx - S * 0.075, ty - S * 0.06], [tx, ty - S * 0.15], [tx + S * 0.075, ty - S * 0.06], [tx, ty - S * 0.03]], FIGUR.takMork[0]);
    sirkel(ctx, tx - S * 0.02, ty - S * 0.005, S * 0.022, '#ffffff');
    strek(ctx, [[tx - S * 0.02, ty - S * 0.02], [tx - S * 0.02, ty - S * 0.005], [tx - S * 0.008, ty - S * 0.005]], '#2b2a2e', S * 0.006);
    // Tavle med ABC ved døra
    poly(ctx, [[S * 0.12, S * 0.9], [S * 0.12, S * 0.78], [S * 0.24, S * 0.74], [S * 0.24, S * 0.86]], '#2f4a3a');
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(S * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(S * 0.18, S * 0.82);
    ctx.transform(1, -0.33, 0, 1, 0, 0);
    ctx.fillText('ABC', 0, 0);
    ctx.restore();
    strek(ctx, [[S * 0.14, S * 0.9], [S * 0.14, S * 0.96]], '#6d4a30', S * 0.012);
    strek(ctx, [[S * 0.22, S * 0.86], [S * 0.22, S * 0.93]], '#6d4a30', S * 0.012);
  },

  // ---------------------------------------------------------------------------
  // Oppfinnelsene
  // ---------------------------------------------------------------------------
  drage(ctx, S) {
    skygge(ctx, S * 0.3, S * 0.87, S * 0.06, S * 0.02);
    strek(ctx, [[S * 0.3, S * 0.88], [S * 0.3, S * 0.76]], '#8a5a3a', S * 0.02);
    sirkel(ctx, S * 0.3, S * 0.8, S * 0.03, '#c9a26b');
  },

  boblemaskin(ctx, S) {
    const x = S * 0.42, y = S * 0.84;
    skygge(ctx, x + S * 0.03, y + S * 0.02, S * 0.18, S * 0.05);
    kasse(ctx, x, y, S * 0.2, S * 0.16, S * 0.14, { topp: '#ff9ccf', venstre: '#f06aa8', hoyre: '#c94a86' });
    const [px, py] = iso(x, y)(S * 0.1, 0, S * 0.08);
    sirkel(ctx, px + S * 0.04, py - S * 0.02, S * 0.06, '#7fd3ff');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = S * 0.012;
    ctx.beginPath(); ctx.arc(px + S * 0.04, py - S * 0.02, S * 0.045, 0, Math.PI * 2); ctx.stroke();
    for (const k of [0, 1, 2]) sirkel(ctx, ...iso(x, y)(-S * 0.04 + k * S * 0.03, S * 0.08, S * 0.07), S * 0.012, GODTERI[k + 2]);
  },

  trampoline(ctx, S) {
    const x = S * 0.5, y = S * 0.74;
    skygge(ctx, x, y + S * 0.12, S * 0.32, S * 0.06);
    for (const u of [-0.8, -0.3, 0.3, 0.8]) strek(ctx, [[x + u * S * 0.3, y + Math.abs(u) * -0.02 * S + S * 0.03], [x + u * S * 0.3, y + S * 0.13]], '#454b59', S * 0.02);
    ellipse(ctx, x, y, S * 0.34, S * 0.12, '#3a74d8');
    ellipse(ctx, x, y, S * 0.29, S * 0.095, '#22252e');
  },

  godterimaskin(ctx, S, tilf) {
    const x = S * 0.5, y = S * 0.86;
    skygge(ctx, x + S * 0.03, y, S * 0.2, S * 0.05);
    kasse(ctx, x, y, S * 0.2, S * 0.2, S * 0.2, { topp: '#ff5a5f', venstre: '#e0393e', hoyre: '#a8242b' });
    const [rx, ry] = iso(x, y)(0, S * 0.1, S * 0.08);
    poly(ctx, [[rx - S * 0.035, ry - S * 0.02], [rx + S * 0.035, ry - S * 0.02], [rx + S * 0.035, ry + S * 0.04], [rx - S * 0.035, ry + S * 0.04]], '#2b2a2e');
    sirkel(ctx, rx + S * 0.07, ry - S * 0.07, S * 0.018, '#ffd23f');
    // Glasskula med kuler i
    const gx = x, gy = S * 0.47, gr = S * 0.17;
    sirkel(ctx, gx, gy, gr, 'rgba(215, 240, 255, 0.85)');
    ctx.save();
    ctx.beginPath(); ctx.arc(gx, gy, gr * 0.96, 0, Math.PI * 2); ctx.clip();
    for (let k = 0; k < 26; k++) {
      const a = tilf.tall() * Math.PI * 2, d = Math.sqrt(tilf.tall()) * gr * 0.9;
      sirkel(ctx, gx + Math.cos(a) * d, gy + Math.abs(Math.sin(a)) * d * 0.9 + gr * 0.05, S * 0.03, GODTERI[k % GODTERI.length]);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = S * 0.014;
    ctx.beginPath(); ctx.arc(gx, gy, gr * 0.75, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ellipse(ctx, gx, gy - gr * 0.98, S * 0.06, S * 0.025, '#e0393e');
    sirkel(ctx, gx, gy - gr - S * 0.02, S * 0.025, '#e0393e');
  },

  iskiosk(ctx, S) {
    const x = S * 0.5, y = S * 0.86;
    skygge(ctx, x + S * 0.03, y + S * 0.01, S * 0.28, S * 0.06);
    kasse(ctx, x, y, S * 0.36, S * 0.24, S * 0.18, { topp: '#fbe7ef', venstre: '#ffffff', hoyre: '#e3cfd8' });
    const p = iso(x, y), W = S * 0.18, D = S * 0.12;
    // Luke og disk
    poly(ctx, [p(-W * 0.6, D, S * 0.07), p(W * 0.6, D, S * 0.07), p(W * 0.6, D, S * 0.15), p(-W * 0.6, D, S * 0.15)], '#5b3a24');
    poly(ctx, [p(-W * 0.7, D, S * 0.06), p(W * 0.7, D, S * 0.06), p(W * 0.7, D + S * 0.04, S * 0.06), p(-W * 0.7, D + S * 0.04, S * 0.06)], '#f06aa8');
    // Stripete markise
    for (let k = 0; k < 6; k++) {
      const a = -W + (2 * W * k) / 6, b = -W + (2 * W * (k + 1)) / 6;
      poly(ctx, [p(a, D, S * 0.19), p(b, D, S * 0.19), p(b, D + S * 0.07, S * 0.14), p(a, D + S * 0.07, S * 0.14)], k % 2 ? '#ffffff' : '#f06aa8');
    }
  },

  sjokoladefontene(ctx, S, tilf) {
    const x = S * 0.5, y = S * 0.82;
    skygge(ctx, x, y + S * 0.03, S * 0.36, S * 0.08);
    ellipse(ctx, x, y + S * 0.01, S * 0.34, S * 0.1, '#9aa1ae');
    ellipse(ctx, x, y, S * 0.33, S * 0.095, '#d8dde3');
    // Jordbær og marshmallows på fatet
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.3, bx = x + Math.cos(a) * S * 0.25, by = y + Math.sin(a) * S * 0.065;
      if (k % 3 === 2) { ellipse(ctx, bx, by - S * 0.01, S * 0.022, S * 0.018, '#ffffff'); continue; }
      poly(ctx, [[bx - S * 0.025, by - S * 0.02], [bx + S * 0.025, by - S * 0.02], [bx, by + S * 0.025]], '#e0393e');
      poly(ctx, [[bx - S * 0.02, by - S * 0.02], [bx, by - S * 0.035], [bx + S * 0.02, by - S * 0.02]], '#25b86a');
    }
    // Søylen og fatene i tre etasjer
    poly(ctx, [[x - S * 0.025, y], [x - S * 0.02, y - S * 0.52], [x + S * 0.02, y - S * 0.52], [x + S * 0.025, y]], '#b8c3cf');
    for (const [h, r] of [[0.14, 0.2], [0.3, 0.14], [0.44, 0.08]]) ellipse(ctx, x, y - S * h, S * r, S * r * 0.3, '#c9d3dd');
  },

  hoppeslott(ctx, S) {
    skygge(ctx, S * 0.5, S * 0.86, S * 0.4, S * 0.08);
    kasse(ctx, S * 0.86, S * 0.9, S * 0.08, S * 0.06, S * 0.06, { topp: '#9aa1ae', venstre: '#7d828d', hoyre: '#5c606a' });
    strek(ctx, [[S * 0.82, S * 0.86], [S * 0.74, S * 0.82]], '#2b2a2e', S * 0.015);
  },

  vannsklie(ctx, S) {
    // Bassenget
    ellipse(ctx, S * 0.68, S * 0.84, S * 0.24, S * 0.085, '#ffffff');
    ellipse(ctx, S * 0.68, S * 0.84, S * 0.21, S * 0.07, '#5fc3ef');
    // Tårnet med stige
    const bx = S * 0.24, by = S * 0.8, top = S * 0.36;
    for (const dx of [-0.07, 0.07]) strek(ctx, [[bx + dx * S, by], [bx + dx * S, top]], '#d0a06a', S * 0.022);
    for (let k = 1; k < 7; k++) strek(ctx, [[bx - S * 0.07, by - (by - top) * k / 7], [bx + S * 0.07, by - (by - top) * k / 7]], '#d0a06a', S * 0.012);
    poly(ctx, [[bx - S * 0.1, top], [bx + S * 0.1, top], [bx + S * 0.1, top + S * 0.025], [bx - S * 0.1, top + S * 0.025]], '#9e6d42');
    strek(ctx, [[bx - S * 0.1, top], [bx - S * 0.1, top - S * 0.06], [bx + S * 0.1, top - S * 0.06], [bx + S * 0.1, top]], '#e0393e', S * 0.012);
    // Sklia i en S-sving ned i bassenget
    const pts = [];
    for (let k = 0; k <= 30; k++) pts.push(bez(...SKLIE(S), k / 30));
    strek(ctx, pts, '#e0a020', S * 0.075);
    strek(ctx, pts, '#ffd23f', S * 0.055);
  },

  karusell(ctx, S) {
    const x = S * 0.5, y = S * 0.82;
    skygge(ctx, x, y + S * 0.04, S * 0.4, S * 0.09);
    ellipse(ctx, x, y + S * 0.025, S * 0.36, S * 0.11, '#8a5a3a');
    ellipse(ctx, x, y, S * 0.36, S * 0.11, '#e3b56a');
    ellipse(ctx, x, y, S * 0.18, S * 0.055, '#d0a06a');
  },

  regnbuemaskin(ctx, S) {
    const x = S * 0.26, y = S * 0.86;
    skygge(ctx, x + S * 0.03, y, S * 0.18, S * 0.05);
    kasse(ctx, x, y, S * 0.22, S * 0.18, S * 0.16, { topp: '#b98be8', venstre: '#9b59d0', hoyre: '#6f3aa3' });
    // Kanonen som peker opp mot høyre
    const [ox, oy] = iso(x, y)(0, 0, S * 0.16);
    poly(ctx, [[ox - S * 0.04, oy], [ox + S * 0.03, oy + S * 0.02], [ox + S * 0.12, oy - S * 0.15], [ox + S * 0.06, oy - S * 0.18]], '#c9d3dd');
    ellipse(ctx, ox + S * 0.09, oy - S * 0.165, S * 0.035, S * 0.02, '#4a4f5c');
    // Små målere
    const p = iso(x, y);
    for (const [u, f] of [[-0.06, '#ffd23f'], [0.0, '#25b86a'], [0.06, '#e0393e']]) sirkel(ctx, ...p(u * S, S * 0.09, S * 0.09), S * 0.017, f);
  },

  danserobot(ctx, S) {
    // Diskogulv
    const p = iso(S * 0.5, S * 0.8);
    const R = S * 0.09;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      poly(ctx, [p(a * R * 2 - R, b * R * 2 - R, 0), p(a * R * 2 + R, b * R * 2 - R, 0), p(a * R * 2 + R, b * R * 2 + R, 0), p(a * R * 2 - R, b * R * 2 + R, 0)],
        GODTERI[(a + 1 + (b + 1) * 3) % 7]);
    }
  },

  ufo(ctx, S) {
    // Et mystisk mønster i gresset der den har landet
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = S * 0.02;
    for (const r of [0.3, 0.2, 0.1]) { ctx.beginPath(); ctx.ellipse(S * 0.5, S * 0.82, S * r, S * r * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); }
  },
};

const SKLIE = (S) => [[S * 0.3, S * 0.37], [S * 0.75, S * 0.42], [S * 0.2, S * 0.66], [S * 0.6, S * 0.8]];

const LIV_O = {
  museum(ctx, S, t, fest) {
    const e = ekstra(fest);
    flagg(ctx, ...MUSEUM_MONE(S), S * 0.15, t);
    // Edelsteinen blinker, og det glitrer rundt inngangen.
    const [gx, gy] = MUSEUM_STEIN(S);
    glitter(ctx, gx - S * 0.012, gy - S * 0.012, S * (0.036 + 0.014 * Math.sin(t * 3 * e)), 0.6 + 0.4 * Math.sin(t * 2.2 * e));
    const [dx, dy] = MUSEUM_P(S)(0, S * 0.15, S * 0.08);
    for (let k = 0; k < 3; k++) {
      const fase = t * 1.4 * e + k * 2.1;
      glitter(ctx, dx + Math.sin(k * 5.3) * S * 0.07, dy - ((fase * 0.25) % 1) * S * 0.12, S * 0.022, Math.sin(((fase * 0.25) % 1) * Math.PI) * 0.9, '#ffe9a8');
    }
  },

  skole(ctx, S, t) {
    flagg(ctx, S * 0.84, S * 0.86, S * 0.32, t);
  },

  drage(ctx, S, t, fest) {
    const e = ekstra(fest);
    const kx = S * 0.64 + Math.sin(t * 0.9 * e) * S * 0.07, ky = S * 0.24 + Math.sin(t * 1.7 * e) * S * 0.05;
    const vri = Math.sin(t * 1.2 * e) * 0.25;
    // Snora
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(0.8, S * 0.006);
    ctx.beginPath(); ctx.moveTo(S * 0.3, S * 0.77); ctx.quadraticCurveTo(S * 0.45, S * 0.6, kx, ky + S * 0.1); ctx.stroke();
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(vri);
    const w = S * 0.09, h = S * 0.12;
    // Halen med sløyfer
    const hale = [];
    for (let k = 0; k <= 8; k++) hale.push([Math.sin(t * 4 * e - k * 0.8) * S * 0.03, h + k * S * 0.03]);
    strek(ctx, hale, '#ffffff', S * 0.008);
    for (const k of [2, 4, 6, 8]) {
      const [hx, hy] = hale[k];
      poly(ctx, [[hx - S * 0.02, hy - S * 0.012], [hx, hy], [hx - S * 0.02, hy + S * 0.012]], REGNBUE[k % 7]);
      poly(ctx, [[hx + S * 0.02, hy - S * 0.012], [hx, hy], [hx + S * 0.02, hy + S * 0.012]], REGNBUE[(k + 3) % 7]);
    }
    poly(ctx, [[0, -h], [-w, -h * 0.15], [0, 0]], spillerfarge());
    poly(ctx, [[0, -h], [w, -h * 0.15], [0, 0]], '#ffd23f');
    poly(ctx, [[-w, -h * 0.15], [0, h], [0, 0]], '#ffd23f');
    poly(ctx, [[w, -h * 0.15], [0, h], [0, 0]], spillerfarge());
    strek(ctx, [[0, -h], [0, h]], '#5b3a24', S * 0.006);
    ctx.restore();
  },

  boblemaskin(ctx, S, t, fest) {
    const e = ekstra(fest);
    const [px, py] = iso(S * 0.42, S * 0.84)(S * 0.1, 0, S * 0.08);
    const n = Math.round(7 * e);
    for (let k = 0; k < n; k++) {
      const u = (t * 0.22 * e + k / n) % 1;
      const x = px + S * 0.05 + u * S * 0.35 + Math.sin(t * 2 + k * 1.7) * S * 0.03;
      const y = py - S * 0.02 - u * S * 0.6 + Math.sin(t * 3 + k) * S * 0.01;
      const r = S * (0.035 + (k % 3) * 0.016) * (0.55 + u * 0.7);
      ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.15));
      sirkel(ctx, x, y, r, 'rgba(190, 230, 255, 0.25)');
      ctx.strokeStyle = k % 2 ? 'rgba(255, 190, 235, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = Math.max(0.7, S * 0.006);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      sirkel(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, 'rgba(255, 255, 255, 0.9)');
    }
    ctx.globalAlpha = 1;
  },

  trampoline(ctx, S, t, fest) {
    const e = ekstra(fest);
    const fase = (t * 1.1 * e) % 1;
    const hopp = Math.sin(Math.PI * fase);
    const x = S * 0.5, y = S * 0.74;
    // Duken svikter når hopperen lander
    const svikt = Math.max(0, 1 - hopp * 4) * S * 0.035;
    if (svikt > 0) ellipse(ctx, x, y + svikt * 0.4, S * 0.2, S * 0.05 + svikt * 0.4, '#15171e');
    ctx.save();
    ctx.translate(x, y + svikt - hopp * S * 0.36);
    if (fest < 3) ctx.rotate(fase * Math.PI * 2);   // salto når noen trykker
    tegnMenneske(ctx, 0, 0, S * 0.3, { farge: spillerfarge(), nr: 2, t, vink: hopp > 0.4 ? 1 : 0 });
    ctx.restore();
  },

  godterimaskin(ctx, S, t, fest) {
    const e = ekstra(fest);
    const [rx, ry] = iso(S * 0.5, S * 0.86)(0, S * 0.1, S * 0.08);
    const u = (t * 0.35 * e) % 1;
    if (u < 0.6) {
      // En godterikule triller ut av luka og spretter bortover
      const v = u / 0.6;
      const k = Math.floor(t * 0.35 * e);
      const bx = rx + v * S * 0.25, by = ry + S * 0.03 + v * S * 0.08 - Math.abs(Math.sin(v * Math.PI * 3)) * S * 0.06 * (1 - v);
      ctx.globalAlpha = 1 - Math.max(0, (v - 0.8) / 0.2);
      sirkel(ctx, bx, by, S * 0.028, GODTERI[k % GODTERI.length]);
      sirkel(ctx, bx - S * 0.008, by - S * 0.008, S * 0.008, 'rgba(255, 255, 255, 0.8)');
      ctx.globalAlpha = 1;
    }
    glitter(ctx, S * 0.42, S * 0.38, S * 0.03, Math.sin(t * 2) * 0.9);
  },

  iskiosk(ctx, S, t, fest) {
    const e = ekstra(fest);
    const [tx, ty] = iso(S * 0.5, S * 0.86)(0, 0, S * 0.18);
    ctx.save();
    ctx.translate(tx, ty - S * 0.02);
    ctx.rotate(Math.sin(t * 2 * e) * 0.08 * e);
    // Den store kjeksen
    poly(ctx, [[-S * 0.09, -S * 0.2], [S * 0.09, -S * 0.2], [0, 0]], '#e3b56a');
    poly(ctx, [[0, -S * 0.2], [S * 0.09, -S * 0.2], [0, 0]], '#c9944a');
    strek(ctx, [[-S * 0.06, -S * 0.17], [S * 0.03, -S * 0.08]], '#b07a45', S * 0.006);
    strek(ctx, [[S * 0.06, -S * 0.17], [-S * 0.03, -S * 0.08]], '#b07a45', S * 0.006);
    // Tre kuler og et kirsebær
    sirkel(ctx, -S * 0.045, -S * 0.23, S * 0.06, '#f6a6c8');
    sirkel(ctx, S * 0.05, -S * 0.23, S * 0.06, '#fff4e0');
    sirkel(ctx, 0, -S * 0.31, S * 0.06, '#7a4a2a');
    sirkel(ctx, S * 0.01, -S * 0.385, S * 0.022, '#e0393e');
    strek(ctx, [[S * 0.01, -S * 0.4], [S * 0.03, -S * 0.43]], '#3d7f2e', S * 0.006);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.3 + 0.4;
      poly(ctx, [[Math.cos(a) * S * 0.04, -S * 0.31 + Math.sin(a) * S * 0.035], [Math.cos(a) * S * 0.04 + S * 0.012, -S * 0.31 + Math.sin(a) * S * 0.035 + S * 0.004],
        [Math.cos(a) * S * 0.04, -S * 0.31 + Math.sin(a) * S * 0.035 + S * 0.008]], GODTERI[k]);
    }
    ctx.restore();
    glitter(ctx, tx + S * 0.12, ty - S * 0.3, S * 0.025, Math.sin(t * 3));
  },

  sjokoladefontene(ctx, S, t, fest) {
    const e = ekstra(fest);
    const x = S * 0.5, y = S * 0.82;
    const BRUN = '#6b3a1f', LYS = '#8a4b26';
    // Sjokoladen renner fra hvert fat ned til det under, i bølgende gardiner
    const nivaa = [[0.44, 0.08, 0.3, 0.14], [0.3, 0.14, 0.14, 0.2], [0.14, 0.2, 0.0, 0.3]];
    for (const [h0, r0, h1, r1] of nivaa) {
      const topp = [], bunn = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI * (k / 10);
        const bx = x + Math.cos(a) * S * r0 * 1.02;
        topp.push([bx, y - S * h0 + Math.sin(a) * S * r0 * 0.3]);
        const fall = S * (h0 - h1) * (0.85 + 0.08 * Math.sin(t * 4 * e + k * 1.3));
        bunn.push([x + Math.cos(a) * S * Math.min(r1, r0 * 1.25), y - S * h0 + Math.sin(a) * S * r0 * 0.3 + fall]);
      }
      poly(ctx, [...topp, ...bunn.reverse()], BRUN);
      for (let k = 1; k < 10; k += 3) {
        const [ax, ay] = topp[k];
        strek(ctx, [[ax, ay], [ax + Math.sin(t * 3 + k) * S * 0.005, ay + S * (h0 - h1) * 0.7]], LYS, S * 0.01);
      }
      ellipse(ctx, x, y - S * h0, S * r0, S * r0 * 0.3, LYS);
    }
    // Boblende topp
    const b = 1 + Math.sin(t * 6 * e) * 0.15;
    ellipse(ctx, x, y - S * 0.55, S * 0.035 * b, S * 0.03 * b, LYS);
    ellipse(ctx, x, y - S * 0.6 - Math.abs(Math.sin(t * 6 * e)) * S * 0.03, S * 0.02, S * 0.02, BRUN);
  },

  hoppeslott(ctx, S, t, fest) {
    const e = ekstra(fest);
    const klem = Math.sin(t * 5 * e) * 0.035 * e;
    ctx.save();
    ctx.translate(S * 0.5, S * 0.85);
    ctx.scale(1 + klem, 1 - klem);
    const o = (x, y) => [x * S, -y * S];
    // Bakvegg og tårn
    const blaa = ['#3a74d8', '#2a5aaf'], gul = ['#ffd23f', '#e0a020'], rod = ['#e0393e', '#a8242b'];
    for (const [tx, h] of [[-0.3, 0.5], [0.3, 0.5], [-0.12, 0.42], [0.12, 0.42]]) {
      poly(ctx, [o(tx - 0.07, 0.1), o(tx + 0.07, 0.1), o(tx + 0.065, h), o(tx - 0.065, h)], blaa[tx > 0 ? 1 : 0]);
      sirkel(ctx, ...o(tx, h + 0.04), S * 0.07, gul[0]);
      sirkel(ctx, ...o(tx - 0.02, h + 0.06), S * 0.025, '#fff4c2');
    }
    poly(ctx, [o(-0.24, 0.1), o(0.24, 0.1), o(0.24, 0.34), o(-0.24, 0.34)], gul[1]);
    for (let k = 0; k < 4; k++) sirkel(ctx, ...o(-0.18 + k * 0.12, 0.36), S * 0.045, gul[0]);
    // Et barn som hopper inni
    const hopp = Math.abs(Math.sin(t * 4 * e));
    tegnMenneske(ctx, 0, -S * (0.12 + hopp * 0.22), S * 0.22, { farge: spillerfarge(), nr: 3, t, vink: hopp > 0.5 ? 1 : 0 });
    // Den oppblåste kanten foran
    poly(ctx, [o(-0.4, 0), o(0.4, 0), o(0.38, 0.14), o(-0.38, 0.14)], rod[0]);
    poly(ctx, [o(0.05, 0), o(0.4, 0), o(0.38, 0.14), o(0.05, 0.14)], rod[1]);
    for (let k = 0; k < 5; k++) sirkel(ctx, ...o(-0.32 + k * 0.16, 0.14), S * 0.05, rod[0]);
    poly(ctx, [o(-0.08, 0), o(0.08, 0), o(0.08, 0.1), o(-0.08, 0.1)], '#ffd23f');
    ctx.restore();
  },

  vannsklie(ctx, S, t, fest) {
    const e = ekstra(fest);
    const kurve = SKLIE(S);
    const pts = [];
    for (let k = 0; k <= 30; k++) pts.push(bez(...kurve, k / 30));
    // Vann som renner nedover sklia
    ctx.save();
    ctx.setLineDash([S * 0.03, S * 0.05]);
    ctx.lineDashOffset = -t * S * 0.4 * e;
    strek(ctx, pts, 'rgba(160, 225, 255, 0.95)', S * 0.018);
    ctx.restore();
    // Et barn som sklir ned, plask, og ringer i vannet
    const fase = (t * 0.32 * e) % 1;
    if (fase < 0.55) {
      const u = fase / 0.55;
      const [x, y] = bez(...kurve, u * u);
      tegnMenneske(ctx, x, y + S * 0.02, S * 0.2, { farge: spillerfarge(), nr: 4, t, vink: 1 });
    } else {
      const u = (fase - 0.55) / 0.45;
      for (let k = 0; k < 8; k++) {
        const a = Math.PI + (k / 7) * Math.PI;
        const r = S * 0.12 * u;
        ctx.globalAlpha = 1 - u;
        sirkel(ctx, S * 0.6 + Math.cos(a) * r, S * 0.8 + Math.sin(a) * r * 1.3 + u * u * S * 0.1, S * 0.012, '#d8f0ff');
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = S * 0.008;
      ctx.beginPath(); ctx.ellipse(S * 0.62, S * 0.83, S * 0.05 + u * S * 0.12, S * 0.015 + u * S * 0.04, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  karusell(ctx, S, t, fest) {
    const e = ekstra(fest);
    const x = S * 0.5, y = S * 0.8, tak = S * 0.3;
    const hester = [];
    for (let k = 0; k < 6; k++) {
      const a = t * 0.9 * e + (k / 6) * Math.PI * 2;
      hester.push({ k, a, x: x + Math.cos(a) * S * 0.27, y: y + Math.sin(a) * S * 0.075, opp: Math.sin(t * 3 * e + k) * S * 0.03 });
    }
    const hest = (h) => {
      const hy = h.y - S * 0.17 + h.opp;
      strek(ctx, [[h.x, tak + S * 0.04], [h.x, h.y]], '#e0b13a', S * 0.01);
      const mot = Math.sin(h.a) > 0 ? -1 : 1;   // de rir rundt
      ctx.save();
      ctx.translate(h.x, hy);
      ctx.scale(mot, 1);
      const f = GODTERI[h.k];
      ellipse(ctx, 0, 0, S * 0.06, S * 0.03, f);
      poly(ctx, [[S * 0.04, -S * 0.01], [S * 0.07, -S * 0.06], [S * 0.09, -S * 0.05], [S * 0.06, 0]], f);
      strek(ctx, [[-S * 0.035, S * 0.02], [-S * 0.04, S * 0.05]], mork(f, 0.3), S * 0.012);
      strek(ctx, [[S * 0.035, S * 0.02], [S * 0.045, S * 0.05]], mork(f, 0.3), S * 0.012);
      strek(ctx, [[-S * 0.06, -S * 0.005], [-S * 0.08, S * 0.02]], '#5b3a24', S * 0.012);
      ctx.restore();
    };
    hester.filter((h) => Math.sin(h.a) < 0).forEach(hest);
    strek(ctx, [[x, y], [x, tak]], '#e0b13a', S * 0.03);
    hester.filter((h) => Math.sin(h.a) >= 0).forEach(hest);
    // Stripete tak
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI, a1 = ((k + 1) / 10) * Math.PI;
      poly(ctx, [[x, tak - S * 0.16], [x + Math.cos(a0) * S * 0.36, tak + Math.sin(a0) * S * 0.08 + S * 0.03],
        [x + Math.cos(a1) * S * 0.36, tak + Math.sin(a1) * S * 0.08 + S * 0.03]], k % 2 ? '#ffffff' : spillerfarge());
    }
    for (let k = 0; k < 10; k++) {
      const a = ((k + 0.5) / 10) * Math.PI;
      sirkel(ctx, x + Math.cos(a) * S * 0.36, tak + Math.sin(a) * S * 0.08 + S * 0.045, S * 0.012, (k + Math.floor(t * 4)) % 2 ? '#fff4c2' : '#ffd23f');
    }
    flagg(ctx, x, tak - S * 0.15, S * 0.14, t);
  },

  regnbuemaskin(ctx, S, t, fest) {
    const e = ekstra(fest);
    const [ox, oy] = iso(S * 0.26, S * 0.86)(0, 0, S * 0.16);
    const mx = ox + S * 0.09, my = oy - S * 0.17;
    const syklus = (t * 0.28 * e) % 1.3;
    const vekst = Math.min(1, syklus / 0.5), bort = Math.max(0, (syklus - 1) / 0.3);
    const cx = mx + S * 0.28, cy = my + S * 0.32, R = S * 0.3, bw = S * 0.018;
    ctx.globalAlpha = 1 - bort;
    REGNBUE.forEach((f, k) => {
      ctx.strokeStyle = f;
      ctx.lineWidth = bw * 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, R - k * bw, Math.PI * 1.1, Math.PI * (1.1 + 0.95 * vekst));
      ctx.stroke();
    });
    for (let k = 0; k < 4; k++) glitter(ctx, cx + Math.cos(Math.PI * (1.2 + k * 0.22)) * (R + S * 0.04), cy + Math.sin(Math.PI * (1.2 + k * 0.22)) * (R + S * 0.04), S * 0.02, Math.sin(t * 4 + k) * vekst);
    ctx.globalAlpha = 1;
    // En liten sky der regnbuen lander
    if (vekst >= 1) {
      const sx = cx + Math.cos(Math.PI * 2.05) * R, sy = cy + Math.sin(Math.PI * 2.05) * R;
      for (const [dx, dy, r] of [[0, 0, 0.04], [0.035, 0.01, 0.03], [-0.035, 0.012, 0.03]]) {
        ctx.globalAlpha = 0.9 * (1 - bort);
        sirkel(ctx, sx + dx * S, sy + dy * S, r * S, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
    // Lys som blinker på maskinen
    sirkel(ctx, ...iso(S * 0.26, S * 0.86)(S * 0.02, S * 0.09, S * 0.13), S * 0.014, Math.sin(t * 8) > 0 ? '#ffffff' : '#ff5a5f');
  },

  danserobot(ctx, S, t, fest) {
    const e = ekstra(fest);
    // Gulvet blinker
    const p = iso(S * 0.5, S * 0.8), R = S * 0.09, blink = Math.floor(t * 3 * e);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if ((a + b + blink) % 2 === 0) continue;
      ctx.globalAlpha = 0.45;
      poly(ctx, [p(a * R * 2 - R, b * R * 2 - R, 0), p(a * R * 2 + R, b * R * 2 - R, 0), p(a * R * 2 + R, b * R * 2 + R, 0), p(a * R * 2 - R, b * R * 2 + R, 0)], '#ffffff');
    }
    ctx.globalAlpha = 1;
    const takt = t * 4 * e;
    const hopp = Math.abs(Math.sin(takt)) * S * 0.04;
    const x = S * 0.5 + Math.sin(takt * 0.5) * S * 0.04, y = S * 0.78 - hopp;
    const MET = ['#d8dde3', '#9aa1ae'];
    // Bein
    strek(ctx, [[x - S * 0.04, y - S * 0.12], [x - S * 0.05 - Math.sin(takt) * S * 0.02, y]], '#7d828d', S * 0.03);
    strek(ctx, [[x + S * 0.04, y - S * 0.12], [x + S * 0.05 - Math.sin(takt) * S * 0.02, y]], '#7d828d', S * 0.03);
    // Armer som danser
    const arm = (side, v) => {
      const sx = x + side * S * 0.09, sy = y - S * 0.27;
      const ex = sx + side * Math.cos(v) * S * 0.1, ey = sy - Math.sin(v) * S * 0.1;
      strek(ctx, [[sx, sy], [ex, ey]], '#7d828d', S * 0.025);
      sirkel(ctx, ex, ey, S * 0.022, MET[0]);
    };
    arm(-1, Math.sin(takt) * 1.2 + 0.3);
    arm(1, -Math.sin(takt) * 1.2 + 0.3);
    // Kropp med lys
    poly(ctx, [[x - S * 0.09, y - S * 0.12], [x + S * 0.09, y - S * 0.12], [x + S * 0.09, y - S * 0.32], [x - S * 0.09, y - S * 0.32]], MET[0]);
    poly(ctx, [[x + S * 0.02, y - S * 0.12], [x + S * 0.09, y - S * 0.12], [x + S * 0.09, y - S * 0.32], [x + S * 0.02, y - S * 0.32]], MET[1]);
    for (let k = 0; k < 3; k++) sirkel(ctx, x - S * 0.045 + k * S * 0.045, y - S * 0.2, S * 0.015, (k + blink) % 3 === 0 ? '#25b86a' : (k + blink) % 3 === 1 ? '#ffd23f' : '#e0393e');
    // Hode
    ctx.save();
    ctx.translate(x, y - S * 0.33);
    ctx.rotate(Math.sin(takt * 0.5) * 0.2);
    poly(ctx, [[-S * 0.07, 0], [S * 0.07, 0], [S * 0.07, -S * 0.11], [-S * 0.07, -S * 0.11]], MET[0]);
    sirkel(ctx, -S * 0.03, -S * 0.06, S * 0.018, '#3fe0ff');
    sirkel(ctx, S * 0.03, -S * 0.06, S * 0.018, '#3fe0ff');
    strek(ctx, [[-S * 0.025, -S * 0.025], [S * 0.025, -S * 0.025]], '#4a4f5c', S * 0.008);
    strek(ctx, [[0, -S * 0.11], [0, -S * 0.16]], '#7d828d', S * 0.01);
    sirkel(ctx, 0, -S * 0.17, S * 0.018, Math.sin(t * 6) > 0 ? '#ff3b3b' : '#ffb3b3');
    ctx.restore();
    // Noter som svever opp
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.4 * e + k / 3) % 1;
      ctx.globalAlpha = Math.sin(Math.PI * u);
      note(ctx, S * (0.25 + k * 0.25) + Math.sin(t * 2 + k) * S * 0.03, S * 0.5 - u * S * 0.35, S * 0.025, REGNBUE[(k * 2 + blink) % 7]);
    }
    ctx.globalAlpha = 1;
  },

  ufo(ctx, S, t, fest) {
    const e = ekstra(fest);
    const x = S * 0.5 + Math.sin(t * 0.7 * e) * S * 0.04, y = S * 0.28 + Math.sin(t * 1.5 * e) * S * 0.025;
    // Lysstrålen ned til bakken
    ctx.fillStyle = 'rgba(255, 245, 170, 0.28)';
    ctx.beginPath(); ctx.moveTo(x - S * 0.07, y + S * 0.04); ctx.lineTo(x + S * 0.07, y + S * 0.04); ctx.lineTo(x + S * 0.18, S * 0.84); ctx.lineTo(x - S * 0.18, S * 0.84); ctx.closePath(); ctx.fill();
    // Ei ku som svever opp og ned i strålen
    const ku = S * 0.82 - (0.5 - 0.5 * Math.cos(t * 0.8 * e)) * S * 0.3;
    ctx.save();
    ctx.translate(x, ku);
    ctx.rotate(Math.sin(t * 1.3) * 0.25);
    ellipse(ctx, 0, -S * 0.05, S * 0.07, S * 0.04, '#ffffff');
    ellipse(ctx, -S * 0.02, -S * 0.06, S * 0.02, S * 0.015, '#2b2a2e');
    ellipse(ctx, S * 0.03, -S * 0.04, S * 0.015, S * 0.012, '#2b2a2e');
    ellipse(ctx, S * 0.075, -S * 0.07, S * 0.025, S * 0.02, '#ffffff');
    ellipse(ctx, S * 0.09, -S * 0.065, S * 0.012, S * 0.01, '#f6a6c8');
    for (const dx of [-0.045, -0.015, 0.02, 0.045]) strek(ctx, [[dx * S, -S * 0.02], [dx * S, S * 0.01]], '#ffffff', S * 0.012);
    ctx.restore();
    // Tallerkenen med glasskuppel og en liten grønn romvesen
    ellipse(ctx, x, y - S * 0.03, S * 0.08, S * 0.07, 'rgba(170, 235, 255, 0.75)');
    sirkel(ctx, x, y - S * 0.04, S * 0.03, '#7bd657');
    sirkel(ctx, x - S * 0.012, y - S * 0.045, S * 0.008, '#1b1b1b');
    sirkel(ctx, x + S * 0.012, y - S * 0.045, S * 0.008, '#1b1b1b');
    strek(ctx, [[x, y - S * 0.07], [x + S * 0.01, y - S * 0.09]], '#7bd657', S * 0.006);
    ellipse(ctx, x, y + S * 0.015, S * 0.2, S * 0.05, '#5c606a');
    ellipse(ctx, x, y, S * 0.2, S * 0.045, '#c9d3dd');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + t * 2 * e;
      if (Math.sin(a) < -0.2) continue;
      sirkel(ctx, x + Math.cos(a) * S * 0.16, y + Math.sin(a) * S * 0.03 + S * 0.005, S * 0.014, REGNBUE[(k + Math.floor(t * 5)) % 7]);
    }
  },
};

export { PYNT_O, LIV_O };
