// Spillerens egen farge: taket på leiren (huset med butikken) og alle flaggene på øya.
// Den velges i butikken og lagres per spiller (spill.takfarge).

export const TAKFARGER = [
  { id: 'rod', navn: 'Rød', farge: '#c0614a' },
  { id: 'blaa', navn: 'Blå', farge: '#3a74d8' },
  { id: 'gronn', navn: 'Grønn', farge: '#3f9a4f' },
  { id: 'gul', navn: 'Gul', farge: '#e8b730' },
  { id: 'oransje', navn: 'Oransje', farge: '#e8822f' },
  { id: 'rosa', navn: 'Rosa', farge: '#e0609a' },
  { id: 'lilla', navn: 'Lilla', farge: '#8e5bd0' },
  { id: 'turkis', navn: 'Turkis', farge: '#2aa7a7' },
  { id: 'svart', navn: 'Svart', farge: '#3a3a44' },
];
export const STANDARD_TAKFARGE = TAKFARGER[0].farge;

let farge = STANDARD_TAKFARGE;

/** Fargen som brukes nå. */
export const spillerfarge = () => farge;

export function settSpillerfarge(f) { farge = f || STANDARD_TAKFARGE; }
