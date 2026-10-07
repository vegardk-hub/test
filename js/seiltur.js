// Seilturen mellom øyene: en liten tegnet film på et canvas over hele skjermen.
// Båten seiler mot høyre i vannet (bølgene foran dekker bunnen av skroget), øya man
// forlater glir bakover, og øya man skal til kommer inn. Himmel, hav og øyer går
// gradvis over fra én stil til en annen (vanlig dag ↔ neon), med et magisk glitter
// midt i overgangen.

import { poly } from './stil/lavpoly.js';
import { spillerfarge } from './stil/spillerfarge.js';

const VARIGHET = 4200;   // ms

// ---------------------------------------------------------------------------
// Farger for de to stilene, og blanding mellom dem
// ---------------------------------------------------------------------------
const STIL = {
  vanlig: {
    himmel: ['#4f93d6', '#9fd0f2', '#ffe2b8'], hav: ['#3fa7c9', '#2a7fae', '#174a7c'], bolge: '#e8f7ff',
    sand: ['#ecd59a', '#c9ab6c'], gress: ['#7fb24f', '#5e8f3a'], stamme: '#8a6a44', blad: ['#4f9a3a', '#3d7f2e'],
    sky: '#ffffff', fjell: '#6f8fb8',
  },
  neon: {
    himmel: ['#0c0224', '#3d0b5c', '#c2189b'], hav: ['#2a0a4e', '#14052e', '#05010f'], bolge: '#19e3ff',
    sand: ['#ff2bd6', '#b0148f'], gress: ['#39ff88', '#14c96a'], stamme: '#ff8a3d', blad: ['#39ff88', '#19e3ff'],
    sky: '#7a3fd0', fjell: '#5a1f8e',
  },
};

function tilRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function bland(a, b, u) {
  const x = tilRgb(a), y = tilRgb(b);
  return `rgb(${x.map((v, k) => Math.round(v + (y[k] - v) * u)).join(',')})`;
}
const klamp = (u, a = 0, b = 1) => Math.max(a, Math.min(b, u));
const myk = (u) => { u = klamp(u); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------------------
// Delene av bildet
// ---------------------------------------------------------------------------
function himmel(ctx, W, H, hy, f, neon) {
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  [0, 0.65, 1].forEach((o, k) => g.addColorStop(o, bland(f.himmel[k], STIL.neon.himmel[k], neon)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hy + 1);
}

function stjerner(ctx, W, hy, neon, tid) {
  if (neon <= 0.02) return;
  for (let k = 0; k < 70; k++) {
    const x = ((k * 137.5) % 1) * W + ((k * 7919) % W), y = ((k * 53) % 100) / 100 * hy * 0.8;
    ctx.globalAlpha = neon * (0.4 + 0.6 * Math.abs(Math.sin(tid * 2 + k)));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x % W, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** Sola: gul og lys på dagen, stripete «synthwave» om neon. */
function sol(ctx, W, hy, neon, tid) {
  const x = W * 0.72, y = hy - W * 0.02, r = Math.min(W, hy) * 0.22;
  // Dagsola med stråler
  if (neon < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - neon;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
    g.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Neonsola
  if (neon > 0.02) {
    ctx.save();
    ctx.globalAlpha = neon;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#fff36b'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#ff2bd6');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 6; k++) {
      const u = (k / 6 + tid * 0.1) % 1;
      const yy = y + r * (u * 1.1 - 0.1);
      if (yy > y - r * 0.1) ctx.fillRect(x - r, yy, r * 2, Math.max(1, r * 0.09 * u + 1));
    }
    ctx.restore();
  }
}

function skyer(ctx, W, hy, f, neon, tid) {
  ctx.save();
  ctx.globalAlpha = 0.85 - neon * 0.55;
  const farge = bland(f.sky, STIL.neon.sky, neon);
  for (let k = 0; k < 4; k++) {
    const x = ((k * 0.31 + 0.1) * W - tid * 18 * (1 + k * 0.3)) % (W * 1.4);
    const xx = x < -W * 0.3 ? x + W * 1.4 : x, y = hy * (0.18 + k * 0.13), s = hy * (0.06 + 0.02 * (k % 2));
    ctx.fillStyle = farge;
    for (const [dx, dy, r] of [[0, 0, 1], [1.1, 0.2, 0.8], [-1.0, 0.25, 0.75], [0.4, -0.4, 0.8]]) {
      ctx.beginPath(); ctx.arc(xx + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Lave fjell langt borte i horisonten. */
function fjellrekke(ctx, W, hy, f, neon, rull) {
  const farge = bland(f.fjell, STIL.neon.fjell, neon);
  const pts = [[0, hy]];
  for (let k = 0; k <= 12; k++) {
    const x = (k / 12) * W;
    const h = (Math.sin(k * 1.7 + rull * 0.002) * 0.5 + 0.5) * hy * 0.06 + hy * 0.01;
    pts.push([x, hy - h]);
  }
  pts.push([W, hy]);
  ctx.globalAlpha = 0.55;
  poly(ctx, pts, farge);
  ctx.globalAlpha = 1;
}

function hav(ctx, W, H, hy, f, neon, tid) {
  const g = ctx.createLinearGradient(0, hy, 0, H);
  [0, 0.4, 1].forEach((o, k) => g.addColorStop(o, bland(f.hav[k], STIL.neon.hav[k], neon)));
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, W, H - hy);
  // Sola speiler seg i vannet
  ctx.save();
  ctx.globalAlpha = 0.5;
  const sx = W * 0.72;
  for (let k = 0; k < 7; k++) {
    const y = hy + (H - hy) * (0.04 + k * 0.05), b = W * (0.08 - k * 0.008) * (1 + Math.sin(tid * 3 + k) * 0.15);
    ctx.fillStyle = bland('#ffe39a', '#ff2bd6', neon);
    ctx.fillRect(sx - b, y, b * 2, Math.max(2, (H - hy) * 0.012));
  }
  ctx.restore();
  // Neon: lysende rutenett på havet
  if (neon > 0.02) {
    ctx.save();
    ctx.globalAlpha = neon * 0.7;
    ctx.strokeStyle = '#19e3ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#19e3ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let k = 1; k < 9; k++) {
      const u = ((k + tid * 0.9) % 9) / 9;
      const y = hy + (H - hy) * u * u;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    for (let k = -10; k <= 10; k++) {
      ctx.moveTo(W * 0.5 + k * W * 0.02, hy);
      ctx.lineTo(W * 0.5 + k * W * 0.22, H);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** En liten øy med palme. x er midten, y vannlinja, s størrelsen. */
function oy(ctx, x, y, s, stil) {
  const f = STIL[stil];
  const neon = stil === 'neon';
  ctx.save();
  if (neon) { ctx.shadowColor = f.sand[0]; ctx.shadowBlur = s * 0.25; }
  poly(ctx, [[x - s, y], [x - s * 0.6, y - s * 0.22], [x - s * 0.1, y - s * 0.3], [x + s * 0.5, y - s * 0.24], [x + s * 0.95, y]], f.sand[0]);
  poly(ctx, [[x - s * 0.1, y - s * 0.3], [x + s * 0.5, y - s * 0.24], [x + s * 0.95, y], [x + s * 0.2, y]], f.sand[1]);
  if (neon) ctx.shadowColor = f.gress[0];
  poly(ctx, [[x - s * 0.55, y - s * 0.2], [x - s * 0.1, y - s * 0.32], [x + s * 0.45, y - s * 0.25], [x + s * 0.1, y - s * 0.18]], f.gress[0]);
  // Palme
  const px = x - s * 0.15, py = y - s * 0.26, h = s * 0.95;
  ctx.strokeStyle = f.stamme;
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  if (neon) ctx.shadowColor = f.stamme;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + h * 0.15, py - h * 0.5, px + h * 0.08, py - h * 0.85); ctx.stroke();
  const tx = px + h * 0.08, ty = py - h * 0.85;
  if (neon) ctx.shadowColor = f.blad[0];
  for (let k = 0; k < 6; k++) {
    const v = -Math.PI / 2 + (k - 2.5) * 0.6, l = h * 0.42;
    const ex = tx + Math.cos(v) * l, ey = ty + Math.sin(v) * l * 0.6 + l * 0.3;
    poly(ctx, [[tx, ty], [(tx + ex) / 2 - Math.sin(v) * l * 0.12, (ty + ey) / 2 - h * 0.06], [ex, ey], [(tx + ex) / 2, (ty + ey) / 2 + h * 0.02]], f.blad[k % 2]);
  }
  ctx.restore();
}

/** Bølgerader som ruller forbi. dybde 0 = ved horisonten, 1 = helt framme. */
function bolger(ctx, W, H, hy, farge, neon, rull, dybde, tykk = 1) {
  const y = hy + (H - hy) * dybde;
  const amp = (H - hy) * (0.012 + dybde * 0.03), lengde = W * (0.08 + dybde * 0.12);
  ctx.save();
  ctx.strokeStyle = farge;
  ctx.globalAlpha = 0.35 + dybde * 0.5;
  ctx.lineWidth = (1.5 + dybde * 3) * tykk;
  ctx.lineCap = 'round';
  if (neon > 0.3) { ctx.shadowColor = farge; ctx.shadowBlur = 6 * neon; }
  const forskyv = (rull * (0.4 + dybde * 1.4)) % lengde;
  for (let x = -lengde - forskyv; x < W + lengde; x += lengde) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lengde * 0.25, y - amp, x + lengde * 0.5, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Seilbåten. (x, y) er midt på vannlinja under skroget, s størrelsen. */
function baat(ctx, x, y, s, vugg, neon, tid) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vugg);
  if (neon > 0.3) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = s * 0.12 * neon; }
  // Skroget (en del av det ligger under vannet, bølgene foran dekker det)
  poly(ctx, [[-s * 0.62, -s * 0.16], [s * 0.66, -s * 0.2], [s * 0.42, s * 0.14], [-s * 0.46, s * 0.14]], '#f4f1e8');
  poly(ctx, [[-s * 0.56, -s * 0.04], [s * 0.6, -s * 0.08], [s * 0.42, s * 0.14], [-s * 0.46, s * 0.14]], bland('#c0392b', '#ff2bd6', neon));
  poly(ctx, [[-s * 0.62, -s * 0.16], [s * 0.66, -s * 0.2], [s * 0.6, -s * 0.26], [-s * 0.56, -s * 0.22]], '#9e6d42');
  // Masta og seilene
  ctx.strokeStyle = '#5b3a24';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.02, -s * 0.2); ctx.lineTo(-s * 0.02, -s * 1.35); ctx.stroke();
  const blaas = Math.sin(tid * 2) * s * 0.03;
  poly(ctx, [[0, -s * 1.3], [s * 0.5 + blaas, -s * 0.32], [0, -s * 0.3]], '#ffffff');
  poly(ctx, [[0, -s * 1.3], [s * 0.2 + blaas * 0.5, -s * 0.32], [0, -s * 0.3]], '#e6e2d6');
  poly(ctx, [[-s * 0.05, -s * 1.18], [-s * 0.05, -s * 0.33], [-s * 0.45 - blaas, -s * 0.32]], bland('#f3d77a', '#19e3ff', neon));
  // Flagg i spillerens farge på toppen av masta
  const topp = [];
  for (let k = 0; k <= 5; k++) {
    const u = k / 5;
    topp.push([-s * 0.02 + u * s * 0.22, -s * 1.35 + Math.sin(tid * 7 - u * 4) * s * 0.03 * u]);
  }
  poly(ctx, [...topp, ...topp.slice().reverse().map(([fx, fy]) => [fx, fy + s * 0.1])], spillerfarge());
  ctx.restore();
}

/** Skum bak båten og en liten baugbølge. */
function kjolvann(ctx, x, y, s, farge, tid) {
  ctx.save();
  ctx.fillStyle = farge;
  for (let k = 0; k < 14; k++) {
    const u = ((tid * 1.6 + k / 14) % 1);
    const bx = x - s * 0.5 - u * s * 2.2, by = y + s * 0.08 + Math.sin(k * 2.3) * s * 0.1 * u;
    ctx.globalAlpha = (1 - u) * 0.7;
    ctx.beginPath(); ctx.ellipse(bx, by, s * (0.05 + u * 0.12), s * (0.02 + u * 0.03), 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const u = (tid * 2 + k / 4) % 1;
    ctx.globalAlpha = (1 - u) * 0.8;
    ctx.beginPath(); ctx.arc(x + s * 0.62 + u * s * 0.15, y - s * 0.02 - Math.sin(u * Math.PI) * s * 0.12, s * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Magisk glitter som sveiper over skjermen når stilen skifter. */
function glitter(ctx, W, H, styrke, tid) {
  if (styrke <= 0.01) return;
  ctx.save();
  for (let k = 0; k < 60; k++) {
    const x = ((k * 97.13) % 1000) / 1000 * W, y = ((k * 61.7) % 1000) / 1000 * H;
    const a = styrke * Math.abs(Math.sin(tid * 5 + k));
    const r = 2 + (k % 4) * 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = ['#ffffff', '#fff36b', '#ff9cf0', '#7ff3ff'][k % 4];
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.4, y - r * 0.4); ctx.lineTo(x + r * 2, y); ctx.lineTo(x + r * 0.4, y + r * 0.4);
    ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.4, y + r * 0.4); ctx.lineTo(x - r * 2, y); ctx.lineTo(x - r * 0.4, y - r * 0.4);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Selve filmen
// ---------------------------------------------------------------------------
/**
 * Tegner ett bilde av seilturen. p = 0–1 gjennom turen, tid = sekunder (til bølger og vugging).
 * fra/til = stilen på øya man forlater og øya man skal til ('vanlig' eller 'neon').
 */
export function tegnSeiltur(ctx, W, H, p, tid, { fra = 'vanlig', til = 'vanlig' } = {}) {
  const hy = H * 0.5;
  // Overgangen mellom stilene skjer midt i turen.
  const a = fra === 'neon' ? 1 : 0, b = til === 'neon' ? 1 : 0;
  const neon = a + (b - a) * myk((p - 0.32) / 0.36);
  const f = STIL.vanlig;
  const rull = p * W * 2.2 + tid * 40;   // hvor langt havet har rullet forbi

  himmel(ctx, W, H, hy, f, neon);
  stjerner(ctx, W, hy, neon, tid);
  sol(ctx, W, hy, neon, tid);
  skyer(ctx, W, hy, f, neon, tid);
  fjellrekke(ctx, W, hy, f, neon, rull);
  hav(ctx, W, H, hy, f, neon, tid);

  // Øya man forlater glir ut til venstre, øya man skal til kommer inn fra høyre.
  const s = Math.min(W, H) * 0.3;
  const fraX = W * 0.16 - myk(p / 0.5) * W * 0.7;
  if (fraX > -s * 1.2) oy(ctx, fraX, hy + (H - hy) * 0.1, s, fra);
  const tilX = W * 1.3 - myk((p - 0.5) / 0.5) * W * 0.48;
  if (p > 0.45) oy(ctx, tilX, hy + (H - hy) * 0.06, s * 0.85, til);

  const bolgeFarge = bland(f.bolge, STIL.neon.bolge, neon);
  for (const d of [0.08, 0.18, 0.3]) bolger(ctx, W, H, hy, bolgeFarge, neon, rull, d, 0.8);

  // Båten: kommer inn fra venstre, seiler rolig mot midten, og videre inn mot den nye øya.
  const bs = Math.min(W, H) * 0.25;
  // Båten legger ut fra stranda på øya man forlater, seiler ut til midten, og videre mot den nye øya.
  const bx = W * (0.24 + 0.22 * myk(p / 0.4)) + W * 0.14 * myk((p - 0.6) / 0.4);
  const vann = hy + (H - hy) * 0.42;
  const by = vann + Math.sin(tid * 2.6) * bs * 0.05;
  kjolvann(ctx, bx, by, bs, bolgeFarge, tid);
  baat(ctx, bx, by, bs, Math.sin(tid * 2.1) * 0.06, neon, tid);

  // Bølgene foran dekker bunnen av skroget, så båten ligger i vannet.
  ctx.save();
  const front = ctx.createLinearGradient(0, vann + bs * 0.04, 0, H);
  front.addColorStop(0, bland(f.hav[1], STIL.neon.hav[1], neon));
  front.addColorStop(1, bland(f.hav[2], STIL.neon.hav[2], neon));
  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, vann + bs * 0.06 + Math.sin(x * 0.02 + rull * 0.03) * bs * 0.035);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // Skum langs kanten av vannet foran båten
  ctx.strokeStyle = bolgeFarge;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.5, bs * 0.02);
  if (neon > 0.3) { ctx.shadowColor = bolgeFarge; ctx.shadowBlur = 6 * neon; }
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const y = vann + bs * 0.06 + Math.sin(x * 0.02 + rull * 0.03) * bs * 0.035;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  for (const d of [0.5, 0.68, 0.88]) bolger(ctx, W, H, hy, bolgeFarge, neon, rull, d, 1.2);

  // Glitter i overgangen (bare når stilen faktisk skifter)
  if (a !== b) glitter(ctx, W, H, Math.sin(Math.PI * klamp((p - 0.3) / 0.4)), tid);
}

/**
 * Spiller seilturen på et canvas. Løftet løses når den er ferdig (etter VARIGHET ms).
 * underveis(p) kalles hvert bilde, så den som kaller kan gjøre noe på et bestemt tidspunkt.
 */
export function spillSeiltur(canvas, valg, underveis = null) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  const t0 = performance.now();
  return new Promise((ferdig) => {
    const bilde = (ms) => {
      const p = klamp((ms - t0) / VARIGHET);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tegnSeiltur(ctx, W, H, p, (ms - t0) / 1000, valg);
      underveis?.(p);
      if (p < 1) requestAnimationFrame(bilde);
      else ferdig();
    };
    requestAnimationFrame(bilde);
  });
}

export { VARIGHET };
