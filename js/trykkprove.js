// Prøveark for Skatteøya: alle råvarer finnes i tre størrelser, og hvert
// trykk er én tone i en barnesang – den lille spiller starten, den mellomste litt
// mer og den store hele sangen. Sola er dagsbudsjettet, natta har stjerneskudd,
// Bruker de samme kortene som spillet.

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

const IKON = {
  tre: '🪵', stein: '🪨', jern: '⛓️', fisk: '🐟', korn: '🌾', ull: '🧶',
  fro: '🌰', nokkel: '🗝️', skatt: '💎', stov: '✨',
};
const VARENAVN = {
  tre: 'tre', stein: 'stein', jern: 'jern', fisk: 'fisk', korn: 'korn', ull: 'ull',
  fro: 'frø', nokkel: 'nøkler', skatt: 'skatter', stov: 'stjernestøv',
};
// Prøvearket har mange ting å trykke på, så sola varer lenger enn den vil gjøre i spillet.
const SOL = { liten: 200, stor: 150 };
const STR_NAVN = ['Liten', 'Middels', 'Stor'];
const UTBYTTE = [2, 5, 12];

const T = {
  nivaa: 'stor',
  sol: SOL.stor,
  solVis: 0,
  natt: null,
  forrad: Object.fromEntries(Object.keys(IKON).map((k) => [k, 0])),
  kort: [],
  K: 200,
};

// ---------------------------------------------------------------------------
// Råvarene. Hver har sin sang, sitt instrument og sin figur i tre størrelser.
// ---------------------------------------------------------------------------
const RAVARER = [
  { id: 'tre', navn: 'Tre', sang: 'petter', instrument: 'hogg', bunn: ['eng', 'eng', 'skog'], figur: figurTre, navnStr: ['Lite tre', 'Tre', 'Stort tre'],
    sprut: ['#8a5c38', '#e8c48a', '#6f9a3f', '#8fbf55'] },
  { id: 'stein', navn: 'Stein', sang: 'mary', instrument: 'treblokk', bunn: ['aas', 'aas', 'aas'], figur: figurStein, navnStr: ['Liten stein', 'Stein', 'Kampestein'],
    sprut: ['#9aa1ae', '#7d7f8a', '#c4c9d2'] },
  { id: 'jern', navn: 'Jern', sang: 'jakob', instrument: 'ambolt', bunn: ['fjell', 'fjell', 'fjell'], figur: figurJern, navnStr: ['Litt malm', 'Malmstein', 'Malmåre'],
    sprut: ['#d98a4a', '#b8c3cf', '#ffe6a0'] },
  { id: 'fisk', navn: 'Fisk', sang: 'ro', instrument: 'plask', bunn: ['vann', 'vann', 'vann'], figur: figurFisk, navnStr: ['Sild', 'Ørret', 'Laks'],
    sprut: ['#ffffff', '#bfe4f7', '#7fc3e6'] },
  { id: 'korn', navn: 'Korn', sang: 'macdonald', instrument: 'floyte', bunn: ['eng', 'eng', 'eng'], figur: figurKorn, navnStr: ['Kornaks', 'Kornband', 'Kornåker'],
    sprut: ['#e2c25a', '#c9a23f', '#f3e3a0'] },
  { id: 'ull', navn: 'Ull', sang: 'baa', instrument: 'spilledaase', bunn: ['eng', 'eng', 'eng'], figur: figurSau, navnStr: ['Lam', 'Sau', 'Vær'],
    sprut: ['#ffffff', '#f3f0e7', '#e5ded0'] },
  { id: 'kiste', navn: 'Kister', sang: 'bursdag', instrument: 'xylofon', bunn: ['strand', 'eng', 'eng'], figur: figurKiste,
    sprut: ['#ffd23f', '#ffe58a', '#fff4c2'], navnStr: ['Liten kiste', 'Stor kiste', 'Kjempekiste'] },
];
const TAKE = { id: 'take', navn: 'Tåke', sang: 'take', instrument: 'sus', sprut: ['#3a4250', '#5a6372', '#7d8494'] };

const KISTEGAVE = [
  (r) => r.velg([{ fro: 1 }, { skatt: 1 }, { nokkel: 1 }]),
  (r) => r.velg([{ fro: 2, nokkel: 1 }, { skatt: 2 }, { fro: 1, skatt: 1, nokkel: 1 }]),
  () => ({ skatt: 3, nokkel: 1, stov: 5 }),
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

function nyTing(def, str) {
  const toner = L.tonerFor(def.sang, str);
  const k = {
    def, str, toner, antall: toner.length, igjen: toner.length,
    seed: (Math.random() * 1e9) | 0, tTrykk: -9, tFerdig: null, tStart: naa(), partikler: [],
  };
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
// Oppsett: én rad per råvare (liten, middels, stor) + tåka
// ---------------------------------------------------------------------------
const PRIKK_H = 46;

function byggTing() {
  const boks = $('ting');
  const cs = getComputedStyle(boks);
  const w = boks.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  T.K = Math.min(230, Math.floor((w - 2 * 14) / 3));
  boks.innerHTML = '';
  T.kort = [];
  const lagKort = (rad, def, str) => {
    const fig = document.createElement('figure');
    const [c, ctx] = lerret(T.K, T.K + PRIKK_H);
    c.style.width = `${T.K}px`;
    c.style.height = `${T.K + PRIKK_H}px`;
    const cap = document.createElement('figcaption');
    fig.append(c, cap);
    rad.append(fig);
    const k = nyTing(def, str);
    k.el = { canvas: c, ctx, cap };
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); trykk(k, e); });
    T.kort.push(k);
    oppdaterTekst(k);
  };
  for (const def of [...RAVARER, TAKE]) {
    const blokk = document.createElement('div');
    blokk.className = 'ravare';
    const sang = L.SANG[def.sang].navn;
    blokk.innerHTML = def.id === 'take'
      ? '<h3>☁️ Tåke <span class="sang">børst den bort der du trykker</span></h3>'
      : `<h3>${def.id === 'kiste' ? '🎁' : IKON[def.id]} ${def.navn} <span class="sang">♪ ${sang}</span></h3>`;
    const rad = document.createElement('div');
    rad.className = 'rad';
    rad.style.gridTemplateColumns = `repeat(3, ${T.K}px)`;
    blokk.append(rad);
    boks.append(blokk);
    if (def.id === 'take') lagKort(rad, def, 0);
    else for (let s = 0; s < 3; s++) lagKort(rad, def, s);
  }
}

function tingNavn(k) {
  if (k.def.id === 'take') return 'Tåke';
  return k.def.navnStr?.[k.str] ?? `${STR_NAVN[k.str]} ${k.def.navn.toLowerCase()}`;
}

function oppdaterTekst(k) {
  if (T.nivaa === 'liten') { k.el.cap.textContent = ''; return; }
  k.el.cap.textContent = k.tFerdig !== null ? `${tingNavn(k)} · ferdig!`
    : `${tingNavn(k)} · ${k.igjen} igjen`;
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
  L.INSTRUMENT[k.def.instrument](k.toner[k.antall - k.igjen]);
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

function sprut(k, x, y, { antall = 7, kraft = 1 } = {}) {
  const f = k.def.sprut;
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
  const id = k.def.id;
  const gave = id === 'kiste' ? KISTEGAVE[k.str](lagTilfeldig(k.seed + 7)) : id === 'take' ? {} : { [id]: UTBYTTE[k.str] };
  setTimeout(() => L.fanfare(k.str + 1), 180);
  if (id === 'take') L.vend();
  else sprut(k, T.K * 0.5, T.K * 0.55, { antall: 10 + k.str * 8, kraft: 1.3 });
  setTimeout(() => flyTil(k, gave), 550);
  if (id === 'kiste' && k.str === 2) setTimeout(() => melding('📜 Byggetegning: Fyrtårn!'), 900);
  setTimeout(() => {
    Object.assign(k, nyTing(k.def, k.str));
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
      forsink += n > 6 ? 70 : 110;
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
      el.innerHTML = `${IKON[v]} <b>${n}</b>`;
      el.title = VARENAVN[v];
    } else {
      // De minste ser en haug, ikke et tall.
      el.innerHTML = n ? `${IKON[v].repeat(Math.min(n, 6))}${n > 6 ? '<small>+</small>' : ''}` : `<span class="tom">${IKON[v]}</span>`;
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
// Tegning av kortene
// ---------------------------------------------------------------------------
function tegnTing(k, t) {
  const { ctx } = k.el;
  const S = T.K;
  ctx.clearRect(0, 0, S, S + PRIKK_H);
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
    tegnTomtKort(ctx, S, lagTilfeldig(k.seed + 3), k.def.bunn[k.str], () => {
      // Vugg og klem rundt foten av figuren når man trykker.
      const vugg = ferdigT === null ? Math.exp(-alder * 7) * Math.sin(alder * 38) * 0.07 : 0;
      const klem = ferdigT === null ? Math.exp(-alder * 16) * 0.08 : 0;
      ctx.save();
      ctx.translate(S * 0.5, S * 0.86);
      ctx.rotate(vugg);
      ctx.scale(1 + klem * 0.6, 1 - klem);
      ctx.translate(-S * 0.5, -S * 0.86);
      k.def.figur(ctx, S, lagTilfeldig(k.seed), k, p, ferdigT, t);
      ctx.restore();
    });
  }
  ctx.restore();

  // Sprut (flis, gnister, vanndråper, ull …)
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

/** Prikker under kortet: én per tone i sangen. Fylte prikker = toner som er spilt. */
function tegnPrikker(ctx, S, k) {
  const n = k.antall, gjort = n - k.igjen;
  const rader = n <= 12 ? 1 : Math.ceil(n / 15);
  const perRad = Math.ceil(n / rader);
  const maks = T.nivaa === 'liten' ? 9.5 : 7.5;
  const r = Math.min(maks, (S - 8) / perRad / 2.6, (PRIKK_H - 6) / rader / 2.6);
  const avst = r * 2.6;
  const y0 = S + 4 + (PRIKK_H - 4 - rader * avst) / 2 + avst / 2;
  for (let i = 0; i < n; i++) {
    const rad = Math.floor(i / perRad), kol = i - rad * perRad;
    const iRad = Math.min(perRad, n - rad * perRad);
    const x = S / 2 + (kol - (iRad - 1) / 2) * avst;
    const y = y0 + rad * avst;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (i < gjort) {
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
    } else {
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.strokeStyle = 'rgba(250, 242, 219, 0.45)';
      ctx.stroke();
    }
  }
}

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
  const ull = ferdigT === null ? 1 - 0.5 * p : 0.5;   // ulla blir mindre for hvert klipp
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
  // Hode og øre
  const hx = x - S * 0.2 * s, hy = y - S * 0.16 * s;
  fasett(ctx, [[hx - S * 0.07 * s, hy + S * 0.02 * s], [hx - S * 0.02 * s, hy - S * 0.07 * s], [hx + S * 0.05 * s, hy - S * 0.03 * s], [hx + S * 0.03 * s, hy + S * 0.06 * s]], '#45434a');
  poly(ctx, [[hx + S * 0.02 * s, hy - S * 0.05 * s], [hx + S * 0.09 * s, hy - S * 0.08 * s], [hx + S * 0.05 * s, hy - S * 0.01 * s]], '#3b3a3f');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(hx - S * 0.02 * s, hy - S * 0.015 * s, S * 0.012 * s, 0, Math.PI * 2); ctx.fill();
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
  requestAnimationFrame(sloyfe);
}

function start() {
  document.querySelectorAll('[data-nivaa]').forEach((b) => { b.onclick = () => { L.vekk(); settNivaa(b.dataset.nivaa); }; });
  $('natt-naa').onclick = () => { L.vekk(); startNatt(); };
  $('morgen').onclick = () => { L.vekk(); godMorgen(); };
  $('natt-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); fangStjerne(e); });
  $('lyd').onclick = () => { L.settLyd(!L.lydPaa()); $('lyd').textContent = L.lydPaa() ? '🔊 Lyd på' : '🔇 Lyd av'; L.vekk(); };
  // Himmelen ligger fast rett under toppen mens man blar.
  const settTopp = () => document.documentElement.style.setProperty('--topp', `${document.querySelector('header').offsetHeight}px`);
  settTopp();
  addEventListener('resize', settTopp);
  byggTing();
  settNivaa('stor');
  let tidtaker = 0;
  addEventListener('resize', () => {
    clearTimeout(tidtaker);
    tidtaker = setTimeout(byggTing, 200);
  });
  requestAnimationFrame(sloyfe);
}

start();
