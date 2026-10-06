// Tester for trykk-reglene. Kjør: node test/regler.test.js
import * as R from '../js/regler.js';
import { SOL, TAKE_TRYKK, UTBYTTE, GJENVEKST } from '../js/data/ting.js';

let feil = 0;
const sjekk = (ok, tekst) => { if (!ok) { feil++; console.log('FEIL:', tekst); } };

// Mange øyer: generering, start og fordeling av ting
const typer = {};
for (let seed = 1; seed <= 40; seed++) {
  const s = R.nyttSpill({ navn: 'Test', nivaa: 'stor' }, seed);
  const v = R.lagVerden(s);
  sjekk(s.avdekket[v.startIndeks] === 1, `start avdekket (seed ${seed})`);
  for (let i = 0; i < v.bredde * v.hoyde; i++) {
    const t = R.tingVed(s, v, i);
    if (t) typer[`${t.type}${t.str}`] = (typer[`${t.type}${t.str}`] ?? 0) + 1;
  }
  const synlig = [...s.avdekket].filter(Boolean).length;
  const tingSynlig = [...s.avdekket.keys()].filter((i) => s.avdekket[i] && R.tingVed(s, v, i)).length;
  sjekk(synlig >= 10, `minst 10 synlige ruter ved start (seed ${seed}: ${synlig})`);
  sjekk(tingSynlig >= 3, `minst 3 ting å trykke på ved start (seed ${seed}: ${tingSynlig})`);
}
console.log('Ting per type og størrelse (40 øyer):', typer);

// Trykk på en ting til den er ferdig
const s = R.nyttSpill({ navn: 'Test', nivaa: 'stor' }, 7);
const v = R.lagVerden(s);
const i = [...s.avdekket.keys()].find((j) => s.avdekket[j] && R.tingVed(s, v, j));
const ting = R.tingVed(s, v, i);
let siste;
for (let k = 0; k < ting.antall; k++) siste = R.trykkTing(s, v, i);
sjekk(siste.some((h) => h.type === 'ferdig'), 'tingen blir ferdig etter alle tonene');
sjekk(s.sol === SOL.stor - ting.antall, 'hvert trykk koster én solstråle');
if (ting.type !== 'kiste') sjekk(s.forrad[ting.type] === UTBYTTE[ting.str], 'riktig utbytte');
sjekk(R.tingVed(s, v, i) === null, 'ruta er tom etter høsting');
sjekk(s.sanger[siste.find((h) => h.type === 'ferdig').sang] === ting.str + 1, 'sangboka husker størrelsen');

// Gjenvekst
for (let d = 0; d < GJENVEKST; d++) R.nyDag(s, v);
if (ting.type !== 'kiste') sjekk(R.tingVed(s, v, i) !== null, 'noe nytt vokser fram etter gjenvekst');
sjekk(s.sol === SOL.stor, 'full sol etter ny dag');

// Tåka
const kant = [...s.avdekket.keys()].find((j) => R.kanBorstes(s, v, j));
for (let k = 0; k < TAKE_TRYKK - 1; k++) sjekk(R.borst(s, v, kant)[0].type === 'borst', 'børstestrøk');
sjekk(R.borst(s, v, kant)[0].type === 'avdekket', `tåka forsvinner etter ${TAKE_TRYKK} strøk`);
sjekk(s.avdekket[kant] === 1, 'ruta er avdekket');

// Sola tar slutt
s.sol = 1;
const j = [...s.avdekket.keys()].find((x) => s.avdekket[x] && R.tingVed(s, v, x));
const h = R.trykkTing(s, v, j);
sjekk(h.some((x) => x.type === 'kveld'), 'kveld når sola er brukt opp');
sjekk(R.trykkTing(s, v, j)[0].type === 'tomSol', 'ingen trykk uten sol');

// Lagring
const tilbake = R.fraData(JSON.parse(JSON.stringify(R.tilData(s))));
sjekk(tilbake.avdekket.length === s.avdekket.length && tilbake.avdekket.every((x, k) => x === s.avdekket[k]), 'avdekket lagres');
sjekk(tilbake.ting.size === s.ting.size && tilbake.dag === s.dag, 'ting og dag lagres');
sjekk(JSON.stringify(tilbake.forrad) === JSON.stringify(s.forrad), 'forrådet lagres');

console.log(feil ? `${feil} feil` : 'Alle tester ok');
process.exitCode = feil ? 1 : 0;
