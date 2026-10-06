// Prøveark for «Øya i hundre år»: trykk med toner (kister, tre, stein, tåke),
// sola som dagsbudsjett, natta med stjerneskudd, og tidsspranget der brettet eldes.
// Bruker de samme kortene som spillet (js/stil/*).

import { tegnKort, tegnUkjent, tegnTomtKort } from './stil/ruter.js';
import { BAKGRUNN, FIGUR } from './stil/palett.js';
import { poly, fasett, klump, kasse, iso, skygge, stein, lys, mork } from './stil/lavpoly.js';
import { lagTilfeldig, blandSeed } from './rng.js';
import * as L from './trykk/toner.js';

const $ = (id) => document.getElementById(id);
const naa = () => performance.now() / 1000;
const klamp = (u, a = 0, b = 1) => Math.max(a, Math.min(b, u));
const myk = (u) => { u = klamp(u); return u * u * (3 - 2 * u); };
const ut = (u) => 1 - Math.pow(1 - klamp(u), 3);
const sprett = (u) => { u = klamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

const IKON = { tre: '🪵', stein: '🪨', mat: '🍎', fro: '🌰', nokkel: '🗝️', skatt: '💎', stov: '✨' };
const VARENAVN = { tre: 'tre', stein: 'stein', mat: 'mat', fro: 'frø', nokkel: 'nøkler', skatt: 'skatter', stov: 'stjernestøv' };
const SOL = { liten: 60, stor: 40 };

const T = {
  nivaa: 'stor',
  sol: SOL.stor,
  solVis: 0,          // sola glir mot riktig plass
  natt: null,
  forrad: Object.fromEntries(Object.keys(IKON).map((k) => [k, 0])),
  kort: [],
  K: 200,
};

// ---------------------------------------------------------------------------
// Tingene man trykker på. Antall trykk = antall toner i melodien.
// ---------------------------------------------------------------------------
const TING = [
  { id: 'take', navn: 'Tåke', melodi: 'take', instrument: 'sus', bunn: null, gir: () => ({}) },
  { id: 'tre', navn: 'Tre', melodi: 'fugler', instrument: 'hogg', bunn: 'eng', gir: () => ({ tre: 3 }) },
  { id: 'stein', navn: 'Stein', melodi: 'baa', instrument: 'treblokk', bunn: 'aas', gir: () => ({ stein: 3 }) },
  { id: 'liten', navn: 'Liten kiste', melodi: 'ro', lengde: 5, instrument: 'xylofon', bunn: 'strand', str: 1,
    gir: (r) => r.velg([{ mat: 2 }, { fro: 1, mat: 1 }, { tre: 2, mat: 1 }]) },
  { id: 'stor', navn: 'Stor kiste', melodi: 'ro', instrument: 'xylofon', bunn: 'eng', str: 1.35,
    gir: (r) => r.velg([{ fro: 2, nokkel: 1 }, { skatt: 1, mat: 3 }, { fro: 1, skatt: 1, tre: 2 }]) },
  { id: 'kjempe', navn: 'Kjempekiste', melodi: 'jakob', instrument: 'xylofon', bunn: 'eng', str: 1.75,
    gir: () => ({ skatt: 3, nokkel: 1, stov: 5 }), ekstra: '📜 Byggetegning: Fyrtårn!' },
];

const AVDEKK = [
  { terreng: 'eng', overlegg: 'skatt' }, { terreng: 'skog' }, { terreng: 'eng', overlegg: 'sau' }, { terreng: 'vann' },
  { terreng: 'eng', overlegg: 'baer' }, { terreng: 'aas' }, { terreng: 'strand', overlegg: 'skatt' }, { terreng: 'skog', overlegg: 'hjort' },
];

function lerret(S, H = S) {
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement('canvas');
  c.width = Math.round(S * dpr);
  c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return [c, ctx];
}

function nyTing(def) {
  const k = {
    def, seed: (Math.random() * 1e9) | 0, tTrykk: -9, tFerdig: null, tStart: naa(), partikler: [],
    antall: def.lengde ?? L.MELODI[def.melodi].length,
  };
  k.igjen = k.antall;
  if (def.id === 'take') {
    const r = lagTilfeldig(k.seed);
    const [u, uc] = lerret(T.K);
    tegnKort(uc, T.K, r, r.velg(AVDEKK));
    k.under = u;
    const [f, fc] = lerret(T.K);
    tegnUkjent(fc, T.K, lagTilfeldig(k.seed + 1));
    k.take = f;
    k.takeCtx = fc;
  }
  return k;
}

// ---------------------------------------------------------------------------
// Oppsett av kortene (bygges på nytt når skjermen endrer størrelse)
// ---------------------------------------------------------------------------
function byggTing() {
  const boks = $('ting');
  const w = boks.clientWidth;
  const kol = w >= 620 ? 3 : 2;
  T.K = Math.min(230, Math.floor((w - (kol - 1) * 18) / kol));
  boks.style.gridTemplateColumns = `repeat(${kol}, ${T.K}px)`;
  boks.innerHTML = '';
  T.kort = TING.map((def) => {
    const fig = document.createElement('figure');
    const [c, ctx] = lerret(T.K, T.K + 34);
    c.style.width = `${T.K}px`;
    c.style.height = `${T.K + 34}px`;
    const cap = document.createElement('figcaption');
    fig.append(c, cap);
    boks.append(fig);
    const k = nyTing(def);
    k.el = { canvas: c, ctx, cap };
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); trykk(k, e); });
    oppdaterTekst(k);
    return k;
  });
}

function oppdaterTekst(k) {
  if (T.nivaa === 'liten') { k.el.cap.textContent = ''; return; }
  k.el.cap.textContent = k.tFerdig !== null ? `${k.def.navn} · åpnet!`
    : `${k.def.navn} · ${k.igjen} av ${k.antall} trykk igjen`;
}

// ---------------------------------------------------------------------------
// Trykk
// ---------------------------------------------------------------------------
function trykk(k, e) {
  L.vekk();
  if (T.natt || k.tFerdig !== null) return;
  if (T.sol <= 0) { L.tomt(); return; }
  const r = k.el.canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = Math.min(T.K * 0.95, e.clientY - r.top);
  const nr = k.antall - k.igjen;
  L.INSTRUMENT[k.def.instrument](L.MELODI[k.def.melodi][nr]);
  k.igjen--;
  k.tTrykk = naa();
  T.sol--;
  sprut(k, x, y);
  if (k.def.id === 'take') borst(k, x, y);
  if (k.igjen <= 0) ferdig(k);
  else if (T.sol <= 0) setTimeout(startNatt, 900);
  oppdaterTekst(k);
  oppdaterSolTekst();
}

function borst(k, x, y) {
  const c = k.takeCtx, S = T.K;
  c.save();
  c.globalCompositeOperation = 'destination-out';
  const g = c.createRadialGradient(x, y, 0, x, y, S * 0.36);
  g.addColorStop(0, 'rgba(0,0,0,0.92)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  c.restore();
}

const SPRUTFARGER = {
  take: ['#3a4250', '#5a6372', '#7d8494'],
  tre: ['#8a5c38', '#e8c48a', '#6f9a3f', '#8fbf55'],
  stein: ['#9aa1ae', '#7d7f8a', '#c4c9d2'],
  kiste: ['#ffd23f', '#ffe58a', '#fff4c2'],
};

function sprut(k, x, y, { antall = 7, kraft = 1, farger } = {}) {
  const f = farger ?? SPRUTFARGER[k.def.id] ?? SPRUTFARGER.kiste;
  const t = naa();
  for (let i = 0; i < antall; i++) {
    const v = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const fart = (90 + Math.random() * 160) * kraft;
    k.partikler.push({
      x, y, vx: Math.cos(v) * fart, vy: Math.sin(v) * fart, t0: t, liv: 0.6 + Math.random() * 0.5,
      r: 2 + Math.random() * 3.5, farge: f[Math.floor(Math.random() * f.length)], spinn: Math.random() * 6,
    });
  }
}

function ferdig(k) {
  k.tFerdig = naa();
  const gave = k.def.gir(lagTilfeldig(k.seed + 7));
  setTimeout(() => L.fanfare(k.def.str ?? 1), 180);
  if (k.def.id === 'take') L.vend();
  if (k.def.str) sprut(k, T.K * 0.5, T.K * 0.55, { antall: 26, kraft: 1.4 });
  setTimeout(() => flyTil(k, gave), 550);
  if (k.def.ekstra) setTimeout(() => melding(k.def.ekstra), 900);
  setTimeout(() => {
    Object.assign(k, nyTing(k.def));
    oppdaterTekst(k);
  }, 3000);
  if (T.sol <= 0) setTimeout(startNatt, 2600);
}

/** Tingene flyr fra kortet ned i forrådet. */
function flyTil(k, gave, fra = null) {
  const r = k?.el.canvas.getBoundingClientRect();
  const start = fra ?? { x: r.left + r.width / 2, y: r.top + T.K * 0.5 };
  let forsink = 0;
  for (const [vare, n] of Object.entries(gave)) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'flyr';
      s.textContent = IKON[vare];
      s.style.left = `${start.x}px`;
      s.style.top = `${start.y}px`;
      document.body.append(s);
      const m = $(`f-${vare}`).getBoundingClientRect();
      const dx = m.left + m.width / 2 - start.x, dy = m.top + m.height / 2 - start.y;
      setTimeout(() => { s.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`; }, 40 + forsink);
      setTimeout(() => {
        s.remove();
        T.forrad[vare]++;
        tegnForrad(vare);
      }, 900 + forsink);
      forsink += 110;
    }
  }
}

function tegnForrad(dunk) {
  const boks = $('forrad');
  if (!boks.children.length) {
    for (const v of Object.keys(IKON)) {
      const el = document.createElement('span');
      el.id = `f-${v}`;
      el.className = 'vare';
      boks.append(el);
    }
  }
  for (const v of Object.keys(IKON)) {
    const el = $(`f-${v}`), n = T.forrad[v];
    if (T.nivaa === 'stor') {
      el.innerHTML = `${IKON[v]} <b>${n}</b> <small>${VARENAVN[v]}</small>`;
    } else {
      // De minste ser en haug, ikke et tall.
      el.innerHTML = n ? `${IKON[v].repeat(Math.min(n, 8))}${n > 8 ? '<small>+</small>' : ''}` : `<span class="tom">${IKON[v]}</span>`;
    }
  }
  if (dunk) {
    const el = $(`f-${dunk}`);
    el.classList.remove('dunk');
    void el.offsetWidth;
    el.classList.add('dunk');
  }
}

let meldingTid = 0;
function melding(tekst) {
  const el = $('melding');
  el.textContent = tekst;
  el.hidden = false;
  el.classList.remove('vis');
  void el.offsetWidth;
  el.classList.add('vis');
  clearTimeout(meldingTid);
  meldingTid = setTimeout(() => { el.hidden = true; }, 2600);
}

// ---------------------------------------------------------------------------
// Tegning av tingene
// ---------------------------------------------------------------------------
function tegnTing(k, t) {
  const { ctx } = k.el;
  const S = T.K;
  ctx.clearRect(0, 0, S, S + 34);
  const p = 1 - k.igjen / k.antall;
  const alder = t - k.tTrykk;
  const ferdigT = k.tFerdig === null ? null : t - k.tFerdig;
  const inn = sprett((t - k.tStart) / 0.4);

  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(inn, inn);
  ctx.translate(-S / 2, -S / 2);
  if (k.def.id === 'take') {
    ctx.drawImage(k.under, 0, 0, S, S);
    ctx.globalAlpha = ferdigT === null ? 1 : 1 - klamp(ferdigT / 0.45);
    ctx.drawImage(k.take, 0, 0, S, S);
    ctx.globalAlpha = 1;
  } else {
    tegnTomtKort(ctx, S, lagTilfeldig(k.seed + 3), k.def.bunn, () => {
      // Vugg og klem rundt foten av figuren når man trykker.
      const vugg = ferdigT === null ? Math.exp(-alder * 7) * Math.sin(alder * 38) * 0.07 : 0;
      const klem = ferdigT === null ? Math.exp(-alder * 16) * 0.08 : 0;
      ctx.save();
      ctx.translate(S * 0.5, S * 0.86);
      ctx.rotate(vugg);
      ctx.scale(1 + klem * 0.6, 1 - klem);
      ctx.translate(-S * 0.5, -S * 0.86);
      const r = lagTilfeldig(k.seed);
      if (k.def.id === 'tre') figurTre(ctx, S, r, p, ferdigT);
      else if (k.def.id === 'stein') figurStein(ctx, S, r, k, p, ferdigT);
      else figurKiste(ctx, S, k, p, ferdigT, t);
      ctx.restore();
    });
  }
  ctx.restore();

  // Spruten (flis, gnister, tåkedotter)
  k.partikler = k.partikler.filter((q) => t - q.t0 < q.liv);
  for (const q of k.partikler) {
    const a = t - q.t0;
    const x = q.x + q.vx * a, y = q.y + q.vy * a + 380 * a * a;
    ctx.globalAlpha = 1 - a / q.liv;
    ctx.fillStyle = q.farge;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(q.spinn * a * 4);
    ctx.fillRect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  tegnPrikker(ctx, S, k);
}

/** Prikker under kortet: én per trykk. Fylte prikker = trykk som er gjort. */
function tegnPrikker(ctx, S, k) {
  const n = k.antall, gjort = n - k.igjen;
  const toRader = n > 12;
  const perRad = toRader ? Math.ceil(n / 2) : n;
  const stor = T.nivaa === 'liten' ? 1.25 : 1;
  const r = Math.min((toRader ? 4.2 : 7.5) * stor, (S - 16) / perRad / 2.6);
  const avst = r * 2.6;
  for (let i = 0; i < n; i++) {
    const rad = toRader ? Math.floor(i / perRad) : 0;
    const kol = i - rad * perRad;
    const x = S / 2 + (kol - (perRad - 1) / 2) * avst;
    const y = S + (toRader ? 10 + rad * avst : 17);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (i < gjort) {
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
    } else {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(250, 242, 219, 0.45)';
      ctx.stroke();
    }
  }
}

function treFigur(ctx, r, x, y, h, p) {
  skygge(ctx, x + h * 0.1, y, h * 0.34, h * 0.09);
  const sb = h * 0.12;
  poly(ctx, [[x - sb / 2, y], [x - sb * 0.38, y - h * 0.48], [x + sb * 0.38, y - h * 0.48], [x + sb / 2, y]], '#8a5c38');
  poly(ctx, [[x + sb * 0.05, y], [x + sb * 0.05, y - h * 0.48], [x + sb * 0.38, y - h * 0.48], [x + sb / 2, y]], '#6a4428');
  if (p > 0) {
    // Hakket i stammen blir dypere for hvert hogg.
    const d = sb * 0.95 * p;
    poly(ctx, [[x - sb / 2 - 0.5, y - h * 0.1], [x - sb / 2 + d, y - h * 0.15], [x - sb / 2 - 0.5, y - h * 0.21]], '#ecc98e');
  }
  fasett(ctx, klump(r, x - h * 0.15, y - h * 0.6, h * 0.25, h * 0.22, 8, 0.12), mork(FIGUR.lov, 0.1));
  fasett(ctx, klump(r, x + h * 0.15, y - h * 0.63, h * 0.24, h * 0.22, 8, 0.12), FIGUR.lov);
  fasett(ctx, klump(r, x, y - h * 0.8, h * 0.27, h * 0.22, 8, 0.12), lys(FIGUR.lov, 0.08));
  for (const [dx, dy] of [[-0.14, -0.62], [0.12, -0.72], [0.02, -0.86], [0.2, -0.56]]) {
    ctx.fillStyle = '#d0453f';
    ctx.beginPath();
    ctx.arc(x + h * dx, y + h * dy, h * 0.028, 0, Math.PI * 2);
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

function figurTre(ctx, S, r, p, ferdigT) {
  const x = S * 0.5, y = S * 0.86, h = S * 0.7;
  if (ferdigT === null) { treFigur(ctx, r, x, y, h, p); return; }
  // Treet faller mot høyre, blir liggende litt og blekner; stubben står igjen.
  stubbe(ctx, x, y, S * 0.06);
  const fall = klamp(ferdigT / 0.75);
  if (ferdigT < 1.8) {
    ctx.save();
    ctx.globalAlpha = 1 - klamp((ferdigT - 1.2) / 0.6);
    ctx.translate(x, y - h * 0.06);
    ctx.rotate((Math.PI / 2) * fall * fall);
    ctx.translate(-x, -(y - h * 0.06));
    treFigur(ctx, r, x, y, h, 1);
    ctx.restore();
  }
}

function figurStein(ctx, S, r, k, p, ferdigT) {
  const x = S * 0.5, y = S * 0.82, R = S * 0.28;
  if (ferdigT === null) {
    stein(ctx, r, x, y, R, FIGUR.stein);
    // Sprekker: én ny for hvert trykk.
    const rs = lagTilfeldig(k.seed + 11);
    const n = Math.round(p * 7);
    ctx.strokeStyle = 'rgba(45, 45, 58, 0.8)';
    ctx.lineWidth = Math.max(1.2, S * 0.012);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
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
  // Steinen sprekker i tre biter som triller fra hverandre.
  const u = ut(ferdigT / 0.7);
  ctx.globalAlpha = 1 - klamp((ferdigT - 1.3) / 0.6);
  [[-1, 0.8], [0.15, 1.2], [1, 0.9]].forEach(([retn, hopp], i) => {
    const px = x + retn * u * S * 0.26;
    const py = y - Math.sin(u * Math.PI) * S * 0.12 * hopp;
    stein(ctx, lagTilfeldig(k.seed + 20 + i), px, py, R * 0.42, i === 1 ? FIGUR.steinMork : FIGUR.stein);
  });
  ctx.globalAlpha = 1;
}

const KISTEFARGER = {
  liten: { kropp: { topp: '#c99a62', venstre: '#b07a45', hoyre: '#86582f' }, lokk: ['#d6a86e', '#946137'], baand: '#6b6f78', laas: '#e2b33c' },
  stor: { kropp: { topp: '#9c6438', venstre: '#8a5530', hoyre: '#653b1f' }, lokk: ['#a8703f', '#6e4223'], baand: '#d9a520', laas: '#ffd23f' },
  kjempe: { kropp: { topp: '#46697c', venstre: '#35505f', hoyre: '#253b47' }, lokk: ['#4f7488', '#2a4250'], baand: '#e0b13a', laas: '#ffd23f' },
};

function figurKiste(ctx, S, k, p, ferdigT, t) {
  const f = KISTEFARGER[k.def.id], s = k.def.str;
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
  if (k.def.id === 'kjempe') {
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

// ---------------------------------------------------------------------------
// Sola og himmelen
// ---------------------------------------------------------------------------
function blandRgb(a, b, u) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * u)).join(',')})`;
}

function himmelFarger(f) {
  // morgen → dag → kveld (topp, bunn)
  const M = ['#9fc7e8', '#f7c9a9'], D = ['#5fa2d8', '#bfe1f5'], K = ['#4f3f86', '#f08a4b'];
  if (f < 0.25) return [blandRgb(M[0], D[0], f / 0.25), blandRgb(M[1], D[1], f / 0.25)];
  if (f < 0.7) return [D[0], D[1]].map((c) => blandRgb(c, c, 0));
  return [blandRgb(D[0], K[0], (f - 0.7) / 0.3), blandRgb(D[1], K[1], (f - 0.7) / 0.3)];
}

function tegnHimmel(t) {
  const c = $('himmel');
  const W = c.clientWidth, H = c.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const maal = 1 - T.sol / SOL[T.nivaa];
  T.solVis += (maal - T.solVis) * 0.12;
  const f = T.solVis;
  const [topp, bunn] = himmelFarger(f);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, topp);
  g.addColorStop(1, bunn);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Sola i en bue fra venstre til høyre
  const sx = W * (0.07 + 0.86 * f), sy = H * 0.95 - Math.sin(Math.PI * f) * H * 0.7;
  const r = Math.min(26, H * 0.24);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.25);
  for (let i = 0; i < 12; i++) {
    const v = (i / 12) * Math.PI * 2;
    poly(ctx, [[Math.cos(v - 0.12) * r * 1.15, Math.sin(v - 0.12) * r * 1.15], [Math.cos(v) * r * 1.75, Math.sin(v) * r * 1.75],
      [Math.cos(v + 0.12) * r * 1.15, Math.sin(v + 0.12) * r * 1.15]], i % 2 ? '#ffc93c' : '#ffe07a');
  }
  ctx.restore();
  const skive = [];
  for (let i = 0; i < 10; i++) { const v = (i / 10) * Math.PI * 2; skive.push([sx + Math.cos(v) * r, sy + Math.sin(v) * r]); }
  fasett(ctx, skive, '#ffd23f', { styrke: 0.8 });
  if (T.nivaa === 'liten') {
    // Et lite smil til de minste
    ctx.fillStyle = '#7a4a10';
    for (const dx of [-0.32, 0.32]) { ctx.beginPath(); ctx.arc(sx + dx * r, sy - r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#7a4a10';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(sx, sy + r * 0.05, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }

  // Åser i bunnen
  const aas = (y0, hoyde, farge, fase) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H - y0 - Math.sin(x / 90 + fase) * hoyde - Math.sin(x / 37 + fase * 2) * hoyde * 0.3);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = farge;
    ctx.fill();
  };
  aas(14, 8, blandRgb('#4e7d35', '#2d3b52', klamp((f - 0.7) / 0.3)), 0.5);
  aas(4, 6, blandRgb('#3d6a2c', '#1f2a3d', klamp((f - 0.7) / 0.3)), 2.1);
}

function oppdaterSolTekst() {
  const el = $('sol-tekst');
  el.textContent = T.nivaa === 'stor' ? `☀️ ${T.sol} av ${SOL.stor} solstråler igjen i dag` : '';
}

// ---------------------------------------------------------------------------
// Natta: stjerneskudd man kan fange
// ---------------------------------------------------------------------------
function startNatt() {
  if (T.natt) return;
  T.natt = { t0: naa(), skudd: [], gnister: [], neste: naa() + 0.6, slutt: null,
    stjerner: Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.85, r: 0.6 + Math.random() * 1.4, fase: Math.random() * 6 })) };
  T.sol = 0;
  L.solnedgang();
  $('natt').hidden = false;
  oppdaterSolTekst();
}

function godMorgen() {
  if (!T.natt || T.natt.slutt) return;
  T.natt.slutt = naa();
  L.morgen();
  setTimeout(() => {
    T.natt = null;
    $('natt').hidden = true;
    T.sol = SOL[T.nivaa];
    oppdaterSolTekst();
  }, 1100);
}

function tegnNatt(t) {
  const n = T.natt;
  const c = $('natt-lerret');
  const W = c.clientWidth, H = c.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const inn = klamp((t - n.t0) / 1.2) * (n.slutt ? 1 - klamp((t - n.slutt) / 1.0) : 1);
  $('natt').style.pointerEvents = n.slutt ? 'none' : 'auto';
  ctx.globalAlpha = inn;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(12, 16, 42, 0.94)');
  g.addColorStop(1, 'rgba(28, 30, 70, 0.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Månen
  ctx.fillStyle = '#f4ecc8';
  ctx.beginPath(); ctx.arc(W - 60, 52, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(12, 16, 42, 1)';
  ctx.beginPath(); ctx.arc(W - 50, 46, 22, 0, Math.PI * 2); ctx.fill();
  // Blinkende stjerner
  for (const s of n.stjerner) {
    ctx.globalAlpha = inn * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.fase)));
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
  }
  // Nye stjerneskudd
  if (!n.slutt && t > n.neste) {
    n.neste = t + 0.7 + Math.random() * 0.8;
    const fraVenstre = Math.random() < 0.5;
    n.skudd.push({ t0: t, x0: fraVenstre ? Math.random() * W * 0.4 : W * (0.6 + Math.random() * 0.4), y0: Math.random() * H * 0.35,
      vx: (fraVenstre ? 1 : -1) * W * (0.22 + Math.random() * 0.12), vy: H * (0.22 + Math.random() * 0.12), liv: 2.2 });
  }
  n.skudd = n.skudd.filter((s) => t - s.t0 < s.liv && !s.tatt);
  for (const s of n.skudd) {
    const a = t - s.t0;
    s.x = s.x0 + s.vx * a;
    s.y = s.y0 + s.vy * a;
    ctx.globalAlpha = inn * (1 - klamp((a - s.liv + 0.4) / 0.4));
    const hale = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.35, s.y - s.vy * 0.35);
    hale.addColorStop(0, 'rgba(255, 236, 160, 0.9)');
    hale.addColorStop(1, 'rgba(255, 236, 160, 0)');
    ctx.strokeStyle = hale;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.35, s.y - s.vy * 0.35); ctx.stroke();
    tegnStjerne(ctx, s.x, s.y, 11, t * 3 + s.t0);
  }
  // Gnister fra fangede stjerner
  n.gnister = n.gnister.filter((q) => t - q.t0 < 0.9);
  for (const q of n.gnister) {
    const a = t - q.t0;
    ctx.globalAlpha = inn * (1 - a / 0.9);
    ctx.fillStyle = '#ffe58a';
    ctx.beginPath(); ctx.arc(q.x + q.vx * a, q.y + q.vy * a + 60 * a * a, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function tegnStjerne(ctx, x, y, r, rot) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const v = rot + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(v) * rr, y + Math.sin(v) * rr]);
  }
  poly(ctx, pts, '#ffd23f');
}

function fangStjerne(e) {
  const n = T.natt;
  if (!n || n.slutt) return;
  L.vekk();
  const r = $('natt-lerret').getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const s = n.skudd.find((q) => Math.hypot(q.x - x, q.y - y) < 46);
  if (!s) return;
  s.tatt = true;
  L.stjerne();
  for (let i = 0; i < 14; i++) {
    const v = Math.random() * Math.PI * 2;
    n.gnister.push({ t0: naa(), x: s.x, y: s.y, vx: Math.cos(v) * 120, vy: Math.sin(v) * 120 });
  }
  flyTil(null, { stov: 1 }, { x: e.clientX, y: e.clientY });
}

// ---------------------------------------------------------------------------
// Tidsspranget: det samme lille brettet gjennom fire generasjoner
// ---------------------------------------------------------------------------
const AAR0 = 1926;
const KOL = 6, RAD = 4;
const TID = { g: 0, anim: null, cache: new Map(), S: 100, blader: [] };
const TIDSTEKST = [
  'Oldemor setter opp en liten hytte, sår den første åkeren, planter en eikespire og graver ned en tidskapsel med frø og en hilsen.',
  'Eika har vokst. Hytta er blitt en liten grend, stien er blitt steinvei, sauene beiter – og tidskapselen er funnet!',
  'Barna til dem du ga mat, er blitt hjelpere: de hogger i skogen. Toget har kommet til bygda, og gården har fått låve.',
  'Eika er blitt en kjempeeik med huske. Oldebarnet leker der oldemor plantet en liten spire for hundre år siden.',
];

function spes(g) {
  const e = (o = {}) => ({ terreng: 'eng', ...o });
  const veiType = g === 0 ? 'tre' : 'stein';
  const rett = (ret) => (g >= 2 ? e({ bane: { retninger: ret } }) : e({ vei: [{ type: veiType, retninger: ret }] }));
  const hus = g === 0
    ? e({ bygg: 'leir', vei: [{ type: 'tre', retninger: 'WE' }] })
    : e({ bygg: 'landsby', nivaa: [0, 2, 4, 5][g], vei: [{ type: 'stein', retninger: g >= 2 ? 'W' : 'WE' }], ...(g >= 2 ? { bane: { retninger: 'E' } } : {}) });
  const rad = [
    [{ terreng: 'skog' }, { terreng: 'skog' }, e(), e(), { terreng: 'aas' }, { terreng: 'fjell' }],
    [{ terreng: 'skog' }, e({ egen: `eik${g}` }), e({ vei: [{ type: veiType, retninger: 'E' }] }), hus, rett('EW'), rett('EW')],
    [e(), e(), g >= 1 ? e({ overlegg: 'sau' }) : e(), g === 0 ? e({ egen: 'saad' }) : e({ bygg: 'gard', nivaa: g }), e(), { terreng: 'vann' }],
    [e(), g === 1 ? e({ overlegg: 'skatt' }) : e({ egen: g === 0 ? 'kapsel' : 'minne' }), e(), e(), { terreng: 'vann' }, { terreng: 'vann' }],
  ];
  if (g >= 2) rad[1][0] = { terreng: 'skog', bygg: 'hogstbu', nivaa: g };
  if (g >= 3) rad[0][4] = { terreng: 'aas', bygg: 'steinbrudd' };
  return rad;
}

function storKrone(ctx, r, x, y, h, bred = 1) {
  const farger = [mork(FIGUR.lov, 0.12), FIGUR.lov, lys(FIGUR.lov, 0.06), lys(FIGUR.lov, 0.12)];
  const klumper = [[-0.22, -0.55, 0.24], [0.22, -0.57, 0.24], [-0.1, -0.74, 0.25], [0.12, -0.8, 0.22], [0, -0.62, 0.26]];
  klumper.forEach(([dx, dy, rr], i) => {
    fasett(ctx, klump(r, x + dx * h * bred, y + dy * h, rr * h * bred, rr * h * 0.85, 8, 0.14), farger[i % farger.length]);
  });
}

const EGNE = {
  eik0(ctx, S) {
    // Nyplantet spire med en liten pinne
    const x = S * 0.5, y = S * 0.66;
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.11, S * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = S * 0.012;
    ctx.beginPath(); ctx.moveTo(x + S * 0.06, y); ctx.lineTo(x + S * 0.06, y - S * 0.17); ctx.stroke();
    ctx.strokeStyle = '#5e8f3a'; ctx.lineWidth = S * 0.015;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - S * 0.11); ctx.stroke();
    poly(ctx, [[x, y - S * 0.1], [x - S * 0.08, y - S * 0.15], [x - S * 0.02, y - S * 0.08]], FIGUR.spire[0]);
    poly(ctx, [[x, y - S * 0.11], [x + S * 0.07, y - S * 0.17], [x + S * 0.02, y - S * 0.08]], FIGUR.spire[1]);
  },
  eik1(ctx, S, r) {
    const x = S * 0.5, y = S * 0.74, h = S * 0.48;
    skygge(ctx, x + h * 0.1, y, h * 0.3, h * 0.09);
    poly(ctx, [[x - h * 0.05, y], [x - h * 0.04, y - h * 0.45], [x + h * 0.04, y - h * 0.45], [x + h * 0.05, y]], '#7a5236');
    storKrone(ctx, r, x, y, h, 0.8);
  },
  eik2(ctx, S, r) {
    const x = S * 0.5, y = S * 0.82, h = S * 0.7;
    skygge(ctx, x + h * 0.1, y, h * 0.4, h * 0.1);
    poly(ctx, [[x - h * 0.08, y], [x - h * 0.05, y - h * 0.45], [x + h * 0.05, y - h * 0.45], [x + h * 0.08, y]], '#7a5236');
    poly(ctx, [[x, y], [x, y - h * 0.45], [x + h * 0.05, y - h * 0.45], [x + h * 0.08, y]], '#5e3f28');
    storKrone(ctx, r, x, y, h, 1.05);
  },
  eik3(ctx, S, r) {
    // Kjempeeik med huske
    const x = S * 0.46, y = S * 0.9, h = S * 0.86;
    skygge(ctx, x + h * 0.1, y, h * 0.5, h * 0.1);
    poly(ctx, [[x - h * 0.12, y], [x - h * 0.07, y - h * 0.42], [x + h * 0.07, y - h * 0.42], [x + h * 0.13, y]], '#7a5236');
    poly(ctx, [[x + h * 0.01, y], [x + h * 0.01, y - h * 0.42], [x + h * 0.07, y - h * 0.42], [x + h * 0.13, y]], '#5e3f28');
    // Gren ut til høyre med huske
    ctx.strokeStyle = '#6a4428'; ctx.lineWidth = S * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + h * 0.04, y - h * 0.4); ctx.lineTo(x + h * 0.4, y - h * 0.5); ctx.stroke();
    storKrone(ctx, r, x, y, h, 1.18);
    const hx = x + h * 0.32;
    ctx.strokeStyle = '#e9dcc0'; ctx.lineWidth = S * 0.008;
    for (const dx of [-0.05, 0.05]) {
      ctx.beginPath(); ctx.moveTo(hx + h * dx, y - h * 0.48); ctx.lineTo(hx + h * dx, y - h * 0.16); ctx.stroke();
    }
    poly(ctx, [[hx - h * 0.075, y - h * 0.16], [hx + h * 0.075, y - h * 0.16], [hx + h * 0.075, y - h * 0.13], [hx - h * 0.075, y - h * 0.13]], '#c0614a');
  },
  saad(ctx, S) {
    // Nysådd åker: jordrader med små spirer
    poly(ctx, [[S * 0.14, S * 0.3], [S * 0.86, S * 0.3], [S * 0.86, S * 0.86], [S * 0.14, S * 0.86]], FIGUR.jord);
    for (let i = 0; i < 6; i++) {
      const y = S * (0.36 + i * 0.09);
      ctx.fillStyle = mork(FIGUR.jord, 0.2);
      ctx.fillRect(S * 0.16, y, S * 0.68, S * 0.022);
      ctx.fillStyle = FIGUR.spire[0];
      for (let j = 0; j < 7; j++) {
        ctx.beginPath(); ctx.arc(S * (0.2 + j * 0.1), y - S * 0.005, S * 0.012, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  kapsel(ctx, S, r) {
    // Nedgravd tidskapsel: jordhaug med et lite flagg
    const x = S * 0.5, y = S * 0.66;
    skygge(ctx, x, y + S * 0.02, S * 0.17, S * 0.05);
    fasett(ctx, klump(r, x, y - S * 0.04, S * 0.15, S * 0.07, 7, 0.1), FIGUR.jord);
    ctx.strokeStyle = '#6a4428'; ctx.lineWidth = S * 0.014;
    ctx.beginPath(); ctx.moveTo(x + S * 0.02, y - S * 0.06); ctx.lineTo(x + S * 0.02, y - S * 0.3); ctx.stroke();
    poly(ctx, [[x + S * 0.02, y - S * 0.3], [x + S * 0.15, y - S * 0.26], [x + S * 0.02, y - S * 0.21]], '#d9483b');
  },
  minne(ctx, S, r) {
    // Minnestein med blomster der kapselen lå
    stein(ctx, r, S * 0.5, S * 0.68, S * 0.12, FIGUR.steinMork);
    for (const [dx, dy, f] of [[-0.16, 0.04, '#f3d77a'], [0.15, 0.06, '#e88ab4'], [-0.07, 0.1, '#ffffff'], [0.08, 0.12, '#f3d77a']]) {
      ctx.fillStyle = f;
      ctx.beginPath(); ctx.arc(S * (0.5 + dx), S * (0.68 + dy), S * 0.022, 0, Math.PI * 2); ctx.fill();
    }
  },
};

function cellebilde(s, x, y, S) {
  const n = `${JSON.stringify(s)}|${x},${y}|${S}`;
  if (TID.cache.has(n)) return TID.cache.get(n);
  const [c, ctx] = lerret(S);
  const tilf = lagTilfeldig(blandSeed('tid', x, y));
  if (s.egen) tegnTomtKort(ctx, S, tilf, s.terreng, () => EGNE[s.egen](ctx, S, lagTilfeldig(blandSeed('egen', x, y))));
  else tegnKort(ctx, S, tilf, s);
  TID.cache.set(n, c);
  return c;
}

function maalTidsbrett() {
  const c = $('tid');
  const w = Math.min(c.parentElement.clientWidth, 760);
  TID.S = Math.max(48, Math.floor((w - 24) / KOL / 1.015));
  const fuge = Math.max(2, Math.round(TID.S * 0.015));
  TID.fuge = fuge;
  const B = KOL * (TID.S + fuge) + 2 * 12, H = RAD * (TID.S + fuge) + 2 * 12;
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr);
  c.height = Math.round(H * dpr);
  c.style.width = `${B}px`;
  c.style.height = `${H}px`;
  TID.B = B;
  TID.H = H;
  TID.cache.clear();
  TID.skitten = true;
}

function tegnTidsbrett(t) {
  const c = $('tid');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BAKGRUNN;
  ctx.fillRect(0, 0, TID.B, TID.H);
  const S = TID.S, steg = S + TID.fuge, a = TID.anim;
  const naaSpes = spes(a ? a.til : TID.g), forSpes = a ? spes(a.fra) : null;
  for (let y = 0; y < RAD; y++) {
    for (let x = 0; x < KOL; x++) {
      const px = 12 + x * steg, py = 12 + y * steg;
      const ny = naaSpes[y][x];
      if (!a || JSON.stringify(forSpes[y][x]) === JSON.stringify(ny)) {
        ctx.drawImage(cellebilde(ny, x, y, S), px, py, S, S);
        continue;
      }
      // Kortet snus: først det gamle, så det nye.
      const start = 0.7 + Math.hypot(x - 2.5, y - 1.5) * 0.22;
      const q = klamp((t - a.t0 - start) / 0.55);
      const bilde = q < 0.5 ? cellebilde(forSpes[y][x], x, y, S) : cellebilde(ny, x, y, S);
      const sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * q)));
      ctx.save();
      ctx.translate(px + S / 2, py + S / 2);
      ctx.scale(sx, 1);
      ctx.drawImage(bilde, -S / 2, -S / 2, S, S);
      if (q > 0 && q < 1) {
        ctx.fillStyle = `rgba(255, 240, 190, ${0.45 * Math.sin(Math.PI * q)})`;
        ctx.fillRect(-S / 2, -S / 2, S, S);
      }
      ctx.restore();
    }
  }
  if (!a) return;
  const u = t - a.t0;
  // Løv som virvler over brettet
  for (const b of TID.blader) {
    const by = ((b.y + u * b.fart) % 1.2) * TID.H - 20;
    const bx = b.x * TID.B + Math.sin(u * 2 + b.fase) * 30;
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.PI * klamp(u / 3.6)) * 0.9;
    ctx.translate(bx, by);
    ctx.rotate(u * b.spinn);
    poly(ctx, [[-6, 0], [0, -3.5], [6, 0], [0, 3.5]], b.farge);
    ctx.restore();
  }
  // Årstallet ruller
  const synlig = Math.sin(Math.PI * klamp(u / 3.6));
  const aar = Math.round(AAR0 + 30 * a.fra + 30 * myk((u - 0.3) / 2.4));
  ctx.globalAlpha = synlig;
  ctx.fillStyle = 'rgba(1, 1, 1, 0.55)';
  const bw = 210, bh = 76;
  ctx.beginPath();
  ctx.roundRect(TID.B / 2 - bw / 2, TID.H / 2 - bh / 2, bw, bh, 18);
  ctx.fill();
  ctx.fillStyle = '#faf2db';
  ctx.font = '800 50px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(aar), TID.B / 2, TID.H / 2 + 2);
  ctx.globalAlpha = 1;
  if (u > 3.7) {
    TID.g = a.til;
    TID.anim = null;
    etterSprang();
  }
}

function startTidssprang() {
  L.vekk();
  if (TID.anim) return;
  if (TID.g >= 3) {
    TID.g = 0;
    $('album').innerHTML = '';
    TID.skitten = true;
    visTidstekst();
    setTimeout(leggIAlbum, 50);
    return;
  }
  TID.anim = { fra: TID.g, til: TID.g + 1, t0: naa() };
  TID.blader = Array.from({ length: 40 }, () => ({
    x: Math.random(), y: Math.random() * 1.2, fart: 0.25 + Math.random() * 0.3, fase: Math.random() * 6, spinn: (Math.random() - 0.5) * 6,
    farge: ['#c98a35', '#e0a030', '#6f9a3f', '#b5562e', '#8fbf55'][Math.floor(Math.random() * 5)],
  }));
  $('tid-knapp').disabled = true;
  L.tidssprang();
}

function etterSprang() {
  visTidstekst();
  TID.skitten = true;
  setTimeout(leggIAlbum, 30);
  if (TID.g === 1) setTimeout(() => { $('brev').hidden = false; L.fanfare(1); }, 500);
}

function visTidstekst() {
  const aar = AAR0 + 30 * TID.g;
  $('tid-aar').textContent = `${aar} · ${TID.g + 1}. generasjon`;
  $('tid-tekst').textContent = TIDSTEKST[TID.g];
  const k = $('tid-knapp');
  k.disabled = false;
  k.textContent = TID.g >= 3 ? '↺ Tilbake til 1926' : '⏳ La tiden gå – 30 år';
}

function leggIAlbum() {
  const kilde = $('tid');
  const [c, ctx] = lerret(150, Math.round(150 * TID.H / TID.B));
  ctx.drawImage(kilde, 0, 0, 150, Math.round(150 * TID.H / TID.B));
  const fig = document.createElement('figure');
  const img = new Image();
  img.src = c.toDataURL('image/png');
  const cap = document.createElement('figcaption');
  cap.textContent = String(AAR0 + 30 * TID.g);
  fig.append(img, cap);
  $('album').append(fig);
}

// ---------------------------------------------------------------------------
// Nivå, oppstart og tegnesløyfe
// ---------------------------------------------------------------------------
function settNivaa(n) {
  T.nivaa = n;
  document.body.classList.toggle('liten', n === 'liten');
  document.querySelectorAll('[data-nivaa]').forEach((b) => b.classList.toggle('valgt', b.dataset.nivaa === n));
  if (!T.natt) T.sol = SOL[n];
  T.kort.forEach(oppdaterTekst);
  tegnForrad();
  oppdaterSolTekst();
}

function sloyfe() {
  const t = naa();
  for (const k of T.kort) tegnTing(k, t);
  tegnHimmel(t);
  if (T.natt) tegnNatt(t);
  if (TID.anim || TID.skitten) { tegnTidsbrett(t); TID.skitten = false; }
  requestAnimationFrame(sloyfe);
}

function start() {
  document.querySelectorAll('[data-nivaa]').forEach((b) => { b.onclick = () => { L.vekk(); settNivaa(b.dataset.nivaa); }; });
  $('natt-naa').onclick = () => { L.vekk(); startNatt(); };
  $('morgen').onclick = () => { L.vekk(); godMorgen(); };
  $('natt-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); fangStjerne(e); });
  $('lyd').onclick = () => { L.settLyd(!L.lydPaa()); $('lyd').textContent = L.lydPaa() ? '🔊 Lyd på' : '🔇 Lyd av'; L.vekk(); };
  $('tid-knapp').onclick = startTidssprang;
  $('brev-ok').onclick = () => { $('brev').hidden = true; flyTil(null, { fro: 4 }, { x: innerWidth / 2, y: innerHeight / 2 }); };
  byggTing();
  maalTidsbrett();
  settNivaa('stor');
  visTidstekst();
  setTimeout(leggIAlbum, 100);
  let tidtaker = 0;
  addEventListener('resize', () => {
    clearTimeout(tidtaker);
    tidtaker = setTimeout(() => { byggTing(); maalTidsbrett(); }, 200);
  });
  requestAnimationFrame(sloyfe);
}

start();
window.__prove = { T, TID }; // for testing i nettleseren
