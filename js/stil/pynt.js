// De 20 byggene man kan kjøpe og sette ut på øya, tegnet i samme low-poly-stil
// som resten av brettet. Hver funksjon tegner i en rute på S × S piksler; bakken
// (kortet) er allerede tegnet. Lyset kommer fra øvre venstre.
//
// PYNT tegner det som står stille (det lagres i kortet). LIV tegner det som beveger
// seg (flagg, røyk, vinger, vann, ballongen …) oppå kortet hver gang skjermen
// tegnes: LIV[id](ctx, S, t, fest), der t = sekunder og fest = sekunder siden noen
// trykket på bygget i nærbildet (Infinity hvis aldri).

import { FIGUR } from './palett.js';
import { poly, fasett, kasse, hus, iso, skygge, lys, mork, stein } from './lavpoly.js';
import { settLag } from './neon.js';
import { spillerfarge } from './spillerfarge.js';
import { PYNT_O, LIV_O } from './oppfinnelser.js';

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

/** Et flagg som blafrer i vinden. */
function flagg(ctx, x, y, h, farge, t, fase = 0) {
  strek(ctx, [[x, y], [x, y - h]], '#5b4a3a', Math.max(1.2, h * 0.06));
  const L = h * 0.55, n = 6;
  const topp = [], bunn = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const bolge = Math.sin(t * 5 + fase - u * 4.5) * h * 0.13 * u;
    topp.push([x + L * u, y - h + bolge]);
    bunn.push([x + L * u * 0.98, y - h * 0.7 + bolge - u * h * 0.14]);
  }
  poly(ctx, [...topp, ...bunn.reverse()], farge);
}

/** Røykdotter som stiger fra (x, y). */
function royk(ctx, x, y, S, t, { antall = 4, farge = '230, 230, 235', fart = 0.35 } = {}) {
  for (let k = 0; k < antall; k++) {
    const u = (t * fart + k / antall) % 1;
    ctx.globalAlpha = 0.55 * (1 - u);
    sirkel(ctx, x + Math.sin(u * 5 + k) * S * 0.02 + u * S * 0.08, y - u * S * 0.3, S * (0.02 + u * 0.05), `rgb(${farge})`);
  }
  ctx.globalAlpha = 1;
}

/** Snøfnugg som daler ned over kortet. */
function sno(ctx, S, t, antall = 7) {
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < antall; k++) {
    const u = (t * 0.12 + k * 0.37) % 1;
    const x = S * ((k * 0.29 + 0.1) % 1) + Math.sin(t * 1.3 + k) * S * 0.03;
    ctx.globalAlpha = 0.85 * Math.sin(Math.PI * u);
    ctx.beginPath(); ctx.arc(x, S * (0.05 + u * 0.85), S * 0.011, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** En liten fugl (V-form) som flakser. */
function fugl(ctx, x, y, s, t, farge = '#2b2a2e') {
  const v = Math.sin(t * 14) * s * 0.5;
  strek(ctx, [[x - s, y - v], [x, y + s * 0.2], [x + s, y - v]], farge, Math.max(1, s * 0.25));
}

/** Et lite glitter (firkantet stjerne). */
function glitter(ctx, x, y, r, a) {
  ctx.globalAlpha = a;
  poly(ctx, [[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]], '#fffbe6');
  ctx.globalAlpha = 1;
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

/** Ekstra fart en stund etter at noen har trykket på bygget. */
const ivrig = (fest) => 1 + 3 * Math.exp(-(fest ?? Infinity) * 0.8);

// Felles mål, så den faste og den levende delen passer sammen.
const BORG_KJERNE = (S) => iso(S * 0.5, S * 0.8)(-S * 0.04, -S * 0.12, 0);
const HYTTE_PIPE = (S) => iso(S * 0.5, S * 0.66)(-S * 0.2 * 0.45, -S * 0.15 * 0.3, S * 0.18 + S * 0.16 * 1.05);

// ---------------------------------------------------------------------------
// Det som står stille
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Havna og seilbåten (låses opp når alle de 20 byggene står på øya)
// ---------------------------------------------------------------------------
const HAV = ['#4b93bd', '#3f80aa', '#8cc6e4'];   // vann, mørkere vann, skum
const BRYGGE = ['#b08458', '#7f5a38', '#5b3f27'];

/** Sjøen nederst til høyre på kortet, med skum langs strandkanten. */
function havkant(ctx, S) {
  const kyst = [[0, S * 0.66], [S * 0.3, S * 0.6], [S * 0.62, S * 0.5], [S, S * 0.38]];
  // På neonøya er sjøen mørk bakke med lysende strandkant, som vannrutene.
  settLag('bakke');
  poly(ctx, [...kyst, [S, S], [0, S]], HAV[0]);
  poly(ctx, [[0, S * 0.84], [S * 0.5, S * 0.76], [S, S * 0.66], [S, S], [0, S]], HAV[1]);
  settLag('kant');
  strek(ctx, kyst, HAV[2], S * 0.018);
  settLag('figur');
}

/** Brygga: planker på stolper, fra land og ut i vannet. */
function brygge(ctx, S) {
  const a = [S * 0.3, S * 0.56], b = [S * 0.58, S * 0.84], br = S * 0.07;
  for (let k = 0; k <= 3; k++) {
    const u = k / 3, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    for (const side of [-1, 1]) {
      ctx.fillStyle = BRYGGE[2];
      ctx.fillRect(x + side * br * 0.8 - S * 0.008, y - side * br * 0.3, S * 0.016, S * 0.07);
    }
  }
  poly(ctx, [[a[0] - br, a[1] + br * 0.4], [a[0] + br, a[1] - br * 0.4], [b[0] + br, b[1] - br * 0.4], [b[0] - br, b[1] + br * 0.4]], BRYGGE[0]);
  poly(ctx, [[b[0] - br, b[1] + br * 0.4], [b[0] + br, b[1] - br * 0.4], [b[0] + br, b[1] - br * 0.4 + S * 0.02], [b[0] - br, b[1] + br * 0.4 + S * 0.02]], BRYGGE[1]);
  ctx.strokeStyle = BRYGGE[1];
  ctx.lineWidth = Math.max(0.6, S * 0.004);
  for (let k = 1; k < 9; k++) {
    const u = k / 9, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    ctx.beginPath(); ctx.moveTo(x - br, y + br * 0.4); ctx.lineTo(x + br, y - br * 0.4); ctx.stroke();
  }
  // Pullerter
  for (const u of [0.45, 0.95]) {
    const x = a[0] + (b[0] - a[0]) * u + br * 0.75, y = a[1] + (b[1] - a[1]) * u - br * 0.3;
    poly(ctx, [[x - S * 0.012, y], [x - S * 0.012, y - S * 0.025], [x + S * 0.012, y - S * 0.025], [x + S * 0.012, y]], '#2f3440');
    sirkel(ctx, x, y - S * 0.025, S * 0.013, '#454b59');
  }
}

/** Seilbåten ved brygga. vugg = helning, opp = hvor mye den løftes av bølgene. */
function seilbaat(ctx, S, vugg = 0, opp = 0) {
  const x = S * 0.76, y = S * 0.8 - opp;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vugg);
  skygge(ctx, 0, S * 0.03, S * 0.17, S * 0.03, 0.18);
  // Skroget
  poly(ctx, [[-S * 0.18, -S * 0.05], [S * 0.19, -S * 0.07], [S * 0.13, S * 0.03], [-S * 0.13, S * 0.035]], '#f4f1e8');
  poly(ctx, [[-S * 0.165, -S * 0.015], [S * 0.17, -S * 0.03], [S * 0.13, S * 0.03], [-S * 0.13, S * 0.035]], '#c0392b');
  poly(ctx, [[-S * 0.18, -S * 0.05], [S * 0.19, -S * 0.07], [S * 0.17, -S * 0.085], [-S * 0.16, -S * 0.065]], '#9e6d42');
  // Masta og seilene
  strek(ctx, [[-S * 0.01, -S * 0.06], [-S * 0.01, -S * 0.5]], '#5b3a24', Math.max(1.2, S * 0.012));
  poly(ctx, [[-S * 0.005, -S * 0.48], [S * 0.16, -S * 0.1], [-S * 0.005, -S * 0.09]], '#ffffff');
  poly(ctx, [[-S * 0.005, -S * 0.48], [S * 0.06, -S * 0.1], [-S * 0.005, -S * 0.09]], '#e6e2d6');
  poly(ctx, [[-S * 0.015, -S * 0.44], [-S * 0.015, -S * 0.11], [-S * 0.15, -S * 0.1]], '#f3d77a');
  ctx.restore();
}

export const PYNT = {
  baal(ctx, S, tilf) {
    const x = S * 0.5, y = S * 0.7;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      stein(ctx, tilf, x + Math.cos(a) * S * 0.17, y + Math.sin(a) * S * 0.08, S * 0.035, FIGUR.stein);
    }
    poly(ctx, [[x - S * 0.13, y + S * 0.03], [x + S * 0.1, y - S * 0.05], [x + S * 0.12, y - S * 0.02], [x - S * 0.11, y + S * 0.06]], '#7a5236');
    poly(ctx, [[x - S * 0.1, y - S * 0.05], [x + S * 0.13, y + S * 0.03], [x + S * 0.11, y + S * 0.06], [x - S * 0.12, y - S * 0.02]], '#6a4428');
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
    const [bx, by] = p(-W, 0, H);
    strek(ctx, [[bx, by], [bx, by - S * 0.04]], '#5b4a3a', S * 0.012);
  },

  snomann(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.03, S * 0.86, S * 0.18, S * 0.05);
    strek(ctx, [[x - S * 0.1, S * 0.5], [x - S * 0.25, S * 0.4], [x - S * 0.29, S * 0.35]], '#6a4428', S * 0.018);
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
    poly(ctx, [[x - r * 1.05, y - r * 1.8], [x, y - r * 2.45], [x + r * 1.05, y - r * 1.8]], FIGUR.takRod[0]);
    poly(ctx, [[x, y - r * 2.45], [x + r * 1.05, y - r * 1.8], [x + r * 0.5, y - r * 1.8]], FIGUR.takRod[1]);
  },

  sopphus(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.03, S * 0.84, S * 0.22, S * 0.06);
    poly(ctx, [[x - S * 0.15, S * 0.84], [x - S * 0.12, S * 0.46], [x + S * 0.12, S * 0.46], [x + S * 0.15, S * 0.84]], '#f3e6c8');
    poly(ctx, [[x + S * 0.03, S * 0.84], [x + S * 0.03, S * 0.46], [x + S * 0.12, S * 0.46], [x + S * 0.15, S * 0.84]], '#d8c8a6');
    poly(ctx, [[x - S * 0.07, S * 0.84], [x - S * 0.07, S * 0.7], [x - S * 0.035, S * 0.66], [x, S * 0.7], [x, S * 0.84]], '#7a4a2a');
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
    poly(ctx, [[x - S * 0.03, y], [x - S * 0.025, y - S * 0.25], [x + S * 0.025, y - S * 0.25], [x + S * 0.03, y]], '#b5b8c0');
    ctx.fillStyle = '#c2c5cc';
    ctx.beginPath(); ctx.ellipse(x, y - S * 0.25, S * 0.1, S * 0.035, 0, 0, Math.PI * 2); ctx.fill();
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
  },

  luftballong(ctx, S) {
    const x = S * 0.5;
    skygge(ctx, x + S * 0.05, S * 0.88, S * 0.16, S * 0.04, 0.15);
    kasse(ctx, x + S * 0.12, S * 0.88, S * 0.025, S * 0.025, S * 0.03, { topp: '#8a5c38', venstre: '#7a5236', hoyre: '#5e3f28' });
  },

  taarn(ctx, S) {
    const x = S * 0.5, y = S * 0.82, w = S * 0.24, h = S * 0.48;
    const p = iso(x, y);
    skygge(ctx, x + S * 0.04, y + S * 0.03, S * 0.26, S * 0.08);
    kasse(ctx, x, y, w, w, h, STEIN);
    for (let k = 0; k < 6; k++) {
      const u = ((k * 37) % 10) / 10 - 0.45, z = 0.1 + k * 0.14;
      poly(ctx, [p(u * w, w / 2, z * h), p(u * w + w * 0.18, w / 2, z * h), p(u * w + w * 0.18, w / 2, z * h + h * 0.05), p(u * w, w / 2, z * h + h * 0.05)], '#989ca7');
    }
    poly(ctx, [p(-w * 0.12, w / 2, 0), p(w * 0.12, w / 2, 0), p(w * 0.12, w / 2, h * 0.2), p(0, w / 2, h * 0.25), p(-w * 0.12, w / 2, h * 0.2)], '#4a372d');
    poly(ctx, [p(-w * 0.04, w / 2, h * 0.55), p(w * 0.04, w / 2, h * 0.55), p(w * 0.04, w / 2, h * 0.72), p(-w * 0.04, w / 2, h * 0.72)], '#2b2a2e');
    tinder(ctx, x, y, w, w, h, STEIN, 3);
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
    poly(ctx, [[x - S * 0.1, topp], [x + S * 0.1, topp], [x + S * 0.1, topp - S * 0.02], [x - S * 0.1, topp - S * 0.02]], '#2b2a2e');
    poly(ctx, [[x - S * 0.055, topp - S * 0.02], [x + S * 0.055, topp - S * 0.02], [x + S * 0.055, topp - S * 0.1], [x - S * 0.055, topp - S * 0.1]], '#ffe58a');
    kjegle(ctx, x, topp - S * 0.1, S * 0.075, S * 0.08, ['#c0392b', '#8e2a20']);
  },

  pariserhjul(ctx, S) {
    const x = S * 0.5, nav = [x, S * 0.42];
    skygge(ctx, x, S * 0.88, S * 0.28, S * 0.05);
    for (const dx of [-0.2, 0.2]) strek(ctx, [[x + S * dx, S * 0.88], nav], '#6b7189', S * 0.022);
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
    kasse(ctx, S * 0.5, S * 0.8, S * 0.36, S * 0.36, S * 0.04, { topp: '#9aa1ae', venstre: '#7d7f8a', hoyre: '#5d5f6b' });
    // Tårnet ved siden av
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = Math.max(1, S * 0.01);
    for (const dx of [0.2, 0.28]) { ctx.beginPath(); ctx.moveTo(S * (0.5 + dx), S * 0.84); ctx.lineTo(S * (0.5 + dx), S * 0.3); ctx.stroke(); }
    for (let k = 0; k < 7; k++) {
      const y0 = S * (0.84 - k * 0.08);
      ctx.beginPath(); ctx.moveTo(S * 0.7, y0); ctx.lineTo(S * 0.78, y0 - S * 0.08); ctx.stroke();
    }
  },

  havn(ctx, S) {
    havkant(ctx, S);
    // Naustet på land, med kasser og en tønne ved brygga
    hus(ctx, S * 0.27, S * 0.44, S * 0.26, S * 0.2, S * 0.13, S * 0.08, { vegg: FIGUR.treVegg, tak: FIGUR.takRod });
    brygge(ctx, S);
    const p = iso(S * 0.5, S * 0.5);
    kasse(ctx, ...p(-S * 0.02, -S * 0.1, 0), S * 0.07, S * 0.07, S * 0.06, { topp: '#d0a06a', venstre: '#b08458', hoyre: '#7f5a38' });
    kasse(ctx, ...p(-S * 0.02, -S * 0.1, S * 0.06), S * 0.05, S * 0.05, S * 0.045, { topp: '#e2c25a', venstre: '#c9a23f', hoyre: '#9e7c2a' });
  },

  havnbaat(ctx, S, tilf) {
    PYNT.havn(ctx, S, tilf);
  },

  borg(ctx, S) {
    const x = S * 0.5, y = S * 0.8;
    const p = iso(x, y);
    skygge(ctx, x + S * 0.04, y + S * 0.03, S * 0.42, S * 0.11);
    const tak = ['#3a74d8', '#2a5299'];
    const [kx, ky] = BORG_KJERNE(S);
    kasse(ctx, kx, ky, S * 0.18, S * 0.18, S * 0.42, STEIN);
    tinder(ctx, kx, ky, S * 0.18, S * 0.18, S * 0.42, STEIN, 3);
    kasse(ctx, x, y, S * 0.5, S * 0.1, S * 0.17, STEIN);
    tinder(ctx, x, y, S * 0.5, S * 0.1, S * 0.17, STEIN, 6);
    poly(ctx, [p(-S * 0.06, S * 0.05, 0), p(S * 0.06, S * 0.05, 0), p(S * 0.06, S * 0.05, S * 0.08), p(0, S * 0.05, S * 0.12), p(-S * 0.06, S * 0.05, S * 0.08)], '#4a372d');
    for (const u of [-1, 1]) {
      const [tx, ty] = p(u * S * 0.27, 0, 0);
      kasse(ctx, tx, ty, S * 0.12, S * 0.12, S * 0.28, STEIN);
      const [kx2, ky2] = iso(tx, ty)(0, 0, S * 0.28);
      kjegle(ctx, kx2, ky2 + S * 0.02, S * 0.09, S * 0.16, tak);
      poly(ctx, [...[[-0.015, 0.12], [0.015, 0.12], [0.015, 0.18], [-0.015, 0.18]].map(([a, z]) => iso(tx, ty)(a * S, S * 0.06, z * S))], '#2b2a2e');
    }
  },
};

// ---------------------------------------------------------------------------
// Det som beveger seg
// ---------------------------------------------------------------------------
export const LIV = {
  baal(ctx, S, t, fest) {
    const x = S * 0.5, y = S * 0.7;
    const stor = 1 + 0.6 * Math.exp(-(fest ?? Infinity) * 1.5);
    const puls = 0.85 + 0.15 * Math.sin(t * 7) + 0.08 * Math.sin(t * 13);
    const g = ctx.createRadialGradient(x, y - S * 0.08, 0, x, y - S * 0.08, S * 0.34 * stor);
    g.addColorStop(0, `rgba(255, 200, 90, ${0.42 * puls})`);
    g.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // Flammene skifter form hele tiden
    const tunge = (dx, h, b, farge, fase) => {
      const top = y - S * h * stor * (0.85 + 0.2 * Math.sin(t * 9 + fase));
      const svai = Math.sin(t * 5 + fase) * S * 0.025;
      poly(ctx, [[x + S * (dx - b), y], [x + S * dx + svai, top], [x + S * (dx + b), y]], farge);
    };
    tunge(-0.04, 0.2, 0.06, FIGUR.flamme[1], 0);
    tunge(0.04, 0.24, 0.06, FIGUR.flamme[1], 2);
    tunge(0, 0.15, 0.045, FIGUR.flamme[0], 4);
    // Gnister som stiger
    const antall = fest < 2 ? 10 : 5;
    for (let k = 0; k < antall; k++) {
      const u = (t * 0.7 + k / antall) % 1;
      ctx.globalAlpha = 1 - u;
      sirkel(ctx, x + Math.sin(k * 3.1 + u * 6) * S * 0.06, y - S * 0.1 - u * S * 0.4, S * 0.01, '#ffcf5a');
    }
    ctx.globalAlpha = 1;
  },

  telt(ctx, S, t) {
    const [tx, ty] = iso(S * 0.5, S * 0.68)(S * 0.24, 0, S * 0.3);
    flagg(ctx, tx, ty, S * 0.13, spillerfarge(), t);
  },

  snomann(ctx, S, t, fest) {
    // Den høyre armen vinker – ivrig rett etter et trykk.
    const x = S * 0.5;
    const vink = Math.sin(t * (fest < 2 ? 10 : 3)) * (fest < 2 ? 0.5 : 0.25);
    const skulder = [x + S * 0.1, S * 0.5];
    const rot = (dx, dy) => [skulder[0] + dx * Math.cos(vink) - dy * Math.sin(vink), skulder[1] + dx * Math.sin(vink) + dy * Math.cos(vink)];
    strek(ctx, [skulder, rot(S * 0.14, -S * 0.07), rot(S * 0.18, -S * 0.11)], '#6a4428', S * 0.018);
    sno(ctx, S, t);
  },

  bronn(ctx, S, t) {
    const x = S * 0.5, y = S * 0.74, r = S * 0.17;
    const dy = Math.sin(t * 1.4) * r * 0.25;
    strek(ctx, [[x, y - r * 1.55], [x, y - r * 0.95 + dy]], '#e9dcc0', r * 0.04);
    kasse(ctx, x, y - r * 0.8 + dy, r * 0.3, r * 0.3, r * 0.25, { topp: '#5a7aa6', venstre: '#9e6d42', hoyre: '#7a5236' });
  },

  sopphus(ctx, S, t) {
    const x = S * 0.5;
    const lys2 = 0.7 + 0.3 * Math.sin(t * 2.3);
    const g = ctx.createRadialGradient(x + S * 0.075, S * 0.62, 0, x + S * 0.075, S * 0.62, S * 0.08);
    g.addColorStop(0, `rgba(255, 230, 120, ${0.8 * lys2})`);
    g.addColorStop(1, 'rgba(255, 230, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, S * 0.54, S * 0.16, S * 0.16);
    sirkel(ctx, x + S * 0.075, S * 0.62, S * 0.03, '#f3d77a');
    // Ildfluer som svever rundt hatten
    for (let k = 0; k < 4; k++) {
      const a = t * (0.5 + k * 0.13) + k * 1.7;
      const fx = x + Math.cos(a) * S * (0.3 + k * 0.03), fy = S * (0.42 + Math.sin(a * 1.3) * 0.12);
      glitter(ctx, fx, fy, S * 0.018, 0.5 + 0.5 * Math.sin(t * 5 + k));
    }
  },

  hytte(ctx, S, t) {
    const [px, py] = HYTTE_PIPE(S);
    royk(ctx, px, py - S * 0.02, S, t);
  },

  iglo(ctx, S, t) {
    const x = S * 0.52 - S * 0.2, y = S * 0.78;
    const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.08);
    g.addColorStop(0, `rgba(255, 200, 110, ${0.55 + 0.25 * Math.sin(t * 3)})`);
    g.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - S * 0.08, y - S * 0.08, S * 0.16, S * 0.12);
    sno(ctx, S, t, 9);
  },

  trehus(ctx, S, t) {
    // En fugl som flyr rundt kronen, og et blad som daler ned.
    const a = t * 0.9;
    fugl(ctx, S * 0.5 + Math.cos(a) * S * 0.36, S * 0.22 + Math.sin(a) * S * 0.08, S * 0.03, t);
    const u = (t * 0.15) % 1;
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.PI * u);
    ctx.translate(S * (0.68 + Math.sin(t * 1.7) * 0.05), S * (0.4 + u * 0.48));
    ctx.rotate(t * 2);
    poly(ctx, [[-S * 0.02, 0], [0, -S * 0.01], [S * 0.02, 0], [0, S * 0.01]], FIGUR.lov);
    ctx.restore();
  },

  stabbur(ctx, S, t) {
    // Værhane på mønet som snur seg med vinden.
    const [mx, my] = iso(S * 0.5, S * 0.82 - S * 0.2)(0, 0, S * 0.1 + S * 0.14);
    strek(ctx, [[mx, my], [mx, my - S * 0.08]], '#3d2416', S * 0.01);
    const snu = Math.cos(t * 0.6);
    ctx.save();
    ctx.translate(mx, my - S * 0.1);
    ctx.scale(snu, 1);
    poly(ctx, [[-S * 0.04, S * 0.01], [-S * 0.01, -S * 0.02], [S * 0.01, -S * 0.035], [S * 0.03, -S * 0.02], [S * 0.02, S * 0.01]], '#2b2a2e');
    poly(ctx, [[-S * 0.04, S * 0.01], [-S * 0.06, -S * 0.025], [-S * 0.03, -S * 0.005]], '#2b2a2e');
    ctx.restore();
  },

  fontene(ctx, S, t, fest) {
    const x = S * 0.5, y = S * 0.74;
    const hoyde = 1 + 0.12 * Math.sin(t * 2.2) + 0.5 * Math.exp(-(fest ?? Infinity) * 1.2);
    // Ringer i vannet
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, S * 0.008);
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.5 + k * 0.5) % 1;
      ctx.globalAlpha = 1 - u;
      ctx.beginPath(); ctx.ellipse(x, y, S * (0.06 + u * 0.18), S * (0.02 + u * 0.065), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160, 215, 245, 0.9)';
    ctx.lineWidth = Math.max(1.5, S * 0.014);
    for (const retn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y - S * 0.3);
      ctx.quadraticCurveTo(x + retn * S * 0.14, y - S * (0.3 + 0.16 * hoyde), x + retn * S * 0.2, y - S * 0.04);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, y - S * 0.26); ctx.lineTo(x, y - S * (0.26 + 0.16 * hoyde)); ctx.stroke();
    // Dråper som følger buene
    for (let k = 0; k < 6; k++) {
      const u = (t * 0.9 + k / 6) % 1, retn = k % 2 ? 1 : -1;
      const bx = x + retn * S * 0.2 * u;
      const by = y - S * 0.3 + (S * 0.26) * u * u - S * 0.16 * hoyde * Math.sin(Math.PI * u);
      sirkel(ctx, bx, by, S * 0.01, '#d8f0ff');
    }
  },

  sirkus(ctx, S, t) {
    flagg(ctx, S * 0.5, S * 0.8 - S * 0.2 - S * 0.28, S * 0.12, spillerfarge(), t);
  },

  vindmolle(ctx, S, t) {
    const x = S * 0.5, nav = [x, S * 0.36];
    const vinkel = 0.35 + t * 0.9;
    for (let k = 0; k < 4; k++) {
      const a = vinkel + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
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

  luftballong(ctx, S, t) {
    // Ballongen dupper og svaier i tauet.
    const dy = Math.sin(t * 0.9) * S * 0.035, dx = Math.sin(t * 0.6) * S * 0.02;
    const x = S * 0.5 + dx, y = S * 0.34 + dy, rx = S * 0.22, ry = S * 0.24;
    const farger = ['#e0393e', '#f5c431', '#3a74d8', '#25b86a', '#f39a2b', '#9b59d0'];
    const n = 6;
    const bredde = (v) => Math.sqrt(1 - v * v) * (v > 0.3 ? 1 - (v - 0.3) * 0.75 : 1);
    for (let k = 0; k < n; k++) {
      const u0 = -1 + (2 * k) / n, u1 = -1 + (2 * (k + 1)) / n;
      const pts = [];
      for (let j = 0; j <= 10; j++) { const v = -1 + (2 * j) / 10; pts.push([x + u0 * rx * bredde(v), y + v * ry]); }
      for (let j = 10; j >= 0; j--) { const v = -1 + (2 * j) / 10; pts.push([x + u1 * rx * bredde(v), y + v * ry]); }
      poly(ctx, pts, (u0 + u1) / 2 > 0.3 ? mork(farger[k], 0.18) : farger[k]);
    }
    const kurv = [x, S * 0.72 + dy];
    for (const kx of [-0.06, 0.06]) strek(ctx, [[x + kx * S * 0.8, y + ry * 0.92], [kurv[0] + kx * S * 0.7, kurv[1] - S * 0.04]], '#6a4428', S * 0.008);
    kasse(ctx, kurv[0], kurv[1], S * 0.1, S * 0.1, S * 0.07, { topp: '#7a5236', venstre: '#b5844f', hoyre: '#8a5c38' });
    strek(ctx, [[kurv[0] + S * 0.04, kurv[1]], [S * 0.62, S * 0.88]], 'rgba(233, 220, 192, 0.8)', S * 0.006);
  },

  taarn(ctx, S, t) {
    const [fx, fy] = iso(S * 0.5, S * 0.82)(0, 0, S * 0.48);
    flagg(ctx, fx, fy, S * 0.16, spillerfarge(), t);
  },

  fyrtaarn(ctx, S, t, fest) {
    const x = S * 0.5, ly = S * 0.3 - S * 0.06;
    const fart = fest < 3 ? 3.2 : 1.2;
    const g = ctx.createRadialGradient(x, ly, 0, x, ly, S * 0.18);
    g.addColorStop(0, `rgba(255, 236, 140, ${0.55 + 0.2 * Math.sin(t * 4)})`);
    g.addColorStop(1, 'rgba(255, 236, 140, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - S * 0.2, ly - S * 0.2, S * 0.4, S * 0.4);
    // To lysstråler som feier rundt (lengst når de peker mot sidene)
    for (const fase of [0, Math.PI]) {
      const a = t * fart + fase;
      const c = Math.cos(a);
      const L = S * 0.55 * Math.abs(c), b = S * 0.06;
      const retn = Math.sign(c) || 1;
      const alfa = 0.35 * Math.abs(c) * (Math.sin(a) > 0 ? 1 : 0.5);
      const lg = ctx.createLinearGradient(x, ly, x + retn * L, ly);
      lg.addColorStop(0, `rgba(255, 245, 190, ${alfa})`);
      lg.addColorStop(1, 'rgba(255, 245, 190, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(x, ly - S * 0.02);
      ctx.lineTo(x + retn * L, ly - b);
      ctx.lineTo(x + retn * L, ly + b);
      ctx.lineTo(x, ly + S * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  },

  pariserhjul(ctx, S, t) {
    const nav = [S * 0.5, S * 0.42], R = S * 0.3;
    const vinkel = 0.2 + t * 0.35;
    ctx.strokeStyle = '#9aa1ae';
    ctx.lineWidth = Math.max(1, S * 0.008);
    for (let k = 0; k < 8; k++) {
      const a = vinkel + (k / 8) * Math.PI * 2;
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
      // Gondolene henger alltid rett ned.
      const a = vinkel + (k / 8) * Math.PI * 2;
      const gx = nav[0] + Math.cos(a) * R, gy = nav[1] + Math.sin(a) * R;
      poly(ctx, [[gx - S * 0.035, gy], [gx + S * 0.035, gy], [gx + S * 0.03, gy + S * 0.06], [gx - S * 0.03, gy + S * 0.06]], farger[k % 4]);
    }
    sirkel(ctx, nav[0], nav[1], S * 0.03, '#f5c431');
  },

  stavkirke(ctx, S, t) {
    // To fugler som flyr rundt spiret.
    for (let k = 0; k < 2; k++) {
      const a = t * (0.7 + k * 0.2) + k * Math.PI;
      fugl(ctx, S * 0.5 + Math.cos(a) * S * 0.3, S * (0.2 + k * 0.06) + Math.sin(a) * S * 0.05, S * 0.025, t + k);
    }
  },

  pyramide(ctx, S, t) {
    const [tx, ty] = iso(S * 0.5, S * 0.72)(0, 0, S * 0.46);
    glitter(ctx, tx, ty + S * 0.02, S * (0.04 + 0.02 * Math.sin(t * 3)), 0.5 + 0.5 * Math.sin(t * 3));
    glitter(ctx, tx - S * 0.1, ty + S * 0.12, S * 0.02, Math.max(0, Math.sin(t * 2.3 + 1)));
  },

  rakett(ctx, S, t, fest) {
    // Blinkende lys i tårnet.
    sirkel(ctx, S * 0.74, S * 0.29, S * 0.015, Math.sin(t * 4) > 0 ? '#ff4b4b' : '#6a2020');
    // Etter et trykk i nærbildet skytes raketten opp, og den lander igjen etterpå.
    const f = fest ?? Infinity;
    let loft = 0, flamme = false;
    if (f < 1.4) { loft = (f / 1.4) ** 2 * S * 1.1; flamme = true; } else if (f < 2.6) loft = S * 2;
    else if (f < 4) { loft = (1 - (f - 2.6) / 1.4) ** 2 * S * 1.1; flamme = true; }
    const x = S * 0.46, bunn = S * 0.78 - loft, topp = S * 0.16 - loft, b = S * 0.08;
    if (loft < S * 1.5) {
      if (flamme) {
        const fl = S * (0.12 + 0.05 * Math.sin(t * 30));
        poly(ctx, [[x - b * 0.6, bunn], [x, bunn + fl * 1.6], [x + b * 0.6, bunn]], FIGUR.flamme[1]);
        poly(ctx, [[x - b * 0.35, bunn], [x, bunn + fl], [x + b * 0.35, bunn]], FIGUR.flamme[0]);
      }
      poly(ctx, [[x - b * 1.9, bunn], [x - b, bunn - S * 0.16], [x - b, bunn]], '#e0393e');
      poly(ctx, [[x + b * 1.9, bunn], [x + b, bunn - S * 0.16], [x + b, bunn]], '#a82a30');
      poly(ctx, [[x - b, bunn], [x - b, topp + S * 0.14], [x, topp + S * 0.12], [x, bunn]], '#f4f6f8');
      poly(ctx, [[x, bunn], [x, topp + S * 0.12], [x + b, topp + S * 0.14], [x + b, bunn]], '#c8cfd8');
      poly(ctx, [[x - b, topp + S * 0.14], [x, topp], [x, topp + S * 0.12]], '#e0393e');
      poly(ctx, [[x, topp], [x + b, topp + S * 0.14], [x, topp + S * 0.12]], '#a82a30');
      poly(ctx, [[x - b, S * 0.56 - loft], [x + b, S * 0.56 - loft], [x + b, S * 0.6 - loft], [x - b, S * 0.6 - loft]], '#e0393e');
      sirkel(ctx, x, S * 0.42 - loft, b * 0.62, '#f4f6f8');
      sirkel(ctx, x, S * 0.42 - loft, b * 0.45, '#3a74d8');
      sirkel(ctx, x - b * 0.15, S * 0.4 - loft, b * 0.13, '#bfe4f7');
    }
    // Damp ved foten (mye under oppskytingen)
    royk(ctx, x - S * 0.06, S * 0.8, S, t, { antall: f < 4 ? 8 : 3, fart: f < 4 ? 0.9 : 0.25 });
  },

  havn(ctx, S, t) {
    // Små bølger på sjøen og et flagg på naustet
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.7)';
    ctx.lineWidth = Math.max(1, S * 0.008);
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const u = (t * 0.25 + k * 0.21) % 1;
      const x = S * (0.15 + ((k * 0.37) % 0.8)), y = S * (0.9 - ((k * 0.23) % 0.25)) + Math.sin(t * 1.5 + k) * S * 0.01;
      ctx.globalAlpha = Math.sin(Math.PI * u);
      ctx.beginPath(); ctx.moveTo(x - S * 0.04, y); ctx.quadraticCurveTo(x, y - S * 0.015, x + S * 0.04, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const [fx, fy] = iso(S * 0.27, S * 0.44)(0, 0, S * 0.21);
    flagg(ctx, fx, fy, S * 0.12, spillerfarge(), t);
  },

  havnbaat(ctx, S, t, fest) {
    LIV.havn(ctx, S, t);
    // Båten vugger på bølgene – mer når noen trykker på den.
    const ekstra = 1 + 3 * Math.exp(-(fest ?? Infinity) * 0.8);
    seilbaat(ctx, S, Math.sin(t * 1.4) * 0.035 * ekstra, (1 + Math.sin(t * 1.8)) * S * 0.006 * ekstra);
    const topp = [S * 0.75, S * 0.8 - S * 0.5];
    flagg(ctx, topp[0], topp[1] + S * 0.01, S * 0.06, spillerfarge(), t);
  },

  borg(ctx, S, t) {
    const [kx, ky] = BORG_KJERNE(S);
    const [fx, fy] = iso(kx, ky)(0, 0, S * 0.42);
    flagg(ctx, fx, fy, S * 0.16, spillerfarge(), t);
    const p = iso(S * 0.5, S * 0.8);
    for (const u of [-1, 1]) {
      const [tx, ty] = p(u * S * 0.27, 0, 0);
      const [vx, vy] = iso(tx, ty)(0, 0, S * 0.28);
      flagg(ctx, vx, vy + S * 0.02 - S * 0.16, S * 0.07, spillerfarge(), t, u);
    }
  },
};

// Skolen og oppfinnelsene ligger i egen fil.
Object.assign(PYNT, PYNT_O);
Object.assign(LIV, LIV_O);

/** Tegner hele bygget: det som står stille og det som beveger seg (t = 0 gir et stillbilde). */
export function tegnBygg(ctx, S, id, tilf, t = 0.6, fest = Infinity) {
  PYNT[id](ctx, S, tilf);
  LIV[id]?.(ctx, S, t, fest);
}

export { ivrig };
