// Figurene for tingene man samler (tre, stein, jern, fisk, korn, ull, kister) i tre
// størrelser. Hver figur tegnes i en rute på S × S piksler og kan vise hvor langt
// man har kommet (p = 0…1) og avslutningen (ferdigT = sekunder siden siste trykk).

import { FIGUR } from './stil/palett.js';
import { poly, fasett, klump, kasse, iso, skygge, stein, lys, mork } from './stil/lavpoly.js';
import { lagTilfeldig } from './rng.js';

const naa = () => performance.now() / 1000;
const klamp = (u, a = 0, b = 1) => Math.max(a, Math.min(b, u));
const ut = (u) => 1 - Math.pow(1 - klamp(u), 3);
const sprett = (u) => { u = klamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

// --- Tre ---------------------------------------------------------------------
function treFigur(ctx, r, x, y, h, p, bred = 1) {
  skygge(ctx, x + h * 0.1, y, h * 0.34 * bred, h * 0.09);
  const sb = h * 0.12;
  poly(ctx, [[x - sb / 2, y], [x - sb * 0.38, y - h * 0.48], [x + sb * 0.38, y - h * 0.48], [x + sb / 2, y]], '#8a5c38');
  poly(ctx, [[x + sb * 0.05, y], [x + sb * 0.05, y - h * 0.48], [x + sb * 0.38, y - h * 0.48], [x + sb / 2, y]], '#6a4428');
  if (p > 0) {
    // Hakket i stammen blir dypere for hvert hogg.
    const d = sb * 0.95 * p;
    poly(ctx, [[x - sb / 2 - 0.5, y - h * 0.1], [x - sb / 2 + d, y - h * 0.15], [x - sb / 2 - 0.5, y - h * 0.21]], '#ecc98e');
  }
  const kl = bred > 1.1
    ? [[-0.24, -0.58, 0.24], [0.24, -0.6, 0.24], [-0.1, -0.78, 0.25], [0.14, -0.82, 0.22], [0, -0.64, 0.26]]
    : [[-0.15, -0.6, 0.25], [0.15, -0.63, 0.24], [0, -0.8, 0.27]];
  const farger = [mork(FIGUR.lov, 0.1), FIGUR.lov, lys(FIGUR.lov, 0.08), lys(FIGUR.lov, 0.12), FIGUR.lov];
  kl.forEach(([dx, dy, rr], i) => fasett(ctx, klump(r, x + dx * h * bred, y + dy * h, rr * h * bred, rr * h * 0.88, 8, 0.12), farger[i]));
  for (const [dx, dy] of [[-0.14, -0.62], [0.12, -0.72], [0.02, -0.86], [0.2, -0.56]]) {
    ctx.fillStyle = '#d0453f';
    ctx.beginPath();
    ctx.arc(x + h * dx * bred, y + h * dy, h * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }
}

function stubbe(ctx, x, y, r) {
  skygge(ctx, x + r * 0.3, y, r * 1.3, r * 0.35);
  poly(ctx, [[x - r, y - r * 0.15], [x + r, y - r * 0.15], [x + r * 0.9, y - r * 1.1], [x - r * 0.9, y - r * 1.1]], '#8a5c38');
  ctx.fillStyle = '#e8c48a';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 1.1, r * 0.9, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a26b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 1.1, r * 0.5, r * 0.17, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function figurTre(ctx, S, r, k, p, ferdigT) {
  const x = S * 0.5, y = S * 0.88, h = S * [0.5, 0.68, 0.86][k.str], bred = [0.8, 1, 1.25][k.str];
  if (ferdigT === null) { treFigur(ctx, r, x, y, h, p, bred); return; }
  // Treet faller mot høyre, blir liggende litt og blekner; stubben står igjen.
  stubbe(ctx, x, y, S * [0.04, 0.06, 0.08][k.str]);
  const fall = klamp(ferdigT / 0.75);
  if (ferdigT < 1.8) {
    ctx.save();
    ctx.globalAlpha = 1 - klamp((ferdigT - 1.2) / 0.6);
    ctx.translate(x, y - h * 0.06);
    ctx.rotate((Math.PI / 2) * fall * fall);
    ctx.translate(-x, -(y - h * 0.06));
    treFigur(ctx, r, x, y, h, 1, bred);
    ctx.restore();
  }
}

// --- Stein og jern ----------------------------------------------------------
function steinbit(ctx, S, r, k, p, ferdigT, { farge, mork: morkFarge, malm = false }) {
  const x = S * 0.5, y = S * 0.84, R = S * [0.16, 0.25, 0.34][k.str];
  if (ferdigT === null) {
    if (k.str === 2) {
      // Den store har småstein rundt seg
      stein(ctx, lagTilfeldig(k.seed + 30), x - R * 1.05, y + S * 0.02, R * 0.32, morkFarge);
      stein(ctx, lagTilfeldig(k.seed + 31), x + R * 1.1, y + S * 0.03, R * 0.26, farge);
    }
    stein(ctx, r, x, y, R, farge);
    if (malm) {
      // Malmklumper og blanke flekker som glitrer mer jo nærmere man er
      const rm = lagTilfeldig(k.seed + 12);
      const n = [3, 5, 8][k.str];
      for (let i = 0; i < n; i++) {
        const mx = x + (rm.tall() - 0.5) * R * 1.3, my = y - R * (0.2 + rm.tall() * 0.6);
        const mr = R * (0.08 + rm.tall() * 0.08);
        poly(ctx, [[mx - mr, my], [mx, my - mr * 0.8], [mx + mr, my], [mx, my + mr * 0.7]], i % 3 === 2 ? FIGUR.malm[1] : FIGUR.malm[0]);
      }
      if (p > 0) {
        const t = naa();
        for (let i = 0; i < n; i++) {
          const gx = x + (Math.sin(i * 7.3 + k.seed) * 0.5) * R * 1.2, gy = y - R * (0.3 + 0.25 * Math.cos(i * 3.1));
          const a = p * (0.5 + 0.5 * Math.sin(t * 6 + i * 2));
          ctx.fillStyle = `rgba(255, 250, 220, ${a})`;
          const g = R * 0.09;
          poly(ctx, [[gx, gy - g], [gx + g * 0.3, gy - g * 0.3], [gx + g, gy], [gx + g * 0.3, gy + g * 0.3], [gx, gy + g], [gx - g * 0.3, gy + g * 0.3], [gx - g, gy], [gx - g * 0.3, gy - g * 0.3]], ctx.fillStyle);
        }
      }
    }
    // Sprekker: kommer gradvis, én bit for hvert trykk.
    const rs = lagTilfeldig(k.seed + 11);
    const totalt = 7;
    const n = Math.round(p * totalt);
    ctx.strokeStyle = 'rgba(40, 40, 52, 0.8)';
    ctx.lineWidth = Math.max(1.2, R * 0.045);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < totalt; i++) {
      const v = rs.tall() * Math.PI * 2;
      const pkt = [[x + (rs.tall() - 0.5) * R * 0.3, y - R * 0.45 + (rs.tall() - 0.5) * R * 0.2]];
      for (let s = 0; s < 3; s++) {
        const [px, py] = pkt[pkt.length - 1];
        const vv = v + (rs.tall() - 0.5) * 0.9;
        pkt.push([px + Math.cos(vv) * R * 0.22, py + Math.sin(vv) * R * 0.14]);
      }
      if (i >= n) continue;
      ctx.beginPath();
      ctx.moveTo(...pkt[0]);
      for (const q of pkt.slice(1)) ctx.lineTo(...q);
      ctx.stroke();
    }
    return;
  }
  // Steinen sprekker i biter som triller fra hverandre.
  const u = ut(ferdigT / 0.7);
  ctx.globalAlpha = 1 - klamp((ferdigT - 1.3) / 0.6);
  [[-1, 0.8], [0.15, 1.2], [1, 0.9]].forEach(([retn, hopp], i) => {
    const px = x + retn * u * S * 0.26;
    const py = y - Math.sin(u * Math.PI) * S * 0.12 * hopp;
    stein(ctx, lagTilfeldig(k.seed + 20 + i), px, py, R * 0.42, i === 1 ? morkFarge : (malm ? FIGUR.malm[0] : farge));
  });
  ctx.globalAlpha = 1;
}

function figurStein(ctx, S, r, k, p, ferdigT) {
  steinbit(ctx, S, r, k, p, ferdigT, { farge: FIGUR.stein, mork: FIGUR.steinMork });
}

function figurJern(ctx, S, r, k, p, ferdigT) {
  steinbit(ctx, S, r, k, p, ferdigT, { farge: '#7b7e8c', mork: '#5d5f6b', malm: true });
}

// --- Fisk --------------------------------------------------------------------
const FISKEFARGER = [
  { rygg: '#6f8ea6', side: '#c9dbe7', finne: '#5a7890' },   // sild
  { rygg: '#7c6a4a', side: '#e2b98d', finne: '#6a5638', prikker: '#c8553f' }, // ørret
  { rygg: '#5d7488', side: '#dfe6ec', finne: '#4c6274', stripe: '#e89a8a' },  // laks
];

function fiskFigur(ctx, x, y, L, vinkel, f) {
  const H = L * 0.36;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vinkel);
  poly(ctx, [[-L * 0.4, 0], [-L * 0.64, -H * 0.55], [-L * 0.58, 0], [-L * 0.64, H * 0.55]], f.finne);   // hale
  poly(ctx, [[-L * 0.05, -H * 0.45], [L * 0.12, -H * 0.85], [L * 0.2, -H * 0.42]], f.finne);              // ryggfinne
  const kropp = [[L * 0.5, 0], [L * 0.3, -H * 0.42], [0, -H * 0.5], [-L * 0.3, -H * 0.36], [-L * 0.42, 0],
    [-L * 0.3, H * 0.36], [0, H * 0.5], [L * 0.3, H * 0.42]];
  poly(ctx, kropp, f.side);
  poly(ctx, [[L * 0.5, 0], [L * 0.3, -H * 0.42], [0, -H * 0.5], [-L * 0.3, -H * 0.36], [-L * 0.42, 0], [0, -H * 0.12]], f.rygg);
  if (f.stripe) poly(ctx, [[L * 0.32, H * 0.02], [-L * 0.36, H * 0.02], [-L * 0.3, H * 0.14], [L * 0.26, H * 0.16]], f.stripe);
  if (f.prikker) {
    ctx.fillStyle = f.prikker;
    for (const [px, py] of [[-0.2, -0.18], [0, -0.05], [0.15, -0.22], [-0.05, -0.3], [0.25, 0.05]]) {
      ctx.beginPath(); ctx.arc(L * px, H * py, L * 0.018, 0, Math.PI * 2); ctx.fill();
    }
  }
  poly(ctx, [[L * 0.02, H * 0.1], [L * 0.12, H * 0.1], [L * 0.04, H * 0.42]], f.finne);                   // sidefinne
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(L * 0.36, -H * 0.1, L * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d232b';
  ctx.beginPath(); ctx.arc(L * 0.375, -H * 0.1, L * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function figurFisk(ctx, S, r, k, p, ferdigT, t) {
  const L = S * [0.34, 0.5, 0.7][k.str];
  const x = S * 0.5, vann = S * 0.7;
  const bob = Math.sin(t * 2.2 + k.seed) * S * 0.015;
  // Ringer i vannet
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, S * 0.008);
  for (let i = 0; i < 2; i++) {
    const u = ((t * 0.6 + i * 0.5 + (k.seed % 7) * 0.1) % 1);
    ctx.globalAlpha = 1 - u;
    ctx.beginPath();
    ctx.ellipse(x, vann, L * (0.35 + u * 0.4), L * (0.08 + u * 0.08), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (ferdigT === null) {
    // Fisken spreller over vannet, og spreller mer jo nærmere man er
    const spreller = Math.sin(t * (4 + p * 10)) * (0.06 + p * 0.12);
    fiskFigur(ctx, x, vann - L * 0.28 + bob, L, -0.15 + spreller, FISKEFARGER[k.str]);
    return;
  }
  // Ferdig: fisken hopper høyt opp og forsvinner
  const u = klamp(ferdigT / 0.9);
  ctx.globalAlpha = 1 - klamp((ferdigT - 0.8) / 0.5);
  fiskFigur(ctx, x + u * S * 0.15, vann - L * 0.28 - Math.sin(u * Math.PI * 0.9) * S * 0.45 - u * S * 0.1, L, -0.15 - u * 1.2, FISKEFARGER[k.str]);
  ctx.globalAlpha = 1;
}

// --- Korn --------------------------------------------------------------------
function straa(ctx, bx, by, h, vinkel, kuttet) {
  const tx = bx + Math.sin(vinkel) * h, ty = by - Math.cos(vinkel) * h;
  ctx.strokeStyle = '#b89a3e';
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.lineCap = 'round';
  if (kuttet) {
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.sin(vinkel) * h * 0.15, by - Math.cos(vinkel) * h * 0.15); ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx, by - h * 0.5, tx, ty); ctx.stroke();
  // Akset: små korn langs toppen
  for (let i = 0; i < 6; i++) {
    const u = 0.68 + i * 0.06;
    const cx = bx + (tx - bx) * u + (i % 2 ? 1 : -1) * h * 0.035, cy = by + (ty - by) * u;
    ctx.fillStyle = i % 2 ? FIGUR.korn[0] : FIGUR.korn[1];
    ctx.beginPath(); ctx.ellipse(cx, cy, h * 0.035, h * 0.06, vinkel, 0, Math.PI * 2); ctx.fill();
  }
}

function figurKorn(ctx, S, r, k, p, ferdigT, t) {
  const rs = lagTilfeldig(k.seed + 40);
  const vind = (i) => Math.sin(t * 1.6 + i * 0.7) * 0.05;
  let straaene = [];
  if (k.str === 0) {
    // En liten tust med kornaks
    for (let i = 0; i < 5; i++) straaene.push([S * (0.42 + i * 0.04), S * 0.84, S * (0.36 + rs.tall() * 0.1), (i - 2) * 0.12]);
  } else if (k.str === 1) {
    // Et kornband: straa samlet i midten
    for (let i = 0; i < 11; i++) straaene.push([S * (0.4 + i * 0.02), S * 0.86, S * (0.5 + rs.tall() * 0.08), (i - 5) * 0.06]);
  } else {
    // En liten åker: rader med straa på mørk jord
    poly(ctx, [[S * 0.1, S * 0.36], [S * 0.9, S * 0.36], [S * 0.92, S * 0.92], [S * 0.08, S * 0.92]], mork(FIGUR.jord, 0.05));
    for (let rad = 0; rad < 5; rad++) {
      for (let i = 0; i < 7; i++) straaene.push([S * (0.16 + i * 0.113 + (rad % 2) * 0.03), S * (0.46 + rad * 0.1), S * 0.22, (rs.tall() - 0.5) * 0.2]);
    }
  }
  // Rekkefølgen strå blir kuttet i (ett nytt kutt for hvert trykk, omtrent)
  const orden = straaene.map((_, i) => i).sort(() => rs.tall() - 0.5);
  const kuttet = new Set(orden.slice(0, Math.round((ferdigT === null ? p : 1) * straaene.length)));
  if (k.str < 2) skygge(ctx, S * 0.52, S * 0.86, S * 0.16, S * 0.04);
  straaene.forEach(([bx, by, h, v], i) => straa(ctx, bx, by, h, v + vind(i), kuttet.has(i)));
  if (k.str === 1 && !kuttet.size) {
    // Båndet rundt kornbandet
    ctx.fillStyle = '#c0614a';
    ctx.fillRect(S * 0.43, S * 0.66, S * 0.17, S * 0.035);
  }
  if (ferdigT !== null && ferdigT < 1.2) {
    // Et nek med korn som spretter opp
    const u = klamp(ferdigT / 1.2);
    ctx.globalAlpha = 1 - u;
    for (let i = 0; i < 8; i++) {
      const v = -Math.PI / 2 + (i - 3.5) * 0.3;
      ctx.fillStyle = FIGUR.korn[i % 2];
      ctx.beginPath(); ctx.arc(S * 0.5 + Math.cos(v) * u * S * 0.35, S * 0.6 + Math.sin(v) * u * S * 0.35, S * 0.02, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// --- Sau og ull --------------------------------------------------------------
function figurSau(ctx, S, r, k, p, ferdigT, t) {
  const s = [0.62, 0.9, 1.25][k.str];
  const hopp = ferdigT === null ? 0 : Math.abs(Math.sin(klamp(ferdigT / 1.2) * Math.PI * 2)) * S * 0.1 * (1 - klamp(ferdigT / 1.6));
  const x = S * 0.5, y = S * 0.8 - hopp;
  // Pust: ulla løfter seg litt. Beiting: hodet går ned i gresset og opp igjen.
  const pust = 1 + 0.03 * Math.sin(t * 2.2 + k.seed % 7);
  const b = 0.5 + 0.5 * Math.sin(t * 0.7 + (k.seed % 13));
  const beite = ferdigT === null ? b * b * (3 - 2 * b) : 0;
  const ull = (ferdigT === null ? 1 - 0.5 * p : 0.5) * pust;   // ulla blir mindre for hvert klipp
  skygge(ctx, x + S * 0.02, S * 0.8 + S * 0.02, S * 0.2 * s, S * 0.05 * s);
  // Bein
  ctx.fillStyle = '#3b3a3f';
  for (const dx of [-0.11, -0.05, 0.05, 0.11]) ctx.fillRect(x + S * dx * s, y - S * 0.06 * s, S * 0.03 * s, S * 0.08 * s);
  // Klippet kropp under ulla
  poly(ctx, klump(lagTilfeldig(k.seed + 50), x, y - S * 0.12 * s, S * 0.13 * s, S * 0.08 * s, 9, 0.05), '#ead8c7');
  // Ulla
  if (ull > 0.5 || ferdigT === null) {
    fasett(ctx, klump(r, x, y - S * 0.13 * s, S * 0.2 * s * ull, S * 0.13 * s * ull, 11, 0.12), FIGUR.ull, { styrke: 0.7 });
  }
  // Halen logrer
  const hale = Math.sin(t * 7 + k.seed % 5) * S * 0.012 * s;
  poly(ctx, [[x + S * 0.18 * s, y - S * 0.16 * s], [x + S * 0.24 * s, y - S * 0.15 * s + hale], [x + S * 0.19 * s, y - S * 0.11 * s]], FIGUR.ull);
  // Hode og øre
  const hx = x - S * (0.2 + 0.015 * beite) * s, hy = y - S * (0.16 - 0.08 * beite) * s;
  fasett(ctx, [[hx - S * 0.07 * s, hy + S * 0.02 * s], [hx - S * 0.02 * s, hy - S * 0.07 * s], [hx + S * 0.05 * s, hy - S * 0.03 * s], [hx + S * 0.03 * s, hy + S * 0.06 * s]], '#45434a');
  poly(ctx, [[hx + S * 0.02 * s, hy - S * 0.05 * s], [hx + S * 0.09 * s, hy - S * 0.08 * s], [hx + S * 0.05 * s, hy - S * 0.01 * s]], '#3b3a3f');
  if ((t * 0.45 + (k.seed % 9) * 0.1) % 3 > 0.12) {   // blunker av og til
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hx - S * 0.02 * s, hy - S * 0.015 * s, S * 0.012 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (k.str === 2) {
    // Væren har horn
    ctx.strokeStyle = '#c9b79a';
    ctx.lineWidth = S * 0.025;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx + S * 0.035, hy - S * 0.02, S * 0.04, Math.PI * 1.1, Math.PI * 2.6); ctx.stroke();
  }
}

// --- Kister ------------------------------------------------------------------
const KISTEFARGER = [
  { kropp: { topp: '#c99a62', venstre: '#b07a45', hoyre: '#86582f' }, lokk: ['#d6a86e', '#946137'], baand: '#6b6f78', laas: '#e2b33c' },
  { kropp: { topp: '#9c6438', venstre: '#8a5530', hoyre: '#653b1f' }, lokk: ['#a8703f', '#6e4223'], baand: '#d9a520', laas: '#ffd23f' },
  { kropp: { topp: '#46697c', venstre: '#35505f', hoyre: '#253b47' }, lokk: ['#4f7488', '#2a4250'], baand: '#e0b13a', laas: '#ffd23f' },
];

function figurKiste(ctx, S, r, k, p, ferdigT, t) {
  const f = KISTEFARGER[k.str], s = [1, 1.35, 1.75][k.str];
  const W = S * 0.15 * s, D = S * 0.1 * s, H = S * 0.13 * s, R = S * 0.07 * s;
  const ax = S * 0.5, ay = S * 0.86 - (W + D) * 0.5;
  const q = iso(ax, ay);
  skygge(ctx, ax + W * 0.1, ay + (W + D) * 0.18, (W + D) * 1.0, (W + D) * 0.34, 0.25);
  kasse(ctx, ax, ay, 2 * W, 2 * D, H, f.kropp);

  // Bånd og lås på kassen
  const bred = Math.max(1.5, S * 0.016 * s);
  ctx.lineWidth = bred;
  ctx.strokeStyle = f.baand;
  for (const u of [-0.6, 0.6]) {
    ctx.beginPath(); ctx.moveTo(...q(u * W, D, 0)); ctx.lineTo(...q(u * W, D, H)); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(...q(W, 0, 0)); ctx.lineTo(...q(W, 0, H)); ctx.stroke();
  if (k.str === 2) {
    ctx.fillStyle = f.laas;
    for (const u of [-0.6, 0.6]) for (const v of [0.2, 0.5, 0.8]) {
      ctx.beginPath(); ctx.arc(...q(u * W, D, v * H), bred * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Lokket hengsles bak: θ = 0 lukket, ca. 110° helt åpent.
  const theta = ferdigT === null ? 0 : sprett(ferdigT / 0.45) * 1.9;
  const roter = (y, z) => {
    const ry = y + D, rz = z;
    return [-D + ry * Math.cos(theta) - rz * Math.sin(theta), H + ry * Math.sin(theta) + rz * Math.cos(theta)];
  };
  // Lokket er en halv tønne: profilen går fra fremre kant (0) over toppen til hengslet bak (N).
  const N = 6;
  const profil = Array.from({ length: N + 1 }, (_, i) => {
    const a = (i / N) * Math.PI;
    return roter(D * Math.cos(a), R * Math.sin(a));
  });
  const L3 = (x, [y, z]) => q(x, y, z);

  if (theta > 0) {
    // Innsiden: mørk, med gull og et varmt lys som strømmer ut.
    poly(ctx, [q(-W, -D, H), q(W, -D, H), q(W, D, H), q(-W, D, H)], '#3a2414');
    const [gx, gy] = q(0, 0, H);
    const lysR = (W + D) * 1.6 * klamp(ferdigT / 0.4);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, lysR);
    g.addColorStop(0, 'rgba(255, 236, 140, 0.95)');
    g.addColorStop(1, 'rgba(255, 220, 100, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(gx, gy, lysR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = FIGUR.gull[0];
    for (const [u, v] of [[-0.4, 0.2], [0.1, -0.2], [0.4, 0.3], [-0.1, 0.5], [0.3, -0.5]]) {
      ctx.beginPath(); ctx.arc(...q(u * W, v * D, H + S * 0.012 * s), S * 0.022 * s, 0, Math.PI * 2); ctx.fill();
    }
    // Lysstråler opp av kista
    ctx.strokeStyle = `rgba(255, 236, 160, ${0.5 * (1 - klamp((ferdigT - 1.2) / 1.2))})`;
    ctx.lineWidth = S * 0.012;
    for (let i = 0; i < 7; i++) {
      const v = -Math.PI / 2 + (i - 3) * 0.28 + Math.sin(t * 2 + i) * 0.05;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(v) * S * 0.5, gy + Math.sin(v) * S * 0.5);
      ctx.stroke();
    }
  }

  // Lokkets flater, bakerst først. Når lokket er slått opp, snur rekkefølgen.
  const rekke = [...Array(N).keys()];
  if (theta < Math.PI / 2) rekke.reverse();
  for (const i of rekke) {
    const a = ((i + 0.5) / N) * Math.PI + theta;
    const opp = Math.sin(a), fram = Math.cos(a);
    const farge = fram < -0.2 && theta > 0.6 ? mork(f.lokk[1], 0.3)
      : opp > 0.75 ? lys(f.lokk[0], 0.14) : fram > 0 ? f.lokk[0] : mork(f.lokk[0], 0.18);
    poly(ctx, [L3(-W, profil[i]), L3(W, profil[i]), L3(W, profil[i + 1]), L3(-W, profil[i + 1])], farge);
  }
  poly(ctx, profil.map((pp) => L3(W, pp)), f.lokk[1]); // gavlen (høyre ende)
  ctx.strokeStyle = f.baand;
  ctx.lineWidth = bred;
  ctx.lineJoin = 'round';
  for (const u of [-0.6, 0.6]) {
    ctx.beginPath();
    profil.forEach((pp, i) => (i ? ctx.lineTo(...L3(u * W, pp)) : ctx.moveTo(...L3(u * W, pp))));
    ctx.stroke();
  }
  ctx.beginPath();
  profil.forEach((pp, i) => (i ? ctx.lineTo(...L3(W, pp)) : ctx.moveTo(...L3(W, pp))));
  ctx.stroke();

  if (ferdigT === null) {
    // Låsen
    poly(ctx, [q(-W * 0.13, D, H * 0.5), q(W * 0.13, D, H * 0.5), q(W * 0.13, D, H * 1.02), q(-W * 0.13, D, H * 1.02)], f.laas);
    ctx.fillStyle = '#3a2a14';
    ctx.beginPath(); ctx.arc(...q(0, D, H * 0.8), S * 0.011 * s, 0, Math.PI * 2); ctx.fill();
    // Lys som lekker ut i sprekken – sterkere jo nærmere man er.
    if (p > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 220, 100, 0.9)';
      ctx.shadowBlur = 6 + 14 * p;
      ctx.strokeStyle = `rgba(255, 228, 120, ${0.35 + 0.65 * p})`;
      ctx.lineWidth = 1 + 2.5 * p;
      ctx.beginPath();
      ctx.moveTo(...q(-W, D, H)); ctx.lineTo(...q(W, D, H)); ctx.lineTo(...q(W, -D, H));
      ctx.stroke();
      ctx.restore();
    }
  }
}

// --- Skattekryss (her ligger det en kiste begravet) ---------------------------
/**
 * Et rødt kryss malt på bakken som pulserer og glitrer. Når man graver, vokser
 * hullet og jordhaugen ved siden av. igjen = gravetrykk som gjenstår, rist = 0–1 like etter et trykk.
 */
export function tegnKryss(ctx, S, t, igjen, maks = 4, rist = 0) {
  const x = S * 0.5 + Math.sin(t * 60) * rist * S * 0.02, y = S * 0.56;
  const gravd = (maks - igjen) / maks;
  if (gravd > 0) {
    // Jordhaug til høyre og hullet i midten
    const hr = S * (0.06 + 0.1 * gravd);
    poly(ctx, klump(lagTilfeldig(7), x + S * 0.24, y + S * 0.08, hr, hr * 0.55, 7, 0.2), '#8a5a3a');
    poly(ctx, klump(lagTilfeldig(8), x + S * 0.22, y + S * 0.05, hr * 0.7, hr * 0.38, 6, 0.2), '#a8744a');
    ctx.fillStyle = '#5b3a24';
    ctx.beginPath(); ctx.ellipse(x, y, S * (0.1 + 0.12 * gravd), S * (0.04 + 0.05 * gravd), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e1d12';
    ctx.beginPath(); ctx.ellipse(x, y + S * 0.01, S * (0.07 + 0.09 * gravd), S * (0.025 + 0.035 * gravd), 0, 0, Math.PI * 2); ctx.fill();
  }
  // Krysset (litt mindre for hvert trykk, som om det graves bort)
  const puls = 1 + 0.07 * Math.sin(t * 4) + rist * 0.15;
  const r = S * 0.22 * puls * (1 - gravd * 0.35);
  ctx.lineCap = 'round';
  for (const [farge, b] of [['rgba(60, 10, 10, 0.55)', 0.11], ['#e0393e', 0.075], ['#ff7a6b', 0.025]]) {
    ctx.strokeStyle = farge;
    ctx.lineWidth = S * b * (1 - gravd * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.6); ctx.lineTo(x + r, y + r * 0.6);
    ctx.moveTo(x + r, y - r * 0.6); ctx.lineTo(x - r, y + r * 0.6);
    ctx.stroke();
  }
  // Glitter som viser at her er det noe
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.7 + k / 3) % 1;
    const a = Math.sin(Math.PI * u);
    const gx = x + Math.cos(k * 2.1 + 0.5) * S * 0.25, gy = y - S * 0.12 + Math.sin(k * 2.1 + 0.5) * S * 0.12;
    const g = S * 0.035 * a;
    ctx.globalAlpha = a;
    poly(ctx, [[gx, gy - g], [gx + g * 0.25, gy - g * 0.25], [gx + g, gy], [gx + g * 0.25, gy + g * 0.25], [gx, gy + g],
      [gx - g * 0.25, gy + g * 0.25], [gx - g, gy], [gx - g * 0.25, gy - g * 0.25]], '#fff4c2');
  }
  ctx.globalAlpha = 1;
}

// --- Hjelperne: små mennesker som samler inn for deg ------------------------
const HUD = '#f2c9a0', HAAR = ['#5b3a24', '#e3b04b', '#2b2a2e', '#a0522d', '#d9d4c7'];

/** Verktøyet hjelperen bærer, etter hva den skal samle inn. Tegnes fra hånda (0, 0) og oppover langs −y. */
function verktoy(ctx, type, h) {
  const skaft = (l) => { ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(0, h * 0.05); ctx.lineTo(0, -l); ctx.stroke(); };
  if (type === 'tre') {          // øks
    skaft(h * 0.42);
    poly(ctx, [[0, -h * 0.42], [h * 0.16, -h * 0.47], [h * 0.18, -h * 0.3], [0, -h * 0.33]], '#b8c3cf');
  } else if (type === 'stein' || type === 'jern') {   // hakke
    skaft(h * 0.42);
    poly(ctx, [[-h * 0.2, -h * 0.36], [0, -h * 0.46], [h * 0.2, -h * 0.36], [0, -h * 0.41]], '#8d929e');
  } else if (type === 'korn') {  // ljå
    skaft(h * 0.55);
    poly(ctx, [[0, -h * 0.55], [-h * 0.3, -h * 0.5], [-h * 0.36, -h * 0.42], [-h * 0.05, -h * 0.5]], '#d8dde3');
  } else if (type === 'fisk') {  // fiskestang med snøre
    ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = h * 0.035;
    ctx.beginPath(); ctx.moveTo(0, h * 0.05); ctx.lineTo(h * 0.15, -h * 0.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = Math.max(0.6, h * 0.012);
    ctx.beginPath(); ctx.moveTo(h * 0.15, -h * 0.6); ctx.quadraticCurveTo(h * 0.45, -h * 0.4, h * 0.42, h * 0.1); ctx.stroke();
  } else if (type === 'ull') {   // saks
    ctx.strokeStyle = '#b8c3cf'; ctx.lineWidth = h * 0.04;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h * 0.04, -h * 0.2); ctx.moveTo(0, 0); ctx.lineTo(-h * 0.04, -h * 0.2); ctx.stroke();
  } else if (type === 'bok') {   // en bok
    poly(ctx, [[-h * 0.1, -h * 0.02], [h * 0.1, -h * 0.02], [h * 0.1, -h * 0.2], [-h * 0.1, -h * 0.2]], '#c0392b');
    poly(ctx, [[-h * 0.08, -h * 0.04], [h * 0.08, -h * 0.04], [h * 0.08, -h * 0.18], [-h * 0.08, -h * 0.18]], '#f3e7cf');
    poly(ctx, [[-h * 0.006, -h * 0.02], [h * 0.006, -h * 0.02], [h * 0.006, -h * 0.2], [-h * 0.006, -h * 0.2]], '#8e2a20');
  } else {                       // kurv
    poly(ctx, [[-h * 0.1, 0], [h * 0.1, 0], [h * 0.08, h * 0.1], [-h * 0.08, h * 0.1]], '#c9a26b');
  }
}

/**
 * Et lite menneske med føttene i (x, y) og høyde h.
 * o: { farge (skjorta), nr (hår), t (sekunder), gaar (0–1), arbeid (0–1), type (verktøy), mot (−1 venstre / 1 høyre), vink }
 */
export function tegnMenneske(ctx, x, y, h, { farge = '#3a74d8', nr = 0, t = 0, gaar = 0, arbeid = 0, type = null, mot = 1, vink = 0, briller = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20, 25, 15, 0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, h * 0.2, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  const hopp = gaar ? Math.abs(Math.sin(t * 9)) * h * 0.04 * gaar : 0;
  ctx.translate(0, -hopp);
  ctx.scale(mot, 1);
  // Bein
  const steg = Math.sin(t * 9) * h * 0.1 * gaar;
  ctx.strokeStyle = '#3d3a4a';
  ctx.lineWidth = h * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-h * 0.05, -h * 0.4); ctx.lineTo(-h * 0.06 + steg, -h * 0.03);
  ctx.moveTo(h * 0.05, -h * 0.4); ctx.lineTo(h * 0.06 - steg, -h * 0.03);
  ctx.stroke();
  // Kropp (skjorte)
  poly(ctx, [[-h * 0.13, -h * 0.42], [h * 0.13, -h * 0.42], [h * 0.11, -h * 0.72], [-h * 0.11, -h * 0.72]], farge);
  poly(ctx, [[h * 0.02, -h * 0.42], [h * 0.13, -h * 0.42], [h * 0.11, -h * 0.72], [h * 0.02, -h * 0.72]], mork(farge, 0.2));
  // Bakre arm
  ctx.strokeStyle = mork(farge, 0.25);
  ctx.lineWidth = h * 0.07;
  ctx.beginPath(); ctx.moveTo(-h * 0.1, -h * 0.68); ctx.lineTo(-h * 0.16 - steg * 0.5, -h * 0.46); ctx.stroke();
  // Hode med hår
  ctx.fillStyle = HUD;
  ctx.beginPath(); ctx.arc(0, -h * 0.84, h * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = HAAR[nr % HAAR.length];
  ctx.beginPath(); ctx.arc(0, -h * 0.87, h * 0.135, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = '#2b2a2e';
  ctx.beginPath(); ctx.arc(h * 0.06, -h * 0.84, h * 0.018, 0, Math.PI * 2); ctx.fill();
  if (briller) {
    ctx.strokeStyle = '#2b2a2e';
    ctx.lineWidth = Math.max(0.6, h * 0.014);
    ctx.beginPath(); ctx.arc(h * 0.065, -h * 0.84, h * 0.04, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h * 0.025, -h * 0.845); ctx.lineTo(-h * 0.09, -h * 0.86); ctx.stroke();
  }
  // Fremre arm med verktøyet; når den arbeider, svinger den
  const fisker = arbeid && type === 'fisk';
  const sving = fisker ? -0.6 + Math.sin(t * 1.5) * 0.08
    : arbeid ? -0.9 + Math.abs(Math.sin(t * 6)) * 1.6
    : vink ? -2.6 + Math.sin(t * 10) * 0.35 : 0.25 - steg * 0.02;
  ctx.save();
  ctx.translate(h * 0.08, -h * 0.68);
  ctx.rotate(sving);
  ctx.strokeStyle = farge;
  ctx.lineWidth = h * 0.07;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h * 0.24); ctx.stroke();
  ctx.fillStyle = HUD;
  ctx.beginPath(); ctx.arc(0, h * 0.26, h * 0.04, 0, Math.PI * 2); ctx.fill();
  if (type && !vink) {
    ctx.translate(0, h * 0.26);
    // I arbeid peker verktøyet framover; på vei ut og hjem bæres det oppreist.
    ctx.rotate(arbeid ? Math.PI * 0.5 : -0.25);
    verktoy(ctx, type, h);
  }
  ctx.restore();
  ctx.restore();
}

// --- Hjort (pynt på brettet, ikke noe man samler) -----------------------------
/** Hjorten løfter hodet, ser seg rundt og beiter; halen vipper. */
export function tegnHjort(ctx, S, t, seed = 0) {
  const x = S * 0.5, y = S * 0.7, f = FIGUR.hjort;
  skygge(ctx, x + S * 0.02, y + S * 0.01, S * 0.15, S * 0.04);
  ctx.fillStyle = f[1];
  for (const dx of [-0.1, -0.06, 0.06, 0.1]) ctx.fillRect(x + S * dx, y - S * 0.1, S * 0.022, S * 0.11);
  const vipp = Math.max(0, Math.sin(t * 3 + seed)) * S * 0.03;
  poly(ctx, [[x + S * 0.12, y - S * 0.17], [x + S * 0.17, y - S * 0.2 - vipp], [x + S * 0.14, y - S * 0.14]], '#f4ece0');
  poly(ctx, [[x - S * 0.13, y - S * 0.18], [x + S * 0.12, y - S * 0.17], [x + S * 0.13, y - S * 0.08], [x - S * 0.12, y - S * 0.08]], f[0]);
  poly(ctx, [[x - S * 0.12, y - S * 0.08], [x + S * 0.13, y - S * 0.08], [x + S * 0.1, y - S * 0.12]], f[1]);
  // Hodet dreier rundt halsroten: ned for å beite, opp for å se seg rundt.
  const b = 0.5 + 0.5 * Math.sin(t * 0.55 + seed);
  const a = (b * b * (3 - 2 * b)) * 0.8 - 0.1;
  const rot = ([px, py]) => {
    const ox = x - S * 0.1, oy = y - S * 0.17;
    const dx = px - ox, dy = py - oy;
    return [ox + dx * Math.cos(-a) - dy * Math.sin(-a), oy + dx * Math.sin(-a) + dy * Math.cos(-a)];
  };
  poly(ctx, [[x - S * 0.13, y - S * 0.18], [x - S * 0.17, y - S * 0.3], [x - S * 0.12, y - S * 0.31], [x - S * 0.08, y - S * 0.17]].map(rot), f[0]);
  poly(ctx, [[x - S * 0.2, y - S * 0.32], [x - S * 0.11, y - S * 0.34], [x - S * 0.13, y - S * 0.27]].map(rot), f[1]);
  ctx.strokeStyle = '#e9dcc0';
  ctx.lineWidth = S * 0.012;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(...rot([x - S * 0.15, y - S * 0.33]));
    ctx.lineTo(...rot([x - S * (0.15 + side * 0.05), y - S * 0.43]));
    ctx.moveTo(...rot([x - S * (0.15 + side * 0.03), y - S * 0.38]));
    ctx.lineTo(...rot([x - S * (0.15 + side * 0.08), y - S * 0.39]));
    ctx.stroke();
  }
}

const FIGURER = {
  tre: figurTre, stein: figurStein, jern: figurJern, fisk: figurFisk, korn: figurKorn, ull: figurSau, kiste: figurKiste,
};

/**
 * Tegner tingen. ting = { type, str (0–2), seed }. p = andel trykk som er gjort,
 * ferdigT = sekunder siden den ble ferdig (null = ikke ferdig), t = klokka (for bevegelse).
 */
export function tegnFigur(ctx, S, ting, { p = 0, ferdigT = null, t = 0 } = {}) {
  const k = { str: ting.str, seed: ting.seed, def: { id: ting.type } };
  FIGURER[ting.type](ctx, S, lagTilfeldig(ting.seed), k, p, ferdigT, t);
}
