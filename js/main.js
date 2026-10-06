// Øya i hundre år – fase T1: trykkmotoren.
// Velg spiller → øya med tåke. Børst bort tåka, trykk på ting (tre, stein, jern,
// fisk, korn, sau, kister) for å spille sangen deres og samle i forrådet. Hvert trykk
// flytter sola; når den går ned, kommer natta med stjerneskudd, og så en ny dag.

import { Kamera } from './kamera.js';
import { Brett, RUTE, BAKGRUNN } from './brett.js';
import * as R from './regler.js';
import * as Lagring from './lagring.js';
import * as L from './trykk/toner.js';
import { tegnFigur } from './figurer.js';
import { tegnTomtKort } from './stil/ruter.js';
import { poly, fasett } from './stil/lavpoly.js';
import { TING, VARER, SOL, NIVAA, AVATARER } from './data/ting.js';
import { sprut, tegnEffekter, harEffekter } from './effekter.js';
import { blandSeed, lagTilfeldig } from './rng.js';

const $ = (id) => document.getElementById(id);
const naa = () => performance.now();
const klamp = (u, a = 0, b = 1) => Math.max(a, Math.min(b, u));
const sprett = (u) => { u = klamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const t = {
  id: null, spill: null, verden: null, brett: null, kamera: null,
  avdekkAnim: new Map(), borstAnim: new Map(),
  naer: null, natt: null, skitten: true, solVis: 0,
  vist: {},           // det forrådet viser (tingene teller først når de har fløyet ned)
};

const liten = () => t.spill?.nivaa === 'liten';

// ---------------------------------------------------------------------------
// Lyd av/på huskes
// ---------------------------------------------------------------------------
try { L.settLyd(localStorage.getItem('oya-lyd') !== 'av'); } catch { /* ignorer */ }

// ---------------------------------------------------------------------------
// Velg spiller
// ---------------------------------------------------------------------------
function visVelg() {
  if (t.id && t.spill) Lagring.lagre(t.id, t.spill);
  t.id = null;
  t.spill = null;
  $('spill').hidden = true;
  $('velg').hidden = false;
  const liste = Lagring.profiler();
  $('profilliste').innerHTML = liste.length
    ? liste.map((p) => `<button class="profil" data-id="${esc(p.id)}">
        <span class="ava">${esc(p.avatar)}</span><span class="navn">${esc(p.navn)}</span>
        <span class="info">${NIVAA[p.nivaa]?.ikon ?? ''} Dag ${p.dag}</span></button>`).join('')
    : '<p class="tom">Lag en spiller for å begynne!</p>';
  $('profilliste').querySelectorAll('.profil').forEach((b) => { b.onclick = () => { L.vekk(); startSpill(b.dataset.id); }; });
}

const ny = { avatar: AVATARER[0], nivaa: 'stor' };
function aapneNySpiller() {
  L.vekk();
  ny.avatar = AVATARER[Math.floor(Math.random() * AVATARER.length)];
  $('ny-navn').value = '';
  const tegnValg = () => {
    $('ny-avatar').innerHTML = AVATARER.map((a) => `<button class="${a === ny.avatar ? 'valgt' : ''}" data-a="${a}">${a}</button>`).join('');
    $('ny-nivaa').innerHTML = Object.entries(NIVAA).map(([k, n]) =>
      `<button class="niva ${k === ny.nivaa ? 'valgt' : ''}" data-n="${k}"><b>${n.ikon} ${n.navn}</b><small>${n.forklaring}</small></button>`).join('');
    $('ny-avatar').querySelectorAll('button').forEach((b) => { b.onclick = () => { ny.avatar = b.dataset.a; tegnValg(); }; });
    $('ny-nivaa').querySelectorAll('button').forEach((b) => { b.onclick = () => { ny.nivaa = b.dataset.n; tegnValg(); }; });
  };
  tegnValg();
  $('ny').showModal();
}

function lagNySpiller() {
  const navn = $('ny-navn').value.trim() || 'Spiller';
  const spill = R.nyttSpill({ navn, nivaa: ny.nivaa, avatar: ny.avatar });
  const id = Lagring.nyId();
  Lagring.lagre(id, spill);
  $('ny').close();
  startSpill(id);
}

// ---------------------------------------------------------------------------
// Start et spill
// ---------------------------------------------------------------------------
function startSpill(id) {
  const spill = Lagring.hent(id);
  if (!spill) { melding('Fant ikke spillet.'); return; }
  t.id = id;
  t.spill = spill;
  t.verden = R.lagVerden(spill);
  t.brett = new Brett(t.verden);
  t.avdekkAnim.clear();
  t.borstAnim.clear();
  t.vist = { ...spill.forrad };
  t.solVis = 1 - spill.sol / SOL[spill.nivaa];
  $('velg').hidden = true;
  $('spill').hidden = false;
  document.body.classList.toggle('liten', liten());
  byggForrad();
  oppdaterHud();
  const k = t.kamera;
  k.tilpassLerret();
  const { bredde: B, hoyde: H, start } = t.verden;
  k.grenser = { bredde: B * RUTE, hoyde: H * RUTE };
  const kort = Math.min(k.lerret.width, k.lerret.height);
  k.minSkala = kort / (Math.max(B, H) * RUTE * 1.05);
  k.maksSkala = kort / (1.6 * RUTE);
  k.sentrer((start.x + 0.5) * RUTE, (start.y + 0.5) * RUTE, kort / ((liten() ? 5.5 : 6.5) * RUTE));
  t.skitten = true;
  if (spill.stat.avdekket === 0) setTimeout(() => melding('Trykk på tåka for å børste den bort', { ikon: '👆☁️' }), 600);
  if (spill.sol <= 0) setTimeout(startNatt, 500);
}

let lagreTid = 0;
function lagreSnart() {
  clearTimeout(lagreTid);
  lagreTid = setTimeout(() => { if (t.id && t.spill) Lagring.lagre(t.id, t.spill); }, 400);
}

// ---------------------------------------------------------------------------
// Trykk på brettet
// ---------------------------------------------------------------------------
function trykkPaa(kx, ky) {
  if (t.naer || t.natt || !t.spill) return;
  L.vekk();
  const { bredde: B, hoyde: H } = t.verden;
  const x = Math.floor(kx / RUTE), y = Math.floor(ky / RUTE);
  if (x < 0 || y < 0 || x >= B || y >= H) return;
  const i = y * B + x;
  const s = t.spill, v = t.verden;
  if (!s.avdekket[i]) {
    behandle(R.borst(s, v, i), i);
    return;
  }
  if (R.tingVed(s, v, i)) { aapneNaer(i); return; }
  const d = R.venterPaa(s, v, i);
  if (d > 0) melding(d === Infinity ? 'Kista er tom.' : `Her vokser det noe nytt om ${d} ${d === 1 ? 'dag' : 'dager'}.`, { ikon: d === Infinity ? '📭' : '🌱' });
}

function midtAv(i) {
  const B = t.verden.bredde;
  return [(i % B + 0.5) * RUTE, (Math.floor(i / B) + 0.5) * RUTE];
}

function behandle(hendelser, i) {
  for (const h of hendelser) {
    if (h.type === 'borst' || h.type === 'avdekket') {
      L.INSTRUMENT.sus(L.SANG.take.toner[h.nr]);
      const [kx, ky] = midtAv(i);
      sprut(kx, ky, { farger: ['#5a6372', '#7d8494', '#9aa1ae'], antall: 12, fart: 1.4 });
      if (h.type === 'borst') t.borstAnim.set(i, naa());
      else {
        t.borstAnim.delete(i);
        t.avdekkAnim.set(i, naa());
        L.vend();
        if (h.ting) setTimeout(() => sprut(kx, ky, { farger: ['#ffd23f', '#ffe58a', '#fff4c2'], antall: 16 }), 300);
      }
    } else if (h.type === 'tomSol') {
      startNatt();
    } else if (h.type === 'kveld') {
      setTimeout(startNatt, 900);
    }
  }
  oppdaterHud();
  lagreSnart();
  t.skitten = true;
}

// ---------------------------------------------------------------------------
// Nærbilde: tingen stort på skjermen, ett trykk = én tone
// ---------------------------------------------------------------------------
function aapneNaer(i) {
  const ting = R.tingVed(t.spill, t.verden, i);
  if (!ting) return;
  const S = Math.floor(Math.min(innerWidth * 0.86, (innerHeight - 150) * 0.86, 440));
  const c = $('naer-lerret');
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(S * dpr);
  c.height = Math.round((S + 56) * dpr);
  c.style.width = `${S}px`;
  c.style.height = `${S + 56}px`;
  t.naer = {
    i, ting, S, tStart: naa() / 1000, tTrykk: -9, tFerdig: null, partikler: [],
    terreng: R.TERRENGNAVN[t.verden.terreng[i]],
    tilf: blandSeed(t.verden.seed, t.verden.forsok, 'kort', i),
  };
  const def = TING[ting.type];
  $('naer-tittel').innerHTML = liten() ? `<span class="stor-ikon">${def.ikon}</span>`
    : `${def.navn[ting.str]} <span class="sang">♪ ${L.SANG[def.sang].navn}</span>`;
  $('naer').hidden = false;
}

function trykkNaer(e) {
  const n = t.naer;
  if (!n || n.tFerdig !== null) return;
  L.vekk();
  const r = $('naer-lerret').getBoundingClientRect();
  const x = e.clientX - r.left, y = Math.min(n.S * 0.95, e.clientY - r.top);
  const def = TING[n.ting.type];
  for (const h of R.trykkTing(t.spill, t.verden, n.i)) {
    if (h.type === 'tone') {
      L.INSTRUMENT[def.instrument](h.frekvens);
      n.ting = { ...n.ting, igjen: h.igjen };
      n.tTrykk = naa() / 1000;
      sprutNaer(n, x, y, 7, 1);
    } else if (h.type === 'ferdig') {
      n.tFerdig = naa() / 1000;
      setTimeout(() => L.fanfare(n.ting.str + 1), 180);
      sprutNaer(n, n.S / 2, n.S * 0.55, 12 + n.ting.str * 8, 1.4);
      setTimeout(() => flyTil(h.gave, { x: r.left + r.width / 2, y: r.top + n.S / 2 }), 550);
      if (h.nySang) setTimeout(() => melding(`Ny sang i sangboka: ${L.SANG[h.sang].navn}!`, { ikon: '🎵✨' }), 1300);
      setTimeout(lukkNaer, 2300);
    } else if (h.type === 'kveld') {
      n.kveld = true;
      if (n.tFerdig === null) setTimeout(lukkNaer, 700);
    } else if (h.type === 'tomSol') {
      lukkNaer();
    }
  }
  oppdaterHud();
  lagreSnart();
  t.skitten = true;
}

function sprutNaer(n, x, y, antall, kraft) {
  const f = TING[n.ting.type].sprut;
  const t0 = naa() / 1000;
  for (let i = 0; i < antall; i++) {
    const v = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const fart = (90 + Math.random() * 160) * kraft * (n.S / 230);
    n.partikler.push({ x, y, vx: Math.cos(v) * fart, vy: Math.sin(v) * fart, t0, liv: 0.6 + Math.random() * 0.5,
      r: (2 + Math.random() * 3.5) * (n.S / 230), farge: f[Math.floor(Math.random() * f.length)], spinn: Math.random() * 6 });
  }
}

function lukkNaer() {
  if (!t.naer) return;
  const kveld = t.naer.kveld || t.spill.sol <= 0;
  t.naer = null;
  $('naer').hidden = true;
  t.skitten = true;
  if (kveld) setTimeout(startNatt, 400);
}

function tegnNaer(tsek) {
  const n = t.naer;
  const c = $('naer-lerret');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const S = n.S;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, S, S + 56);
  const ting = n.ting;
  const p = 1 - ting.igjen / ting.antall;
  const alder = tsek - n.tTrykk;
  const ferdigT = n.tFerdig === null ? null : tsek - n.tFerdig;
  const inn = sprett((tsek - n.tStart) / 0.35);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(inn, inn);
  ctx.translate(-S / 2, -S / 2);
  tegnTomtKort(ctx, S, lagTilfeldig(n.tilf), n.terreng, () => {
    const vugg = ferdigT === null ? Math.exp(-alder * 7) * Math.sin(alder * 38) * 0.07 : 0;
    const klem = ferdigT === null ? Math.exp(-alder * 16) * 0.08 : 0;
    ctx.save();
    ctx.translate(S * 0.5, S * 0.86);
    ctx.rotate(vugg);
    ctx.scale(1 + klem * 0.6, 1 - klem);
    ctx.translate(-S * 0.5, -S * 0.86);
    tegnFigur(ctx, S, ting, { p, ferdigT, t: tsek });
    ctx.restore();
  });
  ctx.restore();
  n.partikler = n.partikler.filter((q) => tsek - q.t0 < q.liv);
  for (const q of n.partikler) {
    const a = tsek - q.t0;
    ctx.globalAlpha = 1 - a / q.liv;
    ctx.fillStyle = q.farge;
    ctx.save();
    ctx.translate(q.x + q.vx * a, q.y + q.vy * a + 380 * (S / 230) * a * a);
    ctx.rotate(q.spinn * a * 4);
    ctx.fillRect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  tegnPrikker(ctx, S, ting.antall, ting.antall - ting.igjen);
}

/** Én prikk per tone. Fylte prikker = toner som er spilt. */
function tegnPrikker(ctx, S, n, gjort) {
  const H = 56;
  const rader = n <= 12 ? 1 : Math.ceil(n / 15);
  const perRad = Math.ceil(n / rader);
  const r = Math.min(liten() ? 12 : 9, (S - 8) / perRad / 2.6, (H - 6) / rader / 2.6);
  const avst = r * 2.6;
  const y0 = S + 4 + (H - 4 - rader * avst) / 2 + avst / 2;
  for (let i = 0; i < n; i++) {
    const rad = Math.floor(i / perRad), kol = i - rad * perRad;
    const iRad = Math.min(perRad, n - rad * perRad);
    ctx.beginPath();
    ctx.arc(S / 2 + (kol - (iRad - 1) / 2) * avst, y0 + rad * avst, r, 0, Math.PI * 2);
    if (i < gjort) { ctx.fillStyle = '#ffd23f'; ctx.fill(); } else {
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.strokeStyle = 'rgba(250, 242, 219, 0.5)';
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Forrådet: tingene flyr ned og teller først når de lander
// ---------------------------------------------------------------------------
function byggForrad() {
  $('forrad').innerHTML = Object.entries(VARER).map(([v, d]) => `<span class="vare" id="f-${v}" title="${d.navn}"></span>`).join('');
  tegnForrad();
}

function tegnForrad(dunk) {
  for (const [v, d] of Object.entries(VARER)) {
    const el = $(`f-${v}`), n = t.vist[v] ?? 0;
    el.classList.toggle('null', !n);
    el.innerHTML = liten()
      ? (n ? `${d.ikon.repeat(Math.min(n, 5))}${n > 5 ? '<small>+</small>' : ''}` : d.ikon)
      : `${d.ikon} <b>${n}</b>`;
  }
  if (dunk) {
    const el = $(`f-${dunk}`);
    el.classList.remove('dunk');
    void el.offsetWidth;
    el.classList.add('dunk');
  }
}

function flyTil(gave, fra) {
  let forsink = 0;
  for (const [vare, n] of Object.entries(gave)) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'flyr';
      s.textContent = VARER[vare].ikon;
      s.style.left = `${fra.x}px`;
      s.style.top = `${fra.y}px`;
      document.body.append(s);
      const m = $(`f-${vare}`).getBoundingClientRect();
      const dx = m.left + m.width / 2 - fra.x, dy = m.top + m.height / 2 - fra.y;
      setTimeout(() => { s.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`; }, 40 + forsink);
      setTimeout(() => {
        s.remove();
        t.vist[vare] = (t.vist[vare] ?? 0) + 1;
        tegnForrad(vare);
      }, 900 + forsink);
      forsink += n > 6 ? 70 : 110;
    }
  }
}

// ---------------------------------------------------------------------------
// Toppen: avatar, himmel med sol, dag og sangbok
// ---------------------------------------------------------------------------
function oppdaterHud() {
  const s = t.spill;
  $('meny-knapp').textContent = s.avatar;
  $('dag').textContent = liten() ? '' : `Dag ${s.dag}`;
  $('sol-tall').textContent = liten() ? '' : `☀️ ${s.sol}`;
}

function blandRgb(a, b, u) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * u)).join(',')})`;
}

function tegnHimmel(tsek) {
  const c = $('himmel');
  const W = c.clientWidth, H = c.clientHeight;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const maal = t.natt ? 1 : 1 - t.spill.sol / SOL[t.spill.nivaa];
  t.solVis += (maal - t.solVis) * 0.12;
  const f = t.solVis;
  const M = ['#9fc7e8', '#f7c9a9'], D = ['#5fa2d8', '#bfe1f5'], K = ['#4f3f86', '#f08a4b'];
  const [topp, bunn] = f < 0.25 ? [blandRgb(M[0], D[0], f / 0.25), blandRgb(M[1], D[1], f / 0.25)]
    : f < 0.7 ? [D[0], D[1]] : [blandRgb(D[0], K[0], (f - 0.7) / 0.3), blandRgb(D[1], K[1], (f - 0.7) / 0.3)];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, topp);
  g.addColorStop(1, bunn);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sola går i en bue mellom dagtallet (venstre) og solstrålene (høyre).
  const sx = W * (0.2 + 0.6 * f), sy = H * 0.88 - Math.sin(Math.PI * f) * H * 0.5;
  const r = H * 0.19;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(tsek * 0.25);
  for (let i = 0; i < 12; i++) {
    const v = (i / 12) * Math.PI * 2;
    poly(ctx, [[Math.cos(v - 0.13) * r * 1.15, Math.sin(v - 0.13) * r * 1.15], [Math.cos(v) * r * 1.7, Math.sin(v) * r * 1.7],
      [Math.cos(v + 0.13) * r * 1.15, Math.sin(v + 0.13) * r * 1.15]], i % 2 ? '#ffc93c' : '#ffe07a');
  }
  ctx.restore();
  const skive = [];
  for (let i = 0; i < 10; i++) { const v = (i / 10) * Math.PI * 2; skive.push([sx + Math.cos(v) * r, sy + Math.sin(v) * r]); }
  fasett(ctx, skive, '#ffd23f', { styrke: 0.8 });
  if (liten()) {
    ctx.fillStyle = '#7a4a10';
    for (const dx of [-0.32, 0.32]) { ctx.beginPath(); ctx.arc(sx + dx * r, sy - r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#7a4a10';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.arc(sx, sy + r * 0.05, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
  const kveld = klamp((f - 0.7) / 0.3);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H - 6 - Math.sin(x / 90 + 0.5) * 5 - Math.sin(x / 37) * 2);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = blandRgb('#4e7d35', '#2d3b52', kveld);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Natta: stjerneskudd man kan fange, så ny dag
// ---------------------------------------------------------------------------
function startNatt() {
  if (t.natt || !t.spill) return;
  if (t.naer) { t.naer.kveld = false; lukkNaer(); }
  t.spill.sol = 0;
  t.natt = { t0: naa() / 1000, skudd: [], gnister: [], neste: naa() / 1000 + 0.8, slutt: null,
    stjerner: Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.85, r: 0.6 + Math.random() * 1.4, fase: Math.random() * 6 })) };
  L.solnedgang();
  $('natt').hidden = false;
  oppdaterHud();
  lagreSnart();
  clearTimeout(t.nattTid);
  t.nattTid = setTimeout(godMorgen, 30000);
}

function godMorgen() {
  if (!t.natt || t.natt.slutt) return;
  clearTimeout(t.nattTid);
  t.natt.slutt = naa() / 1000;
  L.vekk();
  L.morgen();
  setTimeout(() => {
    t.natt = null;
    $('natt').hidden = true;
    const [h] = R.nyDag(t.spill, t.verden);
    oppdaterHud();
    lagreSnart();
    t.skitten = true;
    melding(h.vokst.length ? `Dag ${h.dag}! Det har vokst fram ${h.vokst.length} nye ting.` : `Dag ${h.dag}!`, { ikon: '☀️' });
  }, 1100);
}

function tegnNatt(tsek) {
  const n = t.natt;
  const c = $('natt-lerret');
  const W = c.clientWidth, H = c.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const inn = klamp((tsek - n.t0) / 1.2) * (n.slutt ? 1 - klamp((tsek - n.slutt) / 1.0) : 1);
  $('natt').style.pointerEvents = n.slutt ? 'none' : 'auto';
  $('natt').style.opacity = inn;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(12, 16, 42, 0.94)');
  g.addColorStop(1, 'rgba(28, 30, 70, 0.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f4ecc8';
  ctx.beginPath(); ctx.arc(W - 70, 70, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgb(14, 18, 45)';
  ctx.beginPath(); ctx.arc(W - 58, 63, 26, 0, Math.PI * 2); ctx.fill();
  for (const s of n.stjerner) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(tsek * 1.3 + s.fase));
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
  }
  if (!n.slutt && tsek > n.neste) {
    n.neste = tsek + 0.7 + Math.random() * 0.8;
    const fraVenstre = Math.random() < 0.5;
    n.skudd.push({ t0: tsek, x0: fraVenstre ? Math.random() * W * 0.4 : W * (0.6 + Math.random() * 0.4), y0: Math.random() * H * 0.4,
      vx: (fraVenstre ? 1 : -1) * W * (0.18 + Math.random() * 0.1), vy: H * (0.16 + Math.random() * 0.1), liv: 2.6 });
  }
  n.skudd = n.skudd.filter((s) => tsek - s.t0 < s.liv && !s.tatt);
  for (const s of n.skudd) {
    const a = tsek - s.t0;
    s.x = s.x0 + s.vx * a;
    s.y = s.y0 + s.vy * a;
    ctx.globalAlpha = 1 - klamp((a - s.liv + 0.4) / 0.4);
    const hale = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.35, s.y - s.vy * 0.35);
    hale.addColorStop(0, 'rgba(255, 236, 160, 0.9)');
    hale.addColorStop(1, 'rgba(255, 236, 160, 0)');
    ctx.strokeStyle = hale;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.35, s.y - s.vy * 0.35); ctx.stroke();
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const v = tsek * 3 + s.t0 + (i / 10) * Math.PI * 2;
      const rr = i % 2 ? 6 : 14;
      pts.push([s.x + Math.cos(v) * rr, s.y + Math.sin(v) * rr]);
    }
    poly(ctx, pts, '#ffd23f');
  }
  n.gnister = n.gnister.filter((q) => tsek - q.t0 < 0.9);
  for (const q of n.gnister) {
    const a = tsek - q.t0;
    ctx.globalAlpha = 1 - a / 0.9;
    ctx.fillStyle = '#ffe58a';
    ctx.beginPath(); ctx.arc(q.x + q.vx * a, q.y + q.vy * a + 60 * a * a, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function fangStjerne(e) {
  const n = t.natt;
  if (!n || n.slutt) return;
  L.vekk();
  const r = $('natt-lerret').getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const s = n.skudd.find((q) => Math.hypot(q.x - x, q.y - y) < 55);
  if (!s) return;
  s.tatt = true;
  L.stjerne();
  for (let i = 0; i < 14; i++) {
    const v = Math.random() * Math.PI * 2;
    n.gnister.push({ t0: naa() / 1000, x: s.x, y: s.y, vx: Math.cos(v) * 130, vy: Math.sin(v) * 130 });
  }
  R.fangStjerne(t.spill);
  flyTil({ stov: 1 }, { x: e.clientX, y: e.clientY });
  lagreSnart();
}

// ---------------------------------------------------------------------------
// Meny, sangbok og meldinger
// ---------------------------------------------------------------------------
function aapneMeny() {
  L.vekk();
  const s = t.spill;
  const annet = s.nivaa === 'liten' ? 'stor' : 'liten';
  $('meny-nivaa').textContent = `Bytt til ${NIVAA[annet].ikon} ${NIVAA[annet].navn}`;
  $('meny-lyd').textContent = L.lydPaa() ? '🔊 Lyd på' : '🔇 Lyd av';
  $('meny-tittel').textContent = `${s.avatar} ${s.navn}`;
  $('meny').showModal();
}

function aapneSangbok() {
  L.vekk();
  const s = t.spill;
  const hele = Object.values(TING).filter((d) => (s.sanger[d.sang] ?? 0) >= 3).length;
  $('sangbok-tekst').textContent = liten() ? '' : `Du kan ${hele} av ${Object.keys(TING).length} sanger helt. Trykk ferdig en stor ting for å lære hele sangen!`;
  $('sangliste').innerHTML = Object.values(TING).map((d) => {
    const n = s.sanger[d.sang] ?? 0;
    const noter = [1, 2, 3].map((k) => `<span class="note ${n >= k ? 'har' : ''}">${'♪'.repeat(k)}</span>`).join('');
    return `<div class="sang-rad ${n >= 3 ? 'hel' : ''}"><span class="ikon">${d.ikon}</span>
      <span class="sangnavn">${n ? L.SANG[d.sang].navn : '???'}</span><span class="noter">${noter}</span></div>`;
  }).join('');
  $('sangbok').showModal();
}

let meldingTid = 0;
function melding(tekst, { ikon = '' } = {}) {
  const el = $('melding');
  if (liten()) {
    if (!ikon) return;
    el.textContent = ikon;
  } else el.textContent = ikon ? `${ikon} ${tekst}` : tekst;
  el.hidden = false;
  el.classList.remove('vis');
  void el.offsetWidth;
  el.classList.add('vis');
  clearTimeout(meldingTid);
  meldingTid = setTimeout(() => { el.hidden = true; }, 3000);
}

// ---------------------------------------------------------------------------
// Tegnesløyfe
// ---------------------------------------------------------------------------
function hintRuter() {
  const s = t.spill, v = t.verden;
  if (s.stat.avdekket === 0) return [...s.avdekket.keys()].filter((i) => R.kanBorstes(s, v, i));
  if (s.stat.ting === 0) return [...s.avdekket.keys()].filter((i) => s.avdekket[i] && R.tingVed(s, v, i));
  return null;
}

function tegnBrett(ms) {
  const k = t.kamera, l = k.lerret;
  const ctx = l.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BAKGRUNN;
  ctx.fillRect(0, 0, l.width, l.height);
  k.anvend(ctx);
  const utsnitt = {
    x0: Math.floor(k.x / RUTE) - 1, y0: Math.floor(k.y / RUTE) - 1,
    x1: Math.ceil((k.x + l.width / k.skala) / RUTE), y1: Math.ceil((k.y + l.height / k.skala) / RUTE),
  };
  const hint = hintRuter();
  t.brett.tegn(ctx, t.spill, { utsnitt, skala: k.skala, avdekkAnim: t.avdekkAnim, borstAnim: t.borstAnim, naa: ms, hint });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  tegnEffekter(ctx, (kx, ky) => ({ x: (kx - k.x) * k.skala, y: (ky - k.y) * k.skala }), k.skala, k.dpr);
  t.brett.jobb(6);
  for (const [i, tid] of t.borstAnim) if (ms - tid > 300) t.borstAnim.delete(i);
  t.skitten = !!hint || t.brett.ko.size > 0;
}

function sloyfe() {
  const ms = naa();
  if (t.spill && !$('spill').hidden) {
    tegnHimmel(ms / 1000);
    if (t.skitten || t.avdekkAnim.size || t.borstAnim.size || harEffekter()) tegnBrett(ms);
  }
  if (t.naer) tegnNaer(ms / 1000);
  if (t.natt) tegnNatt(ms / 1000);
  requestAnimationFrame(sloyfe);
}

// ---------------------------------------------------------------------------
// Oppstart
// ---------------------------------------------------------------------------
function start() {
  t.kamera = new Kamera($('lerret'), { vedTrykk: trykkPaa, vedEndring: () => { t.skitten = true; } });
  addEventListener('resize', () => { if (t.spill) { t.kamera.tilpassLerret(); t.skitten = true; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && t.id && t.spill) Lagring.lagre(t.id, t.spill); });

  $('ny-spiller').onclick = aapneNySpiller;
  $('ny-avbryt').onclick = () => $('ny').close();
  $('ny-start').onclick = lagNySpiller;

  $('naer-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); trykkNaer(e); });
  $('naer-lukk').onclick = lukkNaer;
  $('naer').addEventListener('pointerdown', (e) => { if (e.target === $('naer')) lukkNaer(); });

  $('natt-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); fangStjerne(e); });
  $('morgen').onclick = godMorgen;

  $('meny-knapp').onclick = aapneMeny;
  $('sangbok-knapp').onclick = aapneSangbok;
  $('sangbok-lukk').onclick = () => $('sangbok').close();
  $('meny-lukk').onclick = () => $('meny').close();
  $('meny-sov').onclick = () => { $('meny').close(); startNatt(); };
  $('meny-lyd').onclick = () => {
    L.settLyd(!L.lydPaa());
    try { localStorage.setItem('oya-lyd', L.lydPaa() ? 'paa' : 'av'); } catch { /* ignorer */ }
    $('meny-lyd').textContent = L.lydPaa() ? '🔊 Lyd på' : '🔇 Lyd av';
  };
  $('meny-nivaa').onclick = () => {
    R.byttNivaa(t.spill, t.spill.nivaa === 'liten' ? 'stor' : 'liten');
    document.body.classList.toggle('liten', liten());
    tegnForrad();
    oppdaterHud();
    lagreSnart();
    $('meny').close();
  };
  $('meny-bytt').onclick = () => { $('meny').close(); visVelg(); };
  $('meny-ny-oy').onclick = () => {
    if (!confirm('Lage en helt ny øy? Den du har nå, forsvinner.')) return;
    const s = t.spill;
    Lagring.lagre(t.id, R.nyttSpill({ navn: s.navn, nivaa: s.nivaa, avatar: s.avatar }));
    $('meny').close();
    startSpill(t.id);
  };
  $('meny-slett').onclick = () => {
    if (!confirm(`Slette ${t.spill.navn} og øya til ${t.spill.navn}?`)) return;
    const id = t.id;
    t.id = null;
    t.spill = null;
    Lagring.slett(id);
    $('meny').close();
    visVelg();
  };

  visVelg();
  requestAnimationFrame(sloyfe);
}

start();
window.__oya = t; // for testing i nettleseren
