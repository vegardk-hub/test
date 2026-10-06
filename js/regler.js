// Reglene for Skatteøya – uten noe DOM, så de kan testes i Node.
//
// Øya genereres fra en seed. Spilltilstanden lagrer bare det som er endret:
// hvilke ruter som er avdekket, hvor mye tåke som er børstet bort, hvor langt man
// har kommet med hver ting, forrådet, myntene og byggene man har satt ut.
// Alle handlinger returnerer en liste hendelser som skjermen viser.

import { genererVerden } from './kartgen.js';
import { T } from './data/terreng.js';
import {
  TING, VARER, UTBYTTE, KISTEGAVE, STYKKER, STR_SJANSE, SJANSE, GJENVEKST, TAKE_TRYKK, SOL, OY, BYGG_ETTER_ID, BYGG, HAVN, BAAT, OY_STIL, OY_NAVN, OY_IKON, KRYSS, GRAV_TRYKK, MAKS_STJERNER,
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
/** Ca. hver femte rute man avdekker skjuler en kiste (4–6 ruter mellom hver). Den første kommer fort. */
export const KISTE_HVER = [4, 6];
const FORSTE_KISTE = 3;

// ---------------------------------------------------------------------------
// Ny øy og verden
// ---------------------------------------------------------------------------
const verdenLager = new Map();

/**
 * Verdenen (terreng og overlegg) for et spill. Lages fra seeden og huskes.
 * På øy nummer 2 og videre kommer man med båt og går i land ved sjøen.
 */
export function lagVerden(spill) {
  const nr = spill.oyNr ?? 1;
  const nokkel = `${spill.seed}|${nr}`;
  if (!verdenLager.has(nokkel)) {
    const v = { ...genererVerden(spill.seed, OY) };
    if (nr > 1) v.start = kyststart(v, spill.seed);
    v.startIndeks = v.start.y * v.bredde + v.start.x;
    v.oyNr = nr;
    v.stil = OY_STIL[Math.min(nr, OY_STIL.length) - 1];
    verdenLager.set(nokkel, v);
  }
  return verdenLager.get(nokkel);
}

/** Vann som henger sammen med kanten av kartet (havet, ikke et tjern). */
function havet(v) {
  const { bredde: B, hoyde: H } = v;
  const hav = new Uint8Array(B * H);
  const ko = [];
  for (let i = 0; i < B * H; i++) {
    const x = i % B, y = Math.floor(i / B);
    if ((x === 0 || y === 0 || x === B - 1 || y === H - 1) && TERRENGNAVN[v.terreng[i]] === 'vann') { hav[i] = 1; ko.push(i); }
  }
  while (ko.length) {
    const i = ko.pop();
    for (const j of naboer4(v, i)) if (!hav[j] && TERRENGNAVN[v.terreng[j]] === 'vann') { hav[j] = 1; ko.push(j); }
  }
  return hav;
}

/** Landruta der båten legger til: ved havet, helst på stranda, med mye land rundt seg. */
function kyststart(v, seed) {
  const { bredde: B, hoyde: H } = v;
  const hav = havet(v);
  const r = lagTilfeldig(blandSeed(seed, 'kyst'));
  let best = null;
  for (let i = 0; i < B * H; i++) {
    const terr = TERRENGNAVN[v.terreng[i]];
    if (terr === 'vann' || v.overlegg.has(i) || !naboer4(v, i).some((j) => hav[j])) continue;
    const x = i % B, y = Math.floor(i / B);
    let land = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < B && yy < H && TERRENGNAVN[v.terreng[yy * B + xx]] !== 'vann') land++;
      }
    }
    const poeng = land + (terr === 'strand' ? 8 : 0) + r.tall() * 6;
    if (!best || poeng > best.poeng) best = { x, y, poeng };
  }
  return best ? { x: best.x, y: best.y } : v.start;
}

/**
 * Foreldreinnstillinger som passer nivået, til foreldrene endrer dem:
 * 🐣 Liten: bare pluss opp til 5. 🧒 Stor: bare ganging opp til 5.
 */
export const foreldreFor = (nivaa) => medStandard(nivaa === 'liten'
  ? { pluss: { paa: true, tak: 5 }, minus: { paa: false }, gange: { paa: false }, deling: { paa: false }, svar: 'velg' }
  : { pluss: { paa: false }, minus: { paa: false }, gange: { paa: true, tak: 5 }, deling: { paa: false }, svar: 'tastatur' });

export function nyttSpill({ navn, nivaa = 'stor', avatar = '🦊', foreldre = null }, seed = Math.floor(Math.random() * 2 ** 31)) {
  const spill = {
    versjon: VERSJON, navn, nivaa, avatar, seed,
    dag: 1,
    sol: SOL[nivaa],
    avdekket: new Uint8Array(OY.bredde * OY.hoyde),
    take: new Map(),          // rute → børstestrøk som gjenstår
    ting: new Map(),          // rute → { igjen, gang, borteTil }
    bygg: new Map(),          // rute → id for bygg man har satt ut
    oyNr: 1,                  // øya man er på (1, 2, 3 …)
    oyFra: null,              // øya man fant denne fra (havna der man seilte ut)
    oyer: [],                 // de andre øyene man har vært på (pakket som data)
    baat: false,              // har man en seilbåt? (den følger med fra øy til øy)
    kister: new Set(),        // ruter der det har dukket opp en kiste da tåka ble børstet bort
    kryss: new Map(),         // skattekryss: rute → gravetrykk som gjenstår
    gravd: new Set(),         // ruter med en kiste man har gravd fram (blir tomme igjen når den er åpnet)
    nattFangst: 0,            // stjerneskudd fanget i natt
    kisteTeller: 0,           // avdekkede ruter siden forrige kiste
    nesteKiste: FORSTE_KISTE,
    forrad: tomtForrad(),
    mynter: 0,
    sanger: {},               // sang → største størrelse fullført (1–3)
    foreldre: foreldre ? medStandard(foreldre) : foreldreFor(nivaa),
    mattestat: tomMattestat(),
    stat: tomStat(),
  };
  avdekkStart(spill);
  return spill;
}

/** Leiren og rutene rett rundt den er kjent fra starten. */
function avdekkStart(spill) {
  const verden = lagVerden(spill);
  const { x: sx, y: sy } = verden.start;
  for (let y = sy - 2; y <= sy + 2; y++) {
    for (let x = sx - 2; x <= sx + 2; x++) {
      if (x < 0 || y < 0 || x >= verden.bredde || y >= verden.hoyde) continue;
      if (Math.abs(x - sx) + Math.abs(y - sy) <= 3) spill.avdekket[y * verden.bredde + x] = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Ting på rutene
// ---------------------------------------------------------------------------
/** Hvilken type ting som kan vokse på ruta, eller null. Bestemt av seeden. */
export function grunnTing(spill, verden, i) {
  if (i === verden.startIndeks) return null;
  if (spill.kister.has(i) || spill.gravd.has(i)) return 'kiste';
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
  spill.gravd.delete(i);   // en framgravd kiste etterlater en vanlig, tom rute
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

/** Kan det dukke opp en kiste her? Land uten leir, landsby, dyr eller bygg. */
function kisteplass(spill, verden, i) {
  if (i === verden.startIndeks || spill.bygg.has(i)) return false;
  if (TERRENGNAVN[verden.terreng[i]] === 'vann') return false;
  const o = verden.overlegg.get(i);
  return o?.type !== 'landsby' && o?.type !== 'dyr';
}

/** Ruta er nettopp avdekket: tell, og legg en kiste her når det er på tide. */
function kanskjeKiste(spill, verden, i) {
  if (grunnTing(spill, verden, i) === 'kiste') { spill.kisteTeller = 0; return; }
  spill.kisteTeller++;
  if (spill.kisteTeller < spill.nesteKiste || !kisteplass(spill, verden, i)) return;
  spill.kister.add(i);
  spill.kisteTeller = 0;
  spill.nesteKiste = lagTilfeldig(blandSeed(spill.seed, 'kiste', spill.kister.size)).heltall(...KISTE_HVER);
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
    kanskjeKiste(spill, verden, i);
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

/** Kan et bygg settes på rute i? Avdekket land, ikke leiren, og ingen ting eller bygg der. Havna må stå ved sjøen. */
export function kanPlassere(spill, verden, i, id = null) {
  if (!spill.avdekket[i] || i === verden.startIndeks || spill.bygg.has(i)) return false;
  const terr = TERRENGNAVN[verden.terreng[i]];
  if (terr === 'vann' || verden.overlegg.get(i)?.type === 'landsby') return false;
  if (id === HAVN.id && !vedSjoen(verden, i)) return false;
  if (spill.kryss.has(i)) return false;
  return !tingVed(spill, verden, i);
}

/** Ligger ruta inntil vannet? */
export function vedSjoen(verden, i) {
  return naboer4(verden, i).some((j) => TERRENGNAVN[verden.terreng[j]] === 'vann');
}

/** Hvor mange av de 20 ulike byggene står på øya? */
export function ulikeBygg(spill) {
  const ider = new Set(BYGG.map((b) => b.id));
  return new Set([...spill.bygg.values()].filter((id) => ider.has(id))).size;
}

/** Ruta der havna står (eller -1). */
export function havnVed(spill) {
  for (const [i, id] of spill.bygg) if (id === HAVN.id) return i;
  return -1;
}

/** Havna kan kjøpes når alle de ulike byggene står på øya, og det ikke står en havn der fra før. */
export const havnApen = (spill) => ulikeBygg(spill) >= HAVN.krav;
export const kanKjopeHavn = (spill) => havnApen(spill) && havnVed(spill) < 0;

/** Det som skal tegnes på en byggerute (havna får en båt ved brygga når den er bygget). */
export function pyntVed(spill, i) {
  const id = spill.bygg.get(i);
  return id === HAVN.id && spill.baat ? BAAT.id : id;
}

export function kjopOgPlasser(spill, verden, i, id) {
  const b = BYGG_ETTER_ID[id];
  if (!b || id === BAAT.id) return [];
  if (id === HAVN.id && !kanKjopeHavn(spill)) return [{ type: 'laast' }];
  if (spill.mynter < b.pris) return [{ type: 'forLiteMynter', mangler: b.pris - spill.mynter }];
  if (!kanPlassere(spill, verden, i, id)) return [{ type: 'ikkeHer' }];
  spill.mynter -= b.pris;
  spill.bygg.set(i, id);
  spill.stat.bygg++;
  return [{ type: 'bygget', i, id }];
}

// ---------------------------------------------------------------------------
// Skattekryss: nye kister man graver fram
// ---------------------------------------------------------------------------
/** Kan det komme et skattekryss her? Avdekket, tom landrute uten noe som kan vokse. */
function kryssplass(spill, verden, i) {
  if (!spill.avdekket[i] || i === verden.startIndeks || spill.bygg.has(i) || spill.kryss.has(i)) return false;
  if (TERRENGNAVN[verden.terreng[i]] === 'vann' || verden.overlegg.has(i)) return false;
  return grunnTing(spill, verden, i) === null;
}

/** Legger ut nye skattekryss (seedet etter dagen). Gir rutene. */
export function leggKryss(spill, verden, antall = KRYSS.perGang) {
  const r = lagTilfeldig(blandSeed(spill.seed, 'kryss', spill.dag));
  const ledige = [...spill.avdekket.keys()].filter((i) => kryssplass(spill, verden, i));
  const ut = [];
  while (ut.length < antall && ledige.length) {
    const i = ledige.splice(Math.floor(r.tall() * ledige.length), 1)[0];
    spill.kryss.set(i, GRAV_TRYKK);
    ut.push(i);
  }
  return ut;
}

/** Ett gravetrykk på et skattekryss. Etter GRAV_TRYKK trykk kommer det fram en kiste. */
export function grav(spill, verden, i) {
  if (!spill.kryss.has(i)) return [];
  if (spill.sol <= 0) return [{ type: 'tomSol' }];
  const igjen = spill.kryss.get(i) - 1;
  spill.sol--;
  spill.stat.trykk++;
  const h = [];
  if (igjen > 0) {
    spill.kryss.set(i, igjen);
    h.push({ type: 'grav', i, tall: GRAV_TRYKK - igjen, igjen });
  } else {
    spill.kryss.delete(i);
    spill.gravd.add(i);
    const s = spill.ting.get(i) ?? {};
    spill.ting.set(i, { gang: (s.gang ?? 0) + 1 });   // ny størrelse og nytt innhold hver gang
    h.push({ type: 'kisteFunnet', i, tall: GRAV_TRYKK, ting: tingVed(spill, verden, i) });
  }
  if (spill.sol <= 0) h.push({ type: 'kveld' });
  return h;
}

/** Seilbåten bygges ved havna. */
export function byggBaat(spill) {
  if (havnVed(spill) < 0 || spill.baat) return [];
  if (spill.mynter < BAAT.pris) return [{ type: 'forLiteMynter', mangler: BAAT.pris - spill.mynter }];
  spill.mynter -= BAAT.pris;
  spill.baat = true;
  return [{ type: 'baatBygget' }];
}

// ---------------------------------------------------------------------------
// Øyene: seil til en ny øy, eller tilbake til en man har vært på
// ---------------------------------------------------------------------------
/** Øya man står på, pakket som enkel data (så den kan legges i spill.oyer). */
function pakkOy(spill) {
  const avdekket = [];
  spill.avdekket.forEach((v, i) => { if (v) avdekket.push(i); });
  return {
    nr: spill.oyNr, fra: spill.oyFra ?? null, seed: spill.seed, forlot: spill.dag, avdekket,
    take: [...spill.take], ting: [...spill.ting], bygg: [...spill.bygg], kister: [...spill.kister],
    kryss: [...spill.kryss], gravd: [...spill.gravd], kisteTeller: spill.kisteTeller, nesteKiste: spill.nesteKiste,
  };
}

/** Pakker ut en øy og gjør den til den man står på. */
function pakkUt(spill, d) {
  spill.oyNr = d.nr;
  spill.oyFra = d.fra ?? null;
  spill.seed = d.seed;
  spill.avdekket = new Uint8Array(OY.bredde * OY.hoyde);
  for (const i of d.avdekket) spill.avdekket[i] = 1;
  spill.take = new Map(d.take);
  spill.ting = new Map(d.ting);
  spill.bygg = new Map(d.bygg);
  spill.kister = new Set(d.kister ?? []);
  spill.kryss = new Map(d.kryss ?? []);
  spill.gravd = new Set(d.gravd ?? []);
  spill.kisteTeller = d.kisteTeller ?? 0;
  spill.nesteKiste = d.nesteKiste ?? FORSTE_KISTE;
}

const stilFor = (nr) => OY_STIL[Math.min(nr, OY_STIL.length) - 1];

/** Alle øyene man har funnet, med navn og stil, sortert etter nummer. her = øya man står på. */
export function oyListe(spill) {
  const alle = [{ nr: spill.oyNr, fra: spill.oyFra ?? null, bygg: spill.bygg.size, her: true },
    ...(spill.oyer ?? []).map((o) => ({ nr: o.nr, fra: o.fra ?? null, bygg: o.bygg.length, her: false, forlot: o.forlot }))];
  const antallMedStil = {};
  return alle.sort((a, b) => a.nr - b.nr).map((o) => {
    const stil = stilFor(o.nr);
    antallMedStil[stil] = (antallMedStil[stil] ?? 0) + 1;
    const n = antallMedStil[stil];
    return { ...o, stil, navn: `${OY_NAVN[stil]}${n > 1 ? ` ${n}` : ''}`, ikon: OY_IKON[stil] };
  });
}

/** Er det en havn med båt her, som ikke har funnet en ny øy ennå? (Hver havn finner én ny øy.) */
export function kanSeileNy(spill) {
  if (!spill.baat || havnVed(spill) < 0) return false;
  return !(spill.oyer ?? []).some((o) => o.fra === spill.oyNr);
}

/** Kan man seile tilbake til en øy man har vært på? */
export const kanSeileTilbake = (spill) => spill.baat && (spill.oyer ?? []).length > 0;

/**
 * Seil til en ny øy. Øya man står på legges i spill.oyer, og man tar med seg
 * forrådet, myntene og båten. Den nye øya lages fra en ny seed, og man går i land ved sjøen.
 */
export function seil(spill, seed = Math.floor(Math.random() * 2 ** 31)) {
  if (!kanSeileNy(spill)) return [];
  const fra = spill.oyNr;
  const nr = Math.max(spill.oyNr, ...(spill.oyer ?? []).map((o) => o.nr)) + 1;
  spill.oyer = [...(spill.oyer ?? []), pakkOy(spill)];
  pakkUt(spill, { nr, fra, seed, avdekket: [], take: [], ting: [], bygg: [] });
  spill.sol = SOL[spill.nivaa];
  avdekkStart(spill);
  return [{ type: 'seilt', ny: true, oyNr: nr, stil: lagVerden(spill).stil }];
}

/** Seil tilbake til en øy man har vært på. Alt der er som man forlot det (og ting har vokst fram igjen). */
export function seilTil(spill, nr) {
  const maal = (spill.oyer ?? []).find((o) => o.nr === nr);
  if (!spill.baat || !maal || nr === spill.oyNr) return [];
  spill.oyer = [...spill.oyer.filter((o) => o !== maal), pakkOy(spill)];
  pakkUt(spill, maal);
  return [{ type: 'seilt', ny: false, oyNr: nr, stil: lagVerden(spill).stil }];
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
  spill.nattFangst = 0;
  const vokst = [...for_].filter((i) => tingVed(spill, verden, i));
  // Annenhver natt (før dag 3, 5, 7 …) dukker det opp nye skattekryss.
  const kryss = (spill.dag - 1) % KRYSS.hverNatt === 0 ? leggKryss(spill, verden) : [];
  return [{ type: 'nyDag', dag: spill.dag, vokst, kryss }];
}

/** Et stjerneskudd fanget om natta. */
export function fangStjerne(spill) {
  if (spill.nattFangst >= MAKS_STJERNER) return [{ type: 'fullNatt' }];
  spill.nattFangst++;
  spill.forrad.stov = (spill.forrad.stov ?? 0) + 1;
  spill.stat.stjerner++;
  const h = [{ type: 'stjerne', fanget: spill.nattFangst, maks: MAKS_STJERNER }];
  if (spill.nattFangst >= MAKS_STJERNER) h.push({ type: 'fullNatt' });
  return h;
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
  return {
    ...spill, avdekket, take: [...spill.take], ting: [...spill.ting], bygg: [...spill.bygg], kister: [...spill.kister],
    kryss: [...spill.kryss], gravd: [...spill.gravd],
  };
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
    oyNr: d.oyNr ?? 1,
    // Fra før man kunne seile tilbake: øy nr. n ble funnet fra øy n − 1, og den som har seilt, har en båt.
    oyFra: d.oyFra ?? ((d.oyNr ?? 1) > 1 ? d.oyNr - 1 : null),
    oyer: (d.oyer ?? []).map((o) => ({ ...o, fra: o.fra !== undefined ? o.fra : (o.nr > 1 ? o.nr - 1 : null) })),
    baat: d.baat || (d.oyer ?? []).length > 0,
    kister: new Set(d.kister ?? []),
    kryss: new Map(d.kryss ?? []),
    gravd: new Set(d.gravd ?? []),
    nattFangst: d.nattFangst ?? 0,
    kisteTeller: d.kisteTeller ?? 0,
    nesteKiste: d.nesteKiste ?? FORSTE_KISTE,
    forrad: { ...tomtForrad(), ...d.forrad },
    mynter: d.mynter ?? 0,
    sanger: d.sanger ?? {},
    foreldre: d.foreldre ? medStandard(d.foreldre) : foreldreFor(d.nivaa),
    mattestat: { ...tomMattestat(), ...d.mattestat },
    stat: { ...tomStat(), ...d.stat },
  };
}
