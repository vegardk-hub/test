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

const bareGange = M.lagOppgave(M.medStandard({ pluss: { paa: false }, gange: { paa: true, tak: 2 } }));
sjekk(bareGange.art === 'gange' && bareGange.a <= 2, 'bare ganging når bare ganging er valgt');

console.log(feil ? `${feil} feil` : 'Alle tester ok');
process.exitCode = feil ? 1 : 0;
