// Reglene for Skatteøya – uten noe DOM, så de kan testes i Node.
//
// Øya genereres fra en seed. Spilltilstanden lagrer bare det som er endret:
// hvilke ruter som er avdekket, hvor mye tåke som er børstet bort, hvor langt man
// har kommet med hver ting, forrådet, myntene og byggene man har satt ut.
// Alle handlinger returnerer en liste hendelser som skjermen viser.

import { genererVerden } from './kartgen.js';
import { T } from './data/terreng.js';
import {
  TING, VARER, UTBYTTE, KISTE, NYFUNN, trekkvekt, METALLER, EDELSTEINER, STYKKER, STR_SJANSE, SJANSE, GJENVEKST, TAKE_TRYKK, SOL, OY, BYGG_ETTER_ID, BYGG, HAVN, BAAT, OY_STIL, OY_NAVN, OY_IKON, KRYSS, GRAV_TRYKK, MAKS_STJERNER, MAKS_PER_TYPE, MAKS_KISTER, SPAWN, HJELPER, HJELPERE, SKOLE, MUSEUM, SKATTER, OPPFINNELSER,
} from './data/ting.js';
import { tonerFor, SANGER } from './trykk/toner.js';
import { medStandard, lagOppgave, alternativer, TEGN } from './matte.js';
import { TEKSTER } from './data/kunnskap.js';
import { blandSeed, lagTilfeldig } from './rng.js';

export const VERSJON = 2;
export const TERRENGNAVN = { [T.VANN]: 'vann', [T.STRAND]: 'strand', [T.GRESS]: 'eng', [T.SKOG]: 'skog', [T.AAS]: 'aas', [T.FJELL]: 'fjell' };
const TYPE_FOR_TERRENG = { skog: 'tre', aas: 'stein', fjell: 'stein', eng: 'korn', vann: 'fisk' };
const tomtForrad = () => Object.fromEntries(Object.keys(VARER).map((v) => [v, 0]));
const tomStat = () => ({
  trykk: 0, ting: 0, avdekket: 0, stjerner: 0, bygg: 0, solgt: 0,
  klikk: 0, sekunder: 0, tjent: 0, kister: 0, gravd: 0, lyttet: 0, hjulpet: 0,
});
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
    takfarge: null,           // fargen på taket og flaggene (null = standard rød)
    hjelpere: [],             // hjelperne som har kommet (én per fem bygg, høyst fem)
    oppdrag: [],              // hjelpernes oppdrag på turen de er ute på nå: { h, i, type } som ikke er gjort ennå
    turerIgjen: 0,            // turer hjelperne har igjen i dag (etter den de er ute på)
    spawn: {},                // hvor mange ting av hver type som har dukket opp i dag (nye kommer lenger og lenger unna)
    oppfinnelser: [],         // det Theo på skolen har funnet på (kan kjøpes i butikken)
    skoleTeller: 0,           // dager med skole siden forrige idé
    ideDag: null,             // dagen Theo sist fikk en idé (lyspæra vises den dagen)
    evigDag: false,           // natta er skrudd av: ingen sol brukes, og det blir aldri kveld
    dagTeller: 0,             // trykk siden forrige stille dag (bare når natta er av)
    kreativ: false,           // kreativmodus (foreldrekontroll): alle bygg er gratis
    hort: [],                 // kunnskapstekstene læreren har lest (så de ikke kommer igjen for tidlig)
    museum: {},               // skattene man har solgt: vare → antall (de står utstilt i museet)
    kjent: [],                // slagene metaller og edelsteiner man har funnet (kistene gir mest av dem)
    nyTeller: 0,              // regnestykker løst i kister siden forrige nye slag
    nesteNy: null,            // neste nye slag og hvor mange stykker det tar: { vare, etter }
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
  fyllOpp(spill, lagVerden(spill));
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
  if (type !== 'kiste' && !s.aktiv) return null;   // høyst MAKS_PER_TYPE av hver type er ute samtidig
  if (type === 'kiste' && s.skjult) return null;   // det er fullt av kister: denne venter til det blir plass
  const gang = s.gang ?? 0;
  const u = lagTilfeldig(blandSeed(spill.seed, 'str', i, gang)).tall();
  const str = u < STR_SJANSE[0] ? 0 : u < STR_SJANSE[0] + STR_SJANSE[1] ? 1 : 2;
  // Hver ting har sin egen, tilfeldige melodi (ny for hver gang noe vokser fram). Kistene har sin faste.
  const sang = type === 'kiste' ? TING.kiste.sang
    : SANGER[Math.floor(lagTilfeldig(blandSeed(spill.seed, 'sang', i, gang)).tall() * SANGER.length)];
  const toner = tonerFor(sang, str);
  const antall = type === 'kiste' ? STYKKER[str] : toner.length;
  return {
    i, type, str, sang, seed: blandSeed(spill.seed, 'figur', i, gang),
    antall, igjen: Math.min(s.igjen ?? antall, antall), toner,
  };
}

/**
 * Høyst MAKS_PER_TYPE klikkbare ting av hver type på øya samtidig. De som er ute, blir
 * stående til de er høstet (ingenting forsvinner mens man ser på det). Når det er plass,
 * slippes en ny av typen fram – først ting man har begynt å trykke på, ellers den som ligger
 * nærmest en avstand fra leiren som øker for hver ny ting den dagen (SPAWN): om morgenen
 * nær leiren, og så lenger og lenger unna. Kister regnes ikke med.
 */
export function fyllOpp(spill, verden) {
  const B = verden.bredde, st = verden.startIndeks;
  const avst = (i) => Math.hypot(i % B - st % B, Math.floor(i / B) - Math.floor(st / B));
  const ute = {}, kandidater = {};
  spill.avdekket.forEach((v, i) => {
    if (!v || i === st || spill.bygg.has(i)) return;
    const type = grunnTing(spill, verden, i);
    if (!type || type === 'kiste') return;
    const s = spill.ting.get(i);
    if (s?.borteTil === -1 || (s?.borteTil && spill.dag < s.borteTil)) return;
    if (s?.aktiv) ute[type] = (ute[type] ?? 0) + 1;
    else (kandidater[type] ??= []).push({ i, paabegynt: s?.igjen !== undefined ? 0 : 1, d: avst(i) });
  });
  spill.spawn ??= {};
  for (const [type, liste] of Object.entries(kandidater)) {
    while ((ute[type] ?? 0) < MAKS_PER_TYPE && liste.length) {
      const maal = SPAWN.start + SPAWN.steg * (spill.spawn[type] ?? 0);
      liste.sort((a, b) => a.paabegynt - b.paabegynt || Math.abs(a.d - maal) - Math.abs(b.d - maal) || a.i - b.i);
      const k = liste.shift();
      ute[type] = (ute[type] ?? 0) + 1;
      spill.spawn[type] = (spill.spawn[type] ?? 0) + 1;
      spill.ting.set(k.i, { ...(spill.ting.get(k.i) ?? {}), aktiv: true });
    }
  }
  kistetak(spill, verden);
}

/** Hvor mange uåpnede kister som ligger framme på øya. */
function antallKister(spill, verden) {
  let n = 0;
  spill.avdekket.forEach((v, i) => { if (v && tingVed(spill, verden, i)?.type === 'kiste') n++; });
  return n;
}

/** Hvor mange kister (eller kryss) det er plass til før øya er full. */
const kisteplasser = (spill, verden) => MAKS_KISTER - antallKister(spill, verden) - spill.kryss.size;

/**
 * Aldri mer enn MAKS_KISTER kister på øya (kryssene regnes med). Kister det ikke er plass til, ligger
 * skjult og kommer fram når en annen er åpnet – nærmest leiren først. Er det for mange (gamle lagringer),
 * skjules de som ligger lengst unna, og kryss det ikke er plass til, tas bort.
 */
function kistetak(spill, verden) {
  const B = verden.bredde, st = verden.startIndeks;
  const avst = (i) => Math.hypot(i % B - st % B, Math.floor(i / B) - Math.floor(st / B));
  const synlige = [], skjulte = [];
  spill.avdekket.forEach((v, i) => {
    if (!v || spill.bygg.has(i) || grunnTing(spill, verden, i) !== 'kiste') return;
    const s = spill.ting.get(i);
    if (s?.borteTil === -1) return;
    (s?.skjult ? skjulte : synlige).push(i);
  });
  if (synlige.length > MAKS_KISTER) {
    const begynt = (i) => (spill.ting.get(i)?.igjen !== undefined || spill.ting.get(i)?.stykke ? 0 : 1);
    synlige.sort((a, b) => begynt(a) - begynt(b) || avst(a) - avst(b) || a - b);
    for (const i of synlige.splice(MAKS_KISTER)) spill.ting.set(i, { ...(spill.ting.get(i) ?? {}), skjult: true });
  }
  if (synlige.length + spill.kryss.size > MAKS_KISTER) {
    const kryss = [...spill.kryss.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => i);   // de man har gravd mest i, beholdes
    while (synlige.length + spill.kryss.size > MAKS_KISTER && kryss.length) spill.kryss.delete(kryss.pop());
  }
  skjulte.sort((a, b) => avst(a) - avst(b) || a - b);
  while (synlige.length + spill.kryss.size < MAKS_KISTER && skjulte.length) {
    const i = skjulte.shift();
    delete spill.ting.get(i).skjult;
    synlige.push(i);
  }
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

/** Er dagens sol brukt opp? Aldri når natta er skrudd av. */
const tomForSol = (spill) => !spill.evigDag && spill.sol <= 0;

/**
 * Ett trykk er brukt. Vanligvis koster det én solstråle, og når sola er brukt opp, blir det kveld.
 * Med natta skrudd av (evigDag) står sola stille og det blir aldri kveld – men dagene går
 * videre i det stille for hvert SOL-ende trykk, så ting vokser fram igjen, hjelperne går ut,
 * skattekryssene kommer og barnet på skolen får ideer.
 */
function brukSol(spill, verden, h) {
  spill.stat.trykk++;
  if (!spill.evigDag) {
    spill.sol--;
    if (spill.sol <= 0) h.push({ type: 'kveld' });
    return;
  }
  spill.dagTeller = (spill.dagTeller ?? 0) + 1;
  if (spill.dagTeller >= SOL[spill.nivaa]) {
    spill.dagTeller = 0;
    h.push({ ...nyDag(spill, verden)[0], stille: true });
  }
}

/** Skrur natta av (alltid dag) eller på igjen. Sola blir full begge veier. */
export function settEvigDag(spill, paa) {
  spill.evigDag = !!paa;
  spill.dagTeller = 0;
  spill.sol = SOL[spill.nivaa];
}

// ---------------------------------------------------------------------------
// Kistene: mest av slagene man kjenner, og innimellom et nytt slag
// ---------------------------------------------------------------------------
const ALLE_SLAG = [...METALLER, ...EDELSTEINER];

/** Bestemmer hvilket slag som blir det neste nye, og hvor mange regnestykker det tar. */
function velgNesteNy(spill) {
  const ukjent = ALLE_SLAG.filter((v) => !spill.kjent.includes(v));
  if (!ukjent.length) { spill.nesteNy = null; return; }
  const r = lagTilfeldig(blandSeed(spill.seed, 'nytt slag', spill.kjent.length, spill.stat.kister));
  const vekt = (v) => Math.pow(SJELDENHET_VEKT(v), NYFUNN.bratt);
  let x = r.tall() * ukjent.reduce((a, v) => a + vekt(v), 0), vare = ukjent[ukjent.length - 1];
  for (const v of ukjent) { x -= vekt(v); if (x < 0) { vare = v; break; } }
  const slingring = 1 + (r.tall() * 2 - 1) * NYFUNN.slingring;
  const oppstart = Math.min(1, (spill.kjent.length + 1) / NYFUNN.oppstart);
  spill.nesteNy = { vare, etter: Math.max(1, Math.round(NYFUNN.etter[VARER[vare].grad] * slingring * oppstart)) };
}
const SJELDENHET_VEKT = (v) => trekkvekt(VARER[v].grad, 0);

/**
 * Trekker én ting blant slagene man kjenner. Graden trekkes etter vektene for ALLE slagene i lista
 * (også dem man ikke har funnet), så de sjeldne gradene er like sjeldne hele veien. Kjenner man ingen
 * av den graden, blir det nærmeste lavere grad (ellers høyere). Gir null hvis man ikke kjenner noen.
 */
export function trekkKjent(r, liste, kjent, lykke = 0, minstGrad = 1) {
  const perGrad = [0, 0, 0, 0, 0, 0], kjente = [[], [], [], [], [], []];
  for (const v of liste) {
    const g = VARER[v].grad;
    if (g >= minstGrad) perGrad[g] += trekkvekt(g, lykke);
    if (kjent.includes(v)) kjente[g].push(v);
  }
  if (!kjente.some((x) => x.length)) return null;
  let x = r.tall() * perGrad.reduce((a, b) => a + b, 0), grad = 5;
  for (let g = 1; g <= 5; g++) { x -= perGrad[g]; if (x < 0) { grad = g; break; } }
  let g = grad;
  while (g > 1 && !kjente[g].length) g--;
  while (g < 5 && !kjente[g].length) g++;
  return kjente[g][Math.floor(r.tall() * kjente[g].length)];
}

/**
 * Det som ligger i en kiste av størrelse str (0–2). Hvert regnestykke man har løst, teller mot neste
 * nye slag; når det er nok, ligger det ett eksemplar av det nye slaget i kista (i stedet for én av de andre tingene).
 * Gir { gave: { vare: antall }, ny: det nye slaget eller null }.
 */
export function kisteinnhold(spill, str, r) {
  const k = KISTE[str], gave = {};
  const legg = (v) => { if (v) gave[v] = (gave[v] ?? 0) + 1; };
  if (!spill.nesteNy) velgNesteNy(spill);
  spill.nyTeller = (spill.nyTeller ?? 0) + STYKKER[str];
  let ny = null;
  // Kjenner man ingen slag ennå, kommer det første med en gang (en kiste er aldri tom).
  if (spill.nesteNy && (spill.nyTeller >= spill.nesteNy.etter || !spill.kjent.length)) {
    ny = spill.nesteNy.vare;
    spill.kjent.push(ny);
    spill.nyTeller = 0;
    velgNesteNy(spill);
    legg(ny);
  }
  const plan = [];   // hva som skal trekkes: [liste, minste grad]
  for (let n = 0; n < k.metaller; n++) plan.push([METALLER, 1]);
  for (let n = 0; n < k.steiner; n++) plan.push([EDELSTEINER, 1]);
  for (let n = 0; n < k.valgfri; n++) plan.push([r.sjanse(0.5) ? METALLER : EDELSTEINER, 1]);
  if (k.sikker) plan.push([EDELSTEINER, k.sikker]);
  // Det nye slaget tar plassen til én av tingene av samme sort (eller den første).
  if (ny) {
    const sort = METALLER.includes(ny) ? METALLER : EDELSTEINER;
    const hvor = plan.findIndex(([liste, minst]) => liste === sort && minst === 1);
    plan.splice(hvor >= 0 ? hvor : 0, 1);
  }
  for (const [liste, minst] of plan) {
    const annen = liste === METALLER ? EDELSTEINER : METALLER;
    legg(trekkKjent(r, liste, spill.kjent, k.lykke, minst) ?? trekkKjent(r, annen, spill.kjent, k.lykke));
  }
  return { gave, ny };
}

/** Tingen er ferdig: gaven deles ut, ruta står tom til noe nytt vokser fram. */
function fullfor(spill, i, ting, s) {
  const kiste = ting.type === 'kiste' ? kisteinnhold(spill, ting.str, lagTilfeldig(blandSeed(spill.seed, 'gave', i, s.gang ?? 0))) : null;
  const gave = kiste ? kiste.gave : { [ting.type]: UTBYTTE[ting.str] };
  gi(spill, gave);
  s.gang = (s.gang ?? 0) + 1;
  delete s.igjen;
  s.borteTil = ting.type === 'kiste' ? -1 : spill.dag + GJENVEKST;
  delete s.aktiv;
  spill.gravd.delete(i);   // en framgravd kiste etterlater en vanlig, tom rute
  if (ting.type === 'kiste') spill.stat.kister++;
  const sang = ting.sang;
  const for_ = spill.sanger[sang] ?? 0;
  spill.sanger[sang] = Math.max(for_, ting.str + 1);
  spill.stat.ting++;
  return { type: 'ferdig', ting, gave, ny: kiste?.ny ?? null, sang, nySang: for_ === 0, helSang: ting.str === 2 && for_ < 3 };
}

/** Ett trykk på tingen på rute i (ikke kister – de åpnes med mattestykker). */
export function trykkTing(spill, verden, i) {
  if (!spill.avdekket[i]) return [];
  const ting = tingVed(spill, verden, i);
  if (!ting || ting.type === 'kiste') return [];
  if (tomForSol(spill)) return [{ type: 'tomSol' }];
  const nr = ting.antall - ting.igjen;
  const s = spill.ting.get(i) ?? {};
  s.igjen = ting.igjen - 1;
  spill.ting.set(i, s);
  const h = [{ type: 'tone', ting, nr, tall: nr + 1, frekvens: ting.toner[nr], igjen: s.igjen }];
  if (s.igjen <= 0) { h.push(fullfor(spill, i, ting, s)); fyllOpp(spill, verden); }
  brukSol(spill, verden, h);
  return h;
}

/**
 * Uåpnede kister på den avdekkede delen av øya, de nærmeste leiren først.
 */
export function kisterPaaOya(spill, verden) {
  const B = verden.bredde, st = verden.startIndeks;
  const avst = (i) => Math.hypot(i % B - st % B, Math.floor(i / B) - Math.floor(st / B));
  const ut = [];
  spill.avdekket.forEach((v, i) => { if (v && tingVed(spill, verden, i)?.type === 'kiste') ut.push(i); });
  return ut.sort((a, b) => avst(a) - avst(b) || a - b);
}

/**
 * Regnestykket som står på kista nå. Det lages første gang kista åpnes og blir stående
 * (med de samme svaralternativene) til det er løst – også om man går ut og inn igjen.
 * Endrer foreldrene innstillingene for regnestykker, lages et nytt som passer.
 */
export function stykkeFor(spill, verden, i, forrigeTekst = '') {
  const ting = tingVed(spill, verden, i);
  if (!ting || ting.type !== 'kiste') return null;
  const s = spill.ting.get(i) ?? {};
  const sig = Object.keys(TEGN).map((a) => `${spill.foreldre[a].paa ? 1 : 0}:${spill.foreldre[a].tak}`).join('|');
  if (!s.stykke || s.stykke.sig !== sig) {
    const o = lagOppgave(spill.foreldre, forrigeTekst);
    s.stykke = { ...o, valg: alternativer(o), sig, bommet: false };
    spill.ting.set(i, s);
  }
  return s.stykke;
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
    const st = spill.ting.get(i);
    if (st?.stykke) st.stykke.bommet = true;   // huskes, så «riktig på første forsøk» ikke kan lures
    return [{ type: 'feilSvar' }];
  }
  if (tomForSol(spill)) return [{ type: 'tomSol' }];
  m.lost++;
  pa.lost++;
  if (forsteForsok) { m.forste++; pa.forste++; }
  const s = spill.ting.get(i) ?? {};
  s.igjen = ting.igjen - 1;
  delete s.stykke;   // løst: neste stykke (hvis kista har flere) lages når det trengs
  spill.ting.set(i, s);
  const h = [{ type: 'riktigSvar', ting, nr: ting.antall - ting.igjen, igjen: s.igjen }];
  if (s.igjen <= 0) { h.push(fullfor(spill, i, ting, s)); fyllOpp(spill, verden); }
  brukSol(spill, verden, h);
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
  if (kisteplasser(spill, verden) <= 0) return;   // fullt: kista kommer på en senere rute, når det er plass
  spill.kister.add(i);
  spill.kisteTeller = 0;
  spill.nesteKiste = lagTilfeldig(blandSeed(spill.seed, 'kiste', spill.kister.size)).heltall(...KISTE_HVER);
}

/** Ett børstestrøk på tåka over rute i. */
export function borst(spill, verden, i) {
  if (!kanBorstes(spill, verden, i)) return [];
  if (tomForSol(spill)) return [{ type: 'tomSol' }];
  const igjen = (spill.take.get(i) ?? TAKE_TRYKK) - 1;
  const nr = TAKE_TRYKK - 1 - igjen;
  const h = [];
  if (igjen <= 0) {
    spill.take.delete(i);
    spill.avdekket[i] = 1;
    spill.stat.avdekket++;
    kanskjeKiste(spill, verden, i);
    // Lå det en kiste under tåka, og øya er full? Da ligger den skjult til det blir plass.
    if (grunnTing(spill, verden, i) === 'kiste' && kisteplasser(spill, verden) < 0) spill.ting.set(i, { ...(spill.ting.get(i) ?? {}), skjult: true });
    fyllOpp(spill, verden);
    h.push({ type: 'avdekket', i, nr, tall: nr + 1, ting: tingVed(spill, verden, i) });
  } else {
    spill.take.set(i, igjen);
    h.push({ type: 'borst', i, nr, tall: nr + 1, igjen });
  }
  brukSol(spill, verden, h);
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
  spill.stat.tjent += sum;
  // Skattene blir ikke borte: de havner i museet.
  const tilMuseet = SKATTER.includes(vare);
  if (tilMuseet) spill.museum[vare] = (spill.museum[vare] ?? 0) + n;
  return [{ type: 'solgt', vare, antall: n, pris: VARER[vare].pris, sum, tilMuseet }];
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

/** Kan oppfinnelsen kjøpes? Når barnet på skolen har funnet den på – eller alltid i kreativmodus. */
export function harOppfinnelse(spill, id) {
  return spill.kreativ || spill.oppfinnelser.includes(id);
}

/** Prisen på et bygg (eller seilbåten) for denne spilleren: gratis i kreativmodus. */
export function prisFor(spill, id) {
  return spill.kreativ ? 0 : BYGG_ETTER_ID[id]?.pris ?? 0;
}

/** Ruta der skolen står på denne øya (eller −1). */
export function skoleVed(spill) {
  for (const [i, id] of spill.bygg) if (id === SKOLE.id) return i;
  return -1;
}

/** Ruta der museet står på denne øya (eller −1). */
export function museumVed(spill) {
  for (const [i, id] of spill.bygg) if (id === MUSEUM.id) return i;
  return -1;
}

/** Hvor mange ulike slag skatter man har i museet. */
export const slagIMuseet = (spill) => Object.values(spill.museum ?? {}).filter((n) => n > 0).length;

/** Hvor mange skatter som står i museet i alt. */
export const iMuseet = (spill) => Object.values(spill.museum ?? {}).reduce((a, b) => a + b, 0);

/** Hvor mange dager det går til neste idé (5–7, seedet). Vises ikke – det skal være en overraskelse. */
export function ideIntervall(spill) {
  return lagTilfeldig(blandSeed(spill.seed, 'idedager', spill.oppfinnelser.length)).heltall(...SKOLE.dager);
}

/** Tenker barnet på noe nytt? (Nei hvis det ikke står en skole her, eller alt er funnet på.) */
export function tenkerPaaIde(spill) {
  return skoleVed(spill) >= 0 && spill.oppfinnelser.length < OPPFINNELSER.length;
}

/** Theo finner på noe nytt: en tilfeldig (seedet) oppfinnelse han ikke har funnet på før. */
function nyIde(spill) {
  const igjen = OPPFINNELSER.filter((o) => !spill.oppfinnelser.includes(o.id));
  if (!igjen.length) return null;
  const r = lagTilfeldig(blandSeed(spill.seed, 'ide', spill.oppfinnelser.length));
  const o = igjen[Math.floor(r.tall() * igjen.length)];
  spill.oppfinnelser.push(o.id);
  spill.ideDag = spill.dag;
  return o;
}

/**
 * Neste kunnskapstekst læreren skal lese (innen et emne, eller fra alle). Tekster man ikke
 * har hørt kommer først, de letteste først; når alle er hørt, begynner emnet på nytt.
 * 🐣 Liten får nivå 1–2, 🧒 Stor alle nivåer.
 */
export function velgTekst(spill, emne = null, r = Math.random) {
  const maks = spill.nivaa === 'liten' ? 2 : 3;
  const utvalg = TEKSTER.filter((x) => x.niva <= maks && (!emne || x.emne === emne));
  let nye = utvalg.filter((x) => !spill.hort.includes(x.id));
  if (!nye.length) {
    spill.hort = spill.hort.filter((id) => !utvalg.some((x) => x.id === id));
    nye = utvalg;
  }
  const lettest = Math.min(...nye.map((x) => x.niva));
  const kandidater = nye.filter((x) => x.niva === lettest);
  const tekst = kandidater[Math.floor(r() * kandidater.length)];
  spill.hort.push(tekst.id);
  spill.stat.lyttet++;
  return tekst;
}

/** Det som skal tegnes på en byggerute (havna får en båt ved brygga når den er bygget). */
export function pyntVed(spill, i) {
  const id = spill.bygg.get(i);
  return id === HAVN.id && spill.baat ? BAAT.id : id;
}

export function kjopOgPlasser(spill, verden, i, id) {
  const b = BYGG_ETTER_ID[id];
  if (!b || id === BAAT.id) return [];
  if (id === HAVN.id && !kanKjopeHavn(spill)) return [{ type: 'laast' }];
  if (id === SKOLE.id && skoleVed(spill) >= 0) return [{ type: 'laast' }];
  if (id === MUSEUM.id && museumVed(spill) >= 0) return [{ type: 'laast' }];
  if (OPPFINNELSER.some((o) => o.id === id) && !harOppfinnelse(spill, id)) return [{ type: 'laast' }];
  const pris = prisFor(spill, id);
  if (spill.mynter < pris) return [{ type: 'forLiteMynter', mangler: pris - spill.mynter }];
  if (!kanPlassere(spill, verden, i, id)) return [{ type: 'ikkeHer' }];
  spill.mynter -= pris;
  spill.bygg.set(i, id);
  spill.stat.bygg++;
  return [{ type: 'bygget', i, id }, ...nyeHjelpere(spill)];
}

// ---------------------------------------------------------------------------
// Hjelpere: de går ut av leiren hver morgen og samler inn én ting hver
// ---------------------------------------------------------------------------
/** Hvor mange hjelpere man skal ha etter antall bygg man har satt opp. */
export const hjelpereFor = (antallBygg) => Math.min(HJELPER.maks, Math.floor(antallBygg / HJELPER.perBygg));

/** Nye hjelpere som kommer når man har bygget nok (også for spill som hadde nok bygg fra før). */
export function nyeHjelpere(spill) {
  const ut = [];
  while (spill.hjelpere.length < hjelpereFor(spill.stat.bygg)) {
    const nr = spill.hjelpere.length;
    const h = { ...HJELPERE[nr] };
    spill.hjelpere.push(h);
    ut.push({ type: 'nyHjelper', nr, hjelper: h });
  }
  return ut;
}

/**
 * Oppdragene for én tur: hver hjelper får sin egen type ting (så langt det finnes nok typer)
 * og går til den som ligger lengst unna av den typen. Ingen to hjelpere går til samme rute.
 */
export function planleggOppdrag(spill, verden) {
  spill.oppdrag = [];
  if (!spill.hjelpere.length) return [];
  const B = verden.bredde, st = verden.startIndeks;
  const avst = (i) => Math.hypot(i % B - st % B, Math.floor(i / B) - Math.floor(st / B));
  const perType = new Map();
  spill.avdekket.forEach((v, i) => {
    if (!v || i === st) return;
    const ting = tingVed(spill, verden, i);
    if (!ting || ting.type === 'kiste') return;
    if (!perType.has(ting.type)) perType.set(ting.type, []);
    perType.get(ting.type).push(i);
  });
  // Hjelperne går til den som ligger lengst unna av sin type, så barnet får ha de nærmeste i fred.
  for (const liste of perType.values()) liste.sort((a, b) => avst(b) - avst(a));
  // Typene i tilfeldig (men seedet) rekkefølge, så hjelperne bytter på hva de gjør fra dag til dag.
  const r = lagTilfeldig(blandSeed(spill.seed, 'oppdrag', spill.dag));
  const typer = [...perType.keys()].sort().map((tp) => [r.tall(), tp]).sort((a, b) => a[0] - b[0]).map(([, tp]) => tp);
  const tatt = new Set();
  spill.hjelpere.forEach((_, h) => {
    // Først en type ingen andre har fått, så hva som helst som er igjen.
    const brukt = new Set(spill.oppdrag.map((o) => o.type));
    const rekke = [...typer.filter((tp) => !brukt.has(tp)), ...typer];
    for (const type of rekke) {
      const i = perType.get(type).find((x) => !tatt.has(x));
      if (i === undefined) continue;
      tatt.add(i);
      spill.oppdrag.push({ h, i, type });
      return;
    }
  });
  return spill.oppdrag;
}

/**
 * Neste tur: når alle er hjemme fra forrige tur og det er turer igjen i dag, får hjelperne
 * nye oppdrag. Gir oppdragene (tom liste hvis de fortsatt er ute, eller er ferdige for dagen).
 */
export function nesteRunde(spill, verden) {
  if (spill.oppdrag.length || !spill.hjelpere.length || (spill.turerIgjen ?? 0) <= 0) return [];
  spill.turerIgjen--;
  return planleggOppdrag(spill, verden);
}

/** Hjelper nr. h er ferdig med oppdraget sitt: tingen høstes, og det den gir, går i forrådet. */
export function hjelperFerdig(spill, verden, h) {
  const o = spill.oppdrag.find((x) => x.h === h);
  if (!o) return [];
  spill.oppdrag = spill.oppdrag.filter((x) => x !== o);
  const ting = tingVed(spill, verden, o.i);
  if (!ting || ting.type !== o.type) return [{ type: 'fantIkke', h, i: o.i }];   // noen kom før
  const s = spill.ting.get(o.i) ?? {};
  const gave = { [ting.type]: UTBYTTE[ting.str] };
  gi(spill, gave);
  s.gang = (s.gang ?? 0) + 1;
  delete s.igjen;
  s.borteTil = spill.dag + GJENVEKST;
  delete s.aktiv;
  spill.ting.set(o.i, s);
  fyllOpp(spill, verden);
  spill.stat.hjulpet = (spill.stat.hjulpet ?? 0) + 1;
  return [{ type: 'hjelperHostet', h, i: o.i, ting, gave }];
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
  // Høyst KRYSS.maks kryss ute samtidig, og aldri flere enn at kister og kryss til sammen blir MAKS_KISTER.
  antall = Math.min(antall, KRYSS.maks - spill.kryss.size, kisteplasser(spill, verden));
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
  if (tomForSol(spill)) return [{ type: 'tomSol' }];
  const igjen = spill.kryss.get(i) - 1;
  const h = [];
  if (igjen > 0) {
    spill.kryss.set(i, igjen);
    h.push({ type: 'grav', i, tall: GRAV_TRYKK - igjen, igjen });
  } else {
    spill.kryss.delete(i);
    spill.gravd.add(i);
    const s = spill.ting.get(i) ?? {};
    spill.ting.set(i, { gang: (s.gang ?? 0) + 1 });   // ny størrelse og nytt innhold hver gang
    spill.stat.gravd++;
    h.push({ type: 'kisteFunnet', i, tall: GRAV_TRYKK, ting: tingVed(spill, verden, i) });
  }
  brukSol(spill, verden, h);
  return h;
}

/** Seilbåten bygges ved havna. */
export function byggBaat(spill) {
  if (havnVed(spill) < 0 || spill.baat) return [];
  const pris = prisFor(spill, BAAT.id);
  if (spill.mynter < pris) return [{ type: 'forLiteMynter', mangler: pris - spill.mynter }];
  spill.mynter -= pris;
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
  spill.oppdrag = [];
  spill.spawn = {};
  pakkUt(spill, { nr, fra, seed, avdekket: [], take: [], ting: [], bygg: [] });
  spill.sol = SOL[spill.nivaa];
  avdekkStart(spill);
  fyllOpp(spill, lagVerden(spill));
  return [{ type: 'seilt', ny: true, oyNr: nr, stil: lagVerden(spill).stil }];
}

/** Seil tilbake til en øy man har vært på. Alt der er som man forlot det (og ting har vokst fram igjen). */
export function seilTil(spill, nr) {
  const maal = (spill.oyer ?? []).find((o) => o.nr === nr);
  if (!spill.baat || !maal || nr === spill.oyNr) return [];
  spill.oyer = [...spill.oyer.filter((o) => o !== maal), pakkOy(spill)];
  spill.oppdrag = [];
  pakkUt(spill, maal);
  fyllOpp(spill, lagVerden(spill));
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
  // Det hjelperne ikke rakk i går (turen de var ute på, og turene de hadde igjen), gjøres ferdig nå.
  const etterslep = [];
  const gjorFerdig = () => {
    for (const o of [...spill.oppdrag]) {
      for (const e of hjelperFerdig(spill, verden, o.h)) if (e.type === 'hjelperHostet') etterslep.push(e.gave);
    }
  };
  gjorFerdig();
  while (nesteRunde(spill, verden).length) gjorFerdig();
  spill.spawn = {};   // ny dag: tingene dukker opp nær leiren igjen
  fyllOpp(spill, verden);
  const vokst = [...for_].filter((i) => tingVed(spill, verden, i));
  // Annenhver natt (før dag 3, 5, 7 …) dukker det opp nye skattekryss.
  const kryss = (spill.dag - 1) % KRYSS.hverNatt === 0 ? leggKryss(spill, verden) : [];
  // Hjelperne går HJELPER.turer turer om dagen; den første begynner nå.
  spill.turerIgjen = HJELPER.turer;
  const oppdrag = nesteRunde(spill, verden);
  // Barnet på skolen får en ny idé med 5–7 dagers mellomrom (bare på øya der skolen står).
  let ide = null;
  if (skoleVed(spill) >= 0 && spill.oppfinnelser.length < OPPFINNELSER.length) {
    spill.skoleTeller++;
    if (spill.skoleTeller >= ideIntervall(spill)) { spill.skoleTeller = 0; ide = nyIde(spill); }
  }
  return [{ type: 'nyDag', dag: spill.dag, vokst, kryss, oppdrag, ide, etterslep }];
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
    hjelpere: (d.hjelpere ?? []).slice(0, HJELPER.maks),
    oppfinnelser: d.oppfinnelser ?? [],
    skoleTeller: d.skoleTeller ?? 0,
    ideDag: d.ideDag ?? null,
    hort: d.hort ?? [],
    museum: d.museum ?? {},
    // Lagringer fra før nye slag kom litt etter litt: man kjenner det man har i forrådet eller museet.
    kjent: d.kjent ?? ALLE_SLAG.filter((v) => (d.forrad?.[v] ?? 0) > 0 || (d.museum?.[v] ?? 0) > 0),
    nyTeller: d.nyTeller ?? 0,
    nesteNy: d.nesteNy ?? null,
    kreativ: d.kreativ ?? false,
    evigDag: d.evigDag ?? false,
    dagTeller: d.dagTeller ?? 0,
    oppdrag: (d.oppdrag ?? []).filter((o) => o.h < HJELPER.maks),
    turerIgjen: d.turerIgjen ?? 0,
    spawn: d.spawn ?? {},
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
