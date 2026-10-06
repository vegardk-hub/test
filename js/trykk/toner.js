// Toner og «instrumenter» laget med Web Audio (ingen lydfiler). Hvert trykk på en
// ting spiller neste tone i en kjent folketone; siste trykk er siste tone.
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
// Noter og melodier (bare melodier – alle er gamle folketoner uten opphavsrett)
// ---------------------------------------------------------------------------
const HZ = {
  G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5,
};
const noter = (s) => s.split(' ').map((n) => HZ[n]);

export const MELODI = {
  // «Ro, ro, ro din båt»: liten kiste = de fem første tonene, stor kiste = hele linja (10).
  ro: noter('C4 C4 C4 D4 E4 E4 D4 E4 F4 G4'),
  // «Alle fugler små de er» (6 toner) – treet.
  fugler: noter('G4 E4 E4 F4 D4 D4'),
  // «Bæ, bæ, lille lam» (7 toner) – steinen.
  baa: noter('C4 C4 G4 G4 A4 A4 G4'),
  // «Fader Jakob» (32 toner) – kjempekista.
  jakob: noter('C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4 E4 F4 G4 G4 A4 G4 F4 E4 C4 G4 A4 G4 F4 E4 C4 C4 G3 C4 C4 G3 C4'),
  // Børst bort tåka: tre lyse toner oppover.
  take: noter('C5 E5 G5'),
};

// ---------------------------------------------------------------------------
// Byggesteiner
// ---------------------------------------------------------------------------
function tone(f, { start = 0, lengde = 0.4, type = 'sine', volum = 0.2, anslag = 0.006, tilF = null } = {}) {
  const a = kontekst();
  if (!a || !paa) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (tilF) o.frequency.exponentialRampToValueAtTime(tilF, t + lengde);
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

/** Filtrert støy: klikk, hogg og sus. */
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
// Instrumenter: én tone per trykk
// ---------------------------------------------------------------------------
export const INSTRUMENT = {
  // Kister: xylofon – klar grunntone + lys overtone, kort klang.
  xylofon(f) {
    tone(f * 2, { lengde: 0.55, volum: 0.22 });
    tone(f * 8, { lengde: 0.12, volum: 0.05 });
    sus(4000, 3000, { lengde: 0.02, volum: 0.05 });
  },
  // Treet: et hogg (dunk + flis) og en myk marimbatone.
  hogg(f) {
    tone(140, { lengde: 0.14, volum: 0.3, tilF: 70, type: 'sine' });
    sus(1800, 900, { lengde: 0.07, volum: 0.18, q: 2 });
    tone(f, { lengde: 0.7, volum: 0.16, type: 'triangle', anslag: 0.01 });
  },
  // Steinen: treblokk – kort, tørr og høy.
  treblokk(f) {
    tone(f * 2, { lengde: 0.12, volum: 0.24 });
    tone(f * 3, { lengde: 0.06, volum: 0.06, type: 'square' });
    sus(2500, 2000, { lengde: 0.03, volum: 0.12, q: 3 });
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
  for (let k = 0; k < 4 + stor * 3; k++) {
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
  tone(180, { lengde: 1.8, volum: 0.08, tilF: 1400, type: 'sine', anslag: 0.4 });
  sus(300, 3000, { lengde: 1.6, volum: 0.08, q: 0.6 });
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => tone(f, { start: 1.7 + k * 0.09, lengde: 1.2, volum: 0.09 }));
}

export function vend() {
  sus(1200, 3200, { lengde: 0.08, volum: 0.05, q: 1.5 });
}

export function tomt() {
  tone(220, { lengde: 0.15, volum: 0.06, type: 'triangle', tilF: 180 });
}
