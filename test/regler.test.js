// Tester for reglene og mattegeneratoren. Kjør: node test/regler.test.js
import * as R from '../js/regler.js';
import * as M from '../js/matte.js';
import { SOL, TAKE_TRYKK, UTBYTTE, GJENVEKST, STYKKER, BYGG, VARER, SKATTER, METALLER, EDELSTEINER, SJELDENHET, NYFUNN } from '../js/data/ting.js';
import { lagTilfeldig } from '../js/rng.js';
import * as L from '../js/trykk/toner.js';

let feil = 0;
const sjekk = (ok, tekst) => { if (!ok) { feil++; console.log('FEIL:', tekst); } };

// --- Mange øyer: generering, start og fordeling av ting ----------------------
const typer = {};
for (let seed = 1; seed <= 40; seed++) {
  const s = R.nyttSpill({ navn: 'Test', nivaa: 'stor' }, seed);
  const v = R.lagVerden(s);
  sjekk(s.avdekket[v.startIndeks] === 1, `start avdekket (seed ${seed})`);
  for (let i = 0; i < v.bredde * v.hoyde; i++) {
    const t = R.tingVed(s, v, i);
    if (t) typer[`${t.type}${t.str}`] = (typer[`${t.type}${t.str}`] ?? 0) + 1;
  }
  const tingSynlig = [...s.avdekket.keys()].filter((i) => s.avdekket[i] && R.tingVed(s, v, i)).length;
  sjekk(tingSynlig >= 3, `minst 3 ting å trykke på ved start (seed ${seed}: ${tingSynlig})`);
}
console.log('Ting per type og størrelse (40 øyer):', typer);

// --- Trykk på en ting til den er ferdig, med telling -------------------------
const s = R.nyttSpill({ navn: 'Test', nivaa: 'stor' }, 7);
const v = R.lagVerden(s);
const i = [...s.avdekket.keys()].find((j) => s.avdekket[j] && R.tingVed(s, v, j)?.type !== 'kiste' && R.tingVed(s, v, j));
const ting = R.tingVed(s, v, i);
let siste;
const tall = [];
for (let k = 0; k < ting.antall; k++) { siste = R.trykkTing(s, v, i); tall.push(siste[0].tall); }
sjekk(tall.join(',') === Array.from({ length: ting.antall }, (_, k) => k + 1).join(','), 'tellingen går 1, 2, 3 … opp til antallet');
sjekk(siste.some((h) => h.type === 'ferdig'), 'tingen blir ferdig etter alle tonene');
sjekk(s.sol === SOL.stor - ting.antall, 'hvert trykk koster én solstråle');
sjekk(s.forrad[ting.type] === UTBYTTE[ting.str], 'riktig utbytte');
sjekk(R.tingVed(s, v, i) === null, 'ruta er tom etter høsting');
for (let d = 0; d < GJENVEKST; d++) R.nyDag(s, v);
sjekk(R.venterPaa(s, v, i) === 0 && [...s.avdekket.keys()].some((x) => s.avdekket[x] && R.tingVed(s, v, x)?.type === ting.type), 'noe nytt vokser fram etter gjenvekst');

// --- Kister åpnes med mattestykker --------------------------------------------
let kisteFunnet = 0;
for (let seed = 1; seed <= 60 && kisteFunnet < 3; seed++) {
  const k = R.nyttSpill({ navn: 'K', nivaa: 'stor' }, seed);
  const kv = R.lagVerden(k);
  const ki = [...Array(kv.bredde * kv.hoyde).keys()].find((j) => R.tingVed(k, kv, j)?.type === 'kiste');
  if (ki === undefined) continue;
  kisteFunnet++;
  k.avdekket[ki] = 1;
  const kiste = R.tingVed(k, kv, ki);
  sjekk(kiste.antall === STYKKER[kiste.str], 'kista krever riktig antall stykker');
  sjekk(R.trykkTing(k, kv, ki).length === 0, 'kister kan ikke trykkes opp');
  const sol0 = k.sol;
  sjekk(R.svarKiste(k, kv, ki, { riktig: false, art: 'pluss' })[0].type === 'feilSvar', 'feil svar gir feilSvar');
  sjekk(k.sol === sol0, 'feil svar koster ingen sol');
  let h;
  for (let n = 0; n < kiste.antall; n++) h = R.svarKiste(k, kv, ki, { riktig: true, forsteForsok: n > 0, art: 'pluss' });
  const ferdig = h.find((x) => x.type === 'ferdig');
  sjekk(!!ferdig, 'kista åpnes når alle stykkene er løst');
  const verdi = Object.entries(ferdig.gave).reduce((a, [vv, n]) => a + VARER[vv].pris * n, 0);
  sjekk(verdi > 0, 'kista inneholder skatter');
  sjekk(k.mattestat.lost === kiste.antall && k.mattestat.feil === 1, 'mattestatistikken teller');
  sjekk(R.tingVed(k, kv, ki) === null && R.venterPaa(k, kv, ki) === Infinity, 'kista kommer ikke tilbake');
}
sjekk(kisteFunnet === 3, 'fant kister å teste på');

// --- Salg og kjøp ---------------------------------------------------------
s.forrad.rubin = 3;
const solgt = R.selg(s, 'rubin');
const rubiner = 3 * VARER.rubin.pris;
sjekk(solgt[0].sum === rubiner && s.mynter === rubiner && s.forrad.rubin === 0, 'salg av rubiner');
sjekk(R.selg(s, 'rubin').length === 0, 'kan ikke selge det man ikke har');
sjekk(s.museum.rubin === 3 && solgt[0].tilMuseet === true, 'rubinene man selger, havner i museet');
const tomRute = [...s.avdekket.keys()].find((j) => R.kanPlassere(s, v, j));
sjekk(tomRute !== undefined, 'det finnes en ledig rute');
sjekk(R.kjopOgPlasser(s, v, tomRute, 'borg')[0].type === 'forLiteMynter', 'for lite mynter til borgen');
sjekk(R.kjopOgPlasser(s, v, tomRute, 'telt')[0].type === 'bygget', 'kjøpte et telt');
sjekk(s.mynter === rubiner - 15 && s.bygg.get(tomRute) === 'telt', 'teltet står og myntene er trukket');
sjekk(!R.kanPlassere(s, v, tomRute), 'kan ikke bygge to ganger på samme rute');
sjekk(!R.kanPlassere(s, v, v.startIndeks), 'kan ikke bygge på leiren');
sjekk(BYGG.length === 20 && BYGG.every((b, k) => k === 0 || b.pris >= BYGG[k - 1].pris), '20 bygg, sortert etter pris');

// --- Tåka og sola ------------------------------------------------------------
const kant = [...s.avdekket.keys()].find((j) => R.kanBorstes(s, v, j));
for (let k = 0; k < TAKE_TRYKK - 1; k++) sjekk(R.borst(s, v, kant)[0].tall === k + 1, 'børstingen teller');
sjekk(R.borst(s, v, kant)[0].type === 'avdekket', `tåka forsvinner etter ${TAKE_TRYKK} strøk`);
s.sol = 1;
const j = [...s.avdekket.keys()].find((x) => s.avdekket[x] && R.tingVed(s, v, x) && R.tingVed(s, v, x).type !== 'kiste');
sjekk(R.trykkTing(s, v, j).some((x) => x.type === 'kveld'), 'kveld når sola er brukt opp');

// --- Lagring og overføring fra versjon 1 -------------------------------------
const tilbake = R.fraData(JSON.parse(JSON.stringify(R.tilData(s))));
sjekk(tilbake.bygg.get(tomRute) === 'telt' && tilbake.mynter === s.mynter, 'bygg og mynter lagres');
sjekk(tilbake.foreldre.gange.paa === true && tilbake.foreldre.pluss.paa === false, 'foreldreinnstillinger lagres');
const gammel = { ...R.tilData(R.nyttSpill({ navn: 'Gammel' }, 3)), versjon: 1, forrad: { tre: 4, skatt: 2, fro: 1, nokkel: 1 } };
delete gammel.bygg; delete gammel.mynter; delete gammel.foreldre;
const flyttet = R.fraData(JSON.parse(JSON.stringify(gammel)));
sjekk(flyttet && flyttet.forrad.gull === 2 && flyttet.forrad.tre === 4 && flyttet.bygg.size === 0 && !('skatt' in flyttet.forrad), 'versjon 1 overføres');

// --- Mattegeneratoren --------------------------------------------------------
const inn = M.medStandard({ pluss: { paa: true, tak: 10 }, minus: { paa: true, tak: 10 }, gange: { paa: true, tak: 5 }, deling: { paa: true, tak: 5 } });
let forrige = '';
const sett = { pluss: 0, minus: 0, gange: 0, deling: 0 };
for (let n = 0; n < 2000; n++) {
  const o = M.lagOppgave(inn, forrige);
  sett[o.art]++;
  sjekk(o.tekst !== forrige, 'aldri samme stykke to ganger på rad');
  forrige = o.tekst;
  if (o.art === 'pluss') sjekk(o.fasit <= 10 && o.a >= 1 && o.b >= 1, `pluss innenfor 10: ${o.tekst}`);
  if (o.art === 'minus') sjekk(o.fasit >= 1 && o.a <= 10, `minus gir minst 1: ${o.tekst}`);
  if (o.art === 'gange') sjekk([o.a, o.b].every((x) => x <= 5 || x === 10) && o.fasit === o.a * o.b, `gange opp til 5 (og med 10): ${o.tekst}`);
  if (o.art === 'deling') sjekk(o.a % o.b === 0 && o.fasit <= 5, `deling går opp: ${o.tekst}`);
  const alt = M.alternativer(o);
  sjekk(alt.length === 3 && new Set(alt).size === 3 && alt.includes(o.fasit) && alt.every((x) => x >= 0), 'tre ulike svaralternativer');
}
sjekk(Object.values(sett).every((n) => n > 300), `alle regnearter brukes: ${JSON.stringify(sett)}`);
// Kister: ca. hver femte rute man avdekker (målt over mange øyer, utover fra leiren, med uendelig sol)
let avdekket = 0, kister = 0;
for (let seed = 1; seed <= 30; seed++) {
  const sp = R.nyttSpill({ navn: 'K' }, seed);
  const ve = R.lagVerden(sp);
  for (let runde = 0; runde < 60; runde++) {
    const B = ve.bredde, st = ve.startIndeks;
    const avst = (x) => Math.hypot(x % B - st % B, Math.floor(x / B) - Math.floor(st / B));
    const kant = [...sp.avdekket.keys()].filter((x) => R.kanBorstes(sp, ve, x)).sort((a, b) => avst(a) - avst(b))[0];
    if (kant === undefined) break;
    for (let k = 0; k < TAKE_TRYKK; k++) { sp.sol = 99; R.borst(sp, ve, kant); }
    avdekket++;
    if (R.tingVed(sp, ve, kant)?.type === 'kiste') kister++;
    if (R.TERRENGNAVN[ve.terreng[kant]] === 'vann') sjekk(!sp.kister.has(kant), 'ingen nye kister i vannet');
  }
  const igjen = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(igjen.kister.size === sp.kister.size && igjen.nesteKiste === sp.nesteKiste, 'kistene huskes ved lagring');
}
const andel = kister / avdekket;
console.log(`kister: ${kister} av ${avdekket} avdekkede ruter (1 av ${(1 / andel).toFixed(1)})`);
sjekk(andel > 0.15 && andel < 0.27, `ca. hver femte rute har kiste (${andel.toFixed(2)})`);
sjekk(R.fraData({ ...R.tilData(R.nyttSpill({ navn: 'Uten' }, 4)), kister: undefined, nesteKiste: undefined }).kister.size === 0, 'gamle lagringer uten kister virker');

// Havn, båt og seiling til en ny øy
{
  const sp = R.nyttSpill({ navn: 'Seiler' }, 11);
  let ve = R.lagVerden(sp);
  sp.mynter = 5000;
  sp.forrad.rubin = 3;
  // Avdekk hele øya, så det finnes plass ved sjøen
  sp.avdekket.fill(1);
  const ledige = [...sp.avdekket.keys()].filter((x) => R.kanPlassere(sp, ve, x));
  const kyst = ledige.filter((x) => R.vedSjoen(ve, x));
  const inne = ledige.filter((x) => !R.vedSjoen(ve, x));
  sjekk(R.kjopOgPlasser(sp, ve, kyst[0], 'havn')[0].type === 'laast', 'havna er låst før alle byggene står');
  // 19 ulike bygg (og noen like) er ikke nok
  BYGG.slice(0, 19).forEach((b, k) => R.kjopOgPlasser(sp, ve, inne[k], b.id));
  R.kjopOgPlasser(sp, ve, inne[19], 'baal');
  sjekk(R.ulikeBygg(sp) === 19 && !R.havnApen(sp), 'to like bygg teller som ett');
  R.kjopOgPlasser(sp, ve, inne[20], BYGG[19].id);
  sjekk(R.ulikeBygg(sp) === 20 && R.havnApen(sp), 'havna åpnes med 20 ulike bygg');
  sjekk(R.kjopOgPlasser(sp, ve, inne[21], 'havn')[0].type === 'ikkeHer', 'havna må stå ved sjøen');
  sjekk(R.kjopOgPlasser(sp, ve, kyst[0], 'havn')[0].type === 'bygget', 'havna bygges ved sjøen');
  sjekk(!R.kanKjopeHavn(sp), 'bare én havn per øy');
  sjekk(R.seil(sp).length === 0, 'kan ikke seile uten båt');
  const for_ = sp.mynter;
  sjekk(R.byggBaat(sp)[0].type === 'baatBygget' && sp.mynter === for_ - 250, 'båten bygges ved havna');
  sjekk(R.pyntVed(sp, kyst[0]) === 'havnbaat', 'havna tegnes med båt');
  const h = R.seil(sp, 4242);
  ve = R.lagVerden(sp);
  sjekk(h[0].type === 'seilt' && sp.oyNr === 2 && ve.stil === 'neon', 'seiler til øy 2 i neonstil');
  sjekk(sp.bygg.size === 0 && sp.forrad.rubin === 3 && sp.mynter === for_ - 250 && sp.baat, 'tar med forråd, mynter og båt, ikke bygg');
  sjekk(sp.oyer.length === 1 && sp.oyer[0].bygg.length === 22, 'den gamle øya tas vare på');
  const st = ve.startIndeks;
  sjekk(R.TERRENGNAVN[ve.terreng[st]] !== 'vann' && R.vedSjoen(ve, st), 'går i land på en landrute ved sjøen');
  sjekk(sp.avdekket[st] === 1 && sp.sol === SOL.stor, 'leiren er avdekket og sola er full');
  const igjen = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(igjen.oyNr === 2 && R.lagVerden(igjen).startIndeks === st, 'den nye øya huskes ved lagring');
  // Seile tilbake
  sjekk(!R.kanSeileNy(sp) && R.kanSeileTilbake(sp), 'på øy 2: ingen havn ennå, men kan seile tilbake');
  sp.forrad.tre = 7;
  const stHer = ve.startIndeks, avdHer = sp.avdekket.reduce((a, b) => a + b, 0);
  const tilbake = R.seilTil(sp, 1);
  const v1 = R.lagVerden(sp);
  sjekk(tilbake[0]?.type === 'seilt' && !tilbake[0].ny && sp.oyNr === 1 && v1.stil === 'vanlig', 'seiler tilbake til øy 1');
  sjekk(sp.bygg.size === 22 && R.havnVed(sp) === kyst[0] && R.pyntVed(sp, kyst[0]) === 'havnbaat', 'byggene og havna med båten står der');
  sjekk(sp.forrad.tre === 7 && sp.avdekket.every((x) => x === 1), 'forrådet følger med, og øya er som før');
  sjekk(!R.kanSeileNy(sp), 'havna på øy 1 har allerede funnet en ny øy');
  sjekk(R.oyListe(sp).map((o) => `${o.nr}${o.navn}${o.her ? '*' : ''}`).join(',') === '1Skatteøya*,2Neonøya', 'sjøkartet viser begge øyene');
  R.seilTil(sp, 2);
  sjekk(sp.oyNr === 2 && R.lagVerden(sp).startIndeks === stHer && sp.avdekket.reduce((a, b) => a + b, 0) === avdHer, 'og tilbake til øy 2 igjen');
  sjekk(R.seilTil(sp, 2).length === 0 && R.seilTil(sp, 9).length === 0, 'kan ikke seile til øya man er på eller en som ikke finnes');
  // Havn på øy 2 finner øy 3
  sp.avdekket.fill(1);
  const ve2 = R.lagVerden(sp);
  const led2 = [...sp.avdekket.keys()].filter((x) => R.kanPlassere(sp, ve2, x));
  const inne2 = led2.filter((x) => !R.vedSjoen(ve2, x)), kyst2 = led2.filter((x) => R.vedSjoen(ve2, x));
  sp.mynter = 5000;
  BYGG.forEach((b, k) => R.kjopOgPlasser(sp, ve2, inne2[k], b.id));
  R.kjopOgPlasser(sp, ve2, kyst2[0], 'havn');
  sjekk(R.kanSeileNy(sp) && R.byggBaat(sp).length === 0, 'båten er med, så havna på øy 2 kan finne en ny øy');
  R.seil(sp, 999);
  sjekk(sp.oyNr === 3 && sp.oyFra === 2 && R.oyListe(sp).length === 3, 'øy 3 funnet fra øy 2');
  const lagret2 = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret2.oyer.length === 2 && R.oyListe(lagret2).length === 3, 'alle øyene huskes ved lagring');
  // Gammel lagring (fra før man kunne seile tilbake)
  const gml = R.tilData(R.nyttSpill({ navn: 'Gml' }, 5));
  const gmlOy = { ...gml, oyNr: 2, baat: false, oyer: [{ nr: 1, seed: 5, avdekket: [], take: [], ting: [], bygg: [], kister: [] }] };
  delete gmlOy.oyFra;
  const flyttet2 = R.fraData(JSON.parse(JSON.stringify(gmlOy)));
  sjekk(flyttet2.baat && flyttet2.oyFra === 1 && flyttet2.oyer[0].fra === null && R.kanSeileTilbake(flyttet2), 'gamle lagringer får båten og kan seile tilbake');

  // Kyststart på mange øyer
  for (let seed = 1; seed <= 40; seed++) {
    const v2 = R.lagVerden({ seed, oyNr: 2 });
    sjekk(R.TERRENGNAVN[v2.terreng[v2.startIndeks]] !== 'vann' && R.vedSjoen(v2, v2.startIndeks), `kyststart på øy ${seed}`);
  }
}

// Skattekryss annenhver natt, og høyst 10 stjerneskudd per natt
{
  const sp = R.nyttSpill({ navn: 'Graver' }, 21);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  for (const i of R.kisterPaaOya(sp, ve)) sp.ting.set(i, { borteTil: -1 });   // kistene er åpnet, så det er plass til kryss
  const d2 = R.nyDag(sp, ve)[0];
  sjekk(d2.dag === 2 && d2.kryss.length === 0, 'ingen kryss etter første natt');
  const d3 = R.nyDag(sp, ve)[0];
  sjekk(d3.dag === 3 && d3.kryss.length === 3 && sp.kryss.size === 3, 'tre nye kryss etter andre natt');
  sjekk(R.nyDag(sp, ve)[0].kryss.length === 0 && R.nyDag(sp, ve)[0].kryss.length === 3, 'annenhver natt');
  const k = [...sp.kryss.keys()][0];
  sjekk(R.grunnTing(sp, ve, k) === null && !R.tingVed(sp, ve, k), 'krysset står på en tom rute');
  sjekk(!R.kanPlassere(sp, ve, k), 'kan ikke bygge på et kryss');
  const tall = [];
  let funnet = null;
  for (let n = 0; n < 4; n++) for (const h of R.grav(sp, ve, k)) { tall.push(h.tall); if (h.type === 'kisteFunnet') funnet = h; }
  sjekk(tall.join(',') === '1,2,3,4' && funnet?.ting?.type === 'kiste', `fire gravetrykk gir en kiste (${tall})`);
  sjekk(!sp.kryss.has(k) && R.tingVed(sp, ve, k)?.type === 'kiste', 'krysset blir til en kiste');
  const kiste = R.tingVed(sp, ve, k);
  for (let n = 0; n < kiste.antall; n++) R.svarKiste(sp, ve, k, { riktig: true, forsteForsok: true, art: 'pluss' });
  sjekk(!R.tingVed(sp, ve, k) && R.venterPaa(sp, ve, k) === 0, 'åpnet kiste blir en vanlig tom rute igjen');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.kryss.size === sp.kryss.size && lagret.gravd.size === sp.gravd.size, 'kryss huskes ved lagring');
  // Stjerner
  let ok = 0;
  for (let n = 0; n < 15; n++) if (R.fangStjerne(sp)[0].type === 'stjerne') ok++;
  sjekk(ok === 10 && sp.forrad.stov === 10, `høyst 10 stjerner per natt (${ok})`);
  R.nyDag(sp, ve);
  sjekk(R.fangStjerne(sp)[0].type === 'stjerne', 'ny natt, nye stjerner');
}

// Ganging med 0 på alle nivåer, og med 10 også på de lavere nivåene (men aldri 6–9 der)
for (const tak of [2, 3, 4, 5, 10]) {
  const inn = M.medStandard({ pluss: { paa: false }, gange: { paa: true, tak } });
  let null_ = 0, ti = 0, feilFaktor = 0;
  for (let n = 0; n < 3000; n++) {
    const o = M.lagOppgave(inn);
    if (o.a === 0 || o.b === 0) null_++;
    if (o.a === 10 || o.b === 10) ti++;
    if ([o.a, o.b].some((x) => x > tak && x !== 10)) feilFaktor++;
    sjekk(o.fasit === o.a * o.b, `riktig fasit: ${o.tekst}`);
  }
  sjekk(null_ > 150 && null_ < 500, `gange med 0 på nivå ${tak} (${null_} av 3000)`);
  sjekk(ti > 250, `gange med 10 på nivå ${tak} (${ti} av 3000)`);
  sjekk(feilFaktor === 0, `ingen faktorer over ${tak} utenom 10 (nivå ${tak})`);
  const nullSvar = M.alternativer({ fasit: 0 });
  sjekk(nullSvar.includes(0) && new Set(nullSvar).size === 3 && nullSvar.every((x) => x >= 0), 'svaralternativer når svaret er 0');
}

// Standardinnstillinger for nye spillere
{
  const stor = R.nyttSpill({ navn: 'Stor', nivaa: 'stor' }, 1).foreldre;
  const liten = R.nyttSpill({ navn: 'Liten', nivaa: 'liten' }, 1).foreldre;
  const paa = (f) => Object.keys(M.TEGN).filter((a) => f[a].paa).join(',');
  sjekk(paa(stor) === 'gange' && stor.gange.tak === 5, `stor: bare ganging opp til 5 (${paa(stor)})`);
  sjekk(paa(liten) === 'pluss' && liten.pluss.tak === 5 && liten.svar === 'velg', `liten: bare pluss opp til 5 (${paa(liten)})`);
  for (let n = 0; n < 300; n++) {
    const o = M.lagOppgave(liten);
    sjekk(o.art === 'pluss' && o.fasit <= 5, `liten får pluss opp til 5: ${o.tekst}`);
  }
}

// Hjelpere: én per fem bygg (høyst fem), forskjellige oppdrag hver morgen
{
  const sp = R.nyttSpill({ navn: 'Sjef' }, 17);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  sp.mynter = 99999;
  const ledig = () => [...sp.avdekket.keys()].find((x) => R.kanPlassere(sp, ve, x));
  const nye = [];
  for (let n = 0; n < 4; n++) nye.push(...R.kjopOgPlasser(sp, ve, ledig(), 'baal').filter((h) => h.type === 'nyHjelper'));
  sjekk(nye.length === 0 && sp.hjelpere.length === 0, 'ingen hjelper før fem bygg');
  const femte = R.kjopOgPlasser(sp, ve, ledig(), 'telt');
  sjekk(femte[1]?.type === 'nyHjelper' && femte[1].hjelper.navn === 'Ola' && sp.hjelpere.length === 1, 'første hjelper kommer ved bygg nr. 5');
  for (let n = 0; n < 40; n++) R.kjopOgPlasser(sp, ve, ledig(), 'baal');
  sjekk(sp.hjelpere.length === 3, `høyst tre hjelpere (${sp.hjelpere.length})`);
  const for_ = { ...sp.forrad };
  const dag = R.nyDag(sp, ve)[0];
  const typer = dag.oppdrag.map((o) => o.type);
  sjekk(dag.oppdrag.length === 3, `tre oppdrag (${dag.oppdrag.length})`);
  sjekk(new Set(typer).size === 3, `tre forskjellige typer: ${typer}`);
  sjekk(new Set(dag.oppdrag.map((o) => o.i)).size === 3, 'aldri to hjelpere på samme rute');
  let hostet = 0;
  for (const o of dag.oppdrag) {
    const ting = R.tingVed(sp, ve, o.i);
    const h = R.hjelperFerdig(sp, ve, o.h)[0];
    if (h.type === 'hjelperHostet') {
      hostet++;
      sjekk(sp.forrad[o.type] === for_[o.type] + h.gave[o.type] - 0 || sp.forrad[o.type] > for_[o.type], 'det hjelperen samler, havner i forrådet');
      sjekk(!R.tingVed(sp, ve, o.i) && R.venterPaa(sp, ve, o.i) === 2 && ting.type === o.type, 'tingen er høstet og vokser fram igjen');
    }
  }
  sjekk(hostet === 3 && sp.oppdrag.length === 0, 'alle tre samlet inn én ting');
  // Fire turer om dagen: tre til, og så er de ferdige
  let turer = 1, ferdige = 3;
  const avstander = [];
  const stI = ve.startIndeks, Bx = ve.bredde;
  const avstand = (x) => Math.hypot(x % Bx - stI % Bx, Math.floor(x / Bx) - Math.floor(stI / Bx));
  avstander.push(Math.max(...dag.oppdrag.map((o) => avstand(o.i))));
  for (;;) {
    const runde = R.nesteRunde(sp, ve);
    if (!runde.length) break;
    turer++;
    avstander.push(Math.max(...runde.map((o) => avstand(o.i))));
    sjekk(R.nesteRunde(sp, ve).length === 0, 'ingen ny tur før alle er hjemme');
    for (const o of runde) if (R.hjelperFerdig(sp, ve, o.h)[0].type === 'hjelperHostet') ferdige++;
  }
  sjekk(turer === 4 && ferdige === 12, `fire turer om dagen (${turer} turer, ${ferdige} ting)`);
  sjekk(avstander.at(-1) > avstander[0] + 2, `turene går lenger og lenger ut (${avstander.map((a) => a.toFixed(1))})`);
  // Dagen etter: nye oppdrag, og det som ikke ble gjort, gjøres ferdig først
  const dag2 = R.nyDag(sp, ve)[0];
  sjekk(dag2.oppdrag.length === 3, 'nye oppdrag neste dag');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.hjelpere.length === 3 && lagret.oppdrag.length === 3, 'hjelpere og oppdrag huskes ved lagring');
  const ubrukt = sp.stat.hjulpet;
  const neste = R.nyDag(sp, ve)[0];
  sjekk(sp.stat.hjulpet === ubrukt + 12 && neste.etterslep.length === 12, `alle fire turene fra i går gjøres ferdig om morgenen (${sp.stat.hjulpet - ubrukt})`);
  const fem = R.fraData({ ...JSON.parse(JSON.stringify(R.tilData(sp))), hjelpere: [1, 2, 3, 4, 5].map((n) => ({ navn: `H${n}` })), oppdrag: [{ h: 4, i: 1, type: 'tre' }] });
  sjekk(fem.hjelpere.length === 3 && fem.oppdrag.length === 0, 'gamle lagringer med fem hjelpere får tre');
}

// Skolen: Theo finner på noe nytt hver sjette dag
{
  const sp = R.nyttSpill({ navn: 'Elev' }, 23);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  sp.mynter = 5000;
  const ledig = () => [...sp.avdekket.keys()].find((x) => R.kanPlassere(sp, ve, x));
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'drage')[0].type === 'laast', 'oppfinnelser kan ikke kjøpes før Theo har funnet dem på');
  sjekk(!R.tenkerPaaIde(sp), 'ingen ideer uten skole');
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'skole')[0].type === 'bygget' && sp.mynter === 4500, 'skolen koster 500');
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'skole')[0].type === 'laast', 'bare én skole per øy');
  let ider = [];
  const start = sp.dag;
  for (let d = 0; d < 7 && !ider.length; d++) { const h = R.nyDag(sp, ve)[0]; if (h.ide) ider.push([sp.dag, h.ide.id]); }
  sjekk(ider.length === 1 && sp.dag - start >= 5 && sp.dag - start <= 7, `første idé etter 5–7 dager (${JSON.stringify(ider)}, dag ${start})`);
  const id = ider[0][1];
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), id)[0].type === 'bygget', 'oppfinnelsen kan kjøpes når den er funnet på');
  const ideDager = [];
  for (let d = 0; d < 7 * 20; d++) { if (R.nyDag(sp, ve)[0].ide) ideDager.push(sp.dag); }
  const mellom = ideDager.slice(1).map((x, k) => x - ideDager[k]);
  sjekk(mellom.every((m) => m >= 5 && m <= 7) && new Set(mellom).size > 1, `5–7 dager mellom ideene, og det varierer (${mellom})`);
  sjekk(sp.oppfinnelser.length === 12 && new Set(sp.oppfinnelser).size === 12 && !R.tenkerPaaIde(sp), 'alle tolv blir funnet på, én gang hver');
  const pr = (await import('../js/data/ting.js')).OPPFINNELSER.map((o) => o.pris);
  sjekk(Math.min(...pr) === 20 && Math.max(...pr) === 200, 'prisene går fra 20 til 200');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.oppfinnelser.length === 12, 'oppfinnelsene huskes ved lagring');
}

// Læreren: kunnskapstekster uten gjentakelse, de letteste først
{
  const { TEKSTER } = await import('../js/data/kunnskap.js');
  const sp = R.nyttSpill({ navn: 'Lytter', nivaa: 'stor' }, 3);
  const liv = TEKSTER.filter((x) => x.emne === 'liv');
  const sett = [];
  for (let n = 0; n < liv.length; n++) sett.push(R.velgTekst(sp, 'liv'));
  sjekk(new Set(sett.map((x) => x.id)).size === liv.length && sett.every((x) => x.emne === 'liv'), 'alle tekstene i et emne før noen kommer igjen');
  sjekk(sett.map((x) => x.niva).every((n, k, a) => k === 0 || n >= a[k - 1]), 'de letteste først');
  const igjen = R.velgTekst(sp, 'liv');
  sjekk(igjen.emne === 'liv' && sp.hort.filter((id) => id.startsWith(igjen.id)).length >= 1, 'emnet begynner på nytt når alt er hørt');
  const liten = R.nyttSpill({ navn: 'Små', nivaa: 'liten' }, 3);
  for (let n = 0; n < 100; n++) sjekk(R.velgTekst(liten).niva <= 2, 'Liten får nivå 1–2');
  sjekk(TEKSTER.length > 150 && !TEKSTER.some((x) => x.emne === 'vitser'), `kunnskapstekster uten vitser (${TEKSTER.length})`);
}

// Kreativmodus: alle bygg og seilbåten er gratis
{
  const sp = R.nyttSpill({ navn: 'Tester' }, 9);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  sp.kreativ = true;
  const ledig = () => [...sp.avdekket.keys()].find((x) => R.kanPlassere(sp, ve, x));
  sjekk(R.prisFor(sp, 'borg') === 0 && R.kjopOgPlasser(sp, ve, ledig(), 'borg')[0].type === 'bygget' && sp.mynter === 0, 'borgen er gratis i kreativmodus');
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'skole')[0].type === 'bygget', 'skolen er gratis');
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'ufo')[0].type === 'bygget' && sp.oppfinnelser.length === 0, 'alle oppfinnelser er låst opp (uten å bli «funnet på»)');
  sp.kreativ = false;
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'borg')[0].type === 'forLiteMynter', 'uten kreativmodus koster det igjen');
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'drage')[0].type === 'laast', 'og oppfinnelsene er låst igjen');
  sjekk(R.fraData(JSON.parse(JSON.stringify(R.tilData({ ...sp, kreativ: true })))).kreativ === true, 'kreativmodus huskes');
}

// Tak: høyst 3 klikkbare ting av hver type, og høyst 10 skattekryss samtidig
{
  const sp = R.nyttSpill({ navn: 'Tak' }, 33);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  R.fyllOpp(sp, ve);
  const perType = () => {
    const n = {};
    sp.avdekket.forEach((_, i) => { const x = R.tingVed(sp, ve, i); if (x && x.type !== 'kiste') n[x.type] = (n[x.type] ?? 0) + 1; });
    return n;
  };
  const for_ = perType();
  sjekk(Object.values(for_).every((n) => n <= 3) && Object.keys(for_).length >= 5, `høyst 3 av hver type (${JSON.stringify(for_)})`);
  const tre = [...sp.avdekket.keys()].filter((i) => R.tingVed(sp, ve, i)?.type === 'tre');
  // Høst ett tre: et nytt kommer fram, og de to andre står der fortsatt
  const forste = R.tingVed(sp, ve, tre[0]);
  for (let k = 0; k < forste.antall; k++) { sp.sol = 50; R.trykkTing(sp, ve, tre[0]); }
  const etter = [...sp.avdekket.keys()].filter((i) => R.tingVed(sp, ve, i)?.type === 'tre');
  sjekk(etter.length === 3 && !etter.includes(tre[0]) && etter.includes(tre[1]) && etter.includes(tre[2]), 'et høstet tre erstattes av et nytt, de andre blir stående');
  // Kryss: aldri mer enn 10 ute samtidig
  for (let d = 0; d < 20; d++) R.nyDag(sp, ve);
  const kisterNaa = R.kisterPaaOya(sp, ve).length;
  sjekk(sp.kryss.size <= 10 && kisterNaa + sp.kryss.size === 10, `kister og kryss blir til sammen 10, ikke mer (${kisterNaa} kister, ${sp.kryss.size} kryss)`);
  sjekk(Object.values(perType()).every((n) => n <= 3), 'fortsatt høyst 3 av hver type etter mange dager');
  // Gamle lagringer uten «aktiv»: fyllOpp slipper fram tre av hver type
  const gml = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  for (const [, st] of gml.ting) delete st.aktiv;
  R.fyllOpp(gml, ve);
  let n = 0; gml.avdekket.forEach((_, i) => { if (R.tingVed(gml, ve, i)?.type === 'stein') n++; });
  sjekk(n === 3, `gamle lagringer får tre av hver type (${n} stein)`);
}

// Natta skrudd av: ingen sol brukes, det blir aldri kveld, og dagene går videre i det stille
{
  const sp = R.nyttSpill({ navn: 'Dag', nivaa: 'stor' }, 41);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  R.fyllOpp(sp, ve);
  R.settEvigDag(sp, true);
  const sol = sp.sol, dag = sp.dag;
  const typer = new Set();
  let trykk = 0;
  // Trykk gjennom alt som finnes, mange ganger (også store ting på over 40 trykk)
  for (let runde = 0; runde < 400 && trykk < 175; runde++) {
    const i = [...sp.avdekket.keys()].find((x) => { const tg = R.tingVed(sp, ve, x); return tg && tg.type !== 'kiste'; });
    if (i === undefined) break;
    for (const h of R.trykkTing(sp, ve, i)) typer.add(h.type);
    trykk++;
  }
  sjekk(trykk === 175, `kan trykke så mye man vil (${trykk} trykk)`);
  sjekk(sp.sol === sol && !typer.has('kveld') && !typer.has('tomSol'), 'ingen sol brukes, og det blir aldri kveld');
  sjekk(typer.has('nyDag') && sp.dag === dag + 3, `en ny dag i det stille for hvert 50. trykk (dag ${sp.dag})`);
  // En stor ting kan trykkes ferdig i ett strekk
  R.settEvigDag(sp, false);
  sjekk(sp.sol === SOL.stor && !sp.evigDag, 'natta kan skrus på igjen, med full sol');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData({ ...sp, evigDag: true }))));
  sjekk(lagret.evigDag === true, 'valget huskes ved lagring');
}

// Uåpnede kister telles, og uten sol får man ikke svart
{
  const sp = R.nyttSpill({ navn: 'Rot' }, 33);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  const kister = R.kisterPaaOya(sp, ve);
  sjekk(kister.length >= 5 && kister.every((i) => R.tingVed(sp, ve, i).type === 'kiste'), `teller uåpnede kister (${kister.length})`);
  sp.sol = 0;
  sjekk(R.svarKiste(sp, ve, kister[0], { riktig: true, forsteForsok: true, art: 'gange' })[0].type === 'tomSol', 'ingen svar uten sol');
  sp.evigDag = true;
  const k = R.tingVed(sp, ve, kister[0]);
  for (let n = 0; n < k.antall; n++) R.svarKiste(sp, ve, kister[0], { riktig: true, forsteForsok: true, art: 'gange' });
  sjekk(R.kisterPaaOya(sp, ve).length === kister.length - 1 && sp.mattestat.lost === k.antall, 'kista er borte, og stykkene telles i statistikken');
}

// Regnestykket på en kiste er det samme til det er løst
{
  const sp = R.nyttSpill({ navn: 'Fast' }, 33);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  const kiste = R.kisterPaaOya(sp, ve).find((i) => R.tingVed(sp, ve, i).antall >= 2);
  const forste = R.stykkeFor(sp, ve, kiste);
  let like = true;
  for (let n = 0; n < 30; n++) { const o = R.stykkeFor(sp, ve, kiste); if (o.tekst !== forste.tekst || o.valg.join() !== forste.valg.join()) like = false; }
  sjekk(like, `samme stykke og samme svaralternativer hver gang kista åpnes (${forste.tekst})`);
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(R.stykkeFor(lagret, ve, kiste).tekst === forste.tekst, 'stykket huskes ved lagring');
  R.svarKiste(sp, ve, kiste, { riktig: false, forsteForsok: true, art: forste.art });
  sjekk(R.stykkeFor(sp, ve, kiste).bommet === true && R.stykkeFor(sp, ve, kiste).tekst === forste.tekst, 'et feil svar huskes, og stykket står');
  R.svarKiste(sp, ve, kiste, { riktig: true, forsteForsok: false, art: forste.art });
  const neste = R.stykkeFor(sp, ve, kiste);
  sjekk(neste && neste.bommet === false && sp.ting.get(kiste).stykke === neste, 'når stykket er løst, lages det neste (og blir stående)');
  // Foreldrene bytter til bare pluss: stykket byttes til et som passer
  sp.foreldre = M.medStandard({ pluss: { paa: true, tak: 5 }, gange: { paa: false } });
  sjekk(R.stykkeFor(sp, ve, kiste).art === 'pluss', 'nye foreldreinnstillinger gir et stykke som passer');
  const annen = R.kisterPaaOya(sp, ve).find((i) => i !== kiste);
  sjekk(R.stykkeFor(sp, ve, annen) !== R.stykkeFor(sp, ve, kiste), 'hver kiste har sitt eget stykke');
}

// --- Museet: gratis, ett per øy, og samlingen følger spilleren -----------------
{
  const sp = R.nyttSpill({ navn: 'Tester' }, 12);
  let ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  const ledig = () => [...sp.avdekket.keys()].find((x) => R.kanPlassere(sp, ve, x));
  sjekk(R.museumVed(sp) < 0 && R.iMuseet(sp) === 0, 'ikke noe museum og ingen skatter ved start');
  sjekk(R.prisFor(sp, 'museum') === 0 && R.kjopOgPlasser(sp, ve, ledig(), 'museum')[0].type === 'bygget' && sp.mynter === 0, 'museet er gratis');
  sjekk(R.museumVed(sp) >= 0 && R.kjopOgPlasser(sp, ve, ledig(), 'museum')[0].type === 'laast', 'bare ett museum per øy');
  sjekk(R.ulikeBygg(sp) === 0, 'museet teller ikke som ett av de 20 byggene');
  Object.assign(sp.forrad, { gull: 3, diamant: 1, stov: 7, stein: 5 });
  for (const vare of ['gull', 'diamant', 'stov', 'stein']) R.selg(sp, vare);
  R.selg(sp, 'gull');
  sp.forrad.gull = 2;
  R.selg(sp, 'gull', 1);
  sjekk(sp.museum.gull === 4 && sp.museum.diamant === 1 && sp.museum.stov === 7 && R.iMuseet(sp) === 12, `museet teller det som er solgt (${JSON.stringify(sp.museum)})`);
  sjekk(sp.museum.stein === undefined, 'råvarer havner ikke i museet');
  sjekk(sp.forrad.gull === 1, 'det man ikke har solgt, ligger fortsatt i forrådet');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.museum.gull === 4 && R.iMuseet(lagret) === 12, 'samlingen huskes ved lagring');
  const gammel = JSON.parse(JSON.stringify(R.tilData(sp)));
  delete gammel.museum;
  sjekk(R.iMuseet(R.fraData(gammel)) === 0, 'lagringer fra før museet får et tomt museum');
  // Samlingen følger med til en ny øy (der det kan bygges et nytt museum)
  sp.bygg.set(ledig(), 'havn');
  sp.baat = true;
  sjekk(R.seil(sp, 77)[0]?.type === 'seilt' && R.iMuseet(sp) === 12 && R.museumVed(sp) < 0, 'samlingen følger med til den nye øya');
  ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  sjekk(R.kjopOgPlasser(sp, ve, ledig(), 'museum')[0].type === 'bygget', 'den nye øya kan få sitt eget museum');
}

// --- 22 metaller og 36 edelsteiner med sjeldenhetsgrad -------------------------
{
  sjekk(METALLER.length === 22 && EDELSTEINER.length === 36 && SKATTER.length === 59, `22 metaller og 36 edelsteiner (${METALLER.length} og ${EDELSTEINER.length})`);
  const alle = [...METALLER, ...EDELSTEINER];
  sjekk(alle.every((v) => VARER[v].grad >= 1 && VARER[v].grad <= 5 && VARER[v].pris > 0 && /^#[0-9a-f]{6}$/.test(VARER[v].farge)), 'alle har grad 1–5, pris og farge');
  sjekk(new Set(alle.map((v) => VARER[v].navn)).size === alle.length, 'ingen navn går igjen');
  for (const liste of [METALLER, EDELSTEINER]) {
    for (let g = 1; g <= 5; g++) sjekk(liste.some((v) => VARER[v].grad === g), `alle fem grader er med (grad ${g})`);
    for (let k = 1; k < liste.length; k++) {
      const a = VARER[liste[k - 1]], b = VARER[liste[k]];
      sjekk(a.grad < b.grad || (a.grad === b.grad && a.pris <= b.pris), `sortert fra vanlig til sjelden, og dyrere jo sjeldnere (${a.navn} → ${b.navn})`);
    }
  }
  // Trekningen blant alle slagene (når alt er funnet): jo sjeldnere, jo sjeldnere dukker tingen opp
  const r = lagTilfeldig(4242);
  for (const liste of [METALLER, EDELSTEINER]) {
    const antall = {}, N = 600000;
    for (let n = 0; n < N; n++) { const v = R.trekkKjent(r, liste, liste); antall[v] = (antall[v] ?? 0) + 1; }
    const perGrad = [0, 0, 0, 0, 0, 0], iGrad = [0, 0, 0, 0, 0, 0];
    for (const v of liste) { perGrad[VARER[v].grad] += antall[v] ?? 0; iGrad[VARER[v].grad]++; }
    const snitt = perGrad.map((n, g) => (iGrad[g] ? n / iGrad[g] / N : 0));
    sjekk(liste.every((v) => antall[v] > 0), 'alle kan dukke opp');
    for (let g = 2; g <= 5; g++) {
      sjekk(Math.abs(snitt[g] / snitt[g - 1] - 1 / 3) < 0.07, `en ting av grad ${g} dukker opp en tredel så ofte som en av grad ${g - 1} (${(snitt[g] / snitt[g - 1]).toFixed(2)})`);
      const minForrige = Math.min(...liste.filter((v) => VARER[v].grad === g - 1).map((v) => antall[v]));
      const maksDenne = Math.max(...liste.filter((v) => VARER[v].grad === g).map((v) => antall[v]));
      sjekk(maksDenne < minForrige, `hver ting av grad ${g} er sjeldnere enn alle av grad ${g - 1}`);
    }
  }
  // Man trekker bare slag man kjenner
  sjekk(R.trekkKjent(r, EDELSTEINER, []) === null, 'kjenner man ingen, trekkes ingenting');
  const bare = new Set();
  for (let n = 0; n < 5000; n++) bare.add(R.trekkKjent(r, EDELSTEINER, ['agat', 'rubin', 'kobber']));
  sjekk(bare.size === 2 && bare.has('agat') && bare.has('rubin'), `bare kjente slag trekkes (${[...bare]})`);
}

// --- Nye slag kommer litt etter litt -------------------------------------------
{
  // Spiller mange spill: åpner kister (med den vanlige blandingen av størrelser) og ser når de nye slagene kommer.
  const ALLE = METALLER.length + EDELSTEINER.length;
  const spill = 40, etter = [10, 25, 50, 100, 200, 400];   // regnestykker løst
  const slag = etter.map(() => 0), sjeldne = etter.map(() => 0), ferdigVed = [];
  let tingTotalt = 0, gamleTing = 0, verdiTidlig = [0, 0, 0], verdiSent = [0, 0, 0], nT = [0, 0, 0], nS = [0, 0, 0];
  let forsteGrad = 0, rekkefolgeGrad = [0, 0, 0, 0, 0, 0], rekkefolgeN = [0, 0, 0, 0, 0, 0];
  for (let n = 0; n < spill; n++) {
    const sp = R.nyttSpill({ navn: 'Samler' }, 500 + n);
    const r = lagTilfeldig(900 + n);
    let stykker = 0, kister = 0, neste = 0;
    while (sp.kjent.length < ALLE && stykker < 3000) {
      const x = r.tall(), str = x < 0.55 ? 0 : x < 0.85 ? 1 : 2;
      const for_ = sp.kjent.length;
      const { gave, ny } = R.kisteinnhold(sp, str, r);
      sp.stat.kister = ++kister;
      stykker += STYKKER[str];
      const antall = Object.values(gave).reduce((a, b) => a + b, 0);
      const verdi = Object.entries(gave).reduce((a, [v, k]) => a + VARER[v].pris * k, 0);
      sjekk(antall === [1, 3, 5][str], `kista har ${[1, 3, 5][str]} ting (${antall})`);
      sjekk(Object.keys(gave).every((v) => sp.kjent.includes(v)), 'alt i kista er slag man kjenner (det nye medregnet)');
      sjekk(sp.kjent.length - for_ <= 1 && (ny === null) === (sp.kjent.length === for_), 'høyst ett nytt slag per kiste');
      if (kister === 1) { sjekk(ny !== null, 'den første kista gir det første slaget'); forsteGrad += VARER[ny]?.grad ?? 0; }
      if (ny) { const plass = Math.min(5, Math.ceil(sp.kjent.length / 12)); rekkefolgeGrad[plass] += VARER[ny].grad; rekkefolgeN[plass]++; }
      tingTotalt += antall;
      gamleTing += antall - (ny ? 1 : 0);
      if (stykker <= 30) { verdiTidlig[str] += verdi; nT[str]++; }
      if (sp.kjent.length > 45) { verdiSent[str] += verdi; nS[str]++; }
      while (neste < etter.length && stykker >= etter[neste]) {
        slag[neste] += sp.kjent.length;
        sjeldne[neste] += sp.kjent.filter((v) => VARER[v].grad >= 3).length;
        neste++;
      }
    }
    ferdigVed.push(stykker);
  }
  const snitt = (x) => (x / spill).toFixed(1);
  console.log('Slag funnet etter', etter.join(', '), 'løste regnestykker:', slag.map(snitt).join(', '), '· av dem minst «sjelden»:', sjeldne.map(snitt).join(', '));
  console.log('Hele samlingen (58 slag) etter i snitt', Math.round(ferdigVed.reduce((a, b) => a + b, 0) / spill), 'regnestykker',
    `(${Math.min(...ferdigVed)}–${Math.max(...ferdigVed)})`, '· andel av tingene som er slag man hadde fra før:', `${((gamleTing / tingTotalt) * 100).toFixed(0)} %`);
  console.log('Kisteverdi (liten, stor, kjempe) de første 30 stykkene:', verdiTidlig.map((x, k) => (x / nT[k]).toFixed(0)).join(', '),
    '· når man kjenner over 45 slag:', verdiSent.map((x, k) => (x / nS[k]).toFixed(0)).join(', '));
  console.log('Snittgrad på de nye slagene, per tolv funn:', rekkefolgeGrad.slice(1).map((x, k) => (x / rekkefolgeN[k + 1]).toFixed(2)).join(', '));
  sjekk(slag[0] / spill <= 5 && slag[2] / spill <= 12, `det går sakte i starten (${snitt(slag[0])} slag etter 10 stykker, ${snitt(slag[2])} etter 50)`);
  sjekk(slag[0] / spill >= 2, 'men man får noen slag med en gang');
  sjekk(sjeldne[1] / spill < 0.5, `sjeldne slag kommer nesten aldri tidlig (${snitt(sjeldne[1])} etter 25 stykker)`);
  sjekk(ferdigVed.every((x) => x < 3000) && Math.min(...ferdigVed) > 350, 'hele samlingen tar lang tid, men man kommer i mål');
  sjekk(gamleTing / tingTotalt > 0.85, 'det meste man finner, er slag man har fra før');
  sjekk(rekkefolgeGrad[1] / rekkefolgeN[1] < rekkefolgeGrad[3] / rekkefolgeN[3] && rekkefolgeGrad[3] / rekkefolgeN[3] < rekkefolgeGrad[5] / rekkefolgeN[5], 'de vanlige kommer først og de sjeldne sist');
  // Lagring og gamle lagringer
  const sp = R.nyttSpill({ navn: 'Samler' }, 77);
  R.kisteinnhold(sp, 0, lagTilfeldig(1));
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.kjent.length === 1 && lagret.nesteNy.vare === sp.nesteNy.vare && lagret.nyTeller === sp.nyTeller, 'det man kjenner og det som kommer, huskes ved lagring');
  const gammel = JSON.parse(JSON.stringify(R.tilData(sp)));
  delete gammel.kjent; delete gammel.nesteNy; delete gammel.nyTeller;
  gammel.forrad = { ...gammel.forrad, gull: 2, rubin: 0, stov: 9 };
  gammel.museum = { safir: 1, stov: 3 };
  const fra = R.fraData(gammel);
  sjekk(fra.kjent.includes('gull') && fra.kjent.includes('safir') && !fra.kjent.includes('rubin') && !fra.kjent.includes('stov'), `gamle lagringer kjenner det de har i forrådet og museet (${fra.kjent})`);
  sjekk(NYFUNN.etter.slice(1).every((x, k, a) => k === 0 || x > a[k - 1]), 'jo sjeldnere, jo flere regnestykker til et nytt slag');
}

// --- Aldri mer enn 10 kister på øya ------------------------------------------
{
  for (const seed of [3, 21, 58]) {
    const sp = R.nyttSpill({ navn: 'Tak' }, seed);
    const ve = R.lagVerden(sp);
    sp.evigDag = true;
    let maks = 0, dager = 0;
    const tell = () => R.kisterPaaOya(sp, ve).length + sp.kryss.size;
    // Børst bort all tåka, rute for rute, med netter innimellom (så det kommer kryss)
    for (let runde = 0; runde < 60; runde++) {
      const kan = [...sp.avdekket.keys()].filter((i) => R.kanBorstes(sp, ve, i));
      if (!kan.length) break;
      for (const i of kan) {
        while (!sp.avdekket[i]) R.borst(sp, ve, i);
        maks = Math.max(maks, tell());
      }
      R.nyDag(sp, ve); R.nyDag(sp, ve); dager += 2;
      maks = Math.max(maks, tell());
    }
    const skjulte = () => [...sp.ting.values()].filter((s) => s.skjult).length;
    sjekk(sp.stat.avdekket > 500, `hele øya er avdekket (seed ${seed}: ${sp.stat.avdekket} ruter, ${dager} dager)`);
    sjekk(maks === 10, `aldri mer enn 10 kister og kryss til sammen (seed ${seed}: høyst ${maks})`);
    const skjultFor = skjulte();
    sjekk(skjultFor > 0, `kister det ikke var plass til, venter (seed ${seed}: ${skjultFor})`);
    // Grav fram alle kryssene: de blir til kister, og det er fortsatt høyst 10
    for (const i of [...sp.kryss.keys()]) while (sp.kryss.has(i)) R.grav(sp, ve, i);
    sjekk(R.kisterPaaOya(sp, ve).length === 10 && sp.kryss.size === 0, `kryssene blir til kister, fortsatt 10 (seed ${seed}: ${R.kisterPaaOya(sp, ve).length})`);
    // Åpne én kiste: en av dem som ventet, kommer fram
    const k = R.kisterPaaOya(sp, ve)[0], ting = R.tingVed(sp, ve, k);
    for (let n = 0; n < ting.antall; n++) R.svarKiste(sp, ve, k, { riktig: true, forsteForsok: true, art: 'gange' });
    sjekk(R.tingVed(sp, ve, k) === null && R.kisterPaaOya(sp, ve).length === 10 && skjulte() === skjultFor - 1, `når en kiste er åpnet, kommer en ny fram (seed ${seed})`);
    // Åpne alle: til slutt er det tomt for skjulte, og det kommer kryss igjen
    for (let n = 0; n < 400 && R.kisterPaaOya(sp, ve).length; n++) {
      const x = R.kisterPaaOya(sp, ve)[0], tx = R.tingVed(sp, ve, x);
      for (let m = 0; m < tx.antall; m++) R.svarKiste(sp, ve, x, { riktig: true, forsteForsok: true, art: 'gange' });
      maks = Math.max(maks, tell());
    }
    sjekk(skjulte() === 0 && maks === 10, `alle kistene kan åpnes til slutt (seed ${seed})`);
    R.nyDag(sp, ve); R.nyDag(sp, ve);
    sjekk(sp.kryss.size > 0 && tell() <= 10, `når det er plass, kommer det kryss igjen (seed ${seed}: ${sp.kryss.size})`);
  }
  // Gamle lagringer med flere enn 10 kister: bare de 10 nærmeste vises, resten venter
  const sp = R.nyttSpill({ navn: 'Gammel' }, 33);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  for (const i of [...sp.avdekket.keys()].filter((x) => R.kanPlassere(sp, ve, x)).slice(0, 9)) sp.kister.add(i);
  const for_ = R.kisterPaaOya(sp, ve);
  R.fyllOpp(sp, ve);
  const etter = R.kisterPaaOya(sp, ve);
  sjekk(for_.length > 10 && etter.length === 10 && etter.every((i, n) => i === for_[n]), `gamle lagringer: ${for_.length} kister blir til de 10 nærmeste`);
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(R.kisterPaaOya(lagret, ve).length === 10, 'hvilke som venter, huskes ved lagring');
}

// --- Melodiene: mange, tilfeldige, og de samles i sangboka ----------------------
{
  sjekk(L.SANGER.length >= 40, `en stor sangbok (${L.SANGER.length} melodier)`);
  sjekk(L.hertz('A4') === 440 && L.hertz('C4') === 261.63 && L.hertz('Bb3') === L.hertz('A#3'), 'tonene har riktig frekvens');
  const t = L.tolk('C4 D4, E4; F4- G4. r A4,. | B4--');
  sjekk(t.map((n) => n.v).join() === '1,0.5,0.25,2,1.5,1,0.75,3' && t[5].f === null && t.filter((n) => n.f).length === 7, 'lengder og pauser tolkes riktig');
  for (const id of L.SANGER) {
    const m = L.SANG[id];
    sjekk(m.navn && m.av && ['klassisk', 'sang'].includes(m.gruppe) && m.tempo >= 60 && m.tempo <= 300, `${id}: navn, opphav, gruppe og tempo`);
    sjekk(m.deler[0] >= 3 && m.deler[0] < m.deler[1] && m.deler[1] < m.toner.length && m.toner.length <= 60, `${id}: liten < middels < hel (${m.deler}, ${m.toner.length})`);
    sjekk(m.toner.every((f) => f > 100 && f < 2200), `${id}: tonene ligger i et hørbart område`);
    sjekk(L.tonerFor(id, 0).length === m.deler[0] && L.tonerFor(id, 1).length === m.deler[1] && L.tonerFor(id, 2).length === m.toner.length, `${id}: tonerFor gir riktig antall`);
  }
  sjekk(L.SANGER.filter((id) => L.SANG[id].gruppe === 'klassisk').length >= 20, 'minst 20 klassiske stykker');
  // Tilfeldige melodier på tingene: mange forskjellige på samme øy
  const sp = R.nyttSpill({ navn: 'Musiker' }, 12);
  const ve = R.lagVerden(sp);
  sp.avdekket.fill(1);
  sp.evigDag = true;
  R.fyllOpp(sp, ve);
  const hort = new Set();
  let forsteHendelse = null, storFerdig = null;
  for (let runde = 0; runde < 120; runde++) {
    const ruter = [...sp.avdekket.keys()].filter((i) => R.tingVed(sp, ve, i) && R.tingVed(sp, ve, i).type !== 'kiste');
    const i = ruter[runde % ruter.length], ting = R.tingVed(sp, ve, i);
    sjekk(L.SANGER.includes(ting.sang) && ting.antall === L.tonerFor(ting.sang, ting.str).length, 'tingen har en melodi fra sangboka, og like mange trykk som toner');
    const for_ = sp.sanger[ting.sang] ?? 0;
    let ferdig = null;
    for (let k = 0; k < ting.antall; k++) {
      const h = R.trykkTing(sp, ve, i);
      if (k < ting.antall - 1 || true) sjekk(h[0].frekvens === ting.toner[k], 'hvert trykk spiller neste tone i melodien');
      ferdig = h.find((e) => e.type === 'ferdig') ?? ferdig;
    }
    sjekk(ferdig && ferdig.sang === ting.sang && sp.sanger[ting.sang] === Math.max(for_, ting.str + 1), 'melodien skrives i sangboka med hvor mye man har lært');
    sjekk(ferdig.nySang === (for_ === 0) && ferdig.helSang === (ting.str === 2 && for_ < 3), 'ny melodi og hel melodi meldes riktig');
    forsteHendelse ??= ferdig;
    if (ting.str === 2) storFerdig ??= ferdig;
    hort.add(ting.sang);
  }
  sjekk(hort.size >= 25, `stor variasjon: ${hort.size} forskjellige melodier på 120 ting`);
  sjekk(forsteHendelse.nySang === true && storFerdig?.helSang === true, 'første ting gir en ny melodi, første store ting gir en hel');
  const kiste = R.kisterPaaOya(sp, ve)[0];
  sjekk(R.tingVed(sp, ve, kiste).sang === 'bursdag', 'kistene har sin faste sang');
  // Hjelperne lærer ikke bort melodier (barnet må trykke selv)
  const sp2 = R.nyttSpill({ navn: 'Hjelp' }, 5);
  const ve2 = R.lagVerden(sp2);
  sp2.avdekket.fill(1);
  sp2.stat.bygg = 15;
  R.nyeHjelpere(sp2);
  const dag = R.nyDag(sp2, ve2)[0];
  for (const o of dag.oppdrag) R.hjelperFerdig(sp2, ve2, o.h);
  sjekk(dag.oppdrag.length > 0 && Object.keys(sp2.sanger).length === 0, 'det hjelperne samler inn, gir ingen melodier i sangboka');
}

const bareGange = M.lagOppgave(M.medStandard({ pluss: { paa: false }, gange: { paa: true, tak: 2 } }));
sjekk(bareGange.art === 'gange' && [bareGange.a, bareGange.b].every((x) => x <= 2 || x === 10), 'bare ganging når bare ganging er valgt');

console.log(feil ? `${feil} feil` : 'Alle tester ok');
process.exitCode = feil ? 1 : 0;
