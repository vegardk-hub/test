// Tingene man kan samle, det man kan selge og kjøpe, og alle tallene for
// økonomien samlet ett sted, så de er lette å justere.

/** Hver ting har sin sang (antall trykk = antall toner) og sitt instrument. */
export const TING = {
  tre:   { navn: ['Lite tre', 'Tre', 'Stort tre'], ikon: '🌳', sang: 'petter', instrument: 'hogg',
           sprut: ['#8a5c38', '#e8c48a', '#6f9a3f', '#8fbf55'] },
  stein: { navn: ['Liten stein', 'Stein', 'Kampestein'], ikon: '🪨', sang: 'mary', instrument: 'treblokk',
           sprut: ['#9aa1ae', '#7d7f8a', '#c4c9d2'] },
  jern:  { navn: ['Litt malm', 'Malmstein', 'Malmåre'], ikon: '⛓️', sang: 'jakob', instrument: 'ambolt',
           sprut: ['#d98a4a', '#b8c3cf', '#ffe6a0'] },
  fisk:  { navn: ['Sild', 'Ørret', 'Laks'], ikon: '🐟', sang: 'ro', instrument: 'plask',
           sprut: ['#ffffff', '#bfe4f7', '#7fc3e6'] },
  korn:  { navn: ['Kornaks', 'Kornband', 'Kornåker'], ikon: '🌾', sang: 'macdonald', instrument: 'floyte',
           sprut: ['#e2c25a', '#c9a23f', '#f3e3a0'] },
  ull:   { navn: ['Lam', 'Sau', 'Vær'], ikon: '🐑', sang: 'baa', instrument: 'spilledaase',
           sprut: ['#ffffff', '#f3f0e7', '#e5ded0'] },
  kiste: { navn: ['Liten kiste', 'Stor kiste', 'Kjempekiste'], ikon: '🎁', sang: 'bursdag', instrument: 'xylofon',
           sprut: ['#ffd23f', '#ffe58a', '#fff4c2'] },
};

/**
 * Det som havner i forrådet, og hva det kan selges for (mynter per stykk).
 * farge = edelsteiner og metaller tegnes som egne ikoner i den fargen.
 */
export const VARER = {
  tre:     { ikon: '🪵', navn: 'tre', pris: 1 },
  stein:   { ikon: '🪨', navn: 'stein', pris: 1 },
  korn:    { ikon: '🌾', navn: 'korn', pris: 1 },
  fisk:    { ikon: '🐟', navn: 'fisk', pris: 2 },
  ull:     { ikon: '🧶', navn: 'ull', pris: 2 },
  jern:    { ikon: '⛓️', navn: 'jern', pris: 3 },
  stov:    { ikon: '✨', navn: 'stjernestøv', pris: 3 },
  solv:    { form: 'barre', farge: '#c9d3dd', navn: 'sølv', pris: 5 },
  gull:    { form: 'barre', farge: '#f5c431', navn: 'gull', pris: 10 },
  topas:   { form: 'stein', farge: '#f39a2b', navn: 'topas', pris: 8 },
  ametyst: { form: 'stein', farge: '#9b59d0', navn: 'ametyst', pris: 12 },
  smaragd: { form: 'stein', farge: '#25b86a', navn: 'smaragd', pris: 15 },
  safir:   { form: 'stein', farge: '#3a74d8', navn: 'safir', pris: 20 },
  rubin:   { form: 'stein', farge: '#e0353f', navn: 'rubin', pris: 25 },
  diamant: { form: 'stein', farge: '#d8f3ff', navn: 'diamant', pris: 40 },
};
export const SKATTER = ['stov', 'solv', 'gull', 'topas', 'ametyst', 'smaragd', 'safir', 'rubin', 'diamant'];
export const RAVARER = ['tre', 'stein', 'korn', 'fisk', 'ull', 'jern'];

/** Hva en ferdig ting gir: liten, middels, stor. */
export const UTBYTTE = [2, 5, 12];

/** Antall mattestykker for å åpne en liten, stor og kjempekiste. */
export const STYKKER = [1, 2, 3];

/** Innholdet i kistene. r = seedet tilfeldighet. */
export const KISTEGAVE = [
  (r) => r.velg([{ solv: 2 }, { solv: 1, topas: 1 }, { ametyst: 1 }, { gull: 1 }, { solv: 3 }]),
  (r) => {
    const g = { gull: r.heltall(1, 2) };
    for (let k = 0; k < 2; k++) { const s = r.velg(['topas', 'ametyst', 'smaragd', 'safir']); g[s] = (g[s] ?? 0) + 1; }
    return g;
  },
  (r) => {
    const g = { gull: r.heltall(2, 3), solv: 2 };
    for (let k = 0; k < 3; k++) { const s = r.velg(['smaragd', 'safir', 'rubin', 'rubin']); g[s] = (g[s] ?? 0) + 1; }
    if (r.sjanse(0.5)) g.diamant = 1;
    return g;
  },
];

/**
 * Bygg man kan kjøpe og sette ut på øya. Prisen følger hvor krevende bygget er.
 * Rekkefølgen her er rekkefølgen i butikken.
 */
export const BYGG = [
  { id: 'baal',        navn: 'Bålplass',    pris: 10 },
  { id: 'telt',        navn: 'Telt',        pris: 15 },
  { id: 'snomann',     navn: 'Snømann',     pris: 20 },
  { id: 'bronn',       navn: 'Brønn',       pris: 25 },
  { id: 'sopphus',     navn: 'Sopphus',     pris: 35 },
  { id: 'hytte',       navn: 'Torvhytte',   pris: 40 },
  { id: 'iglo',        navn: 'Iglo',        pris: 45 },
  { id: 'trehus',      navn: 'Trehus',      pris: 55 },
  { id: 'stabbur',     navn: 'Stabbur',     pris: 60 },
  { id: 'fontene',     navn: 'Fontene',     pris: 70 },
  { id: 'sirkus',      navn: 'Sirkustelt',  pris: 85 },
  { id: 'vindmolle',   navn: 'Vindmølle',   pris: 100 },
  { id: 'luftballong', navn: 'Luftballong', pris: 110 },
  { id: 'taarn',       navn: 'Tårn',        pris: 130 },
  { id: 'fyrtaarn',    navn: 'Fyrtårn',     pris: 150 },
  { id: 'pariserhjul', navn: 'Pariserhjul', pris: 180 },
  { id: 'stavkirke',   navn: 'Stavkirke',   pris: 220 },
  { id: 'pyramide',    navn: 'Pyramide',    pris: 250 },
  { id: 'rakett',      navn: 'Rakett',      pris: 300 },
  { id: 'borg',        navn: 'Borg',        pris: 400 },
];
export const BYGG_ETTER_ID = Object.fromEntries(BYGG.map((b) => [b.id, b]));

/** Sjansen for liten, middels og stor utgave. */
export const STR_SJANSE = [0.55, 0.3, 0.15];

/** Sjansen for at det vokser noe på en rute, etter terreng. */
export const SJANSE = { skog: 0.7, aas: 0.6, fjell: 0.3, eng: 0.28, vann: 0.3, strand: 0 };

/** Dager før noe nytt vokser fram der man har høstet (kister kommer ikke tilbake). */
export const GJENVEKST = 2;

/** Børstestrøk som trengs for å fjerne tåka over en rute. */
export const TAKE_TRYKK = 3;

/** Solstråler per dag (= trykk per dag) for hvert nivå. */
export const SOL = { liten: 70, stor: 50 };

export const NIVAA = {
  liten: { navn: 'Liten', ikon: '🐣', forklaring: 'Under 6 år – ingen lesing' },
  stor:  { navn: 'Stor', ikon: '🧒', forklaring: '6 år og eldre' },
};

export const AVATARER = ['🦊', '🐻', '🐰', '🐸', '🦉', '🐱', '🐶', '🦄', '🐧', '🐢'];

/** Størrelsen på øya i ruter. */
export const OY = { bredde: 28, hoyde: 28 };
