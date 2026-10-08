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
  // Dagen etter: nye oppdrag, og det som ikke ble gjort, gjøres ferdig først
  const dag2 = R.nyDag(sp, ve)[0];
  sjekk(dag2.oppdrag.length === 3, 'nye oppdrag neste dag');
  const lagret = R.fraData(JSON.parse(JSON.stringify(R.tilData(sp))));
  sjekk(lagret.hjelpere.length === 3 && lagret.oppdrag.length === 3, 'hjelpere og oppdrag huskes ved lagring');
  const ubrukt = sp.stat.hjulpet;
  R.nyDag(sp, ve);
  sjekk(sp.stat.hjulpet === ubrukt + 3, 'oppdrag fra i går gjøres ferdig om morgenen');
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
  sjekk(sp.kryss.size === 10, `høyst 10 kryss samtidig (${sp.kryss.size})`);
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

const bareGange = M.lagOppgave(M.medStandard({ pluss: { paa: false }, gange: { paa: true, tak: 2 } }));
sjekk(bareGange.art === 'gange' && [bareGange.a, bareGange.b].every((x) => x <= 2 || x === 10), 'bare ganging når bare ganging er valgt');

console.log(feil ? `${feil} feil` : 'Alle tester ok');
process.exitCode = feil ? 1 : 0;
