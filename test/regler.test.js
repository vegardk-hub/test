// Tester for reglene og mattegeneratoren. Kjør: node test/regler.test.js
import * as R from '../js/regler.js';
import * as M from '../js/matte.js';
import { SOL, TAKE_TRYKK, UTBYTTE, GJENVEKST, STYKKER, BYGG, VARER } from '../js/data/ting.js';

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
sjekk(R.tingVed(s, v, i) !== null, 'noe nytt vokser fram etter gjenvekst');

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
sjekk(solgt[0].sum === 3 * VARER.rubin.pris && s.mynter === 75 && s.forrad.rubin === 0, 'salg av rubiner');
sjekk(R.selg(s, 'rubin').length === 0, 'kan ikke selge det man ikke har');
const tomRute = [...s.avdekket.keys()].find((j) => R.kanPlassere(s, v, j));
sjekk(tomRute !== undefined, 'det finnes en ledig rute');
sjekk(R.kjopOgPlasser(s, v, tomRute, 'borg')[0].type === 'forLiteMynter', 'for lite mynter til borgen');
sjekk(R.kjopOgPlasser(s, v, tomRute, 'telt')[0].type === 'bygget', 'kjøpte et telt');
sjekk(s.mynter === 75 - 15 && s.bygg.get(tomRute) === 'telt', 'teltet står og myntene er trukket');
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
sjekk(tilbake.foreldre.pluss.paa === true, 'foreldreinnstillinger lagres');
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
  if (o.art === 'gange') sjekk(o.a <= 5 && o.b <= 5 && o.fasit === o.a * o.b, `gange opp til 5: ${o.tekst}`);
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

const bareGange = M.lagOppgave(M.medStandard({ pluss: { paa: false }, gange: { paa: true, tak: 2 } }));
sjekk(bareGange.art === 'gange' && bareGange.a <= 2, 'bare ganging når bare ganging er valgt');

console.log(feil ? `${feil} feil` : 'Alle tester ok');
process.exitCode = feil ? 1 : 0;
