// Opplesing med nettleserens talemotor (Web Speech API), med samme stemmevalg som
// Lesestjerna (js/stemme.js der):
//  1. «Finn» – Microsofts nevrale nettstemme (Edge på PC/Mac) er den klart beste.
//  2. En høykvalitetsstemme på iPad/Mac (Apple kaller dem «Forbedret»/«Enhanced»/«Premium»).
//     På iPad bruker alle nettlesere – også Edge – Apples egen talemotor, så der er det
//     Nora som leser, og den forbedrede Nora-stemmen hvis den er lastet ned
//     (Innstillinger → Tilgjengelighet → Opplest innhold → Stemmer → Norsk).
//  3. En annen norsk nettstemme (ikke lokal), så en hvilken som helst norsk stemme.
// Finnes ingen norsk stemme, settes bare språket til nb-NO, så velger enheten selv.

const tale = () => (typeof window !== 'undefined' ? window.speechSynthesis : null);

/** Norske stemmer (sjekker språket først – «Finnish» inneholder bokstavene i «Finn»). */
export function norske() {
  const s = tale();
  return s ? s.getVoices().filter((v) => /^n[bno]/i.test(v.lang)) : [];
}

export function valgtStemme() {
  const n = norske();
  return n.find((v) => /\bfinn\b/i.test(v.name))
    || n.find((v) => /premium|enhanced|forbedret|neural|natural/i.test(v.name))
    || n.find((v) => !v.localService)
    || n[0] || null;
}

/** iPad laster stemmene litt etter oppstart: be om dem tidlig, så de er klare ved første trykk. */
export function forbered() {
  const s = tale();
  if (!s) return;
  s.getVoices();
  s.addEventListener?.('voiceschanged', () => s.getVoices());
}

let teller = 0;   // hver opplesing får sitt nummer, så en avbrutt opplesing ikke melder seg

/**
 * Leser en tekst høyt, setning for setning. Alle setningene legges i køen med en gang
 * (iPad krever at opplesingen starter i selve trykket). vedSetning(k) kalles når setning k begynner.
 * Gir et løfte som løses når alt er lest (eller avbrutt).
 */
export function lesOpp(tekst, { fart = 0.92, vedSetning = null } = {}) {
  const s = tale();
  if (!s) return Promise.resolve(false);
  s.cancel();
  const nr = ++teller;
  const setninger = delISetninger(tekst);
  const stemme = valgtStemme();
  return new Promise((ferdig) => {
    setninger.forEach((setning, k) => {
      const y = new SpeechSynthesisUtterance(setning);
      if (stemme) y.voice = stemme;
      y.lang = stemme?.lang ?? 'nb-NO';
      y.rate = fart;
      y.onstart = () => { if (nr === teller) vedSetning?.(k); };
      if (k === setninger.length - 1) {
        y.onend = () => ferdig(nr === teller);
        y.onerror = () => ferdig(false);
      }
      s.speak(y);
    });
  });
}

/** Ett kort ord eller tall (tellingen), uten å vente. */
export function si(tekst, fart = 1.15) {
  const s = tale();
  if (!s) return;
  s.cancel();
  teller++;
  const y = new SpeechSynthesisUtterance(String(tekst));
  const stemme = valgtStemme();
  if (stemme) y.voice = stemme;
  y.lang = stemme?.lang ?? 'nb-NO';
  y.rate = fart;
  s.speak(y);
}

export function stille() {
  teller++;
  tale()?.cancel();
}

/** Deler en tekst i setninger (etter . ! ? og …). */
export function delISetninger(tekst) {
  return (tekst.match(/[^.!?…]+[.!?…]*/g) ?? [tekst]).map((x) => x.trim()).filter(Boolean);
}
