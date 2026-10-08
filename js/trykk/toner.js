// Toner og «instrumenter» laget med Web Audio (ingen lydfiler). Hvert trykk på en
// ting spiller neste tone i en kjent melodi (klassisk musikk og sanger, se data/melodier.js).
// Den lille utgaven av en ting spiller starten av melodien, den mellomste litt mer, og den store hele.
// Lyden kan først starte etter at brukeren har trykket på noe (krav i nettleserne).

import { MELODIER } from '../data/melodier.js';

let ac = null;
let paa = true;
let stoy = null;

export const lydPaa = () => paa;
export function settLyd(v) { paa = v; }

function kontekst() {
  if (!ac) {
    const K = window.AudioContext || window.webkitAudioContext;
    if (!K) return null;
    ac = new K();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

/** Låser opp lyden på iPad: må kalles fra et trykk. */
export function vekk() { kontekst(); }

// ---------------------------------------------------------------------------
// Noter og melodier
// ---------------------------------------------------------------------------
const HALVTONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frekvensen til en tone, f.eks. «C4» (261,63 Hz), «F#4» eller «Bb3». */
export function hertz(navn) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(navn);
  if (!m) throw new Error(`Ukjent tone: ${navn}`);
  const midi = 12 * (Number(m[3]) + 1) + HALVTONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return Math.round(440 * 2 ** ((midi - 69) / 12) * 100) / 100;
}

/** Tolker en melodi (se skrivemåten i data/melodier.js) til [{ f, v }]: frekvens (null = pause) og lengde i slag. */
export function tolk(tekst) {
  return tekst.replace(/\|/g, ' ').trim().split(/\s+/).map((ord) => {
    const m = /^(r|[A-G][#b]?\d)([-.,;]*)$/.exec(ord);
    if (!m) throw new Error(`Kan ikke tolke «${ord}»`);
    let v = m[2].includes(';') ? 0.25 : m[2].includes(',') ? 0.5 : 1;
    v += (m[2].match(/-/g) ?? []).length;
    if (m[2].includes('.')) v *= 1.5;
    return { f: m[1] === 'r' ? null : hertz(m[1]), v };
  });
}

/**
 * Alle melodiene: { navn, av, gruppe, tempo, deler, noter: [{ f, v }], toner: [frekvens …] }.
 * deler = antall toner for liten og middels utgave; den store spiller hele melodien.
 */
export const SANG = {};
for (const [id, m] of Object.entries(MELODIER)) {
  const noter = tolk(m.noter);
  SANG[id] = { ...m, noter, toner: noter.filter((n) => n.f).map((n) => n.f) };
}
/** Melodiene i den rekkefølgen de står i sangboka. */
export const SANGER = Object.keys(MELODIER);
// Tåka har sine egne tre toner (ikke i sangboka).
SANG.take = { navn: '', deler: [3, 3], noter: tolk('C5 E5 G5'), toner: tolk('C5 E5 G5').map((n) => n.f) };

/** Tonene for en melodi i en gitt størrelse (0 = liten, 1 = middels, 2 = stor). */
export function tonerFor(sang, str) {
  const s = SANG[sang];
  return str >= 2 ? s.toner : s.toner.slice(0, s.deler[str]);
}

// ---------------------------------------------------------------------------
// Byggesteiner
// ---------------------------------------------------------------------------
function tone(f, { start = 0, lengde = 0.4, type = 'sine', volum = 0.2, anslag = 0.006, tilF = null, vibrato = 0 } = {}) {
  const a = kontekst();
  if (!a || !paa) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (tilF) o.frequency.exponentialRampToValueAtTime(tilF, t + lengde);
  if (vibrato) {
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = f * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + lengde + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volum, t + anslag);
  g.gain.exponentialRampToValueAtTime(0.0001, t + lengde);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + lengde + 0.05);
}

function stoyBuffer(a) {
  if (stoy) return stoy;
  stoy = a.createBuffer(1, a.sampleRate * 1, a.sampleRate);
  const d = stoy.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return stoy;
}

/** Filtrert støy: klikk, hogg, plask og sus. */
function sus(fra, til, { start = 0, lengde = 0.2, volum = 0.2, q = 1.2 } = {}) {
  const a = kontekst();
  if (!a || !paa) return;
  const t = a.currentTime + start;
  const k = a.createBufferSource();
  k.buffer = stoyBuffer(a);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(fra, t);
  f.frequency.exponentialRampToValueAtTime(til, t + lengde);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volum, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + lengde);
  k.connect(f).connect(g).connect(a.destination);
  k.start(t);
  k.stop(t + lengde + 0.05);
}

// ---------------------------------------------------------------------------
// Instrumenter: én tone per trykk. Hver råvare har sin egen klang.
// ---------------------------------------------------------------------------
export const INSTRUMENT = {
  // Kister: xylofon – klar grunntone + lys overtone, kort klang.
  xylofon(f) {
    tone(f * 2, { lengde: 0.55, volum: 0.22 });
    tone(f * 8, { lengde: 0.12, volum: 0.05 });
    sus(4000, 3000, { lengde: 0.02, volum: 0.05 });
  },
  // Tre: et hogg (dunk + flis) og en myk marimbatone.
  hogg(f) {
    tone(140, { lengde: 0.14, volum: 0.3, tilF: 70 });
    sus(1800, 900, { lengde: 0.07, volum: 0.18, q: 2 });
    tone(f, { lengde: 0.7, volum: 0.16, type: 'triangle', anslag: 0.01 });
  },
  // Stein: treblokk – kort, tørr og høy.
  treblokk(f) {
    tone(f * 2, { lengde: 0.12, volum: 0.24 });
    tone(f * 3, { lengde: 0.06, volum: 0.06, type: 'square' });
    sus(2500, 2000, { lengde: 0.03, volum: 0.12, q: 3 });
  },
  // Jern: ambolt – metallisk klang med skjeve overtoner som ringer lenge.
  ambolt(f) {
    tone(f * 2, { lengde: 1.1, volum: 0.16 });
    tone(f * 2 * 2.76, { lengde: 0.5, volum: 0.06 });
    tone(f * 2 * 5.4, { lengde: 0.2, volum: 0.03 });
    sus(5000, 4000, { lengde: 0.03, volum: 0.1, q: 4 });
  },
  // Fisk: en dråpe som plasker, og en rund tone.
  plask(f) {
    tone(f * 3, { lengde: 0.09, volum: 0.12, tilF: f * 1.4 });
    sus(900, 400, { lengde: 0.12, volum: 0.08, q: 1 });
    tone(f, { start: 0.02, lengde: 0.5, volum: 0.16, type: 'triangle' });
  },
  // Korn: en myk fløyte med litt vibrato og pust.
  floyte(f) {
    tone(f * 2, { lengde: 0.5, volum: 0.16, anslag: 0.04, vibrato: 0.006 });
    sus(3000, 2500, { lengde: 0.08, volum: 0.03, q: 0.8 });
  },
  // Ull: spilledåse – høy, sart og klingende.
  spilledaase(f) {
    tone(f * 4, { lengde: 0.7, volum: 0.13 });
    tone(f * 8, { lengde: 0.25, volum: 0.03 });
  },
  // Tåka: sus og en lys klokketone.
  sus(f) {
    sus(500, 2400, { lengde: 0.35, volum: 0.16, q: 0.8 });
    tone(f, { start: 0.05, lengde: 0.8, volum: 0.1 });
  },
};

// ---------------------------------------------------------------------------
// Små melodier og stemninger
// ---------------------------------------------------------------------------
export function fanfare(stor = 1) {
  const toner = [523.25, 659.25, 783.99, 1046.5];
  toner.forEach((f, k) => tone(f, { start: k * 0.07, lengde: 0.5, volum: 0.14, type: 'triangle' }));
  // Glitter: tilfeldige toner fra en pentaton skala høyt oppe.
  const glitter = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
  for (let k = 0; k < 2 + stor * 3; k++) {
    tone(glitter[Math.floor(Math.random() * glitter.length)], { start: 0.3 + k * 0.06, lengde: 0.35, volum: 0.05 });
  }
}

export function stjerne() {
  const f = [1318.5, 1568, 1760, 2093, 2349][Math.floor(Math.random() * 5)];
  tone(f, { lengde: 1.6, volum: 0.12 });
  tone(f * 2.76, { lengde: 0.5, volum: 0.03 });
}

export function solnedgang() {
  [784, 659.25, 523.25, 392].forEach((f, k) => tone(f, { start: k * 0.22, lengde: 0.9, volum: 0.09, type: 'triangle' }));
}

export function morgen() {
  [392, 523.25, 659.25, 784, 1046.5].forEach((f, k) => tone(f, { start: k * 0.1, lengde: 0.6, volum: 0.1, type: 'triangle' }));
}

export function tidssprang() {
  tone(180, { lengde: 1.8, volum: 0.08, tilF: 1400, anslag: 0.4 });
  sus(300, 3000, { lengde: 1.6, volum: 0.08, q: 0.6 });
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => tone(f, { start: 1.7 + k * 0.09, lengde: 1.2, volum: 0.09 }));
}

export function vend() {
  sus(1200, 3200, { lengde: 0.08, volum: 0.05, q: 1.5 });
}

export function tomt() {
  tone(220, { lengde: 0.15, volum: 0.06, type: 'triangle', tilF: 180 });
}

// ---------------------------------------------------------------------------
// Avspilling av en hel melodi (sangboka i stavkirka): orgeltoner i riktig rytme
// ---------------------------------------------------------------------------
let avspilling = null;

/** Én orgeltone: grunntone med et par overtoner og en dyp undertone. */
function orgel(a, ut, noder, f, start, lengde) {
  const g = a.createGain();
  const hold = Math.max(0.12, lengde * 0.92);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.15, start + 0.025);
  g.gain.setValueAtTime(0.15, start + Math.max(0.03, hold - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, start + hold + 0.12);
  g.connect(ut);
  for (const [gang, volum, type] of [[1, 1, 'sine'], [2, 0.45, 'sine'], [3, 0.18, 'sine'], [0.5, 0.3, 'triangle']]) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = type;
    o.frequency.value = f * gang;
    og.gain.value = volum;
    o.connect(og).connect(g);
    o.start(start);
    o.stop(start + hold + 0.2);
    noder.push(o);
  }
}

export function stoppMelodi() {
  if (!avspilling) return;
  const { a, ut, noder, tider } = avspilling;
  avspilling = null;
  tider.forEach(clearTimeout);
  try {
    ut.gain.setValueAtTime(ut.gain.value, a.currentTime);
    ut.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.08);
  } catch { /* ignorer */ }
  setTimeout(() => {
    for (const o of noder) { try { o.stop(); } catch { /* allerede stoppet */ } }
    try { ut.disconnect(); } catch { /* ignorer */ }
  }, 160);
}

/**
 * Spiller de første `antall` tonene av en melodi (hele hvis ikke annet er sagt), med riktig rytme.
 * vedTone(k) kalles når tone nr. k begynner, vedSlutt(helt) når melodien er ferdig. Gir lengden i sekunder.
 */
export function spillMelodi(sang, antall = Infinity, { vedTone = null, vedSlutt = null } = {}) {
  stoppMelodi();
  const a = kontekst(), s = SANG[sang];
  if (!a || !paa || !s) { vedSlutt?.(false); return 0; }
  const slag = 60 / s.tempo;
  const ut = a.createGain();
  ut.gain.value = 1;
  ut.connect(a.destination);
  const noder = [], tider = [];
  let t = 0.08, nr = 0;
  for (const n of s.noter) {
    const lengde = n.v * slag;
    if (n.f) {
      if (nr >= antall) break;
      orgel(a, ut, noder, n.f, a.currentTime + t, lengde);
      const k = nr++;
      tider.push(setTimeout(() => vedTone?.(k), t * 1000));
    }
    t += lengde;
  }
  const denne = { a, ut, noder, tider };
  tider.push(setTimeout(() => { if (avspilling === denne) { avspilling = null; vedSlutt?.(true); } }, (t + 0.4) * 1000));
  avspilling = denne;
  return t;
}
