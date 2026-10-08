// Museet: et rom der skattene man har solgt, står utstilt i glassmontre med lys.
// Edelsteinene og metallklumpene er små 3D-figurer med flate fasetter som snurrer sakte:
// hver fasett får lys etter hvilken vei den vender, så de blinker når de går rundt.
// Ingen DOM-elementer her (bortsett fra to skjulte lerreter til det som står stille) –
// main.js eier lerretet, knappene og trykkene.

import { VARER, SKATTER, METALLER, EDELSTEINER, SJELDENHET } from './data/ting.js';
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;
const TILT = 0.3;                       // vi ser litt ned på tingene
const CT = Math.cos(TILT), ST = Math.sin(TILT);
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// ---------------------------------------------------------------------------
// Små hjelpere
// ---------------------------------------------------------------------------
const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const prikk = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const css = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const rgba = (farge, a) => { const [r, g, b] = typeof farge === 'string' ? rgb(farge) : farge; return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
const mellom = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const stor = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Lyset kommer ovenfra, litt fra venstre; et svakere lys fra høyre gir kant.
const LYS = norm([-0.45, 0.8, 0.55]);
const LYS2 = norm([0.75, 0.15, 0.35]);
const HALV = norm([LYS[0], LYS[1], LYS[2] + 1]);      // midt mellom lyset og øyet: der blinker det
const HALV2 = norm([LYS2[0], LYS2[1], LYS2[2] + 1]);
const INDRE = norm([0.35, -0.5, 0.8]);                // lyset som kastes rundt inne i steinen

// ---------------------------------------------------------------------------
// Formene: ringer av punkter som bindes sammen til fasetter
// ---------------------------------------------------------------------------
/** n punkter i en ring. halv = forskjøvet et halvt steg (gir trekantfasetter mot naboringen). */
function ring(n, r, y, halv = false, sx = 1, sz = 1) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = ((k + (halv ? 0.5 : 0)) / n) * TAU;
    pts.push([Math.cos(a) * r * sx, y, Math.sin(a) * r * sz]);
  }
  return { pts, halv };
}

/** Rektangel med skårne hjørner (åtte punkter): smaragdslipen. */
function rekt(a, b, hj, y) {
  const p = [[a - hj, b], [a, b - hj], [a, hj - b], [a - hj, -b], [hj - a, -b], [-a, hj - b], [-a, b - hj], [hj - a, b]];
  return { pts: p.map(([x, z]) => [x, y, z]), halv: false };
}

function normal(v, idx) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < idx.length; k++) {
    const a = v[idx[k]], b = v[idx[(k + 1) % idx.length]];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(nx, ny, nz);
  return l < 1e-9 ? null : [nx / l, ny / l, nz / l];
}

const midtpunkt = (v, idx) => {
  const c = [0, 0, 0];
  for (const i of idx) { c[0] += v[i][0]; c[1] += v[i][1]; c[2] += v[i][2]; }
  return [c[0] / idx.length, c[1] / idx.length, c[2] / idx.length];
};

/** Snur fasettene så alle vender ut fra midten av formen. */
function rett({ v, f }) {
  const c = midtpunkt(v, v.map((_, k) => k));
  return { v, f: f.map((idx) => {
    const n = normal(v, idx);
    if (!n) return idx;
    const m = midtpunkt(v, idx);
    return prikk(n, [m[0] - c[0], m[1] - c[1], m[2] - c[2]]) < 0 ? [...idx].reverse() : idx;
  }) };
}

/** Binder ringene sammen ovenfra og ned. topp/bunn = høyden på en spiss, eller null for en flat flate. */
function slip(ringer, topp = null, bunn = null) {
  const v = [], f = [];
  const start = ringer.map((r) => { const s = v.length; v.push(...r.pts); return s; });
  const n = ringer[0].pts.length;
  const at = (ri, k) => start[ri] + (k % n);
  if (topp === null) f.push(ringer[0].pts.map((_, k) => at(0, k)));
  else { v.push([0, topp, 0]); for (let k = 0; k < n; k++) f.push([v.length - 1, at(0, k), at(0, k + 1)]); }
  for (let ri = 0; ri < ringer.length - 1; ri++) {
    const A = ringer[ri], B = ringer[ri + 1];
    for (let k = 0; k < n; k++) {
      if (A.halv === B.halv) f.push([at(ri, k), at(ri, k + 1), at(ri + 1, k + 1), at(ri + 1, k)]);
      else if (B.halv) f.push([at(ri, k), at(ri, k + 1), at(ri + 1, k)], [at(ri, k + 1), at(ri + 1, k + 1), at(ri + 1, k)]);
      else f.push([at(ri, k), at(ri + 1, k + 1), at(ri + 1, k)], [at(ri, k), at(ri, k + 1), at(ri + 1, k + 1)]);
    }
  }
  const siste = ringer.length - 1;
  if (bunn === null) f.push(ringer[siste].pts.map((_, k) => at(siste, k)));
  else { v.push([0, bunn, 0]); for (let k = 0; k < n; k++) f.push([v.length - 1, at(siste, k), at(siste, k + 1)]); }
  return rett({ v, f });
}

/** Skalerer, velter (toppen ut mot +x), flytter ut og dreier rundt midtaksen. */
function flytt({ v, f }, { s = 1, velt = 0, ut = 0, opp = 0, rundt = 0 }) {
  const cv = Math.cos(velt), sv = Math.sin(velt), cr = Math.cos(rundt), sr = Math.sin(rundt);
  return { f, v: v.map(([x, y, z]) => {
    x *= s; y *= s; z *= s;
    const x1 = x * cv + y * sv + ut, y1 = y * cv - x * sv + opp;
    return [x1 * cr + z * sr, y1, z * cr - x1 * sr];
  }) };
}

function flett(...deler) {
  const v = [], f = [];
  for (const d of deler) {
    const s = v.length;
    v.push(...d.v);
    f.push(...d.f.map((idx) => idx.map((i) => i + s)));
  }
  return { v, f };
}

/** Kule av 80 trekanter (ikosaeder delt én gang). */
function kule() {
  const g = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g],
    [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]].map(norm);
  const f0 = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const midt = new Map();
  const m = (a, b) => {
    const nokkel = a < b ? a * 100 + b : b * 100 + a;
    if (!midt.has(nokkel)) { v.push(norm(mellom(v[a], v[b], 0.5))); midt.set(nokkel, v.length - 1); }
    return midt.get(nokkel);
  };
  const f = f0.flatMap(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  return { v, f };
}

/** En klump (gull, sølv): en kule med kuler og søkk, litt flattrykt. Samme seed gir samme klump. */
function klump(seed, { sx = 1, sy = 0.74, sz = 0.84, uro = 0.32, lapper = 7 } = {}) {
  const r = mulberry32(seed);
  const { v, f } = kule();
  const retning = Array.from({ length: lapper }, () => ({ d: norm([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]), a: (r() * 1.7 - 0.5) * uro }));
  return rett({ f, v: v.map((p) => {
    let rad = 1 + (r() - 0.5) * uro * 0.4;
    for (const { d, a } of retning) { const q = prikk(p, d); if (q > 0) rad += a * q * q * q; }
    return [p[0] * rad * sx, p[1] * rad * sy, p[2] * rad * sz];
  }) });
}

/** Midtstiller formen, gjør den én enhet stor, og regner ut hvilken vei hver fasett vender. */
function ferdig({ v, f }, storrelse = null) {
  let minY = Infinity, maksY = -Infinity, R = 0;
  for (const [x, y, z] of v) { minY = Math.min(minY, y); maksY = Math.max(maksY, y); R = Math.max(R, Math.hypot(x, z)); }
  const my = (minY + maksY) / 2, k = storrelse ?? 1 / Math.max(R, (maksY - minY) / 2);
  const vv = v.map(([x, y, z]) => [x * k, (y - my) * k, z * k]);
  const flater = [];
  for (const idx of f) {
    const n = normal(vv, idx);
    if (n) flater.push({ idx, n, c: midtpunkt(vv, idx) });
  }
  return { v: vv, flater };
}

const krystall = slip([ring(6, 0.5, 0.5), ring(6, 0.5, -0.75)], 1.15, null);
const dobbel = slip([ring(6, 0.4, 0.62), ring(6, 0.4, -0.62)], 1.2, -1.2);     // krystall med spiss i begge ender
const terning = slip([ring(4, 1, 0.707), ring(4, 1, -0.707)]);

// Fasongene: slipte steiner, krystaller, kupler (cabochon) og former for metallene.
const F = {
  // Brilliantslip: flat topp, krone, rundist og spiss.
  brilliant: ferdig(slip([ring(8, 0.56, 0.44), ring(8, 0.82, 0.3, true), ring(8, 1, 0.1), ring(8, 1, 0.03), ring(8, 0.55, -0.5, true)], null, -1)),
  oval: ferdig(slip([ring(10, 0.6, 0.42, false, 1, 0.74), ring(10, 0.86, 0.3, true, 1, 0.74), ring(10, 1, 0.08, false, 1, 0.74),
    ring(10, 1, 0.02, false, 1, 0.74), ring(10, 0.5, -0.42, true, 1, 0.74)], null, -0.74)),
  // Smal oval (markise).
  markise: ferdig(slip([ring(8, 0.56, 0.42, false, 1, 0.5), ring(8, 0.82, 0.3, true, 1, 0.5), ring(8, 1, 0.1, false, 1, 0.5),
    ring(8, 1, 0.03, false, 1, 0.5), ring(8, 0.55, -0.45, true, 1, 0.5)], null, -0.85)),
  // Smaragdslip: avlang, med trinn. Beryllene (smaragd, akvamarin, rød beryll) slipes gjerne slik.
  trinn: ferdig(slip([rekt(0.62, 0.4, 0.16, 0.4), rekt(0.84, 0.56, 0.2, 0.27), rekt(1, 0.7, 0.24, 0.1), rekt(1, 0.7, 0.24, 0.03),
    rekt(0.72, 0.48, 0.17, -0.32), rekt(0.42, 0.24, 0.09, -0.6), rekt(0.2, 0.05, 0.02, -0.78)])),
  // Dråpe (briolett).
  draape: ferdig(slip([ring(8, 0.34, 0.62), ring(8, 0.66, 0.12, true), ring(8, 0.8, -0.3), ring(8, 0.62, -0.68, true), ring(8, 0.3, -0.93)], 1.2, -1.03)),
  sekskant: ferdig(slip([ring(6, 0.55, 0.42), ring(6, 0.82, 0.28), ring(6, 1, 0.1), ring(6, 1, 0.03), ring(6, 0.62, -0.35), ring(6, 0.3, -0.7)], null, -0.95)),
  prinsesse: ferdig(slip([ring(4, 0.6, 0.42), ring(4, 0.85, 0.28), ring(4, 1, 0.1), ring(4, 1, 0.03), ring(4, 0.55, -0.45)], null, -0.95)),
  trillion: ferdig(slip([ring(3, 0.55, 0.4), ring(3, 0.8, 0.28, true), ring(3, 1, 0.1), ring(3, 1, 0.03), ring(3, 0.5, -0.45, true)], null, -0.9)),
  oktaeder: ferdig(slip([ring(4, 1, 0)], 1.05, -1.05)),
  // Kuppelslip for steiner man ikke ser gjennom: rund og høy, eller oval og lav.
  kuppel: ferdig(slip([ring(10, 0.4, 0.62), ring(10, 0.76, 0.4, true), ring(10, 1, 0.05), ring(10, 0.9, -0.12, true)], 0.72, null)),
  cabochon: ferdig(slip([ring(10, 0.42, 0.44, false, 1, 0.76), ring(10, 0.78, 0.27, true, 1, 0.76), ring(10, 1, 0, false, 1, 0.76), ring(10, 0.9, -0.14, true, 1, 0.76)], 0.52, null)),
  // Krystaller slik de vokser: klynge, to spisser, og en lang stav.
  klynge: ferdig(flett(krystall,
    flytt(krystall, { s: 0.6, velt: 0.55, ut: 0.5, opp: -0.38, rundt: 0.3 }),
    flytt(krystall, { s: 0.5, velt: 0.6, ut: 0.48, opp: -0.45, rundt: 2.5 }),
    flytt(krystall, { s: 0.42, velt: 0.7, ut: 0.46, opp: -0.5, rundt: 4.3 }))),
  spiss: ferdig(flett(krystall, flytt(krystall, { s: 0.58, velt: 0.5, ut: 0.5, opp: -0.4, rundt: 1.2 }))),
  stav: ferdig(flytt(dobbel, { velt: 0.3 })),
  // Metaller: terning, terningklynge og støpt barre.
  terning: ferdig(terning),
  terninger: ferdig(flett(terning, flytt(terning, { s: 0.6, velt: 0.35, ut: 0.95, opp: -0.25, rundt: 0.8 }), flytt(terning, { s: 0.45, velt: -0.3, ut: 0.9, opp: 0.3, rundt: 3.6 }))),
  barre: ferdig(slip([rekt(0.78, 0.3, 0.03, 0.2), rekt(1, 0.42, 0.03, -0.2)])),
};
const K = (seed, o = {}) => ferdig(klump(seed, o), o.str ?? 0.84);                                        // klump
const T = (seed) => ferdig(klump(seed, { sx: 1, sy: 0.72, sz: 0.82, uro: 0.14, lapper: 4 }), 0.92);        // trommelpolert stein

const FORM = {
  // Metaller
  kobber: K(31, { uro: 0.42, lapper: 10 }), tinn: F.barre, sink: K(47, { sy: 0.6, uro: 0.24 }), nikkel: K(59, { sy: 0.8, uro: 0.2, lapper: 5 }),
  titan: F.stav, krom: K(53, { uro: 0.5, lapper: 12, sy: 0.86, str: 0.66 }), solv: K(23, { sx: 0.95, sy: 0.82, sz: 0.9, uro: 0.42, lapper: 9, str: 0.8 }),
  kobolt: K(61, { sy: 0.8, uro: 0.3 }), wolfram: F.terning, vismut: F.terninger, niob: K(67, { sz: 0.7, uro: 0.28 }),
  elektrum: K(71, { sy: 0.68, uro: 0.36 }), tantal: K(73, { uro: 0.26, sz: 0.72 }), indium: F.barre, gull: K(7, { str: 0.86 }),
  palladium: K(79, { sy: 0.7, uro: 0.22, lapper: 6 }), platina: K(83, { uro: 0.3, sy: 0.72, lapper: 8 }),
  ruthenium: K(89, { uro: 0.46, lapper: 11 }), rhenium: F.barre, osmium: F.klynge, iridium: K(97, { uro: 0.36, sy: 0.8 }), rhodium: F.barre,
  // Edelsteiner
  bergkrystall: F.spiss, rosenkvarts: T(101), roykkvarts: F.klynge, agat: F.cabochon, jaspis: T(103), citrin: F.trillion, karneol: F.cabochon,
  onyks: F.kuppel, tigeroye: F.cabochon, fluoritt: F.oktaeder, granat: F.oval, rav: T(107), peridot: F.markise, turkis: F.kuppel,
  malakitt: F.cabochon, topas: F.sekskant, akvamarin: F.trinn, lapis: T(109), maanestein: F.kuppel, jade: F.cabochon, ametyst: F.klynge,
  turmalin: F.stav, zirkon: F.brilliant, smaragd: F.trinn, opal: F.kuppel, morganitt: F.draape, tanzanitt: F.prinsesse, safir: F.draape,
  rubin: F.oval, svartopal: F.cabochon, aleksandritt: F.brilliant, padparadscha: F.oval, diamant: F.brilliant, rodberyll: F.trinn, taaffeitt: F.markise,
};

// ---------------------------------------------------------------------------
// Stoffene: fargetrapp fra skygge til blink
// ---------------------------------------------------------------------------
const HVIT = [255, 255, 255], SVART = [0, 0, 0];
/** Gjennomsiktig, slipt stein. ild = regnbuefarger inni (0–1). c2 = en annen farge steinen skifter til. */
function edel(farge, { ild = 0, dyp = 0.72, skift = null } = {}) {
  const c = rgb(farge);
  return { type: 'edel', ild, glod: farge, c: [mellom(c, [10, 6, 24], dyp), c, mellom(c, HVIT, 0.5), HVIT],
    c2: skift ? edel(skift, { dyp }).c : null };
}
/** Klar eller melkehvit stein med egen fargetrapp. */
const klar = (trapp, glod, ild = 0) => ({ type: 'edel', ild, glod, c: trapp.map(rgb), c2: null });
/** Stein man ikke ser gjennom. striper = fargen på båndene (agat, malakitt, tigerøye). */
function matt(farge, { striper = null, frekv = 9 } = {}) {
  const trapp = (f) => { const c = rgb(f); return [mellom(c, SVART, 0.62), c, mellom(c, HVIT, 0.38), HVIT]; };
  return { type: 'matt', glod: farge, c: trapp(farge), c2: striper ? trapp(striper) : null, frekv };
}
const metall = (trapp, glod) => ({ type: 'metall', glod, c: trapp.map(rgb) });
/** Metall i sin egen farge: mørkt i skyggen, blankt i lyset. */
function metallAv(farge) {
  const c = rgb(farge);
  return { type: 'metall', glod: mellom(c, HVIT, 0.25), c: [mellom(c, [12, 13, 20], 0.86), mellom(c, SVART, 0.42), mellom(c, HVIT, 0.14), mellom(c, HVIT, 0.88)] };
}

const STOFF = {
  stov: { type: 'glass', glod: '#ffe58a' },
  gull: metall(['#3d2402', '#c4850a', '#ffd84a', '#fffbe0'], '#ffcf4a'),
  solv: metall(['#1b212b', '#727f8f', '#d3dde6', '#ffffff'], '#cfe0f0'),
  bergkrystall: klar(['#4f6a80', '#d3e6f0', '#f6fbff', '#ffffff'], '#d9efff'),
  maanestein: klar(['#56698f', '#cfdcf2', '#f2f7ff', '#ffffff'], '#bcd3ff', 0.12),
  rosenkvarts: edel(VARER.rosenkvarts.farge, { dyp: 0.5 }),
  karneol: edel(VARER.karneol.farge, { dyp: 0.6 }),
  rav: edel(VARER.rav.farge, { dyp: 0.55 }),
  granat: edel(VARER.granat.farge, { dyp: 0.8 }),
  agat: matt(VARER.agat.farge, { striper: '#f1dcc0', frekv: 9 }),
  jaspis: matt(VARER.jaspis.farge, { striper: '#6e2418', frekv: 5 }),
  tigeroye: matt(VARER.tigeroye.farge, { striper: '#4a2a0c', frekv: 11 }),
  malakitt: matt(VARER.malakitt.farge, { striper: '#0b5a37', frekv: 10 }),
  turkis: matt(VARER.turkis.farge),
  lapis: matt(VARER.lapis.farge),
  jade: matt(VARER.jade.farge),
  onyks: { type: 'matt', glod: '#9aa0b5', c: ['#020203', '#23232b', '#6a6a7c', '#ffffff'].map(rgb), c2: null },
  perle: { type: 'perle', glod: '#fff3e6' },
  opal: klar(['#6f8c92', '#dcebe9', '#f6fbfa', '#ffffff'], '#d9fff6', 0.6),
  // Svart opal: mørk stein med flekker som lyser i alle farger.
  svartopal: { type: 'matt', glod: '#7f8cff', c: ['#020308', '#161a2a', '#39446e', '#dfe4ff'].map(rgb), c2: null, ild: 0.85 },
  // Aleksandritt skifter farge: grønn i dagslys, rød i lampelys.
  aleksandritt: edel(VARER.aleksandritt.farge, { skift: '#a8306e' }),
  diamant: klar(['#2f5f8c', '#a9dcf7', '#eef9ff', '#ffffff'], '#bfe9ff', 0.38),
};
for (const v of METALLER) STOFF[v] ??= metallAv(VARER[v].farge);
for (const v of EDELSTEINER) STOFF[v] ??= edel(VARER[v].farge);
// En ting man ikke har funnet ennå: bare en mørk skygge.
const SKYGGE = metall(['#0b0e16', '#171d2a', '#262f42', '#333d54'], '#000000');

const PUNKT = [0, 0.45, 0.85, 1.25];
function tone(c, b) {
  b = Math.max(0, Math.min(1.25, b));
  let k = 1;
  while (k < 3 && b > PUNKT[k]) k++;
  return mellom(c[k - 1], c[k], (b - PUNKT[k - 1]) / (PUNKT[k] - PUNKT[k - 1]));
}

/** Regnbuefarge (lys og sterk) for «ilden» i diamanten. */
function regnbue(h) {
  const f = (n) => { const k = (n + h / 30) % 12; return (0.72 - 0.28 * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255; };
  return [f(0), f(8), f(4)];
}

function stjerne(ctx, x, y, r, a) {
  if (a <= 0 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const v = (k / 8) * TAU, rr = k % 2 ? r * 0.16 : r;
    ctx.lineTo(x + Math.cos(v) * rr, y + Math.sin(v) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = Math.min(1, a) * 0.35;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Tegner en form som snurrer rundt sin egen akse
// ---------------------------------------------------------------------------
function tegnForm(ctx, form, stoff, x, y, s, vinkel, glimt = true) {
  const ca = Math.cos(vinkel), sa = Math.sin(vinkel);
  const P = form.v.map(([vx, vy, vz]) => {
    const x1 = vx * ca + vz * sa, z1 = vz * ca - vx * sa;
    return [x + x1 * s, y - (vy * CT - z1 * ST) * s];
  });
  const bak = [], foran = [];
  for (const fl of form.flater) {
    const [nx, ny, nz] = fl.n;
    const nz1 = nz * ca - nx * sa;
    const n = [nx * ca + nz * sa, ny * CT - nz1 * ST, ny * ST + nz1 * CT];
    const [cx, cy, cz] = fl.c;
    const cx1 = cx * ca + cz * sa, cz1 = cz * ca - cx * sa;
    (n[2] > 0 ? foran : bak).push({ fl, n, z: cy * ST + cz1 * CT, sx: x + cx1 * s, sy: y - (cy * CT - cz1 * ST) * s });
  }
  foran.sort((a, b) => a.z - b.z);
  const sti = (idx) => {
    ctx.beginPath();
    ctx.moveTo(P[idx[0]][0], P[idx[0]][1]);
    for (let k = 1; k < idx.length; k++) ctx.lineTo(P[idx[k]][0], P[idx[k]][1]);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  const blink = [];
  if (stoff.type === 'edel') {
    // Noen steiner skifter farge mens de snurrer.
    let skift = stoff.c2 ? 0.5 + 0.5 * Math.sin(vinkel * 0.7) : 0;
    skift = skift * skift * (3 - 2 * skift);
    skift = skift * skift * (3 - 2 * skift);   // mest tid i den ene eller den andre fargen
    const trapp = stoff.c2 ? stoff.c.map((c, k) => mellom(c, stoff.c2[k], skift)) : stoff.c;
    // Baksiden først: der kastes lyset rundt inne i steinen, og det ser vi gjennom forsiden.
    bak.sort((a, b) => a.z - b.z);
    ctx.lineWidth = 0.7;
    for (const o of bak) {
      const m = [-o.n[0], -o.n[1], -o.n[2]];
      const b = 0.14 + 0.85 * Math.pow(Math.max(0, prikk(m, INDRE)), 1.6) + 0.4 * Math.pow(Math.max(0, prikk(m, LYS)), 3);
      let c = tone(trapp, b);
      if (stoff.ild) c = mellom(c, regnbue((o.n[0] * 150 + o.n[1] * 210 + 720) % 360), stoff.ild);
      sti(o.fl.idx);
      ctx.fillStyle = ctx.strokeStyle = css(c);
      ctx.fill();
      ctx.stroke();
    }
    for (const o of foran) {
      const d = Math.max(0, prikk(o.n, LYS)), d2 = Math.max(0, prikk(o.n, LYS2));
      const g = Math.pow(Math.max(0, prikk(o.n, HALV)), 28) + 0.6 * Math.pow(Math.max(0, prikk(o.n, HALV2)), 20);
      let c = tone(trapp, 0.16 + 0.34 * d + 0.13 * d2 + 1.05 * g);
      if (stoff.ild) c = mellom(c, regnbue((o.n[0] * 190 - o.n[1] * 120 + 900) % 360), stoff.ild * 0.42 * (1 - Math.min(1, g)));
      sti(o.fl.idx);
      ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, g);
      ctx.fillStyle = css(c);
      ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.6, s * 0.012);
      ctx.stroke();
      if (g > 0.5) blink.push({ o, g });
    }
    ctx.globalAlpha = 1;
  } else if (stoff.type === 'matt') {
    // Stein man ikke ser gjennom: myk glans, og bånd på tvers for dem som har det.
    ctx.lineWidth = 0.7;
    for (const o of foran) {
      const d = Math.max(0, prikk(o.n, LYS)), d2 = Math.max(0, prikk(o.n, LYS2));
      const g = Math.pow(Math.max(0, prikk(o.n, HALV)), 18);
      const b = 0.2 + 0.42 * d + 0.14 * d2 + 0.6 * g;
      let c = tone(stoff.c, b);
      if (stoff.c2) {
        const band = 0.5 + 0.5 * Math.sin(o.fl.c[1] * stoff.frekv + o.fl.c[0] * 1.6);
        c = mellom(c, tone(stoff.c2, b), band * band);
      }
      if (stoff.ild) {
        const flekk = Math.max(0, Math.sin(o.n[0] * 6 + o.n[1] * 4 + o.fl.c[0] * 7 + o.fl.c[2] * 5));
        c = mellom(c, regnbue((o.fl.c[0] * 260 + o.fl.c[2] * 200 + o.n[0] * 120 + 900) % 360), stoff.ild * flekk);
      }
      sti(o.fl.idx);
      ctx.fillStyle = ctx.strokeStyle = css(c);
      ctx.fill();
      ctx.stroke();
      if (g > 0.7) blink.push({ o, g: 0.5 + (g - 0.7) });
    }
  } else {
    ctx.lineWidth = 0.7;
    for (const o of foran) {
      const d = Math.max(0, prikk(o.n, LYS)), d2 = Math.max(0, prikk(o.n, LYS2));
      const g = Math.pow(Math.max(0, prikk(o.n, HALV)), 10);
      const speil = 0.5 + o.n[2] * o.n[1];   // speiler lys himmel over og mørkt gulv under
      sti(o.fl.idx);
      ctx.fillStyle = ctx.strokeStyle = css(tone(stoff.c, 0.1 + 0.52 * d + 0.18 * d2 + 0.24 * speil + 0.8 * g));
      ctx.fill();
      ctx.stroke();
      if (g > 0.62) blink.push({ o, g: 0.5 + (g - 0.62) });
    }
  }
  if (!glimt || !blink.length) return;
  blink.sort((a, b) => b.g - a.g);
  const f = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const { o, g } of blink.slice(0, 3)) stjerne(ctx, o.sx, o.sy, s * (0.16 + 0.34 * Math.min(1, g - 0.5)), (g - 0.5) * 2.2);
  ctx.globalCompositeOperation = f;
}

// ---------------------------------------------------------------------------
// Stjernestøvet står i et glass med kork
// ---------------------------------------------------------------------------
const STOVKORN = (() => {
  const r = mulberry32(99);
  return Array.from({ length: 34 }, () => ({ rad: 0.08 + r() * 0.42, y: r(), fart: 0.5 + r() * 1.3, fase: r() * TAU, blunk: 1.5 + r() * 3, farge: Math.floor(r() * 4) }));
})();
const STOVFARGER = ['#fff6c8', '#ffd23f', '#bfe9ff', '#ffffff'];

function glassSti(ctx, x, y, s) {
  const w = s * 0.6, hals = s * 0.32;
  ctx.beginPath();
  ctx.moveTo(x - w, y - s * 0.45);
  ctx.lineTo(x - w, y + s * 0.68);
  ctx.quadraticCurveTo(x - w, y + s * 0.9, x - w + s * 0.22, y + s * 0.9);
  ctx.lineTo(x + w - s * 0.22, y + s * 0.9);
  ctx.quadraticCurveTo(x + w, y + s * 0.9, x + w, y + s * 0.68);
  ctx.lineTo(x + w, y - s * 0.45);
  ctx.quadraticCurveTo(x + w, y - s * 0.72, x + hals, y - s * 0.76);
  ctx.lineTo(x + hals, y - s * 0.92);
  ctx.lineTo(x - hals, y - s * 0.92);
  ctx.lineTo(x - hals, y - s * 0.76);
  ctx.quadraticCurveTo(x - w, y - s * 0.72, x - w, y - s * 0.45);
  ctx.closePath();
}

function tegnStovglass(ctx, x, y, s, vinkel, t, antall, skygget) {
  glassSti(ctx, x, y, s);
  ctx.fillStyle = skygget ? 'rgba(30, 38, 56, 0.55)' : 'rgba(170, 215, 255, 0.10)';
  ctx.fill();
  if (!skygget) {
    ctx.save();
    glassSti(ctx, x, y, s);
    ctx.clip();
    // Haugen med støv i bunnen vokser med antallet.
    const niva = y + s * (0.62 - 0.5 * Math.min(1, antall / 60));
    let g = ctx.createLinearGradient(0, niva - s * 0.15, 0, y + s * 0.9);
    g.addColorStop(0, 'rgba(255, 240, 170, 0)');
    g.addColorStop(0.25, 'rgba(255, 226, 120, 0.85)');
    g.addColorStop(1, 'rgba(232, 150, 30, 0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s);
    ctx.lineTo(x - s, niva + s * 0.05);
    ctx.quadraticCurveTo(x - s * 0.1, niva - s * 0.16, x + s, niva + s * 0.08);
    ctx.lineTo(x + s, y + s);
    ctx.fill();
    // Lysende korn som virvler rundt.
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(x, y + s * 0.1, 0, x, y + s * 0.1, s * 0.8);
    g.addColorStop(0, `rgba(255, 236, 150, ${0.4 + 0.1 * Math.sin(t * 2)})`);
    g.addColorStop(1, 'rgba(255, 236, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    for (const k of STOVKORN) {
      const a = vinkel * k.fart + k.fase;
      const hy = ((k.y + t * 0.03 * k.fart) % 1);
      const px = x + Math.cos(a) * k.rad * s * 1.15, py = y + s * (0.6 - hy * 1.15) + Math.sin(a) * s * 0.05;
      const lys = (0.55 + 0.45 * Math.sin(t * k.blunk + k.fase)) * (0.6 + 0.4 * Math.sin(a));
      ctx.globalAlpha = Math.max(0, lys);
      ctx.fillStyle = STOVFARGER[k.farge];
      ctx.beginPath();
      ctx.arc(px, py, s * (0.022 + 0.022 * lys), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const lx = x + Math.cos(vinkel * 0.7) * s * 0.22, ly = y - s * 0.1 + Math.sin(t * 0.9) * s * 0.2;
    const f = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    stjerne(ctx, lx, ly, s * 0.2, 0.5 + 0.5 * Math.sin(t * 2.3));
    ctx.globalCompositeOperation = f;
  }
  // Selve glasset: kant og gjenskinn
  glassSti(ctx, x, y, s);
  ctx.strokeStyle = skygget ? 'rgba(120, 135, 165, 0.35)' : 'rgba(225, 242, 255, 0.6)';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.stroke();
  if (!skygget) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.moveTo(x - s * 0.42, y - s * 0.4); ctx.lineTo(x - s * 0.42, y + s * 0.35); ctx.stroke();
    ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(x + s * 0.44, y + s * 0.2); ctx.lineTo(x + s * 0.44, y + s * 0.6); ctx.stroke();
  }
  // Korken
  ctx.fillStyle = skygget ? '#1c2230' : '#b98450';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.34, y - s * 1.12); ctx.lineTo(x + s * 0.34, y - s * 1.12);
  ctx.lineTo(x + s * 0.29, y - s * 0.86); ctx.lineTo(x - s * 0.29, y - s * 0.86);
  ctx.closePath();
  ctx.fill();
  if (!skygget) {
    ctx.fillStyle = '#8f5f33';
    ctx.fillRect(x - s * 0.31, y - s * 0.97, s * 0.62, s * 0.035);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x - s * 0.3, y - s * 1.12, s * 0.14, s * 0.24);
  }
}

/** Perla er rund og blank, med et svakt skjær av rosa og blått. */
function tegnPerle(ctx, x, y, s, vinkel, skygget) {
  const r = s * 0.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (skygget) { ctx.fillStyle = '#171d2a'; ctx.fill(); return; }
  const hx = x - r * 0.32 + Math.cos(vinkel) * r * 0.07, hy = y - r * 0.36;
  let g = ctx.createRadialGradient(hx, hy, r * 0.05, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#f8f2ea'); g.addColorStop(0.78, '#d8cdc6'); g.addColorStop(1, '#9a909e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const [dv, farge] of [[0, 'rgba(255, 160, 200, 0.26)'], [2.4, 'rgba(140, 220, 255, 0.24)']]) {
    const px = x + Math.cos(vinkel * 0.6 + dv) * r * 0.45, py = y + r * 0.35 + Math.sin(vinkel * 0.6 + dv) * r * 0.2;
    g = ctx.createRadialGradient(px, py, 0, px, py, r * 0.75);
    g.addColorStop(0, farge); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0.5, 1.5); ctx.stroke();
  stjerne(ctx, hx, hy, r * 0.3, 0.9);
}

/** Tegner en skatt med midten i (x, y) og «radius» s. skygget = en ting man ikke har ennå. */
export function tegnTing(ctx, vare, x, y, s, vinkel, t, { skygget = false, antall = 1, glimt = true } = {}) {
  if (vare === 'stov') tegnStovglass(ctx, x, y + s * 0.1, s, vinkel, t, antall, skygget);
  else if (STOFF[vare].type === 'perle') tegnPerle(ctx, x, y, s, vinkel, skygget);
  else tegnForm(ctx, FORM[vare], skygget ? SKYGGE : STOFF[vare], x, y, s, vinkel, glimt && !skygget);
}

// ---------------------------------------------------------------------------
// Montrene: sokkel, glassboks, dreieskive og lys
// ---------------------------------------------------------------------------
function rund(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function flate(ctx, pts, farge) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = farge;
  ctx.fill();
}

function gull(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fff1b8');
  g.addColorStop(0.5, '#e2b64a');
  g.addColorStop(1, '#a87a1e');
  return g;
}

/** Skriver teksten så den får plass i bredden (krymper skrifta om nødvendig). */
function skriv(ctx, tekst, x, y, maksB, px, vekt = '700', skrift = SERIF) {
  let s = px;
  ctx.font = `${vekt} ${s}px ${skrift}`;
  while (s > 8 && ctx.measureText(tekst).width > maksB) { s -= 1; ctx.font = `${vekt} ${s}px ${skrift}`; }
  ctx.fillText(tekst, x, y);
}

/** Målene til en monter som står på gulvet i (cx, by) og er u bred. */
function montre(cx, by, u, vare) {
  const pw = u * 0.92, ph = u * 0.42, dz = u * 0.26, ins = u * 0.06;
  const gw = pw * 0.86, gh = u * 0.98, gd = dz * 0.72, gi = ins * 0.72;
  const topY = by - ph, gy = topY - dz * 0.14;
  return { vare, cx, by, u, pw, ph, dz, ins, gw, gh, gd, gi, topY, gy, topp: gy - gd - gh,
    bord: { x: cx, y: gy - gd * 0.5, rx: gw * 0.36, ry: gd * 0.4 },
    midt: { x: cx, y: gy - gd * 0.5 - gh * 0.47 }, s: gw * 0.3 };
}

/** Det som står bak tingen: skygge, sokkel, skilt, glassets bakside og dreieskiva. */
function montreBak(ctx, m, { vis, tekst, grad = 0 }) {
  const { cx, by, u, pw, ph, dz, ins, gw, gh, gd, gi, topY, gy } = m;
  // Skygge og lys på gulvet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath(); ctx.ellipse(cx, by, pw * 0.64, u * 0.075, 0, 0, TAU); ctx.fill();
  if (vis) {
    const g = ctx.createRadialGradient(cx, by + u * 0.08, 0, cx, by + u * 0.08, pw * 0.9);
    g.addColorStop(0, rgba(STOFF[m.vare].glod, 0.16));
    g.addColorStop(1, rgba(STOFF[m.vare].glod, 0));
    ctx.save();
    ctx.translate(0, by + u * 0.08);
    ctx.scale(1, 0.22);
    ctx.translate(0, -(by + u * 0.08));
    ctx.fillStyle = g;
    ctx.fillRect(cx - pw, by + u * 0.08 - pw, pw * 2, pw * 2);
    ctx.restore();
  }
  // Sokkelen
  let g = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0);
  g.addColorStop(0, '#2c3246'); g.addColorStop(0.25, '#3b425a'); g.addColorStop(0.7, '#262b3c'); g.addColorStop(1, '#161924');
  ctx.fillStyle = g;
  ctx.fillRect(cx - pw / 2, topY, pw, ph);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(cx - pw / 2 - u * 0.015, by - ph * 0.13, pw + u * 0.03, ph * 0.13);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(cx - pw / 2, topY, pw, ph * 0.1);
  g = ctx.createLinearGradient(0, topY - dz, 0, topY);
  g.addColorStop(0, '#39405a'); g.addColorStop(1, '#4d5672');
  flate(ctx, [[cx - pw / 2, topY], [cx + pw / 2, topY], [cx + pw / 2 - ins, topY - dz], [cx - pw / 2 + ins, topY - dz]], g);
  ctx.fillStyle = gull(ctx, cx - pw / 2, 0, cx + pw / 2, 0);
  ctx.fillRect(cx - pw / 2, topY - u * 0.006, pw, Math.max(1.5, u * 0.014));
  // Messingskiltet
  const sw = pw * 0.72, sh = ph * 0.32, sx = cx - sw / 2, sy = topY + ph * 0.36;
  rund(ctx, sx, sy, sw, sh, sh * 0.2);
  ctx.fillStyle = vis ? gull(ctx, 0, sy, 0, sy + sh) : '#4a4f63';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = Math.max(0.8, u * 0.006);
  ctx.stroke();
  if (grad) {
    // Sjeldenheten: én til fem stjerner over skiltet.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = vis ? '#e9c35a' : '#5a6078';
    ctx.font = `700 ${Math.max(7, ph * 0.17)}px ${SANS}`;
    ctx.fillText('★'.repeat(grad), cx, topY + ph * 0.235);
  }
  if (tekst) {
    ctx.fillStyle = vis ? '#3a2a08' : '#9aa0b5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    skriv(ctx, tekst, cx, sy + sh * 0.54, sw * 0.9, sh * 0.62);
  }
  // Glassets bakside
  const xb0 = cx - gw / 2 + gi, xb1 = cx + gw / 2 - gi;
  g = ctx.createLinearGradient(0, gy - gd - gh, 0, gy - gd);
  g.addColorStop(0, 'rgba(120, 160, 255, 0.03)'); g.addColorStop(1, 'rgba(120, 160, 255, 0.09)');
  ctx.fillStyle = g;
  ctx.fillRect(xb0, gy - gd - gh, xb1 - xb0, gh);
  ctx.strokeStyle = 'rgba(225, 240, 255, 0.2)';
  ctx.lineWidth = Math.max(0.8, u * 0.007);
  ctx.strokeRect(xb0, gy - gd - gh, xb1 - xb0, gh);
  // Dreieskiva
  const b = m.bord;
  ctx.fillStyle = '#7a5a1c';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + u * 0.022, b.rx, b.ry, 0, 0, TAU); ctx.fill();
  g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.rx);
  g.addColorStop(0, '#4a2470'); g.addColorStop(1, '#190a2c');
  ctx.save();
  ctx.translate(0, b.y); ctx.scale(1, b.ry / b.rx); ctx.translate(0, -b.y);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.rx, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#d9b45a';
  ctx.lineWidth = Math.max(1, u * 0.012);
  ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, TAU); ctx.stroke();
}

/** Det som beveger seg: lyskjegla, gløden, tingen som snurrer, og småting på dreieskiva. */
function montreLiv(ctx, m, { vis, antall, vinkel, t, nr }) {
  const { cx, u, gh, gd, gy, bord: b } = m;
  const stoff = STOFF[m.vare];
  const lampeY = gy - gd * 0.5 - gh + gh * 0.04;
  if (vis) {
    const f = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createLinearGradient(0, lampeY, 0, b.y);
    g.addColorStop(0, 'rgba(255, 244, 214, 0.30)');
    g.addColorStop(1, 'rgba(255, 244, 214, 0.03)');
    flate(ctx, [[cx - u * 0.035, lampeY], [cx + u * 0.035, lampeY], [cx + b.rx, b.y], [cx - b.rx, b.y]], g);
    const puls = 0.85 + 0.15 * Math.sin(t * 1.7 + nr);
    g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.rx * 1.15);
    g.addColorStop(0, rgba(stoff.glod, 0.55 * puls));
    g.addColorStop(1, rgba(stoff.glod, 0));
    ctx.save();
    ctx.translate(0, b.y); ctx.scale(1, 0.42); ctx.translate(0, -b.y);
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.rx * 1.2, b.y - b.rx * 1.2, b.rx * 2.4, b.rx * 2.4);
    ctx.restore();
    g = ctx.createRadialGradient(m.midt.x, m.midt.y, 0, m.midt.x, m.midt.y, m.s * 1.9);
    g.addColorStop(0, rgba(stoff.glod, 0.22 * puls));
    g.addColorStop(1, rgba(stoff.glod, 0));
    ctx.fillStyle = g;
    ctx.fillRect(m.midt.x - m.s * 2, m.midt.y - m.s * 2, m.s * 4, m.s * 4);
    // Støvkorn som svever i lyset
    ctx.fillStyle = '#fff6dc';
    for (let k = 0; k < 4; k++) {
      const fase = nr * 1.7 + k * 2.1, hy = (t * 0.035 * (1 + k * 0.3) + k * 0.27 + nr * 0.13) % 1;
      const py = lampeY + (b.y - lampeY) * (1 - hy);
      const px = cx + Math.sin(t * 0.5 + fase) * b.rx * 0.6 * (1 - hy * 0.7);
      ctx.globalAlpha = 0.35 * Math.sin(hy * Math.PI);
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.7, u * 0.007), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = f;
  }
  // Har man mange, ligger det flere små rundt på skiva.
  const rundt = m.vare === 'stov' || !vis ? 0 : antall >= 25 ? 3 : antall >= 10 ? 2 : antall >= 3 ? 1 : 0;
  const smaa = [];
  for (let k = 0; k < rundt; k++) {
    const a = vinkel + (k / rundt) * TAU + 0.6;
    smaa.push({ a, z: Math.sin(a), x: b.x + Math.cos(a) * b.rx * 0.72, y: b.y + Math.sin(a) * b.ry * 0.72 - m.s * 0.2 });
  }
  const liten = (o) => tegnTing(ctx, m.vare, o.x, o.y, m.s * 0.3, o.a * 1.3 + 1, t, { glimt: false });
  smaa.filter((o) => o.z < 0).forEach(liten);
  const dupp = Math.sin(t * 1.3 + nr * 0.9) * u * 0.014;
  ctx.fillStyle = `rgba(0, 0, 0, ${vis ? 0.32 : 0.2})`;
  ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx * (0.5 - dupp / u), b.ry * (0.5 - dupp / u), 0, 0, TAU); ctx.fill();
  tegnTing(ctx, m.vare, m.midt.x, m.midt.y + dupp, m.s, vinkel, t, { skygget: !vis, antall });
  smaa.filter((o) => o.z >= 0).forEach(liten);
}

/** Det som ligger foran tingen: glassets forside med gjenskinn, kantene og lampa. */
function montreForan(ctx, m, { vis }) {
  const { cx, u, gw, gh, gd, gi, gy } = m;
  const x0 = cx - gw / 2, y0 = gy - gh;
  let g = ctx.createLinearGradient(x0, y0, x0 + gw, gy);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  g.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
  g.addColorStop(1, 'rgba(190, 220, 255, 0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, gw, gh);
  // Skrå gjenskinn
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, gw, gh); ctx.clip();
  const skra = gh * 0.42;
  flate(ctx, [[x0 + gw * 0.2, y0], [x0 + gw * 0.38, y0], [x0 + gw * 0.38 - skra, gy], [x0 + gw * 0.2 - skra, gy]], 'rgba(255, 255, 255, 0.075)');
  flate(ctx, [[x0 + gw * 0.46, y0], [x0 + gw * 0.5, y0], [x0 + gw * 0.5 - skra, gy], [x0 + gw * 0.46 - skra, gy]], 'rgba(255, 255, 255, 0.05)');
  flate(ctx, [[x0 + gw * 1.12, y0], [x0 + gw * 1.2, y0], [x0 + gw * 1.2 - skra, gy], [x0 + gw * 1.12 - skra, gy]], 'rgba(255, 255, 255, 0.05)');
  ctx.restore();
  // Toppen av glasset
  flate(ctx, [[x0, y0], [x0 + gw, y0], [x0 + gw - gi, y0 - gd], [x0 + gi, y0 - gd]], 'rgba(255, 255, 255, 0.09)');
  // Lampa i taket på montren
  const ly = gy - gd * 0.5 - gh + gh * 0.035;
  ctx.fillStyle = gull(ctx, cx - u * 0.07, 0, cx + u * 0.07, 0);
  ctx.beginPath(); ctx.ellipse(cx, ly - u * 0.012, u * 0.075, u * 0.026, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = vis ? '#fffbe6' : '#565c70';
  ctx.beginPath(); ctx.ellipse(cx, ly, u * 0.045, u * 0.016, 0, 0, TAU); ctx.fill();
  // Kantene
  ctx.strokeStyle = 'rgba(232, 244, 255, 0.62)';
  ctx.lineWidth = Math.max(1, u * 0.011);
  ctx.lineJoin = 'round';
  ctx.strokeRect(x0, y0, gw, gh);
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x0 + gi, y0 - gd); ctx.lineTo(x0 + gw - gi, y0 - gd); ctx.lineTo(x0 + gw, y0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 244, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x0, gy); ctx.lineTo(x0 + gi, gy - gd);
  ctx.moveTo(x0 + gw, gy); ctx.lineTo(x0 + gw - gi, gy - gd);
  ctx.stroke();
  // Messinglist nederst og hjørnebeslag øverst
  ctx.fillStyle = gull(ctx, 0, gy - u * 0.03, 0, gy + u * 0.012);
  ctx.fillRect(x0 - u * 0.012, gy - u * 0.03, gw + u * 0.024, u * 0.042);
  ctx.fillStyle = '#e2b64a';
  const hb = u * 0.035;
  ctx.fillRect(x0 - hb * 0.25, y0 - hb * 0.25, hb, hb);
  ctx.fillRect(x0 + gw - hb * 0.75, y0 - hb * 0.25, hb, hb);
  stjerne(ctx, x0 + gw * 0.1, y0 + gh * 0.08, u * 0.045, vis ? 0.75 : 0.3);
  if (!vis) {
    ctx.fillStyle = 'rgba(233, 201, 110, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(gh * 0.3)}px ${SERIF}`;
    ctx.fillText('?', m.midt.x, m.midt.y);
  }
}

// ---------------------------------------------------------------------------
// Rommet
// ---------------------------------------------------------------------------
function bakgrunn(ctx, W, H, horisont, u) {
  let g = ctx.createLinearGradient(0, 0, 0, horisont);
  g.addColorStop(0, '#0e1330'); g.addColorStop(1, '#2b3668');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horisont);
  // Stripete tapet
  ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
  const sb = Math.max(16, u * 0.2);
  for (let x = W / 2 - Math.ceil(W / sb) * sb; x < W; x += sb * 2) ctx.fillRect(x, 0, sb, horisont);
  // Varmt lys på veggen
  for (const fx of [0.18, 0.5, 0.82]) {
    g = ctx.createRadialGradient(W * fx, horisont * 0.5, 0, W * fx, horisont * 0.5, Math.max(u * 1.8, W * 0.22));
    g.addColorStop(0, 'rgba(255, 214, 150, 0.13)');
    g.addColorStop(1, 'rgba(255, 214, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horisont);
  }
  // Brystpanel og fotlist
  const ph = u * 0.36;
  g = ctx.createLinearGradient(0, horisont - ph, 0, horisont);
  g.addColorStop(0, '#1b2249'); g.addColorStop(1, '#10152e');
  ctx.fillStyle = g;
  ctx.fillRect(0, horisont - ph, W, ph);
  ctx.fillStyle = gull(ctx, 0, horisont - ph - 3, 0, horisont - ph);
  ctx.fillRect(0, horisont - ph - 3, W, 3);
  ctx.fillStyle = '#080a16';
  ctx.fillRect(0, horisont - 5, W, 5);
  // Blankt tregulv med planker som løper innover
  g = ctx.createLinearGradient(0, horisont, 0, H);
  g.addColorStop(0, '#5d3f29'); g.addColorStop(0.5, '#3b2718'); g.addColorStop(1, '#1e130b');
  ctx.fillStyle = g;
  ctx.fillRect(0, horisont, W, H - horisont);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1.2;
  const fy = horisont - (H - horisont) * 0.9, u0 = (horisont - fy) / (H - fy);
  for (let k = -16; k <= 16; k++) {
    const xb = W / 2 + k * Math.max(70, W * 0.1);
    ctx.beginPath(); ctx.moveTo(W / 2 + (xb - W / 2) * u0, horisont); ctx.lineTo(xb, H); ctx.stroke();
  }
  g = ctx.createLinearGradient(0, horisont, 0, horisont + (H - horisont) * 0.45);
  g.addColorStop(0, 'rgba(255, 220, 170, 0.17)'); g.addColorStop(1, 'rgba(255, 220, 170, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, horisont, W, (H - horisont) * 0.45);
  // Mørkere ut mot kantene
  g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)'); g.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Salene: høyst ni montre i hver. Stjernestøvet og metallene først, så edelsteinene, fra de vanligste til de sjeldneste. */
const del = (liste, n) => Array.from({ length: Math.ceil(liste.length / n) }, (_, k) => liste.slice(k * n, k * n + n));
export const SALER = [
  ...del(['stov', ...METALLER], 9).map((varer, k, a) => ({ navn: `Metaller ${k + 1} av ${a.length}`, varer })),
  ...del(EDELSTEINER, 9).map((varer, k, a) => ({ navn: `Edelsteiner ${k + 1} av ${a.length}`, varer })),
];
export const salFor = (vare) => Math.max(0, SALER.findIndex((sal) => sal.varer.includes(vare)));

/** Hvor montrene står: to rekker liggende (5 + 4 når salen er full), rekker på tre stående. */
function oppsett(W, H, medTittel, varer) {
  const smal = W < 640;
  const topp = (smal && medTittel ? 112 : 78), bunn = 76;   // nederst står knappene for å bytte sal
  const liggende = W > H * 1.1;
  const n = varer.length;
  const rader = liggende ? [Math.ceil(n / 2), Math.floor(n / 2)].filter(Boolean) : del(varer, 3).map((x) => x.length);
  const skala = rader.map((_, r) => 1 - (rader.length - 1 - r) * (liggende ? 0.16 : 0.05));
  const steg = (W - 16) / Math.max(...rader);
  const sum = skala.reduce((a, b) => a + b, 0) * 1.66 + (rader.length - 1) * 0.04;
  const u = Math.min(steg * 0.98, (H - topp - bunn) / sum, 240);
  const hoyde = sum * u;
  let y = topp + (H - topp - bunn - hoyde) * 0.6;
  const plass = [];
  let nr = 0;
  rader.forEach((iRad, r) => {
    const ur = u * skala[r];
    y += ur * 1.66;
    for (let k = 0; k < iRad; k++) plass.push({ cx: W / 2 + (k - (iRad - 1) / 2) * Math.min(steg, u * 1.28), by: y, u: ur, vare: varer[nr++] });
    y += u * 0.04;
  });
  const forste = plass[0];
  return { plass, u, horisont: forste.by - forste.u * 0.3, tittelY: smal ? 94 : 40 };
}

function lagLerret(W, H, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { c, ctx };
}

const synlig = (valg, vare) => !!valg.alt || (valg.samling[vare] ?? 0) > 0;
// Navnet på tingen. 🐣 Liten øver seg på å lese: da står navnet med store bokstaver.
const navnPaa = (valg, vare) => (valg.versaler ? VARER[vare].navn.toUpperCase() : stor(VARER[vare].navn));
const skilt = navnPaa;

/** Alt som står stille tegnes én gang i to lag (bak og foran tingene), og lages på nytt når noe endrer seg. */
function byggLag(W, H, valg, nokkel) {
  const dpr = valg.dpr ?? 1;
  const bak = lagLerret(W, H, dpr), foran = lagLerret(W, H, dpr);
  const o = oppsett(W, H, !!valg.tittel, SALER[valg.sal ?? 0].varer);
  bakgrunn(bak.ctx, W, H, o.horisont, o.u);
  if (valg.tittel) {
    const c = bak.ctx;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const px = Math.min(32, W * 0.06);
    c.fillStyle = gull(c, 0, o.tittelY - px / 2, 0, o.tittelY + px / 2);
    skriv(c, valg.tittel, W / 2, o.tittelY, W < 640 ? W - 24 : W - 420, px);
  }
  const montrer = o.plass.map((p) => montre(p.cx, p.by, p.u, p.vare));
  for (const m of montrer) {
    const vis = synlig(valg, m.vare);
    montreBak(bak.ctx, m, { vis, tekst: skilt(valg, m.vare), grad: VARER[m.vare].grad });
    montreForan(foran.ctx, m, { vis });
  }
  return { nokkel, bak: bak.c, foran: foran.c, montrer };
}

function rom(ctx, W, H, t, st, valg, levende = true) {
  const varer = SALER[valg.sal ?? 0].varer;
  const nokkel = [W, H, valg.dpr, valg.tittel, valg.versaler, valg.sal ?? 0, varer.map((v) => (synlig(valg, v) ? 1 : 0)).join('')].join('|');
  if (st.lag?.nokkel !== nokkel) st.lag = byggLag(W, H, valg, nokkel);
  ctx.drawImage(st.lag.bak, 0, 0, W, H);
  if (!levende) return [];
  st.lag.montrer.forEach((m, nr) => montreLiv(ctx, m, { vis: synlig(valg, m.vare), antall: valg.samling[m.vare] ?? 0, vinkel: st.vinkel[m.vare], t, nr }));
  ctx.drawImage(st.lag.foran, 0, 0, W, H);
  return st.lag.montrer.map((m) => ({ vare: m.vare, x: m.cx - m.pw / 2, y: m.topp, w: m.pw, h: m.by - m.topp }));
}

// ---------------------------------------------------------------------------
// Nærbilde av én monter
// ---------------------------------------------------------------------------
function naerbilde(ctx, W, H, t, st, valg) {
  rom(ctx, W, H, t, st, valg, false);
  ctx.fillStyle = 'rgba(5, 7, 16, 0.88)';
  ctx.fillRect(0, 0, W, H);
  const vare = valg.vare, vis = synlig(valg, vare), antall = valg.samling[vare] ?? 0;
  const topp = W < 640 && valg.tittel ? 112 : 78;   // på smale skjermer står romtittelen under knappene
  const u = Math.max(90, Math.min(W * 0.66, (H - topp - 164) / 1.66, 440));
  const y0 = topp + Math.max(0, (H - topp - 1.66 * u - 164) / 2);
  const m = montre(W / 2, y0 + 84 + 1.66 * u, u, vare);
  const grad = VARER[vare].grad ?? 0;
  // Lys på gulvet under montren
  const g = ctx.createRadialGradient(m.cx, m.by, 0, m.cx, m.by, u * 1.5);
  g.addColorStop(0, vis ? rgba(STOFF[vare].glod, 0.2) : 'rgba(120, 140, 190, 0.1)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.translate(0, m.by); ctx.scale(1, 0.3); ctx.translate(0, -m.by);
  ctx.fillStyle = g;
  ctx.fillRect(m.cx - u * 1.6, m.by - u * 1.6, u * 3.2, u * 3.2);
  ctx.restore();
  montreBak(ctx, m, { vis, tekst: skilt(valg, vare), grad });
  montreLiv(ctx, m, { vis, antall, vinkel: st.vinkel[vare], t, nr: SKATTER.indexOf(vare) % 9 });
  montreForan(ctx, m, { vis });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = gull(ctx, 0, y0 + 10, 0, y0 + 46);
  skriv(ctx, navnPaa(valg, vare), W / 2, y0 + 28, W - 30, Math.min(40, W * 0.09));
  if (grad) {
    ctx.fillStyle = '#e9c35a';
    skriv(ctx, `${'★'.repeat(grad)} ${stor(SJELDENHET[grad].navn)}`, W / 2, y0 + 64, W - 30, Math.min(21, W * 0.05), '700', SANS);
  }
  ctx.fillStyle = '#e9e2cf';
  skriv(ctx, antall ? `I museet: ${antall}` : 'Tom monter. Det du selger i butikken, havner her.', W / 2, m.by + 40, W - 24, Math.min(24, W * 0.055), '600', SANS);
  return [{ vare, x: m.cx - m.gw / 2, y: m.topp, w: m.gw, h: m.gy - m.topp }];
}

// ---------------------------------------------------------------------------
// Samlingen: alt man har funnet, på en fløyelstavle med gullramme
// ---------------------------------------------------------------------------
function samlingen(ctx, W, H, t, st, valg) {
  rom(ctx, W, H, t, st, valg, false);
  ctx.fillStyle = 'rgba(5, 7, 16, 0.8)';
  ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 20, 1000), ph = Math.min(H - 78 - 22, 820);
  const px = (W - pw) / 2, py = 78 + (H - 78 - 22 - ph) / 2;
  // Tavla
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  rund(ctx, px, py, pw, ph, 22);
  ctx.fillStyle = gull(ctx, px, py, px + pw, py + ph);
  ctx.fill();
  ctx.restore();
  let g = ctx.createRadialGradient(W / 2, py + ph * 0.4, 0, W / 2, py + ph * 0.4, Math.max(pw, ph) * 0.75);
  g.addColorStop(0, '#5a1532'); g.addColorStop(1, '#22060f');
  rund(ctx, px + 7, py + 7, pw - 14, ph - 14, 16);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(233, 201, 110, 0.55)';
  ctx.lineWidth = 1.5;
  rund(ctx, px + 15, py + 15, pw - 30, ph - 30, 11);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const topp = 60, bunn = 50;
  ctx.fillStyle = gull(ctx, 0, py + 24, 0, py + 58);
  skriv(ctx, 'Samlingen', W / 2, py + 42, pw - 60, Math.min(32, W * 0.07));
  // Rutenettet: så store ruter som mulig. Hver rute er litt høyere enn den er bred (tingen øverst, antallet under).
  const n = SKATTER.length, gw = pw - 44, gh = ph - topp - bunn;
  let kol = 4, rute = 0;
  for (let k = 4; k <= 16; k++) {
    const str = Math.min(gw / k, gh / Math.ceil(n / k) / 1.3);
    if (str > rute) { rute = str; kol = k; }
  }
  const rader = Math.ceil(n / kol), bw = gw / kol, bh = gh / rader;
  const treff = [];
  let sum = 0, slag = 0;
  SKATTER.forEach((vare, k) => {
    const rad = Math.floor(k / kol), iRad = rad === rader - 1 ? n - rad * kol : kol;
    const cx = W / 2 + ((k % kol) - (iRad - 1) / 2) * bw, y = py + topp + rad * bh;
    const antall = valg.samling[vare] ?? 0, vis = synlig(valg, vare);
    sum += antall;
    if (antall) slag++;
    const s = rute * 0.3, ty = y + bh * 0.4;
    if (vis) {
      g = ctx.createRadialGradient(cx, ty, 0, cx, ty, s * 1.9);
      g.addColorStop(0, rgba(STOFF[vare].glod, 0.28)); g.addColorStop(1, rgba(STOFF[vare].glod, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - s * 2, ty - s * 2, s * 4, s * 4);
      tegnTing(ctx, vare, cx, ty, s, st.vinkel[vare], t, { antall, glimt: rute > 44 });
      if (antall) {
        const tallPx = Math.max(10, rute * 0.26);
        ctx.fillStyle = gull(ctx, 0, y + bh * 0.86 - tallPx / 2, 0, y + bh * 0.86 + tallPx / 2);
        skriv(ctx, String(antall), cx, y + bh * 0.86, bw - 4, tallPx, '800', SANS);
      }
    } else {
      // Ikke funnet ennå: en tom plass med spørsmålstegn.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath(); ctx.arc(cx, ty, s * 0.95, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(233, 201, 110, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(233, 201, 110, 0.45)';
      ctx.font = `700 ${Math.max(9, s * 1.05)}px ${SERIF}`;
      ctx.fillText('?', cx, ty + s * 0.06);
    }
    treff.push({ vare, x: cx - bw / 2, y, w: bw, h: bh });
  });
  // I alt
  ctx.fillStyle = '#f1e6d0';
  const tekst = sum ? `${slag} av ${n} slag funnet · ${sum} ${sum === 1 ? 'skatt' : 'skatter'} i alt`
    : 'Museet er tomt ennå. Skattene du selger i butikken, havner her.';
  skriv(ctx, tekst, W / 2, py + ph - bunn / 2 - 6, pw - 50, Math.min(22, W * 0.046), '700', SANS);
  return treff;
}

// ---------------------------------------------------------------------------
// Ut til main.js
// ---------------------------------------------------------------------------
export function nyTilstand() {
  return { vinkel: {}, fart: {}, sist: null, lag: null, gnister: [] };
}

/** Et trykk på en ting: den snurrer fort en stund, og det spruter gnister fra (x, y). */
export function dytt(st, vare, x, y) {
  st.fart[vare] = Math.min(14, (st.fart[vare] ?? 0) + 7);
  const farge = rgba(STOFF[vare].glod, 1);
  for (let k = 0; k < 18; k++) {
    const v = Math.random() * TAU, fart = 60 + Math.random() * 190;
    st.gnister.push({ x, y, vx: Math.cos(v) * fart, vy: Math.sin(v) * fart - 60, t0: st.sist ?? 0, liv: 0.6 + Math.random() * 0.6,
      r: 3 + Math.random() * 5, farge: k % 3 ? farge : '#ffffff' });
  }
}

/**
 * Tegner museet. valg = { modus: 'rom' | 'naer' | 'samling', sal (nummer i SALER), vare, samling: { vare: antall },
 * tittel, versaler (navnene med store bokstaver), alt (vis alle tingene, også de man ikke har), dpr }.
 * Gir tilbake det man kan trykke på: [{ vare, x, y, w, h }].
 */
export function tegn(ctx, W, H, t, st, valg) {
  const dt = st.sist === null ? 0 : Math.max(0, Math.min(0.1, t - st.sist));
  st.sist = t;
  SKATTER.forEach((v, k) => {
    st.fart[v] = (st.fart[v] ?? 0) * Math.exp(-dt * 1.3);
    st.vinkel[v] = (st.vinkel[v] ?? k * 0.83) + dt * (0.5 + st.fart[v]);
  });
  const treff = valg.modus === 'samling' ? samlingen(ctx, W, H, t, st, valg)
    : valg.modus === 'naer' ? naerbilde(ctx, W, H, t, st, valg)
    : rom(ctx, W, H, t, st, valg);
  if (st.gnister.length) {
    const f = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    st.gnister = st.gnister.filter((g) => t - g.t0 < g.liv);
    for (const g of st.gnister) {
      const a = t - g.t0, u = a / g.liv;
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = g.farge;
      ctx.beginPath();
      ctx.arc(g.x + g.vx * a, g.y + g.vy * a + 160 * a * a, g.r * (1 - u * 0.6), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = f;
  }
  return treff;
}
