// Tingene man kan samle, det man kan selge og kjøpe, og alle tallene for
// økonomien samlet ett sted, så de er lette å justere.

/**
 * Hver ting har sitt instrument. Melodien er tilfeldig for hver ting (antall trykk = antall toner),
 * se data/melodier.js – bare kistene har sin faste sang (`sang`).
 */
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
 * Sjeldenhet: grad 1–5. vekt = hvor ofte en ting av den graden trekkes i en kiste
 * (hver grad er tre ganger så sjelden som den forrige).
 */
export const SJELDENHET = [null,
  { navn: 'vanlig', vekt: 81 },
  { navn: 'uvanlig', vekt: 27 },
  { navn: 'sjelden', vekt: 9 },
  { navn: 'svært sjelden', vekt: 3 },
  { navn: 'legendarisk', vekt: 1 },
];

const metall = (navn, farge, pris, grad) => ({ form: 'barre', farge, navn, pris, grad });
const stein = (navn, farge, pris, grad) => ({ form: 'stein', farge, navn, pris, grad });

/**
 * Det som havner i forrådet, og hva det kan selges for (mynter per stykk).
 * Metallene og edelsteinene finnes på ordentlig, og fargen er den de har i naturen.
 * grad = hvor sjeldne de er (se SJELDENHET). Prisen følger graden: det er få ting i kistene,
 * så hver ting er verdt en del, og de sjeldne er verdt mye.
 */
export const VARER = {
  tre:     { ikon: '🪵', navn: 'tre', pris: 1 },
  stein:   { ikon: '🪨', navn: 'stein', pris: 1 },
  korn:    { ikon: '🌾', navn: 'korn', pris: 1 },
  fisk:    { ikon: '🐟', navn: 'fisk', pris: 2 },
  ull:     { ikon: '🧶', navn: 'ull', pris: 2 },
  jern:    { ikon: '⛓️', navn: 'jern', pris: 3 },
  stov:    { ikon: '✨', navn: 'stjernestøv', pris: 3 },

  // --- Metaller (22) -------------------------------------------------------
  kobber:    metall('kobber', '#c9713c', 4, 1),
  tinn:      metall('tinn', '#d5d3ca', 4, 1),
  sink:      metall('sink', '#b4bcc5', 4, 1),
  nikkel:    metall('nikkel', '#c8c1a6', 6, 1),
  titan:     metall('titan', '#9b9ea3', 10, 2),
  krom:      metall('krom', '#c6d2da', 10, 2),
  solv:      metall('sølv', '#c9d3dd', 12, 2),
  kobolt:    metall('kobolt', '#8d99a9', 12, 2),
  wolfram:   metall('wolfram', '#7c8188', 12, 2),
  vismut:    metall('vismut', '#dcc4c8', 15, 2),
  niob:      metall('niob', '#a4a7ad', 15, 2),
  elektrum:  metall('elektrum', '#e8d47c', 24, 3),
  tantal:    metall('tantal', '#7e8896', 27, 3),
  indium:    metall('indium', '#dddee2', 27, 3),
  gull:      metall('gull', '#f5c431', 30, 3),
  palladium: metall('palladium', '#cfd0cb', 42, 3),
  platina:   metall('platina', '#dad9d2', 48, 3),
  ruthenium: metall('ruthenium', '#b8bbc0', 75, 4),
  rhenium:   metall('rhenium', '#a7aab0', 85, 4),
  osmium:    metall('osmium', '#a6b8cb', 90, 4),
  iridium:   metall('iridium', '#d9d6ca', 140, 5),
  rhodium:   metall('rhodium', '#e8eaec', 180, 5),

  // --- Edelsteiner og smykkesteiner (36) -----------------------------------
  bergkrystall: stein('bergkrystall', '#e6f1f6', 6, 1),
  rosenkvarts:  stein('rosenkvarts', '#f4b6c8', 6, 1),
  roykkvarts:   stein('røykkvarts', '#8a6f5c', 6, 1),
  agat:         stein('agat', '#c9793a', 6, 1),
  jaspis:       stein('jaspis', '#a5402c', 6, 1),
  citrin:       stein('citrin', '#f2c12e', 8, 1),
  karneol:      stein('karneol', '#e2622b', 8, 1),
  onyks:        stein('onyks', '#23232b', 8, 1),
  tigeroye:     stein('tigerøye', '#b87a26', 8, 1),
  fluoritt:     stein('fluoritt', '#5cc9a0', 8, 1),
  granat:       stein('granat', '#8f1d2f', 15, 2),
  rav:          stein('rav', '#e8981c', 15, 2),
  peridot:      stein('peridot', '#9ccc3c', 18, 2),
  turkis:       stein('turkis', '#30c4c0', 18, 2),
  malakitt:     stein('malakitt', '#1f9c62', 18, 2),
  topas:        stein('topas', '#f39a2b', 20, 2),
  akvamarin:    stein('akvamarin', '#8fd8ea', 20, 2),
  lapis:        stein('lapis lazuli', '#2040a8', 20, 2),
  maanestein:   stein('månestein', '#dbe6f6', 22, 2),
  jade:         stein('jade', '#58b074', 22, 2),
  perle:        stein('perle', '#f6f0e6', 25, 2),
  ametyst:      stein('ametyst', '#9b59d0', 30, 2),
  turmalin:     stein('turmalin', '#e0559a', 42, 3),
  zirkon:       stein('zirkon', '#5fb9da', 42, 3),
  smaragd:      stein('smaragd', '#25b86a', 45, 3),
  opal:         stein('opal', '#eaf3f2', 48, 3),
  morganitt:    stein('morganitt', '#f3b49c', 48, 3),
  tanzanitt:    stein('tanzanitt', '#5b50d0', 54, 3),
  safir:        stein('safir', '#3a74d8', 60, 3),
  rubin:        stein('rubin', '#e0353f', 90, 4),
  svartopal:    stein('svart opal', '#1c2030', 105, 4),
  aleksandritt: stein('aleksandritt', '#1f9c8a', 110, 4),
  padparadscha: stein('padparadscha', '#ff8c6b', 120, 4),
  diamant:      stein('diamant', '#d8f3ff', 140, 4),
  rodberyll:    stein('rød beryll', '#d4163c', 240, 5),
  taaffeitt:    stein('taaffeitt', '#c7a2dc', 300, 5),
};
/** Rekkefølgen er den de står i over: fra de vanligste til de sjeldneste. */
export const METALLER = Object.keys(VARER).filter((v) => VARER[v].form === 'barre');
export const EDELSTEINER = Object.keys(VARER).filter((v) => VARER[v].form === 'stein');
export const SKATTER = ['stov', ...METALLER, ...EDELSTEINER];
export const RAVARER = ['tre', 'stein', 'korn', 'fisk', 'ull', 'jern'];

/** Hva en ferdig ting gir: liten, middels, stor. */
export const UTBYTTE = [2, 5, 12];

/** Antall mattestykker for å åpne en liten, stor og kjempekiste. */
export const STYKKER = [1, 2, 3];

/**
 * Innholdet i kistene: liten, stor og kjempekiste. Den lille har én ting (metall eller edelstein),
 * den store tre og kjempekista fem. Jo større kiste, jo mer «lykke»: da øker sjansen for de sjeldne.
 * Kjempekista har alltid med én edelstein som er minst «uvanlig» (hvis man kjenner en).
 * Tingene trekkes blant slagene man allerede har funnet – se NYFUNN for hvordan nye slag kommer.
 */
export const KISTE = [
  { metaller: 0, steiner: 0, valgfri: 1, lykke: 0 },
  { metaller: 1, steiner: 2, valgfri: 0, lykke: 1 },
  { metaller: 2, steiner: 2, valgfri: 0, lykke: 2, sikker: 2 },
];

/** Hvor tungt en ting av en grad veier i trekningen. Lykke løfter de sjeldne. */
export const trekkvekt = (grad, lykke = 0) => SJELDENHET[grad].vekt * (1 + lykke * (grad - 1) * 0.5);

/**
 * Nye slag: man finner mest av de slagene man kjenner fra før. Et nytt slag dukker opp først når man
 * har løst et visst antall regnestykker i kistene siden forrige nye slag – og jo sjeldnere slaget er,
 * jo flere stykker (`etter`, per grad). `slingring` gjør at det ikke kommer helt på slaget.
 * De vanlige kommer stort sett først (`bratt` = hvor sterkt), men innimellom kommer et sjeldnere slag tidlig.
 * De aller første slagene kommer fortere (`oppstart`), så man har noe å begynne med.
 */
export const NYFUNN = { etter: [0, 5, 8, 12, 18, 26], slingring: 0.3, bratt: 1.5, oppstart: 4 };

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

/**
 * Havna låses opp når man har satt opp alle de 20 ulike byggene på øya. Den må stå
 * ved sjøen. Ved havna kan man bygge en seilbåt, og med båten kan man seile til en
 * ny øy (i neonstil) – eller bli der man er.
 */
export const HAVN = { id: 'havn', navn: 'Havn', pris: 150, krav: BYGG.length };
export const BAAT = { id: 'havnbaat', navn: 'Havn med seilbåt', pris: 250 };

/**
 * Skolen: et spesielt bygg (én per øy). Ut av skolen kommer et smart barn (med samme navn som spilleren) som går
 * rundt på øya. Med 5–7 dagers mellomrom (det er en overraskelse når) får barnet en lyspære
 * over hodet og finner på noe nytt, som dukker opp i butikken.
 */
export const SKOLE = { id: 'skole', navn: 'Skole', pris: 500, dager: [5, 7] };
export const OPPFINNER = { farge: '#ffd23f' };   // navnet er spillerens eget

/**
 * Museet: et gratis bygg (ett per øy). Skattene man selger i butikken (sølv, gull, edelsteiner
 * og stjernestøv), blir ikke borte: de stilles ut i museet, og samlingen følger spilleren fra øy til øy.
 */
export const MUSEUM = { id: 'museum', navn: 'Museum', pris: 0 };

/** Læreren på skolen leser opp kunnskapstekster (de samme som i Lesestjerna). */
export const LAERER = { navn: 'Frida', farge: '#25b86a' };

/** Oppfinnelsene fra skolen. Prisen følger hvor avansert tingen er. */
export const OPPFINNELSER = [
  { id: 'drage',            navn: 'Drage',              pris: 20,  tekst: 'en drage som flyr høyt over øya' },
  { id: 'boblemaskin',      navn: 'Boblemaskin',        pris: 25,  tekst: 'en maskin som blåser såpebobler' },
  { id: 'trampoline',       navn: 'Trampoline',         pris: 35,  tekst: 'en trampoline man kan hoppe salto på' },
  { id: 'godterimaskin',    navn: 'Godterimaskin',      pris: 45,  tekst: 'en maskin full av godterikuler' },
  { id: 'iskiosk',          navn: 'Iskiosk',            pris: 60,  tekst: 'en iskiosk med en kjempeis på taket' },
  { id: 'sjokoladefontene', navn: 'Sjokoladefontene',   pris: 75,  tekst: 'en fontene med rennende sjokolade' },
  { id: 'hoppeslott',       navn: 'Hoppeslott',         pris: 90,  tekst: 'et oppblåsbart hoppeslott' },
  { id: 'vannsklie',        navn: 'Vannsklie',          pris: 110, tekst: 'en svingete vannsklie med basseng' },
  { id: 'karusell',         navn: 'Karusell',           pris: 130, tekst: 'en karusell med fargerike hester' },
  { id: 'regnbuemaskin',    navn: 'Regnbuemaskin',      pris: 150, tekst: 'en maskin som skyter ut regnbuer' },
  { id: 'danserobot',       navn: 'Danserobot',         pris: 175, tekst: 'en robot som danser disko' },
  { id: 'ufo',              navn: 'Flygende tallerken', pris: 200, tekst: 'en flygende tallerken som henter en ku' },
];

export const BYGG_ETTER_ID = Object.fromEntries([...BYGG, HAVN, BAAT, SKOLE, MUSEUM, ...OPPFINNELSER].map((b) => [b.id, b]));

/** Stilen på øy nummer 1, 2, 3 … (den siste brukes videre). */
export const OY_STIL = ['vanlig', 'neon'];
export const OY_NAVN = { vanlig: 'Skatteøya', neon: 'Neonøya' };
export const OY_IKON = { vanlig: '🏝️', neon: '🌈' };

/** Sjansen for liten, middels og stor utgave. */
export const STR_SJANSE = [0.55, 0.3, 0.15];

/** Sjansen for at det vokser noe på en rute, etter terreng. */
export const SJANSE = { skog: 0.7, aas: 0.6, fjell: 0.3, eng: 0.28, vann: 0.3, strand: 0 };

/** Dager før noe nytt vokser fram der man har høstet (kister kommer ikke tilbake). */
export const GJENVEKST = 2;

/**
 * Skattekryss: annenhver natt dukker det opp nye kryss på avdekkede, tomme ruter.
 * Man graver (trykker) GRAV_TRYKK ganger på krysset, så kommer det fram en kiste.
 */
export const KRYSS = { perGang: 3, hverNatt: 2, maks: 10 };   // høyst 10 kryss ute samtidig

/** Høyst så mange klikkbare ting av hver type (tre, stein, jern, korn, sau, fisk) samtidig. */
export const MAKS_PER_TYPE = 3;

/**
 * Høyst så mange uåpnede kister på øya samtidig (skattekryssene regnes med, siden de blir til kister).
 * Når det er fullt, kommer det ingen nye kister eller kryss før man har åpnet en.
 */
export const MAKS_KISTER = 10;
export const GRAV_TRYKK = 4;

/**
 * Hjelpere: for hvert femte bygg man har satt opp (totalt, på alle øyene), kommer det
 * en hjelper – høyst tre. Hver morgen går de ut av leiren og samler inn én ting hver
 * (hogger et tre, fisker, slår korn …), og helst forskjellige typer.
 */
export const HJELPER = { perBygg: 5, maks: 3, turer: 4 };   // fire turer om dagen

/**
 * Hvor nye ting dukker opp: den første om morgenen ca. `start` ruter fra leiren, og hver
 * neste av samme type `steg` ruter lenger unna – så hjelperne (og barnet) må lenger og lenger ut.
 */
export const SPAWN = { start: 2, steg: 1.5 };
export const HJELPERE = [
  { navn: 'Ola', farge: '#3a74d8' },
  { navn: 'Siri', farge: '#e0393e' },
  { navn: 'Per', farge: '#25b86a' },
  { navn: 'Ida', farge: '#f39a2b' },
  { navn: 'Nils', farge: '#9b59d0' },
];

/** Stjerneskudd man kan fange per natt. */
export const MAKS_STJERNER = 10;

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
