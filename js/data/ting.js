// Tingene man kan samle, og alle tallene for trykk-økonomien samlet ett sted,
// så de er lette å justere.

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

/** Det som havner i forrådet. */
export const VARER = {
  tre:    { ikon: '🪵', navn: 'tre' },
  stein:  { ikon: '🪨', navn: 'stein' },
  jern:   { ikon: '⛓️', navn: 'jern' },
  fisk:   { ikon: '🐟', navn: 'fisk' },
  korn:   { ikon: '🌾', navn: 'korn' },
  ull:    { ikon: '🧶', navn: 'ull' },
  fro:    { ikon: '🌰', navn: 'frø' },
  nokkel: { ikon: '🗝️', navn: 'nøkler' },
  skatt:  { ikon: '💎', navn: 'skatter' },
  stov:   { ikon: '✨', navn: 'stjernestøv' },
};

/** Hva en ferdig ting gir: liten, middels, stor. */
export const UTBYTTE = [2, 5, 12];

/** Kister gir ulike ting. r = seedet tilfeldighet. */
export const KISTEGAVE = [
  (r) => r.velg([{ fro: 1 }, { skatt: 1 }, { nokkel: 1 }, { fro: 1, korn: 2 }]),
  (r) => r.velg([{ fro: 2, nokkel: 1 }, { skatt: 2 }, { fro: 1, skatt: 1, nokkel: 1 }]),
  () => ({ skatt: 3, nokkel: 1, stov: 5, fro: 3 }),
];

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
