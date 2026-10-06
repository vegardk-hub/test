// Reglene for trykk-økonomien – uten noe DOM, så de kan testes i Node.
//
// Øya genereres fra en seed. Spilltilstanden lagrer bare det som er endret:
// hvilke ruter som er avdekket, hvor mye tåke som er børstet bort, og hvor langt
// man har kommet med hver ting. Alle handlinger returnerer en liste hendelser
// som skjermen viser (toner, avdekking, gaver, kveld …).

import { genererVerden } from './kartgen.js';
import { T } from './data/terreng.js';
import {
  TING, VARER, UTBYTTE, KISTEGAVE, STR_SJANSE, SJANSE, GJENVEKST, TAKE_TRYKK, SOL, OY,
} from './data/ting.js';
import { tonerFor } from './trykk/toner.js';
import { blandSeed, lagTilfeldig } from './rng.js';

export const VERSJON = 1;
export const TERRENGNAVN = { [T.VANN]: 'vann', [T.STRAND]: 'strand', [T.GRESS]: 'eng', [T.SKOG]: 'skog', [T.AAS]: 'aas', [T.FJELL]: 'fjell' };
const TYPE_FOR_TERRENG = { skog: 'tre', aas: 'stein', fjell: 'stein', eng: 'korn', vann: 'fisk' };

// ---------------------------------------------------------------------------
// Ny øy og verden
// ---------------------------------------------------------------------------
const verdenLager = new Map();

/** Verdenen (terreng og overlegg) for et spill. Lages fra seeden og huskes. */
export function lagVerden(spill) {
  if (!verdenLager.has(spill.seed)) {
    const v = genererVerden(spill.seed, OY);
    v.startIndeks = v.start.y * v.bredde + v.start.x;
    verdenLager.set(spill.seed, v);
  }
  return verdenLager.get(spill.seed);
}

export function nyttSpill({ navn, nivaa = 'stor', avatar = '🦊' }, seed = Math.floor(Math.random() * 2 ** 31)) {
  const spill = {
    versjon: VERSJON, navn, nivaa, avatar, seed,
    dag: 1,
    sol: SOL[nivaa],
    avdekket: new Uint8Array(OY.bredde * OY.hoyde),
    take: new Map(),          // rute → børstestrøk som gjenstår
    ting: new Map(),          // rute → { igjen, gang, borteTil }
    forrad: Object.fromEntries(Object.keys(VARER).map((v) => [v, 0])),
    sanger: {},               // sang → største størrelse fullført (1–3)
    stat: { trykk: 0, ting: 0, avdekket: 0, stjerner: 0 },
  };
  const verden = lagVerden(spill);
  const { x: sx, y: sy } = verden.start;
  for (let y = sy - 2; y <= sy + 2; y++) {
    for (let x = sx - 2; x <= sx + 2; x++) {
      if (x < 0 || y < 0 || x >= verden.bredde || y >= verden.hoyde) continue;
      if (Math.abs(x - sx) + Math.abs(y - sy) <= 3) spill.avdekket[y * verden.bredde + x] = 1;
    }
  }
  return spill;
}

// ---------------------------------------------------------------------------
// Ting på rutene
// ---------------------------------------------------------------------------
/** Hvilken type ting som kan vokse på ruta, eller null. Bestemt av seeden. */
export function grunnTing(spill, verden, i) {
  if (i === verden.startIndeks) return null;
  const o = verden.overlegg.get(i);
  if (o?.type === 'skatt') return 'kiste';
  if (o?.type === 'malm') return 'jern';
  if (o?.type === 'dyr') return o.art === 'hjort' ? null : 'ull';
  if (o?.type === 'landsby') return null;
  if (o?.type === 'baer') return 'korn';
  const terr = TERRENGNAVN[verden.terreng[i]];
  const type = TYPE_FOR_TERRENG[terr];
  if (!type) return null;
  return lagTilfeldig(blandSeed(spill.seed, 'har', i)).tall() < SJANSE[terr] ? type : null;
}

/** Tingen som står på ruta nå (eller null). */
export function tingVed(spill, verden, i) {
  const type = grunnTing(spill, verden, i);
  if (!type) return null;
  const s = spill.ting.get(i) ?? {};
  if (s.borteTil === -1 || (s.borteTil && spill.dag < s.borteTil)) return null;
  const gang = s.gang ?? 0;
  const u = lagTilfeldig(blandSeed(spill.seed, 'str', i, gang)).tall();
  const str = u < STR_SJANSE[0] ? 0 : u < STR_SJANSE[0] + STR_SJANSE[1] ? 1 : 2;
  const toner = tonerFor(TING[type].sang, str);
  return {
    i, type, str, seed: blandSeed(spill.seed, 'figur', i, gang),
    antall: toner.length, igjen: s.igjen ?? toner.length, toner,
  };
}

/** Er ruta høstet og venter på at noe nytt skal vokse? Gir antall dager igjen (Infinity for kister). */
export function venterPaa(spill, verden, i) {
  const s = spill.ting.get(i);
  if (!s?.borteTil || !grunnTing(spill, verden, i)) return 0;
  if (s.borteTil === -1) return Infinity;
  return Math.max(0, s.borteTil - spill.dag);
}

function gi(spill, gave) {
  for (const [v, n] of Object.entries(gave)) spill.forrad[v] = (spill.forrad[v] ?? 0) + n;
}

/** Ett trykk på tingen på rute i. */
export function trykkTing(spill, verden, i) {
  if (!spill.avdekket[i]) return [];
  const ting = tingVed(spill, verden, i);
  if (!ting) return [];
  if (spill.sol <= 0) return [{ type: 'tomSol' }];
  const nr = ting.antall - ting.igjen;
  const s = spill.ting.get(i) ?? {};
  s.igjen = ting.igjen - 1;
  spill.ting.set(i, s);
  spill.sol--;
  spill.stat.trykk++;
  const h = [{ type: 'tone', ting, nr, frekvens: ting.toner[nr], igjen: s.igjen }];
  if (s.igjen <= 0) {
    const gave = ting.type === 'kiste'
      ? KISTEGAVE[ting.str](lagTilfeldig(blandSeed(spill.seed, 'gave', i, s.gang ?? 0)))
      : { [ting.type]: UTBYTTE[ting.str] };
    gi(spill, gave);
    s.gang = (s.gang ?? 0) + 1;
    delete s.igjen;
    s.borteTil = ting.type === 'kiste' ? -1 : spill.dag + GJENVEKST;
    const sang = TING[ting.type].sang;
    const for_ = spill.sanger[sang] ?? 0;
    spill.sanger[sang] = Math.max(for_, ting.str + 1);
    spill.stat.ting++;
    h.push({ type: 'ferdig', ting, gave, sang, nySang: ting.str === 2 && for_ < 3 });
  }
  if (spill.sol <= 0) h.push({ type: 'kveld' });
  return h;
}

// ---------------------------------------------------------------------------
// Tåka
// ---------------------------------------------------------------------------
export function naboer4(verden, i) {
  const B = verden.bredde, x = i % B, y = Math.floor(i / B), ut = [];
  if (x > 0) ut.push(i - 1);
  if (x < B - 1) ut.push(i + 1);
  if (y > 0) ut.push(i - B);
  if (y < verden.hoyde - 1) ut.push(i + B);
  return ut;
}

/** Tåke som kan børstes bort: ikke avdekket, men ved siden av noe som er det. */
export function kanBorstes(spill, verden, i) {
  return !spill.avdekket[i] && naboer4(verden, i).some((j) => spill.avdekket[j]);
}

/** Ett børstestrøk på tåka over rute i. */
export function borst(spill, verden, i) {
  if (!kanBorstes(spill, verden, i)) return [];
  if (spill.sol <= 0) return [{ type: 'tomSol' }];
  const igjen = (spill.take.get(i) ?? TAKE_TRYKK) - 1;
  const nr = TAKE_TRYKK - 1 - igjen;
  spill.sol--;
  spill.stat.trykk++;
  const h = [];
  if (igjen <= 0) {
    spill.take.delete(i);
    spill.avdekket[i] = 1;
    spill.stat.avdekket++;
    h.push({ type: 'avdekket', i, nr, ting: tingVed(spill, verden, i) });
  } else {
    spill.take.set(i, igjen);
    h.push({ type: 'borst', i, nr, igjen });
  }
  if (spill.sol <= 0) h.push({ type: 'kveld' });
  return h;
}

// ---------------------------------------------------------------------------
// Dag og natt
// ---------------------------------------------------------------------------
/** Natta er over: ny dag, full sol, og det har vokst fram nye ting. */
export function nyDag(spill, verden) {
  const for_ = new Set();
  for (const [i, s] of spill.ting) if (s.borteTil > 0 && spill.dag < s.borteTil) for_.add(i);
  spill.dag++;
  spill.sol = SOL[spill.nivaa];
  const vokst = [...for_].filter((i) => tingVed(spill, verden, i));
  return [{ type: 'nyDag', dag: spill.dag, vokst }];
}

/** Et stjerneskudd fanget om natta. */
export function fangStjerne(spill) {
  spill.forrad.stov = (spill.forrad.stov ?? 0) + 1;
  spill.stat.stjerner++;
  return [{ type: 'stjerne' }];
}

export function byttNivaa(spill, nivaa) {
  spill.nivaa = nivaa;
  spill.sol = Math.min(spill.sol, SOL[nivaa]);
}

// ---------------------------------------------------------------------------
// Lagring: til og fra enkel JSON
// ---------------------------------------------------------------------------
export function tilData(spill) {
  const avdekket = [];
  spill.avdekket.forEach((v, i) => { if (v) avdekket.push(i); });
  return { ...spill, avdekket, take: [...spill.take], ting: [...spill.ting] };
}

export function fraData(d) {
  if (!d || d.versjon !== VERSJON) return null;
  const avdekket = new Uint8Array(OY.bredde * OY.hoyde);
  for (const i of d.avdekket) avdekket[i] = 1;
  return {
    ...d,
    avdekket,
    take: new Map(d.take),
    ting: new Map(d.ting),
    forrad: { ...Object.fromEntries(Object.keys(VARER).map((v) => [v, 0])), ...d.forrad },
    sanger: d.sanger ?? {},
    stat: { trykk: 0, ting: 0, avdekket: 0, stjerner: 0, ...d.stat },
  };
}
