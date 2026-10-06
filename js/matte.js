// Mattestykker til skattekistene. Ren logikk uten DOM (bygget på matte.js fra HEX).
// Foreldrene velger regnearter og hvor store tallene kan være; generatoren lager
// stykker innenfor det, og aldri det samme stykket to ganger på rad.

export const TEGN = { pluss: '+', minus: '−', gange: '×', deling: ':' };   // ekte minustegn

/** Standardinnstillinger. tak = største tall (pluss/minus) eller største faktor (gange/deling). */
export const STANDARD = {
  pluss: { paa: true, tak: 10 },
  minus: { paa: false, tak: 10 },
  gange: { paa: false, tak: 5 },
  deling: { paa: false, tak: 5 },
  svar: 'velg',        // 'velg' = tre svar å velge mellom, 'tastatur' = skriv svaret
  visTall: true,       // tallene vises når man trykker på ting
  lesOpp: false,       // tallene leses høyt
};

/** Hurtigvalg for foreldrene (alderstrinnene fra HEX). */
export const FORHANDSVALG = {
  '4-5': { navn: '4–5 år', pluss: { paa: true, tak: 10 }, minus: { paa: true, tak: 5 }, gange: { paa: false, tak: 2 }, deling: { paa: false, tak: 2 }, svar: 'velg' },
  '6-8': { navn: '6–8 år', pluss: { paa: true, tak: 20 }, minus: { paa: true, tak: 20 }, gange: { paa: false, tak: 5 }, deling: { paa: false, tak: 5 }, svar: 'tastatur' },
  '9-10': { navn: '9–10 år', pluss: { paa: true, tak: 100 }, minus: { paa: true, tak: 100 }, gange: { paa: true, tak: 10 }, deling: { paa: true, tak: 10 }, svar: 'tastatur' },
};

export const TAK_VALG = { pluss: [5, 10, 20, 50, 100], minus: [5, 10, 20, 50, 100], gange: [2, 3, 4, 5, 10], deling: [2, 3, 4, 5, 10] };
export const ARTNAVN = { pluss: 'Pluss', minus: 'Minus', gange: 'Gange', deling: 'Deling' };

const heltall = (r, min, max) => min + Math.floor(r() * (max - min + 1));

/** Andelen gangestykker med 0, og med 10 når taket er lavere enn 10. */
export const GANGE_NULL = 0.1;
export const GANGE_TI = 0.15;

function lag(art, tak, r) {
  if (art === 'pluss') {
    // Bygges fra svaret og ned, så summen aldri går over taket.
    const sum = heltall(r, 2, Math.max(2, tak));
    const a = heltall(r, 1, sum - 1);
    return { a, b: sum - a, fasit: sum };
  }
  if (art === 'minus') {
    // Svaret blir aldri 0 eller mindre – det forvirrer de yngste mer enn det lærer bort.
    const a = heltall(r, 2, Math.max(2, tak));
    const b = heltall(r, 1, a - 1);
    return { a, b, fasit: a - b };
  }
  const lav = tak >= 3 ? 2 : 1;   // ganging med 1 er for lett når det finnes noe å velge mellom
  if (art === 'gange') {
    // Av og til ganges det med 0 (på alle nivåer) eller med 10 (også når taket er lavere enn 10,
    // men aldri med 6–9 før foreldrene velger 10).
    let a = heltall(r, lav, tak), b = heltall(r, lav, tak);
    const u = r();
    if (u < GANGE_NULL) a = 0;
    else if (tak < 10 && u < GANGE_NULL + GANGE_TI) a = 10;
    if (r() < 0.5) [a, b] = [b, a];
    return { a, b, fasit: a * b };
  }
  // Deling går alltid opp.
  const b = heltall(r, lav, tak), svar = heltall(r, 1, tak);
  return { a: b * svar, b, fasit: svar };
}

/** Et nytt mattestykke. forrigeTekst hindrer at samme stykke kommer to ganger på rad. */
export function lagOppgave(inn, forrigeTekst = '', r = Math.random) {
  let arter = Object.keys(TEGN).filter((a) => inn?.[a]?.paa);
  if (!arter.length) arter = ['pluss'];
  let o = null;
  for (let forsok = 0; forsok < 12; forsok++) {
    const art = arter[Math.floor(r() * arter.length)];
    const tak = inn?.[art]?.tak ?? STANDARD[art].tak;
    const { a, b, fasit } = lag(art, tak, r);
    o = { art, a, b, fasit, op: TEGN[art], tekst: `${a} ${TEGN[art]} ${b}` };
    if (o.tekst !== forrigeTekst) break;
  }
  return o;
}

/** Tre svar å velge mellom (det riktige og to som ligger nær), i tilfeldig rekkefølge. */
export function alternativer(oppgave, r = Math.random) {
  const f = oppgave.fasit;
  const naer = f >= 20 ? [1, 2, 10, -1, -2, -10] : [1, 2, 3, -1, -2, -3];
  const valg = new Set([f]);
  for (let forsok = 0; valg.size < 3 && forsok < 40; forsok++) {
    const v = f + naer[Math.floor(r() * naer.length)];
    if (v >= 0) valg.add(v);
  }
  for (let v = f + 1; valg.size < 3; v++) valg.add(v);
  return [...valg].sort(() => r() - 0.5);
}

/** Fyller ut manglende felt (for eldre lagringer og nye innstillinger). */
export function medStandard(inn = {}) {
  const ut = { ...STANDARD, ...inn };
  for (const a of Object.keys(TEGN)) ut[a] = { ...STANDARD[a], ...(inn[a] ?? {}) };
  return ut;
}
