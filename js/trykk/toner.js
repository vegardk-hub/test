// Toner og «instrumenter» laget med Web Audio (ingen lydfiler). Hvert trykk på en
// ting spiller neste tone i en kjent barnesang. Den lille utgaven av en ting spiller
// starten av sangen, den mellomste litt mer, og den store hele sangen.
// Lyden kan først starte etter at brukeren har trykket på noe (krav i nettleserne).

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
// Noter og sanger. Bare melodiene brukes – alle er gamle og uten opphavsrett.
// ---------------------------------------------------------------------------
const HZ = {
  G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5,
};
const noter = (s) => s.trim().split(/\s+/).map((n) => HZ[n]);

/** deler = antall toner for liten og middels utgave; den store spiller hele sangen. */
export const SANG = {
  ro: {
    navn: 'Ro, ro, ro din båt', deler: [5, 10],
    toner: noter(`C4 C4 C4 D4 E4  E4 D4 E4 F4 G4
      C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4  G4 F4 E4 D4 C4`),
  },
  baa: {
    navn: 'Bæ, bæ, lille lam', deler: [7, 14],
    toner: noter(`C4 C4 G4 G4 A4 A4 G4  F4 F4 E4 E4 D4 D4 C4
      G4 G4 F4 F4 E4 E4 D4  G4 G4 F4 F4 E4 E4 D4
      C4 C4 G4 G4 A4 A4 G4  F4 F4 E4 E4 D4 D4 C4`),
  },
  jakob: {
    navn: 'Fader Jakob', deler: [8, 14],
    toner: noter(`C4 D4 E4 C4 C4 D4 E4 C4  E4 F4 G4 E4 F4 G4
      G4 A4 G4 F4 E4 C4 G4 A4 G4 F4 E4 C4  C4 G3 C4 C4 G3 C4`),
  },
  macdonald: {
    navn: 'Old MacDonald', deler: [12, 25],
    toner: noter(`C4 C4 C4 G3 A3 A3 G3  E4 E4 D4 D4 C4
      G3 C4 C4 C4 G3 A3 A3 G3  E4 E4 D4 D4 C4
      G3 G3 C4 C4 C4  G3 G3 C4 C4 C4  C4 C4 C4  C4 C4 C4  C4 C4 C4 C4 C4 C4
      C4 C4 C4 G3 A3 A3 G3  E4 E4 D4 D4 C4`),
  },
  petter: {
    navn: 'Lille Petter Edderkopp', deler: [13, 23],
    toner: noter(`G3 C4 C4 C4 D4 E4 E4  E4 D4 C4 D4 E4 C4
      E4 E4 F4 G4  G4 F4 E4 F4 G4 E4
      C4 C4 D4 E4  E4 D4 C4 D4 E4 C4
      G3 G3 C4 C4 C4 D4 E4 E4  E4 D4 C4 D4 E4 C4`),
  },
  mary: {
    navn: 'Mary Had a Little Lamb', deler: [7, 13],
    toner: noter(`E4 D4 C4 D4 E4 E4 E4  D4 D4 D4  E4 G4 G4
      E4 D4 C4 D4 E4 E4 E4  E4 D4 D4 E4 D4 C4`),
  },
  bursdag: {
    navn: 'Happy Birthday', deler: [6, 12],
    toner: noter(`G4 G4 A4 G4 C5 B4  G4 G4 A4 G4 D5 C5
      G4 G4 G5 E5 C5 B4 A4  F5 F5 E5 C5 D5 C5`),
  },
  take: { navn: '', deler: [3, 3], toner: noter('C5 E5 G5') },
};

/** Tonene for en sang i en gitt størrelse (0 = liten, 1 = middels, 2 = stor). */
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
