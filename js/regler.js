// Reglene for Skatteøya – uten noe DOM, så de kan testes i Node.
//
// Øya genereres fra en seed. Spilltilstanden lagrer bare det som er endret:
// hvilke ruter som er avdekket, hvor mye tåke som er børstet bort, hvor langt man
// har kommet med hver ting, forrådet, myntene og byggene man har satt ut.
// Alle handlinger returnerer en liste hendelser som skjermen viser.

import { genererVerden } from './kartgen.js';
import { T } from './data/terreng.js';
import {
  TING, VARER, UTBYTTE, KISTEGAVE, STYKKER, STR_SJANSE, SJANSE, GJENVEKST, TAKE_TRYKK, SOL, OY, BYGG_ETTER_ID,
} from './data/ting.js';
import { tonerFor } from './trykk/toner.js';
import { medStandard } from './matte.js';
import { blandSeed, lagTilfeldig } from './rng.js';

export const VERSJON = 2;
export const TERRENGNAVN = { [T.VANN]: 'vann', [T.STRAND]: 'strand', [T.GRESS]: 'eng', [T.SKOG]: 'skog', [T.AAS]: 'aas', [T.FJELL]: 'fjell' };
const TYPE_FOR_TERRENG = { skog: 'tre', aas: 'stein', fjell: 'stein', eng: 'korn', vann: 'fisk' };
const tomtForrad = () => Object.fromEntries(Object.keys(VARER).map((v) => [v, 0]));
const tomStat = () => ({ trykk: 0, ting: 0, avdekket: 0, stjerner: 0, bygg: 0, solgt: 0 });
const tomMattestat = () => ({ lost: 0, forste: 0, feil: 0, perArt: {} });

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

/** Foreldreinnstillinger som passer nivået, til foreldrene endrer dem. */
const foreldreFor = (nivaa) => medStandard(nivaa === 'liten'
  ? { pluss: { paa: true, tak: 10 }, svar: 'velg' }
  : { pluss: { paa: true, tak: 20 }, minus: { paa: true, tak: 20 }, svar: 'tastatur' });

export function nyttSpill({ navn, nivaa = 'stor', avatar = '🦊', foreldre = null }, seed = Math.floor(Math.random() * 2 ** 31)) {
  const spill = {
    versjon: VERSJON, navn, nivaa, avatar, seed,
    dag: 1,
    sol: SOL[nivaa],
    avdekket: new Uint8Array(OY.bredde * OY.hoyde),
    take: new Map(),          // rute → børstestrøk som gjenstår
    ting: new Map(),          // rute → { igjen, gang, borteTil }
    bygg: new Map(),          // rute → id for bygg man har satt ut
    forrad: tomtForrad(),
    mynter: 0,
    sanger: {},               // sang → største størrelse fullført (1–3)
    foreldre: foreldre ? medStandard(foreldre) : foreldreFor(nivaa),
    mattestat: tomMattestat(),
    stat: tomStat(),
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

/**
 * Tingen som står på ruta nå (eller null). For kister er «antall» antall mattestykker;
 * for alt annet antall trykk (= toner i sangen).
 */
export function tingVed(spill, verden, i) {
  if (spill.bygg.has(i)) return null;
  const type = grunnTing(spill, verden, i);
  if (!type) return null;
  const s = spill.ting.get(i) ?? {};
  if (s.borteTil === -1 || (s.borteTil && spill.dag < s.borteTil)) return null;
  const gang = s.gang ?? 0;
  const u = lagTilfeldig(blandSeed(spill.seed, 'str', i, gang)).tall();
  const str = u < STR_SJANSE[0] ? 0 : u < STR_SJANSE[0] + STR_SJANSE[1] ? 1 : 2;
  const toner = tonerFor(TING[type].sang, str);
  const antall = type === 'kiste' ? STYKKER[str] : toner.length;
  return {
    i, type, str, seed: blandSeed(spill.seed, 'figur', i, gang),
    antall, igjen: Math.min(s.igjen ?? antall, antall), toner,
  };
}

/** Er ruta høstet og venter på at noe nytt skal vokse? Gir antall dager igjen (Infinity for kister). */
export function venterPaa(spill, verden, i) {
  const s = spill.ting.get(i);
  if (spill.bygg.has(i) || !s?.borteTil || !grunnTing(spill, verden, i)) return 0;
  if (s.borteTil === -1) return Infinity;
  return Math.max(0, s.borteTil - spill.dag);
}

function gi(spill, gave) {
  for (const [v, n] of Object.entries(gave)) spill.forrad[v] = (spill.forrad[v] ?? 0) + n;
}

/** Tingen er ferdig: gaven deles ut, ruta står tom til noe nytt vokser fram. */
function fullfor(spill, i, ting, s) {
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
  return { type: 'ferdig', ting, gave, sang, nySang: ting.str === 2 && for_ < 3 };
}

/** Ett trykk på tingen på rute i (ikke kister – de åpnes med mattestykker). */
export function trykkTing(spill, verden, i) {
  if (!spill.avdekket[i]) return [];
  const ting = tingVed(spill, verden, i);
  if (!ting || ting.type === 'kiste') return [];
  if (spill.sol <= 0) return [{ type: 'tomSol' }];
  const nr = ting.antall - ting.igjen;
  const s = spill.ting.get(i) ?? {};
  s.igjen = ting.igjen - 1;
  spill.ting.set(i, s);
  spill.sol--;
  spill.stat.trykk++;
  const h = [{ type: 'tone', ting, nr, tall: nr + 1, frekvens: ting.toner[nr], igjen: s.igjen }];
  if (s.igjen <= 0) h.push(fullfor(spill, i, ting, s));
  if (spill.sol <= 0) h.push({ type: 'kveld' });
  return h;
}

/**
 * Svar på et mattestykke ved en kiste. Feil svar koster ingenting (prøv igjen).
 * Riktig svar koster én solstråle; når alle stykkene er løst, åpnes kista.
 */
export function svarKiste(spill, verden, i, { riktig, forsteForsok, art }) {
  const ting = tingVed(spill, verden, i);
  if (!ting || ting.type !== 'kiste' || !spill.avdekket[i]) return [];
  const m = spill.mattestat;
  const pa = (m.perArt[art] ??= { lost: 0, forste: 0, feil: 0 });
  if (!riktig) {
    m.feil++;
    pa.feil++;
    return [{ type: 'feilSvar' }];
  }
  if (spill.sol <= 0) return [{ type: 'tomSol' }];
  m.lost++;
  pa.lost++;
  if (forsteForsok) { m.forste++; pa.forste++; }
  const s = spill.ting.get(i) ?? {};
  s.igjen = ting.igjen - 1;
  spill.ting.set(i, s);
  spill.sol--;
  spill.stat.trykk++;
  const h = [{ type: 'riktigSvar', ting, nr: ting.antall - ting.igjen, igjen: s.igjen }];
  if (s.igjen <= 0) h.push(fullfor(spill, i, ting, s));
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
    h.push({ type: 'avdekket', i, nr, tall: nr + 1, ting: tingVed(spill, verden, i) });
  } else {
    spill.take.set(i, igjen);
    h.push({ type: 'borst', i, nr, tall: nr + 1, igjen });
  }
  if (spill.sol <= 0) h.push({ type: 'kveld' });
  return h;
}

// ---------------------------------------------------------------------------
// Butikken: selge skatter og råvarer, kjøpe bygg og sette dem ut
// ---------------------------------------------------------------------------
export function selg(spill, vare, antall = spill.forrad[vare] ?? 0) {
  const n = Math.min(antall, spill.forrad[vare] ?? 0);
  if (n <= 0 || !VARER[vare]) return [];
  const sum = n * VARER[vare].pris;
  spill.forrad[vare] -= n;
  spill.mynter += sum;
  spill.stat.solgt += n;
  return [{ type: 'solgt', vare, antall: n, pris: VARER[vare].pris, sum }];
}

/** Kan et bygg settes på rute i? Avdekket land, ikke leiren, og ingen ting eller bygg der. */
export function kanPlassere(spill, verden, i) {
  if (!spill.avdekket[i] || i === verden.startIndeks || spill.bygg.has(i)) return false;
  const terr = TERRENGNAVN[verden.terreng[i]];
  if (terr === 'vann' || verden.overlegg.get(i)?.type === 'landsby') return false;
  return !tingVed(spill, verden, i);
}

export function kjopOgPlasser(spill, verden, i, id) {
  const b = BYGG_ETTER_ID[id];
  if (!b) return [];
  if (spill.mynter < b.pris) return [{ type: 'forLiteMynter', mangler: b.pris - spill.mynter }];
  if (!kanPlassere(spill, verden, i)) return [{ type: 'ikkeHer' }];
  spill.mynter -= b.pris;
  spill.bygg.set(i, id);
  spill.stat.bygg++;
  return [{ type: 'bygget', i, id }];
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
  return { ...spill, avdekket, take: [...spill.take], ting: [...spill.ting], bygg: [...spill.bygg] };
}

/** Versjon 1 (T1) hadde frø, nøkler og «skatter» i stedet for sølv, gull og edelsteiner. */
function fraVersjon1(d) {
  const f = { ...d.forrad };
  const ut = { ...d, versjon: 2, bygg: [], mynter: 0 };
  ut.forrad = { ...f, gull: (f.skatt ?? 0), solv: (f.nokkel ?? 0) + (f.fro ?? 0) };
  delete ut.forrad.skatt;
  delete ut.forrad.nokkel;
  delete ut.forrad.fro;
  return ut;
}

export function fraData(d) {
  if (!d) return null;
  if (d.versjon === 1) d = fraVersjon1(d);
  if (d.versjon !== VERSJON) return null;
  const avdekket = new Uint8Array(OY.bredde * OY.hoyde);
  for (const i of d.avdekket) avdekket[i] = 1;
  return {
    ...d,
    avdekket,
    take: new Map(d.take),
    ting: new Map(d.ting),
    bygg: new Map(d.bygg ?? []),
    forrad: { ...tomtForrad(), ...d.forrad },
    mynter: d.mynter ?? 0,
    sanger: d.sanger ?? {},
    foreldre: d.foreldre ? medStandard(d.foreldre) : foreldreFor(d.nivaa),
    mattestat: { ...tomMattestat(), ...d.mattestat },
    stat: { ...tomStat(), ...d.stat },
  };
}
