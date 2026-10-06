// Neonstil: den samme tegnekoden som lager den vanlige øya, men hver farge byttes
// til en sterk neonfarge i det øyeblikket den settes på canvas-konteksten.
// Bakken blir mørk, kantene på kortene lyser, og alt som står oppå (trær, stein,
// dyr, kister, bygg) får mettede neonfarger. Til slutt legges en myk glød over
// (et nedskalert bilde som legges oppå med «lighter»).
//
// Konteksten lappes én gang (neonKontekst), og fargene byttes bare når neon er på
// (settNeon), så de samme lerretene kan brukes på vanlige øyer også.

let paa = false;
let lag = 'figur';   // 'bakke' | 'kant' | 'figur' – settes av ruter.js mens kortet tegnes

export const neonPaa = () => paa;
export function settNeon(verdi) { paa = !!verdi; }
/** Hvilken del av kortet som tegnes nå. Gir forrige lag tilbake. */
export function settLag(l) { const f = lag; lag = l; return f; }

// ---------------------------------------------------------------------------
// Fargene
// ---------------------------------------------------------------------------
function tolk(c) {
  if (c[0] === '#') {
    const h = c.slice(1);
    if (h.length === 3 || h.length === 4) {
      const v = [...h].map((x) => parseInt(x + x, 16));
      return [v[0], v[1], v[2], h.length === 4 ? v[3] / 255 : 1];
    }
    if (h.length === 6 || h.length === 8) {
      const v = [0, 2, 4, 6].map((k) => parseInt(h.slice(k, k + 2), 16));
      return [v[0], v[1], v[2], h.length === 8 ? v[3] / 255 : 1];
    }
    return null;
  }
  const m = c.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const v = m[1].split(',').map((x) => parseFloat(x));
    return [v[0], v[1], v[2], v[3] ?? 1];
  }
  if (c === 'white') return [255, 255, 255, 1];
  if (c === 'black') return [0, 0, 0, 1];
  return null;
}

function tilHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const maks = Math.max(r, g, b), min = Math.min(r, g, b), l = (maks + min) / 2;
  if (maks === min) return [0, 0, l];
  const d = maks - min;
  const s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min);
  let h;
  if (maks === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (maks === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Stykkevis lineær kurve: [inn, ut]-par sortert etter inn (0–360). */
function kurve(punkter) {
  return (h) => {
    for (let k = 1; k < punkter.length; k++) {
      const [a, fa] = punkter[k - 1], [b, fb] = punkter[k];
      if (h <= b) return fa + ((h - a) / (b - a || 1)) * (fb - fa);
    }
    return punkter.at(-1)[1];
  };
}

// Figurene: rødt blir rosa, brunt blir oransje, grønt blir lysende grønt, blått blir turkis.
const FIGURHUE = kurve([[0, 330], [14, 340], [22, 22], [45, 38], [55, 54], [75, 80], [110, 118], [160, 150], [185, 182], [240, 195], [265, 268], [320, 295], [345, 322], [360, 330]]);
// Bakken: mørk lilla for sand og ås, mørk turkis for eng og skog, dypblå for vann.
const BAKKEHUE = kurve([[0, 300], [60, 285], [75, 175], [160, 165], [185, 205], [250, 230], [300, 265], [360, 300]]);

const lager = new Map();

/** Neonutgaven av en farge for et gitt lag. Ukjente fargeformater slippes gjennom. */
export function neonFarge(c, l = lag) {
  const nokkel = l + c;
  const ferdig = lager.get(nokkel);
  if (ferdig) return ferdig;
  const v = tolk(c.trim());
  if (!v) return c;
  const [r, g, b, a] = v;
  const [h, s, L] = tilHsl(r, g, b);
  const grå = s < 0.16 || (L < 0.12 || L > 0.96);
  let ut;
  if (l === 'bakke') {
    const hh = grå ? 245 : BAKKEHUE(h);
    ut = `hsla(${hh.toFixed(0)}, 70%, ${(4 + L * 12).toFixed(1)}%, ${a})`;
  } else if (l === 'kant') {
    const hh = grå ? 255 : BAKKEHUE(h);
    ut = `hsla(${hh.toFixed(0)}, 100%, 55%, ${(a * 0.62).toFixed(3)})`;
  } else if (grå) {
    if (L > 0.85) ut = `hsla(185, 100%, ${(84 + (L - 0.85) * 80).toFixed(1)}%, ${a})`;
    else if (L < 0.15) ut = `hsla(260, 60%, ${(L * 60).toFixed(1)}%, ${a})`;
    else ut = `hsla(272, 95%, ${(30 + L * 42).toFixed(1)}%, ${a})`;
  } else {
    ut = `hsla(${FIGURHUE(h).toFixed(0)}, 100%, ${(24 + L * 50).toFixed(1)}%, ${a})`;
  }
  lager.set(nokkel, ut);
  return ut;
}

// ---------------------------------------------------------------------------
// Konteksten
// ---------------------------------------------------------------------------
/** Lapper en 2D-kontekst så alle farger går gjennom neonFarge når neon er på. */
export function neonKontekst(ctx) {
  if (!ctx || ctx.__neon) return ctx;
  const proto = Object.getPrototypeOf(ctx);
  for (const navn of ['fillStyle', 'strokeStyle', 'shadowColor']) {
    const d = Object.getOwnPropertyDescriptor(proto, navn);
    Object.defineProperty(ctx, navn, {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) { d.set.call(this, paa && typeof v === 'string' ? neonFarge(v) : v); },
    });
  }
  for (const navn of ['createLinearGradient', 'createRadialGradient']) {
    const orig = proto[navn];
    ctx[navn] = function (...arg) {
      const g = orig.apply(this, arg);
      if (paa) {
        const leggTil = g.addColorStop;
        g.addColorStop = (o, c) => leggTil.call(g, o, typeof c === 'string' ? neonFarge(c) : c);
      }
      return g;
    };
  }
  ctx.__neon = true;
  return ctx;
}

// ---------------------------------------------------------------------------
// Glød
// ---------------------------------------------------------------------------
let glodLerret = null;

/**
 * Legger en myk glød over det som er tegnet på lerretet: bildet skaleres ned i to
 * steg (det gjør det uskarpt) og legges oppå igjen med «lighter».
 */
export function glod(lerret, styrke = 0.55, x = 0, y = 0, w = lerret.width, h = lerret.height) {
  if (!paa || !w || !h) return;
  glodLerret ??= [document.createElement('canvas'), document.createElement('canvas')];
  const [a, b] = glodLerret;
  const aw = Math.max(1, Math.round(w / 4)), ah = Math.max(1, Math.round(h / 4));
  const bw = Math.max(1, Math.round(w / 10)), bh = Math.max(1, Math.round(h / 10));
  if (a.width !== aw || a.height !== ah) { a.width = aw; a.height = ah; }
  if (b.width !== bw || b.height !== bh) { b.width = bw; b.height = bh; }
  const ac = a.getContext('2d'), bc = b.getContext('2d');
  ac.imageSmoothingEnabled = bc.imageSmoothingEnabled = true;
  ac.clearRect(0, 0, aw, ah);
  ac.drawImage(lerret, x, y, w, h, 0, 0, aw, ah);
  bc.clearRect(0, 0, bw, bh);
  bc.drawImage(a, 0, 0, bw, bh);
  const ctx = lerret.getContext('2d');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = styrke;
  ctx.drawImage(b, 0, 0, bw, bh, x, y, w, h);
  ctx.globalAlpha = styrke * 0.6;
  ctx.drawImage(a, 0, 0, aw, ah, x, y, w, h);
  ctx.restore();
}
