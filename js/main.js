// Skatteøya – trykk, tell og regn.
// Velg spiller → øya med tåke. Børst bort tåka og trykk på ting (tre, stein, jern,
// fisk, korn, sau); hvert trykk er én tone og ett tall (1, 2, 3 …). Skattekister
// åpnes med mattestykker og gir sølv, gull og edelsteiner. Skattene selges i
// butikken, og for myntene kjøper man bygg som settes ut på øya.

import { Kamera } from './kamera.js';
import { Brett, RUTE, BAKGRUNN } from './brett.js';
import * as R from './regler.js';
import * as Lagring from './lagring.js';
import * as L from './trykk/toner.js';
import * as M from './matte.js';
import { tegnFigur } from './figurer.js';
import { tegnTomtKort } from './stil/ruter.js';
import { PYNT, LIV, tegnBygg, ivrig } from './stil/pynt.js';
import { poly, fasett } from './stil/lavpoly.js';
import { TING, VARER, SKATTER, RAVARER, SOL, NIVAA, AVATARER, BYGG, BYGG_ETTER_ID, HAVN, BAAT, MAKS_STJERNER } from './data/ting.js';
import { settNeon, neonPaa, neonKontekst, glod } from './stil/neon.js';
import { visVersjon } from './versjon.js';
import { TAKFARGER, STANDARD_TAKFARGE, spillerfarge, settSpillerfarge } from './stil/spillerfarge.js';
import { ikon } from './ikoner.js';
import { sprut, flytendeTekst, tegnEffekter, harEffekter } from './effekter.js';
import { blandSeed, lagTilfeldig } from './rng.js';

const $ = (id) => document.getElementById(id);
const naa = () => performance.now();
const klamp = (u, a = 0, b = 1) => Math.max(a, Math.min(b, u));
const sprett = (u) => { u = klamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const t = {
  id: null, spill: null, verden: null, brett: null, kamera: null,
  avdekkAnim: new Map(), borstAnim: new Map(), byggAnim: new Map(),
  naer: null, natt: null, plasser: null, skitten: true, solVis: 0,
  vist: {},           // det forrådet viser (tingene teller først når de har fløyet ned)
  forrigeStykke: '',
};

const liten = () => t.spill?.nivaa === 'liten';
const innst = () => t.spill.foreldre;

try { L.settLyd(localStorage.getItem('oya-lyd') !== 'av'); } catch { /* ignorer */ }

// ---------------------------------------------------------------------------
// Tall som leses høyt (valgfritt, foreldrene slår det på)
// ---------------------------------------------------------------------------
function siTall(n) {
  if (!t.spill || !innst().lesOpp || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = 'nb-NO';
    u.rate = 1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* opplesing er pynt */ }
}

// ---------------------------------------------------------------------------
// Talltastatur (fra HEX): 1–9, slett, 0, ok
// ---------------------------------------------------------------------------
function lagTastatur(el, vedTast) {
  el.innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'slett', '0', 'ok'].map((k) =>
    `<button type="button" class="tast${k === 'ok' ? ' tast-ok' : k === 'slett' ? ' tast-slett' : ''}" data-k="${k}">${k === 'slett' ? '⌫' : k === 'ok' ? '✓' : k}</button>`).join('');
  el.querySelectorAll('button').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); L.vekk(); vedTast(b.dataset.k); });
  });
}

function rist(el) {
  el.classList.remove('rister');
  void el.offsetWidth;
  el.classList.add('rister');
}

// ---------------------------------------------------------------------------
// Velg spiller
// ---------------------------------------------------------------------------
function visVelg() {
  if (t.id && t.spill) Lagring.lagre(t.id, t.spill);
  t.id = null;
  t.spill = null;
  avbrytPlassering();
  settNeon(false);
  document.body.classList.remove('neon');
  $('spill').hidden = true;
  $('velg').hidden = false;
  const liste = Lagring.profiler();
  $('profilliste').innerHTML = liste.length
    ? liste.map((p) => `<button class="profil" data-id="${esc(p.id)}">
        <span class="ava">${esc(p.avatar)}</span><span class="navn">${esc(p.navn)}</span>
        <span class="info">${NIVAA[p.nivaa]?.ikon ?? ''} Dag ${p.dag}${p.oyNr > 1 ? ` · 🌈 Øy ${p.oyNr}` : p.oyer ? ` · 🏝️ ${p.oyer} øyer` : ''}</span></button>`).join('')
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
  settSpillerfarge(spill.takfarge);
  settNeon(t.verden.stil === 'neon');
  document.body.classList.toggle('neon', neonPaa());
  t.brett = new Brett(t.verden);
  t.avdekkAnim.clear();
  t.borstAnim.clear();
  t.byggAnim.clear();
  t.vist = { ...spill.forrad, mynter: spill.mynter };
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
  if (t.plasser) { plasserHer(i); return; }
  if (!s.avdekket[i]) {
    behandle(R.borst(s, v, i), i);
    return;
  }
  if (s.kryss.has(i)) { behandleGrav(R.grav(s, v, i), i); return; }
  if (i === v.startIndeks) { aapneButikk(); return; }
  if (s.bygg.has(i)) { aapneNaer(i, { pynt: R.pyntVed(s, i) }); return; }
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
      if (innst().visTall) flytendeTekst(kx, ky - 10, String(h.tall), { farge: '#ffe58a', varighet: 900 });
      siTall(h.tall);
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

/** Graving på et skattekryss: fire trykk (1, 2, 3, 4), så spretter kista fram. */
const GRAVETONER = [261.63, 329.63, 392.0, 523.25];
function behandleGrav(hendelser, i) {
  const [kx, ky] = midtAv(i);
  for (const h of hendelser) {
    if (h.type === 'grav' || h.type === 'kisteFunnet') {
      L.INSTRUMENT.hogg(GRAVETONER[h.tall - 1]);
      sprut(kx, ky, { farger: ['#7a5236', '#a0703f', '#5b3a24'], antall: 14, fart: 1.5 });
      if (innst().visTall) flytendeTekst(kx, ky - 10, String(h.tall), { farge: '#ffe58a', varighet: 900 });
      siTall(h.tall);
      t.borstAnim.set(i, naa());
    }
    if (h.type === 'kisteFunnet') {
      t.byggAnim.set(i, naa());
      setTimeout(() => { L.fanfare(1); sprut(kx, ky - 20, { farger: ['#ffd23f', '#ffe58a', '#fff4c2'], antall: 26, fart: 1.5 }); }, 150);
      melding(liten() ? '🎁✨' : 'Du fant en skattekiste! Trykk på den og løs stykket.', { ikon: liten() ? '' : '🎁' });
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
// Nærbilde: tingen stort på skjermen. Ett trykk = én tone og ett tall.
// Kister åpnes med mattestykker; bygg man har satt ut, kan man glede seg over.
// ---------------------------------------------------------------------------
function aapneNaer(i, { pynt = null } = {}) {
  const ting = pynt ? null : R.tingVed(t.spill, t.verden, i);
  if (!ting && !pynt) return;
  const kiste = ting?.type === 'kiste';
  const boks = $('naer');
  boks.classList.toggle('med-matte', kiste);
  const liggende = innerWidth > innerHeight * 1.15;
  // Ved kister trengs det plass til regnestykket: ved siden av (liggende) eller under (stående).
  const panel = innst().svar === 'velg' ? 230 : 430;
  const vedHavn = pynt === HAVN.id || pynt === BAAT.id;
  const S = Math.floor(kiste
    ? Math.max(130, Math.min(liggende ? innerWidth * 0.42 : innerWidth * 0.8, liggende ? innerHeight - 170 : innerHeight - panel - 130, 380))
    : Math.min(innerWidth * 0.86, (innerHeight - (vedHavn ? 300 : 150)) * 0.86, 440));
  const H = S + (pynt ? 0 : kiste ? 40 : 56);
  const c = $('naer-lerret');
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(S * dpr);
  c.height = Math.round(H * dpr);
  c.style.width = `${S}px`;
  c.style.height = `${H}px`;
  const terreng = R.TERRENGNAVN[t.verden.terreng[i]];
  t.naer = {
    i, ting, pynt, S, H, tStart: naa() / 1000, tTrykk: -9, tFerdig: null, partikler: [], tall: 0, tTall: -9,
    terreng: pynt && terreng === 'skog' ? 'eng' : terreng,
    tilf: blandSeed(t.verden.seed, t.verden.forsok, 'kort', i),
  };
  if (pynt) {
    $('naer-tittel').innerHTML = liten() ? '<span class="stor-ikon">🎉</span>' : esc(BYGG_ETTER_ID[pynt].navn);
  } else {
    const def = TING[ting.type];
    $('naer-tittel').innerHTML = liten() ? `<span class="stor-ikon">${def.ikon}</span>`
      : `${def.navn[ting.str]} <span class="sang">${kiste ? 'Løs stykket for å åpne!' : `♪ ${L.SANG[def.sang].navn}`}</span>`;
  }
  $('matte').hidden = !kiste;
  if (kiste) nyttStykke();
  visHavnValg(pynt);
  boks.hidden = false;
}

function trykkNaer(e) {
  const n = t.naer;
  if (!n || n.tFerdig !== null) return;
  L.vekk();
  const r = $('naer-lerret').getBoundingClientRect();
  const x = e.clientX - r.left, y = Math.min(n.S * 0.95, e.clientY - r.top);
  if (n.pynt) {
    // Bygg man har satt ut: en liten fest når man trykker på dem.
    n.tTrykk = naa() / 1000;
    sprutNaer(n, x, y, 14, 1.2, ['#ffd23f', '#e0393e', '#3a74d8', '#25b86a', '#ffffff']);
    L.fanfare(1);
    return;
  }
  if (n.ting.type === 'kiste') return;   // kister åpnes med regnestykket under
  const def = TING[n.ting.type];
  for (const h of R.trykkTing(t.spill, t.verden, n.i)) {
    if (h.type === 'tone') {
      L.INSTRUMENT[def.instrument](h.frekvens);
      n.ting = { ...n.ting, igjen: h.igjen };
      n.tTrykk = naa() / 1000;
      n.tall = h.tall;
      n.tTall = n.tTrykk;
      siTall(h.tall);
      sprutNaer(n, x, y, 7, 1);
    } else if (h.type === 'ferdig') {
      ferdigNaer(n, h, r);
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

function ferdigNaer(n, h, r) {
  n.tFerdig = naa() / 1000;
  setTimeout(() => L.fanfare(n.ting.str + 1), 180);
  sprutNaer(n, n.S / 2, n.S * 0.55, 12 + n.ting.str * 8, 1.4);
  setTimeout(() => flyTil(h.gave, { x: r.left + r.width / 2, y: r.top + n.S / 2 }), 550);
  if (h.nySang) setTimeout(() => melding(`Ny sang i sangboka: ${L.SANG[h.sang].navn}!`, { ikon: '🎵✨' }), 1300);
  if (n.ting.type === 'kiste' && !liten()) {
    const verdi = Object.entries(h.gave).reduce((a, [v, k]) => a + VARER[v].pris * k, 0);
    setTimeout(() => melding(`Skatten er verdt ${verdi} mynter i butikken!`, { ikon: '💰' }), 1500);
  }
  setTimeout(lukkNaer, 2400);
}

function sprutNaer(n, x, y, antall, kraft, farger = null) {
  const f = farger ?? TING[n.ting.type].sprut;
  const t0 = naa() / 1000;
  for (let i = 0; i < antall; i++) {
    const v = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const fart = (90 + Math.random() * 160) * kraft * (n.S / 230);
    n.partikler.push({ x, y, vx: Math.cos(v) * fart, vy: Math.sin(v) * fart, t0, liv: 0.6 + Math.random() * 0.5,
      r: (2 + Math.random() * 3.5) * (n.S / 230), farge: f[Math.floor(Math.random() * f.length)], spinn: Math.random() * 6 });
  }
}

// ---------------------------------------------------------------------------
// Havna: bygg en seilbåt, og seil til en ny øy (eller bli der du er)
// ---------------------------------------------------------------------------
function visHavnValg(pynt) {
  const el = $('havn-valg');
  el.hidden = pynt !== HAVN.id && pynt !== BAAT.id;
  if (el.hidden) return;
  const s = t.spill;
  if (pynt === HAVN.id) {
    const kan = s.mynter >= BAAT.pris;
    el.innerHTML = `${liten() ? '' : '<p>Bygg en seilbåt, så kan du seile til en ny øy!</p>'}
      <button id="havn-baat" class="hoved${kan ? '' : ' dyr'}">⛵ ${liten() ? '' : 'Bygg seilbåt – '}${BAAT.pris} 🪙</button>
      ${!kan && !liten() ? `<small>Du har ${s.mynter} mynter og mangler ${BAAT.pris - s.mynter}.</small>` : ''}`;
    $('havn-baat').onclick = byggBaat;
  } else {
    const ny = R.kanSeileNy(s), tilbake = R.kanSeileTilbake(s);
    el.innerHTML = `${liten() ? '' : `<p>${ny ? 'Seilbåten er klar! Vil du seile til en ny øy? Øya du har bygget, blir liggende her, og du kan seile tilbake når du vil.'
      : 'Seilbåten ligger klar ved brygga. I sjøkartet kan du seile til de andre øyene dine.'}</p>`}
      <div class="havn-knapper">
        ${ny ? `<button id="havn-seil" class="hoved">⛵ ${liten() ? '➡️ 🏝️' : 'Seil til en ny øy!'}</button>` : ''}
        ${tilbake ? `<button id="havn-kart"${ny ? '' : ' class="hoved"'}>🗺️ ${liten() ? '' : 'Sjøkartet'}</button>` : ''}
        <button id="havn-bli">${liten() ? '🏠' : '🏝️ Bli her litt til'}</button></div>`;
    $('havn-seil')?.addEventListener('click', () => seilAvsted());
    $('havn-kart')?.addEventListener('click', () => { lukkNaer(); aapneSjokart(); });
    $('havn-bli').onclick = lukkNaer;
  }
}

function byggBaat() {
  L.vekk();
  const h = R.byggBaat(t.spill);
  if (h[0]?.type !== 'baatBygget') {
    rist($('havn-valg'));
    L.tomt();
    if (h[0]?.type === 'forLiteMynter' && !liten()) melding(`Seilbåten koster ${BAAT.pris} mynter. Du mangler ${h[0].mangler}.`, { ikon: '🪙' });
    return;
  }
  trekkVist('mynter', BAAT.pris);
  const n = t.naer;
  n.pynt = BAAT.id;
  n.tTrykk = naa() / 1000;
  sprutNaer(n, n.S * 0.75, n.S * 0.55, 26, 1.3, ['#ffd23f', '#e0393e', '#3a74d8', '#25b86a', '#ffffff']);
  L.fanfare(3);
  $('naer-tittel').innerHTML = liten() ? '<span class="stor-ikon">⛵</span>' : esc(BAAT.navn);
  visHavnValg(BAAT.id);
  lagreSnart();
  t.skitten = true;
}

/** Sjøkartet: alle øyene man har funnet. Man kan seile tilbake til dem når som helst. */
function aapneSjokart() {
  L.vekk();
  const s = t.spill;
  const oyer = R.oyListe(s);
  $('sjokart-tekst').textContent = liten() ? ''
    : R.kanSeileNy(s) ? 'Du kan også seile til en helt ny øy fra havna.'
    : R.havnVed(s) < 0 && !oyer.some((o) => o.fra === s.oyNr) ? `Vil du finne en ny øy? Sett opp alle ${HAVN.krav} byggene og en havn på denne øya.` : '';
  $('oyliste').innerHTML = oyer.map((o) => `<div class="oyrad${o.her ? ' her' : ''}">
      <span class="oyikon">${o.ikon}</span>
      <span class="oynavn"><b>${esc(o.navn)}</b><small>${o.bygg} bygg${o.her ? ' · Du er her' : ''}</small></span>
      ${o.her ? '<span class="her-merke">📍</span>' : `<button class="hoved" data-oy="${o.nr}">⛵ ${liten() ? '' : 'Seil hit'}</button>`}
    </div>`).join('');
  $('oyliste').querySelectorAll('[data-oy]').forEach((b) => { b.onclick = () => seilAvsted(Number(b.dataset.oy)); });
  $('sjokart').showModal();
}

/** Seil til en ny øy (nr = null) eller tilbake til øy nummer nr. */
function seilAvsted(nr = null) {
  L.vekk();
  const fraStil = t.verden.stil;
  t.seiler = true;   // ingen natt mens man er på havet
  if (t.naer) t.naer.kveld = false;
  lukkNaer();
  if ($('sjokart').open) $('sjokart').close();
  avbrytPlassering();
  const h = nr === null ? R.seil(t.spill) : R.seilTil(t.spill, nr);
  if (h[0]?.type !== 'seilt') { t.seiler = false; return; }
  Lagring.lagre(t.id, t.spill);
  const { ny, stil } = h[0];
  const navn = R.oyListe(t.spill).find((o) => o.her).navn;
  const el = $('seiling');
  el.classList.toggle('fra-neon', fraStil === 'neon');
  el.classList.toggle('til-vanlig', stil !== 'neon');
  el.classList.toggle('samme', fraStil === stil);
  el.classList.remove('ferdig');
  $('seiling-tekst').textContent = liten() ? '⛵ ✨' : ny ? 'Seiler til en ny øy …' : `Seiler til ${navn} …`;
  el.hidden = false;
  L.fanfare(3);
  setTimeout(() => { t.seiler = false; startSpill(t.id); el.classList.add('ferdig'); }, 2700);
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('ferdig');
    const tekst = !ny ? `Velkommen tilbake til ${navn}!` : stil === 'neon' ? `Velkommen til ${navn}! Her lyser alt.` : 'Velkommen til en ny øy!';
    melding(liten() ? `${R.oyListe(t.spill).find((o) => o.her).ikon}✨` : tekst, { ikon: liten() ? '' : '⛵✨' });
  }, 3400);
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
  ctx.clearRect(0, 0, S, n.H);
  const ting = n.ting;
  const p = ting ? 1 - ting.igjen / ting.antall : 0;
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
    if (n.pynt) {
      // Bygget lever: et trykk gir ekstra fart en stund (og raketten skytes opp).
      const fest = tsek - n.tTrykk;
      n.tv = (n.tv ?? tsek) + Math.min(0.1, tsek - (n.sist ?? tsek)) * ivrig(fest);
      n.sist = tsek;
      PYNT[n.pynt](ctx, S, lagTilfeldig(blandSeed(t.verden.seed, 'pynt', n.i)));
      LIV[n.pynt]?.(ctx, S, n.tv, fest);
    }
    else tegnFigur(ctx, S, ting, { p, ferdigT, t: tsek });
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
  if (!ting) return;
  if (ting.type === 'kiste') { tegnPrikker(ctx, S, n.H - S, ting.antall, ting.antall - ting.igjen, false); return; }
  tegnPrikker(ctx, S, n.H - S, ting.antall, ting.antall - ting.igjen, innst().visTall);
  if (innst().visTall && n.tall > 0) tegnTeller(ctx, S, n, tsek);
}

/** Det store tallet øverst på kortet: 1, 2, 3 … opp til tallet som fjerner tingen. */
function tegnTeller(ctx, S, n, tsek) {
  const a = tsek - n.tTall;
  const pop = 1 + 0.45 * Math.exp(-a * 9);
  const ferdig = n.tall >= n.ting.antall;
  ctx.save();
  ctx.translate(S / 2, S * 0.16);
  ctx.scale(pop, pop);
  ctx.font = `900 ${Math.round(S * 0.17)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = S * 0.025;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(30, 25, 15, 0.85)';
  ctx.strokeText(String(n.tall), 0, 0);
  ctx.fillStyle = ferdig ? '#ffd23f' : '#ffffff';
  ctx.fillText(String(n.tall), 0, 0);
  ctx.restore();
  if (!liten()) {
    ctx.font = `700 ${Math.round(S * 0.055)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = S * 0.012;
    ctx.strokeStyle = 'rgba(30, 25, 15, 0.8)';
    const tekst = `av ${n.ting.antall}`;
    ctx.strokeText(tekst, S / 2, S * 0.27);
    ctx.fillStyle = '#ffe58a';
    ctx.fillText(tekst, S / 2, S * 0.27);
  }
}

/**
 * Én prikk per trykk (eller per mattestykke). Fylte prikker = gjort.
 * Med tall: fylte prikker viser tallet sitt, og den siste prikken viser målet.
 */
function tegnPrikker(ctx, S, H, n, gjort, medTall) {
  const rader = n <= 12 ? 1 : Math.ceil(n / 15);
  const perRad = Math.ceil(n / rader);
  const r = Math.min(liten() || n <= 3 ? 13 : 10, (S - 8) / perRad / 2.6, (H - 6) / rader / 2.6);
  const avst = r * 2.6;
  const y0 = S + 4 + (H - 4 - rader * avst) / 2 + avst / 2;
  const visTall = medTall && r >= 7.5;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 1.05)}px system-ui, -apple-system, sans-serif`;
  for (let i = 0; i < n; i++) {
    const rad = Math.floor(i / perRad), kol = i - rad * perRad;
    const iRad = Math.min(perRad, n - rad * perRad);
    const x = S / 2 + (kol - (iRad - 1) / 2) * avst, y = y0 + rad * avst;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (i < gjort) {
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      if (visTall) { ctx.fillStyle = '#4a3410'; ctx.fillText(String(i + 1), x, y + 0.5); }
    } else {
      ctx.lineWidth = Math.max(1, r * 0.25);
      ctx.strokeStyle = 'rgba(250, 242, 219, 0.5)';
      ctx.stroke();
      if (medTall && i === n - 1) {
        ctx.font = `800 ${Math.round(Math.max(r * 1.05, 11))}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = '#ffe58a';
        ctx.fillText(String(n), x, y + 0.5);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Mattestykker ved kistene
// ---------------------------------------------------------------------------
function nyttStykke() {
  const n = t.naer;
  const o = M.lagOppgave(innst(), t.forrigeStykke);
  t.forrigeStykke = o.tekst;
  n.oppgave = o;
  n.innTastet = '';
  n.bommet = false;
  $('matte-stykke').textContent = `${o.tekst} =`;
  $('matte-melding').textContent = '';
  $('matte-melding').className = 'matte-melding';
  const velg = innst().svar === 'velg';
  $('matte-valg').hidden = !velg;
  $('matte-tast').hidden = velg;
  if (velg) {
    $('matte-valg').innerHTML = M.alternativer(o).map((v) => `<button type="button" class="svarvalg" data-v="${v}">${v}</button>`).join('');
    $('matte-valg').querySelectorAll('button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); L.vekk(); svar(Number(b.dataset.v), b); });
    });
  }
  visInntastet();
}

function visInntastet() {
  const n = t.naer;
  $('matte-svar').textContent = innst().svar === 'velg' ? '?' : (n.innTastet || '?');
}

function tastKiste(k) {
  const n = t.naer;
  if (!n?.oppgave || n.tFerdig !== null) return;
  if (k === 'slett') n.innTastet = n.innTastet.slice(0, -1);
  else if (k === 'ok') { if (n.innTastet === '') rist($('matte')); else svar(Number(n.innTastet)); return; }
  else if (n.innTastet.length < 4) n.innTastet += k;
  visInntastet();
}

function svar(verdi, knapp = null) {
  const n = t.naer;
  if (!n?.oppgave || n.tFerdig !== null || n.venter) return;
  const o = n.oppgave;
  const riktig = verdi === o.fasit;
  const h = R.svarKiste(t.spill, t.verden, n.i, { riktig, forsteForsok: !n.bommet, art: o.art });
  lagreSnart();
  if (!riktig) {
    // Ingen straff: samme stykke står, og man prøver igjen.
    n.bommet = true;
    n.innTastet = '';
    visInntastet();
    $('matte-melding').textContent = liten() ? '🙈' : 'Ikke helt – prøv igjen!';
    $('matte-melding').className = 'matte-melding feil';
    if (knapp) knapp.classList.add('feil');
    rist($('matte'));
    L.tomt();
    return;
  }
  $('matte-svar').textContent = String(o.fasit);
  $('matte-melding').textContent = liten() ? '⭐' : 'Riktig!';
  $('matte-melding').className = 'matte-melding riktig';
  if (knapp) knapp.classList.add('riktig');
  const r = $('naer-lerret').getBoundingClientRect();
  for (const e of h) {
    if (e.type === 'riktigSvar') {
      // Hvert løste stykke spiller sin del av sangen.
      const toner = n.ting.toner;
      const del = Math.ceil(toner.length / n.ting.antall);
      toner.slice((e.nr - 1) * del, e.nr * del).forEach((f, k) => setTimeout(() => L.INSTRUMENT.xylofon(f), k * 190));
      n.ting = { ...n.ting, igjen: e.igjen };
      n.tTrykk = naa() / 1000;
      sprutNaer(n, n.S / 2, n.S * 0.55, 10, 1);
    } else if (e.type === 'ferdig') {
      setTimeout(() => ferdigNaer(n, e, r), 900);
    } else if (e.type === 'kveld') {
      n.kveld = true;
    } else if (e.type === 'tomSol') {
      lukkNaer();
      return;
    }
  }
  oppdaterHud();
  t.skitten = true;
  if (n.ting.igjen > 0) {
    n.venter = true;
    setTimeout(() => { n.venter = false; if (t.naer === n) nyttStykke(); }, 1100);
  }
}

// ---------------------------------------------------------------------------
// Forrådet: tingene flyr ned og teller først når de lander
// ---------------------------------------------------------------------------
const FORRAD_REKKE = ['mynter', ...RAVARER, ...SKATTER];

function byggForrad() {
  $('forrad').innerHTML = FORRAD_REKKE.map((v) =>
    `<span class="vare${v === 'mynter' ? ' mynter' : ''}" id="f-${v}" title="${v === 'mynter' ? 'mynter' : VARER[v].navn}"></span>`).join('');
  tegnForrad();
}

function tegnForrad(dunk) {
  for (const v of FORRAD_REKKE) {
    const el = $(`f-${v}`), n = t.vist[v] ?? 0;
    // Skatter vises først når man har funnet noen (bortsett fra mynter).
    el.hidden = SKATTER.includes(v) && !n;
    el.classList.toggle('null', !n);
    el.innerHTML = liten() && v !== 'mynter'
      ? (n ? `${ikon(v).repeat(Math.min(n, 5))}${n > 5 ? '<small>+</small>' : ''}` : ikon(v))
      : `${ikon(v)} <b>${n}</b>`;
  }
  if (dunk) {
    const el = $(`f-${dunk}`);
    el.classList.remove('dunk');
    void el.offsetWidth;
    el.classList.add('dunk');
  }
}

/** Ting flyr fra et punkt ned i forrådet. Mange av samme slag deles på opptil 10 flygere. */
function flyTil(gave, fra) {
  let forsink = 0;
  for (const [vare, n] of Object.entries(gave)) {
    if (!n) continue;
    const flygere = Math.min(n, 10);
    for (let k = 0; k < flygere; k++) {
      const andel = Math.floor(n / flygere) + (k < n % flygere ? 1 : 0);
      if (SKATTER.includes(vare)) $(`f-${vare}`).hidden = false;
      const s = document.createElement('span');
      s.className = 'flyr';
      s.innerHTML = ikon(vare);
      s.style.left = `${fra.x}px`;
      s.style.top = `${fra.y}px`;
      document.body.append(s);
      const m = $(`f-${vare}`).getBoundingClientRect();
      const dx = m.left + m.width / 2 - fra.x, dy = m.top + m.height / 2 - fra.y;
      setTimeout(() => { s.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`; }, 40 + forsink);
      setTimeout(() => {
        s.remove();
        t.vist[vare] = (t.vist[vare] ?? 0) + andel;
        tegnForrad(vare);
        if (vare === 'mynter') oppdaterButikkMynter();
      }, 900 + forsink);
      forsink += flygere > 6 ? 70 : 110;
    }
  }
}

/** Tar vekk fra visningen med en gang (det man selger eller betaler). */
function trekkVist(vare, n) {
  t.vist[vare] = Math.max(0, (t.vist[vare] ?? 0) - n);
  tegnForrad();
}

// ---------------------------------------------------------------------------
// Butikken: selg skatter og råvarer, kjøp bygg
// ---------------------------------------------------------------------------
let fane = 'selg';
const bildeLager = new Map();

function byggBilde(id) {
  const nokkel = `${id}|${neonPaa()}|${spillerfarge()}`;
  if (bildeLager.has(nokkel)) return bildeLager.get(nokkel);
  const S = 120, dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = S * dpr;
  const ctx = neonKontekst(c.getContext('2d'));
  ctx.scale(dpr, dpr);
  tegnTomtKort(ctx, S, lagTilfeldig(blandSeed('butikk', id)), ['iglo', 'snomann', HAVN.id, BAAT.id].includes(id) ? 'strand' : 'eng',
    () => tegnBygg(ctx, S, id, lagTilfeldig(blandSeed('butikk-pynt', id))));
  glod(c, 0.5);
  const url = c.toDataURL();
  bildeLager.set(nokkel, url);
  return url;
}

function aapneButikk(f = fane) {
  L.vekk();
  fane = f;
  tegnButikk();
  if (!$('butikk').open) $('butikk').showModal();
}

function oppdaterButikkMynter(alltid = false) {
  if (!alltid && !$('butikk').open) return;
  $('butikk-mynter').innerHTML = `🪙 <b>${t.vist.mynter ?? 0}</b>${liten() ? '' : ' mynter'}`;
}

function tegnButikk() {
  const s = t.spill;
  $('fane-selg').classList.toggle('valgt', fane === 'selg');
  $('fane-kjop').classList.toggle('valgt', fane === 'kjop');
  $('butikk-selg').hidden = fane !== 'selg';
  $('butikk-kjop').hidden = fane !== 'kjop';
  oppdaterButikkMynter(true);
  tegnTakfarger();
  if (fane === 'selg') {
    const varer = [...SKATTER, ...RAVARER].filter((v) => s.forrad[v] > 0);
    const skattVerdi = SKATTER.reduce((a, v) => a + s.forrad[v] * VARER[v].pris, 0);
    $('butikk-selg').innerHTML = varer.length
      ? `${skattVerdi ? `<button class="hoved selg-alle" id="selg-skatter">💰 Selg alle skattene${liten() ? '' : ` (${skattVerdi} mynter)`}</button>` : ''}
        <div class="selgliste">${varer.map((v) => {
          const n = s.forrad[v], p = VARER[v].pris;
          return `<div class="selgrad"><span class="vi">${ikon(v)}</span>
            <span class="vn">${liten() ? '' : `<b>${VARER[v].navn}</b><small>${n} × ${p} = ${n * p} 🪙</small>`}</span>
            <button data-selg="${v}">${liten() ? `${'🪙'.repeat(Math.min(3, Math.ceil(n * p / 20)))}` : `Selg for ${n * p} 🪙`}</button></div>`;
        }).join('')}</div>`
      : `<p class="tom-tekst">${liten() ? '🌳 🪨 🎁' : 'Du har ingenting å selge ennå. Trykk på ting på øya og åpne kister!'}</p>`;
    $('butikk-selg').querySelectorAll('[data-selg]').forEach((b) => { b.onclick = () => selgVare([b.dataset.selg], b); });
    $('selg-skatter')?.addEventListener('click', (e) => selgVare(SKATTER.filter((v) => s.forrad[v] > 0), e.currentTarget));
  } else {
    $('butikk-kjop').innerHTML = BYGG.map((b) => {
      const kan = s.mynter >= b.pris;
      const mangler = b.pris - s.mynter;
      return `<button class="byggkort${kan ? '' : ' dyr'}" data-bygg="${b.id}">
        <img src="${byggBilde(b.id)}" alt=""><span class="bn">${esc(b.navn)}</span>
        <span class="bp">${b.pris} 🪙</span>${!kan && !liten() ? `<span class="bm">mangler ${mangler}</span>` : ''}</button>`;
    }).join('') + havnKort();
    $('butikk-kjop').querySelectorAll('[data-bygg]').forEach((b) => { b.onclick = () => velgBygg(b.dataset.bygg); });
  }
}

/** Havna nederst i butikken: låst til alle de 20 ulike byggene står på øya. */
function havnKort() {
  const s = t.spill;
  const har = R.ulikeBygg(s);
  const laast = !R.havnApen(s), staar = R.havnVed(s) >= 0;
  const status = staar ? (liten() ? '✔️' : '✔️ Står på øya')
    : laast ? (liten() ? `🔒 ${har}/${HAVN.krav}` : `🔒 ${har} av ${HAVN.krav} ulike bygg`)
    : (liten() ? '⚓' : 'Settes ved sjøen');
  return `<button class="byggkort havn${laast || staar ? ' laast' : ''}${!laast && !staar && s.mynter < HAVN.pris ? ' dyr' : ''}" data-bygg="${HAVN.id}">
    <img src="${byggBilde(HAVN.id)}" alt=""><span class="bn">⚓ ${esc(HAVN.navn)}</span>
    <span class="bp">${HAVN.pris} 🪙</span><span class="bl">${status}</span></button>`;
}

/** Fargevelgeren nederst i butikken: taket på leiren og alle flaggene. */
function tegnTakfarger() {
  const valgt = t.spill.takfarge ?? STANDARD_TAKFARGE;
  $('takfarge-tekst').textContent = liten() ? '🎨' : '🎨 Farge på taket og flaggene';
  $('takfarger').innerHTML = TAKFARGER.map((f) => `<button class="${f.farge === valgt ? 'valgt' : ''}" data-farge="${f.farge}"
    style="background:${f.farge}" aria-label="${f.navn}" title="${f.navn}"></button>`).join('');
  $('takfarger').querySelectorAll('[data-farge]').forEach((b) => { b.onclick = () => velgTakfarge(b.dataset.farge); });
}

function velgTakfarge(farge) {
  L.vekk();
  t.spill.takfarge = farge;
  settSpillerfarge(farge);
  L.INSTRUMENT.xylofon(659.25);
  lagreSnart();
  t.skitten = true;
  tegnButikk();   // bildene i butikken får de nye flaggene
}

function selgVare(varer, knapp) {
  const r = knapp.getBoundingClientRect();
  let sum = 0;
  for (const v of varer) {
    const n = t.spill.forrad[v];
    for (const h of R.selg(t.spill, v)) { sum += h.sum; trekkVist(v, n); }
  }
  if (!sum) return;
  L.INSTRUMENT.xylofon(523.25);
  setTimeout(() => L.INSTRUMENT.xylofon(783.99), 120);
  flyTil({ mynter: sum }, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  lagreSnart();
  setTimeout(tegnButikk, 50);
}

function velgBygg(id) {
  const b = BYGG_ETTER_ID[id];
  if (id === HAVN.id && !R.kanKjopeHavn(t.spill)) {
    rist($('butikk'));
    L.tomt();
    const staar = R.havnVed(t.spill) >= 0;
    if (!liten()) {
      melding(staar ? 'Havna står allerede på øya. Trykk på den for å bygge en seilbåt.'
        : `Havna kan bygges når alle de ${HAVN.krav} ulike byggene står på øya. Du har ${R.ulikeBygg(t.spill)}.`, { ikon: '⚓' });
    }
    return;
  }
  if (t.spill.mynter < b.pris) {
    rist($('butikk'));
    L.tomt();
    if (!liten()) melding(`Du har ${t.spill.mynter} mynter. ${b.navn} koster ${b.pris}, så du mangler ${b.pris - t.spill.mynter}.`, { ikon: '🪙' });
    return;
  }
  $('butikk').close();
  t.plasser = { id };
  $('plasser-tekst').innerHTML = liten() ? `<img src="${byggBilde(id)}" alt=""> 👇`
    : id === HAVN.id ? 'Trykk på en rute ved sjøen for å bygge <b>havna</b>' : `Trykk der du vil sette opp: <b>${esc(b.navn)}</b>`;
  $('plasser').hidden = false;
  t.skitten = true;
}

function plasserHer(i) {
  const { id } = t.plasser;
  const for_ = R.ulikeBygg(t.spill);
  const h = R.kjopOgPlasser(t.spill, t.verden, i, id);
  if (h[0]?.type !== 'bygget') {
    L.tomt();
    melding(h[0]?.type === 'forLiteMynter' ? 'Du har ikke nok mynter.'
      : id === HAVN.id ? 'Havna må stå på land, rett ved sjøen. Velg en rute med ring rundt.'
      : 'Her kan du ikke bygge. Velg en ledig rute med ring rundt.', { ikon: '🚫' });
    return;
  }
  if (for_ < HAVN.krav && R.ulikeBygg(t.spill) >= HAVN.krav) {
    setTimeout(() => {
      L.fanfare(3);
      melding(liten() ? '⚓🎉' : `Alle ${HAVN.krav} byggene står på øya! Nå kan du kjøpe en havn i butikken.`, { ikon: liten() ? '' : '⚓🎉' });
    }, 2200);
  }
  if (id === HAVN.id) setTimeout(() => melding(liten() ? '⛵❓' : 'Trykk på havna for å bygge en seilbåt.', { ikon: '⛵' }), 2200);
  trekkVist('mynter', BYGG_ETTER_ID[id].pris);
  t.byggAnim.set(i, naa());
  const [kx, ky] = midtAv(i);
  sprut(kx, ky, { farger: ['#c8a26b', '#e3cfa1', '#8a6a3c'], antall: 22, fart: 1.6 });
  setTimeout(() => sprut(kx, ky - 30, { farger: ['#ffd23f', '#e0393e', '#3a74d8', '#25b86a'], antall: 24, fart: 1.4 }), 350);
  L.fanfare(2);
  melding(`${BYGG_ETTER_ID[id].navn} står ferdig!`, { ikon: '🎉' });
  avbrytPlassering();
  lagreSnart();
}

function avbrytPlassering() {
  t.plasser = null;
  $('plasser').hidden = true;
  t.skitten = true;
}

// ---------------------------------------------------------------------------
// Foreldrekontroll (bak et regnestykke for voksne)
// ---------------------------------------------------------------------------
// Porten: første gang løser man et voksent gangestykke og lager en firesifret kode.
// Etter det kreves koden. Har man glemt den, kan man lage en ny etter et vanskeligere stykke.
let port = null;
const PORTTEKST = {
  matte: 'Løs stykket for å komme til foreldrekontrollen:',
  ny1: 'Lag en firesifret foreldrekode. Den trengs hver gang du skal inn hit.',
  ny2: 'Skriv den samme koden én gang til:',
  kode: 'Skriv foreldrekoden:',
  glemt: 'Glemt koden? Løs stykket, så kan du lage en ny kode:',
};
const tilfeldig = (n) => Math.floor(Math.random() * n);
const kodeModus = () => port && port.modus !== 'matte' && port.modus !== 'glemt';

/** Åpner porten. maal kalles når man er sluppet inn. */
function aapnePort(maal, modus = null) {
  if ($('meny').open) $('meny').close();
  port = { maal, inn: '' };
  settPort(modus ?? (Lagring.hentKode() ? 'kode' : 'matte'));
  if (!$('port').open) $('port').showModal();
}

function settPort(modus, tekst = '') {
  port.modus = modus;
  port.inn = '';
  port.stykke = '';
  if (modus === 'matte' || modus === 'glemt') {
    const a = modus === 'matte' ? 6 + tilfeldig(4) : 13 + tilfeldig(37), b = 6 + tilfeldig(4);
    port.fasit = a * b;
    port.stykke = `${a} × ${b} =`;
  }
  $('port-tekst').textContent = PORTTEKST[modus];
  $('port-melding').textContent = tekst;
  $('port-glemt').hidden = modus !== 'kode';
  visPort();
}

function visPort() {
  const kode = kodeModus();
  $('port-stykke').textContent = port.stykke;
  $('port-svar').textContent = kode ? [0, 1, 2, 3].map((i) => (i < port.inn.length ? '●' : '○')).join('') : (port.inn || '?');
  $('port-svar').classList.toggle('kode', kode);
}

function slippInn() {
  const { maal } = port;
  port = null;
  $('port').close();
  maal();
}

function tastPort(k) {
  if (!port) return;
  if (k === 'slett') port.inn = port.inn.slice(0, -1);
  else if (k === 'ok') { if (port.inn) sjekkPort(); else rist($('port')); return; }
  else if (port.inn.length < 4) port.inn += k;
  visPort();
  // Koden sjekkes av seg selv når fire sifre er skrevet.
  if (kodeModus() && port.inn.length === 4) setTimeout(sjekkPort, 180);
}

function sjekkPort() {
  if (!port) return;
  const { modus, inn } = port;
  if (modus === 'matte' || modus === 'glemt') {
    if (Number(inn) === port.fasit) settPort('ny1');
    else { rist($('port')); port.inn = ''; visPort(); }
  } else if (inn.length !== 4) {
    rist($('port'));
  } else if (modus === 'ny1') {
    port.forste = inn;
    settPort('ny2');
  } else if (modus === 'ny2') {
    if (inn === port.forste) {
      Lagring.lagreKode(inn);
      melding('Foreldrekoden er lagret. Husk den!', { ikon: '🔑' });
      slippInn();
    } else {
      rist($('port'));
      settPort('ny1', 'Kodene var ikke like. Prøv igjen.');
    }
  } else if (modus === 'kode') {
    if (inn === Lagring.hentKode()) slippInn();
    else { rist($('port')); settPort('kode', 'Feil kode. Prøv igjen.'); }
  }
}

/** Foreldrene: alle spillerne på enheten, med mulighet til å fjerne dem. */
function aapneSpillere() {
  const liste = Lagring.profiler();
  $('spillerliste').innerHTML = liste.length ? liste.map((p) => `<div class="spillerrad">
      <span class="ava">${esc(p.avatar)}</span>
      <span class="sn"><b>${esc(p.navn)}</b><small>${NIVAA[p.nivaa]?.ikon ?? ''} Dag ${p.dag}${p.id === t.id ? ' · spiller nå' : ''}</small></span>
      <button data-fjern="${esc(p.id)}">🗑️ Fjern</button></div>`).join('')
    : '<p class="midt forklaring">Ingen spillere ennå.</p>';
  $('spillerliste').querySelectorAll('[data-fjern]').forEach((b) => { b.onclick = () => fjernSpiller(b.dataset.fjern); });
  if (!$('spillere').open) $('spillere').showModal();
}

function fjernSpiller(id) {
  const p = Lagring.profiler().find((q) => q.id === id);
  if (!p || !confirm(`Fjerne ${p.navn}? Øya og alt ${p.navn} har samlet, blir slettet. Dette kan ikke angres.`)) return;
  if (id === t.id) {
    // Spilleren som er i gang: tilbake til valg av spiller.
    t.id = null;
    t.spill = null;
    Lagring.slett(id);
    $('spillere').close();
    visVelg();
    return;
  }
  Lagring.slett(id);
  aapneSpillere();
  if (!$('velg').hidden) visVelg();
}

function aapneForeldre() {
  $('foreldre-navn').textContent = t.spill.navn;
  tegnForeldre();
  $('foreldre').showModal();
}

function tegnForeldre() {
  const f = innst();
  $('f-hurtig').innerHTML = Object.entries(M.FORHANDSVALG).map(([k, v]) => `<button data-hurtig="${k}">${v.navn}</button>`).join('');
  $('f-arter').innerHTML = Object.keys(M.TEGN).map((art) => `
    <div class="artrad">
      <button class="bryter${f[art].paa ? ' paa' : ''}" data-art="${art}">${f[art].paa ? '✓' : ''} ${M.ARTNAVN[art]} (${M.TEGN[art]})</button>
      <span class="tak">${art === 'pluss' || art === 'minus' ? 'tall opp til' : 'tabell opp til'}</span>
      <span class="valgrad liten">${M.TAK_VALG[art].map((v) => `<button class="${f[art].tak === v ? 'valgt' : ''}" data-art="${art}" data-tak="${v}">${v}</button>`).join('')}</span>
      ${art === 'gange' ? `<span class="tak">· av og til × 0${f.gange.tak < 10 ? ' og × 10' : ''}</span>` : ''}
    </div>`).join('');
  $('f-svar').innerHTML = [['velg', 'Velg blant tre svar'], ['tastatur', 'Skriv svaret selv']]
    .map(([k, n]) => `<button class="${f.svar === k ? 'valgt' : ''}" data-svar="${k}">${n}</button>`).join('');
  $('f-telling').innerHTML = `
    <button class="bryter${f.visTall ? ' paa' : ''}" data-flagg="visTall">${f.visTall ? '✓' : ''} Vis tallene når man trykker</button>
    <button class="bryter${f.lesOpp ? ' paa' : ''}" data-flagg="lesOpp">${f.lesOpp ? '✓' : ''} Les tallene høyt</button>`;
  const ms = t.spill.mattestat;
  const prosent = ms.lost ? Math.round((ms.forste / ms.lost) * 100) : 0;
  const perArt = Object.entries(ms.perArt).filter(([, v]) => v.lost)
    .map(([a, v]) => `${M.ARTNAVN[a]}: ${v.lost} (${Math.round((v.forste / v.lost) * 100)} %)`).join(' · ');
  $('f-stat').innerHTML = ms.lost
    ? `${ms.lost} regnestykker løst, ${prosent} % riktig på første forsøk.<br><small>${perArt}</small>`
    : 'Ingen regnestykker løst ennå.';
  const prov = M.lagOppgave(f);
  $('f-eksempel').textContent = `Eksempel: ${prov.tekst} = ${prov.fasit}`;

  const endre = (fn) => { fn(f); t.spill.foreldre = M.medStandard(f); lagreSnart(); tegnForeldre(); };
  $('f-hurtig').querySelectorAll('[data-hurtig]').forEach((b) => {
    b.onclick = () => endre((ff) => { const v = M.FORHANDSVALG[b.dataset.hurtig]; for (const a of Object.keys(M.TEGN)) ff[a] = { ...v[a] }; ff.svar = v.svar; });
  });
  $('f-arter').querySelectorAll('.bryter[data-art]').forEach((b) => {
    b.onclick = () => endre((ff) => {
      ff[b.dataset.art].paa = !ff[b.dataset.art].paa;
      if (!Object.keys(M.TEGN).some((a) => ff[a].paa)) ff.pluss.paa = true;   // minst én regneart
    });
  });
  $('f-arter').querySelectorAll('[data-tak]').forEach((b) => {
    b.onclick = () => endre((ff) => { ff[b.dataset.art].tak = Number(b.dataset.tak); ff[b.dataset.art].paa = true; });
  });
  $('f-svar').querySelectorAll('[data-svar]').forEach((b) => { b.onclick = () => endre((ff) => { ff.svar = b.dataset.svar; }); });
  $('f-telling').querySelectorAll('[data-flagg]').forEach((b) => {
    b.onclick = () => endre((ff) => { ff[b.dataset.flagg] = !ff[b.dataset.flagg]; });
  });
}

// ---------------------------------------------------------------------------
// Toppen: avatar, himmel med sol, dag, butikk og sangbok
// ---------------------------------------------------------------------------
function oppdaterHud() {
  const s = t.spill;
  $('meny-knapp').textContent = s.avatar;
  $('dag').textContent = liten() ? '' : `Dag ${s.dag}`;
  $('sol-tall').textContent = liten() ? '' : `☀️ ${s.sol}`;
  $('seil-knapp').hidden = !R.kanSeileTilbake(s);
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
  if (neonPaa()) { tegnNeonHimmel(ctx, W, H, f, tsek); return; }
  const Mo = ['#9fc7e8', '#f7c9a9'], D = ['#5fa2d8', '#bfe1f5'], K = ['#4f3f86', '#f08a4b'];
  const [topp, bunn] = f < 0.25 ? [blandRgb(Mo[0], D[0], f / 0.25), blandRgb(Mo[1], D[1], f / 0.25)]
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

/** Himmelen på neonøya: lilla himmel, en stripete «synthwave»-sol og et lysende rutenett i horisonten. */
function tegnNeonHimmel(ctx, W, H, f, tsek) {
  const kveld = klamp((f - 0.6) / 0.4);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, blandRgb('#2a0a5e', '#0c0224', kveld));
  g.addColorStop(1, blandRgb('#c2189b', '#3d0b5c', kveld));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sx = W * (0.2 + 0.6 * f), sy = H * 0.86 - Math.sin(Math.PI * f) * H * 0.48;
  const r = H * 0.26;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  const sg = ctx.createLinearGradient(0, sy - r, 0, sy + r);
  sg.addColorStop(0, '#fff36b');
  sg.addColorStop(0.55, '#ff8a3d');
  sg.addColorStop(1, '#ff2bd6');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  // Striper som glir nedover sola
  ctx.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 5; k++) {
    const u = (k / 5 + tsek * 0.08) % 1;
    const y = sy + r * (u * 1.1 - 0.1);
    if (y > sy) ctx.fillRect(sx - r, y, r * 2, Math.max(1, r * 0.1 * u));
  }
  ctx.restore();
  // Rutenett langs horisonten
  ctx.save();
  ctx.shadowColor = '#19e3ff';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#19e3ff';
  ctx.lineWidth = 1.5;
  const hy = H - 8;
  ctx.beginPath();
  ctx.moveTo(0, hy); ctx.lineTo(W, hy);
  for (let x = -((tsek * 12) % 24); x < W + 24; x += 24) { ctx.moveTo(x, hy); ctx.lineTo(W / 2 + (x - W / 2) * 1.6, H); }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Natta: stjerneskudd man kan fange, så ny dag
// ---------------------------------------------------------------------------
function startNatt() {
  if (t.natt || !t.spill || t.seiler) return;
  if (t.naer) { t.naer.kveld = false; lukkNaer(); }
  avbrytPlassering();
  t.spill.sol = 0;
  t.natt = { t0: naa() / 1000, skudd: [], gnister: [], neste: naa() / 1000 + 0.8, slutt: null,
    stjerner: Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.85, r: 0.6 + Math.random() * 1.4, fase: Math.random() * 6 })) };
  L.solnedgang();
  t.natt.full = t.spill.nattFangst >= MAKS_STJERNER;
  oppdaterNattTekst();
  $('natt').hidden = false;
  oppdaterHud();
  lagreSnart();
  clearTimeout(t.nattTid);
  t.nattTid = setTimeout(godMorgen, 30000);
}

/** Teksten øverst om natta: hvor mange stjerneskudd man har fanget (høyst MAKS_STJERNER). */
function oppdaterNattTekst() {
  const n = t.spill.nattFangst, full = n >= MAKS_STJERNER;
  $('natt').querySelector('.natt-tekst').innerHTML = liten()
    ? `🌙 ${n ? '✨'.repeat(n) : '✨'}${full ? ' 😴' : ''}`
    : full ? `✨ ${n} av ${MAKS_STJERNER}! Nå har du fanget alt stjernestøvet i natt. God natt!`
      : `🌙 Fang stjerneskudd! ✨ ${n} av ${MAKS_STJERNER} <small>(${VARER.stov.pris} 🪙 hver)</small>`;
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
    if (h.kryss.length) {
      melding(liten() ? '✖️'.repeat(h.kryss.length) + ' 🎁'
        : `Dag ${h.dag}! I natt har det dukket opp ${h.kryss.length} skattekryss på øya. Trykk på dem for å grave fram kister!`, { ikon: liten() ? '' : '✖️🎁' });
    } else {
      melding(h.vokst.length ? `Dag ${h.dag}! Det har vokst fram ${h.vokst.length} nye ting.` : `Dag ${h.dag}!`, { ikon: '☀️' });
    }
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
  if (!n.slutt && !n.full && tsek > n.neste) {
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
  const h = R.fangStjerne(t.spill);
  if (h[0].type !== 'stjerne') return;
  s.tatt = true;
  L.stjerne();
  for (let i = 0; i < 14; i++) {
    const v = Math.random() * Math.PI * 2;
    n.gnister.push({ t0: naa() / 1000, x: s.x, y: s.y, vx: Math.cos(v) * 130, vy: Math.sin(v) * 130 });
  }
  flyTil({ stov: 1 }, { x: e.clientX, y: e.clientY });
  oppdaterNattTekst();
  if (h.some((q) => q.type === 'fullNatt')) {
    // Natta er full: ingen flere stjerneskudd, og snart blir det morgen.
    n.full = true;
    n.skudd = [];
    setTimeout(() => L.fanfare(2), 400);
    clearTimeout(t.nattTid);
    t.nattTid = setTimeout(godMorgen, 4000);
  }
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
function melding(tekst, { ikon: ik = '' } = {}) {
  const el = $('melding');
  if (liten()) {
    if (!ik) return;
    el.textContent = ik;
  } else el.textContent = ik ? `${ik} ${tekst}` : tekst;
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
  if (t.plasser) return [...s.avdekket.keys()].filter((i) => R.kanPlassere(s, v, i, t.plasser.id));
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
  t.brett.tegn(ctx, t.spill, { utsnitt, skala: k.skala, avdekkAnim: t.avdekkAnim, borstAnim: t.borstAnim, byggAnim: t.byggAnim, naa: ms, hint });
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
    if (t.skitten || t.brett.harLiv || t.avdekkAnim.size || t.borstAnim.size || t.byggAnim.size || harEffekter()) tegnBrett(ms);
  }
  if (t.naer) { tegnNaer(ms / 1000); glod($('naer-lerret'), 0.5); }
  if (t.natt) tegnNatt(ms / 1000);
  requestAnimationFrame(sloyfe);
}

// ---------------------------------------------------------------------------
// Oppstart
// ---------------------------------------------------------------------------
function start() {
  visVersjon();
  neonKontekst($('lerret').getContext('2d'));
  neonKontekst($('naer-lerret').getContext('2d'));
  t.kamera = new Kamera($('lerret'), { vedTrykk: trykkPaa, vedEndring: () => { t.skitten = true; } });
  addEventListener('resize', () => { if (t.spill) { t.kamera.tilpassLerret(); t.skitten = true; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && t.id && t.spill) Lagring.lagre(t.id, t.spill); });

  $('ny-spiller').onclick = aapneNySpiller;
  $('ny-avbryt').onclick = () => $('ny').close();
  $('ny-start').onclick = lagNySpiller;

  $('naer-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); trykkNaer(e); });
  $('naer-lukk').onclick = lukkNaer;
  $('naer').addEventListener('pointerdown', (e) => { if (e.target === $('naer')) lukkNaer(); });
  lagTastatur($('matte-tast'), tastKiste);

  $('natt-lerret').addEventListener('pointerdown', (e) => { e.preventDefault(); fangStjerne(e); });
  $('morgen').onclick = godMorgen;

  $('meny-knapp').onclick = aapneMeny;
  $('sangbok-knapp').onclick = aapneSangbok;
  $('butikk-knapp').onclick = () => aapneButikk();
  $('seil-knapp').onclick = aapneSjokart;
  $('sjokart-lukk').onclick = () => $('sjokart').close();
  $('fane-selg').onclick = () => { fane = 'selg'; tegnButikk(); };
  $('fane-kjop').onclick = () => { fane = 'kjop'; tegnButikk(); };
  $('butikk-lukk').onclick = () => $('butikk').close();
  $('plasser-avbryt').onclick = avbrytPlassering;
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
  $('meny-foreldre').onclick = () => aapnePort(aapneForeldre);
  $('foreldre-start').onclick = () => { L.vekk(); aapnePort(aapneSpillere); };
  $('port-glemt').onclick = () => settPort('glemt');
  $('f-spillere').onclick = () => { lagreSnart(); $('foreldre').close(); aapneSpillere(); };
  $('spillere-lukk').onclick = () => $('spillere').close();
  $('endre-kode').onclick = () => { $('spillere').close(); aapnePort(aapneSpillere, 'ny1'); };
  lagTastatur($('port-tast'), tastPort);
  $('port-avbryt').onclick = () => { port = null; $('port').close(); };
  $('foreldre-lukk').onclick = () => { lagreSnart(); $('foreldre').close(); };
  $('meny-bytt').onclick = () => { $('meny').close(); visVelg(); };
  $('meny-ny-oy').onclick = () => {
    if (!confirm('Lage en helt ny øy? Den du har nå, forsvinner (foreldreinnstillingene beholdes).')) return;
    const s = t.spill;
    Lagring.lagre(t.id, R.nyttSpill({ navn: s.navn, nivaa: s.nivaa, avatar: s.avatar, foreldre: s.foreldre }));
    $('meny').close();
    startSpill(t.id);
  };

  visVelg();
  requestAnimationFrame(sloyfe);
}

start();
window.__oya = t; // for testing i nettleseren
