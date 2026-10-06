// Brettet: hver rute er et kort (tegnet med js/stil/ruter.js) på svart bakgrunn.
// Ruter med en ting viser tingen (fra figurer.js) på et tomt kort. Tåke som kan
// børstes bort, blir tynnere for hvert strøk og viser et hint av det som er under.
// Kortene tegnes én gang per innhold og zoomtrinn og gjenbrukes.

import { tegnKort, tegnUkjent, tegnTomtKort } from './stil/ruter.js';
import { BAKGRUNN } from './stil/palett.js';
import { blandSeed, lagTilfeldig } from './rng.js';
import { tegnFigur } from './figurer.js';
import { TAKE_TRYKK } from './data/ting.js';
import { TERRENGNAVN, tingVed, kanBorstes } from './regler.js';

export const RUTE = 100;     // verdensenheter per rute
export const FUGE = 1.5;     // ca. 1,5 % av ruta (målt i forbildet)
export const KORT = RUTE - FUGE;

/** Hva kortet viser når ruta er avdekket. */
function avdekketInnhold(spill, verden, i) {
  const terreng = TERRENGNAVN[verden.terreng[i]];
  if (i === verden.startIndeks) return { terreng, bygg: 'leir' };
  const o = verden.overlegg.get(i);
  if (o?.type === 'landsby') return { terreng, bygg: 'landsby', nivaa: 2 };
  const ting = tingVed(spill, verden, i);
  if (ting) return { terreng, ting };
  if (o?.type === 'dyr' && o.art === 'hjort') return { terreng, overlegg: 'hjort' };
  return { terreng };
}

/** Hva skal ruta vise? null = ingenting (mørke). */
export function innholdFor(spill, verden, i) {
  if (spill.avdekket[i]) return avdekketInnhold(spill, verden, i);
  if (!kanBorstes(spill, verden, i)) return null;
  return { ukjent: true, take: spill.take.get(i) ?? TAKE_TRYKK };
}

const andel = (ting) => Math.floor((1 - ting.igjen / ting.antall) * 8) / 8;
const signatur = (inn) => {
  if (inn.ukjent) return '?';
  if (inn.ting) return `${inn.terreng}|${inn.ting.type}${inn.ting.str}|${inn.ting.seed}|${andel(inn.ting)}`;
  return `${inn.terreng}|${inn.bygg ?? ''}|${inn.nivaa ?? ''}|${inn.overlegg ?? ''}`;
};

const STORRELSER = [48, 64, 96, 128, 192, 256, 384];
const passendeStorrelse = (px) => STORRELSER.find((s) => s >= px) ?? STORRELSER.at(-1);

export class Brett {
  constructor(verden) {
    this.verden = verden;
    this.kort = new Map();   // nøkkel → { sig, str, lerret }
    this.ko = new Map();     // nøkkel → { innhold, str } som venter på skarpere versjon
    this.royk = null;
    this.roykNokkel = '';
  }

  #lagKort(nokkel, i, innhold, str) {
    const lerret = document.createElement('canvas');
    lerret.width = lerret.height = str;
    const ctx = lerret.getContext('2d');
    const tilf = lagTilfeldig(blandSeed(this.verden.seed, this.verden.forsok, 'kort', i));
    if (innhold.ukjent) tegnUkjent(ctx, str, tilf);
    else if (innhold.ting) {
      tegnTomtKort(ctx, str, tilf, innhold.terreng, () => tegnFigur(ctx, str, innhold.ting, { p: andel(innhold.ting) }));
    } else tegnKort(ctx, str, tilf, innhold);
    const k = { sig: signatur(innhold), str, lerret };
    this.kort.set(nokkel, k);
    return k;
  }

  /** Kortet i ønsket størrelse. Endret innhold tegnes straks; ny zoom tegnes etter hvert. */
  hent(nokkel, i, innhold, str) {
    const sig = signatur(innhold);
    const k = this.kort.get(nokkel);
    if (k && k.sig === sig) {
      if (k.str !== str) this.ko.set(nokkel, { i, innhold, str });
      return k.lerret;
    }
    this.ko.delete(nokkel);
    return this.#lagKort(nokkel, i, innhold, str).lerret;
  }

  /** Tegner opp til `maks` kort fra køen. Returnerer true hvis det gjenstår noe. */
  jobb(maks = 10) {
    for (const [nokkel, { i, innhold, str }] of this.ko) {
      if (maks-- <= 0) break;
      this.ko.delete(nokkel);
      this.#lagKort(nokkel, i, innhold, str);
    }
    return this.ko.size > 0;
  }

  /** Myk røyk rundt kanten av det kjente (et lite bilde forstørret med utjevning). */
  #roykBilde(spill) {
    const { bredde: B, hoyde: H } = this.verden;
    const nokkel = `${spill.stat.avdekket}`;
    if (this.royk && this.roykNokkel === nokkel) return this.royk;
    const P = 6, M = 2;
    const c = this.royk ?? document.createElement('canvas');
    c.width = (B + 2 * M) * P;
    c.height = (H + 2 * M) * P;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < B * H; i++) {
      if (!kanBorstes(spill, this.verden, i)) continue;
      const tilf = lagTilfeldig(blandSeed(this.verden.seed, 'royk', i));
      const cx = ((i % B) + M + 0.5) * P, cy = (Math.floor(i / B) + M + 0.5) * P;
      for (let k = 0; k < 2; k++) {
        const r = P * (0.8 + tilf.tall() * 0.7);
        const ox = (tilf.tall() - 0.5) * P * 1.2, oy = (tilf.tall() - 0.5) * P * 1.2;
        const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
        g.addColorStop(0, 'rgba(120, 125, 140, 0.16)');
        g.addColorStop(1, 'rgba(120, 125, 140, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
      }
    }
    this.royk = c;
    this.roykNokkel = nokkel;
    this.roykMarg = M;
    return c;
  }

  /**
   * Tegner brettet. ctx har kameraets transformasjon. utsnitt = synlige ruter.
   * avdekkAnim: rute → starttid for kort som snus fram. borstAnim: rute → tid for siste strøk.
   * hint: ruter som skal ha en pulserende ring (de første trykkene).
   */
  tegn(ctx, spill, { utsnitt, skala, avdekkAnim, borstAnim, naa, hint }) {
    const { bredde: B, hoyde: H } = this.verden;
    const str = passendeStorrelse(KORT * skala);

    const royk = this.#roykBilde(spill);
    const M = this.roykMarg;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(royk, -M * RUTE, -M * RUTE, (B + 2 * M) * RUTE, (H + 2 * M) * RUTE);

    const { x0, y0, x1, y1 } = utsnitt;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(B - 1, x1); x++) {
        const i = y * B + x;
        const innhold = innholdFor(spill, this.verden, i);
        if (!innhold) continue;
        const px = x * RUTE + FUGE / 2, py = y * RUTE + FUGE / 2;
        const start = avdekkAnim.get(i);
        if (start !== undefined) {
          // Kortet snus: tåka smalner inn, det nye kortet vokser fram.
          const p = Math.min(1, (naa - start) / 450);
          const sx = Math.abs(Math.cos(Math.PI * p));
          const bilde = p < 0.5 ? this.hent(-1 - i, i, { ukjent: true }, str) : this.hent(i, i, innhold, str);
          ctx.drawImage(bilde, px + KORT * (1 - sx) / 2, py, KORT * sx, KORT);
          if (p >= 1) avdekkAnim.delete(i);
          continue;
        }
        if (innhold.ukjent && innhold.take < TAKE_TRYKK) {
          // Tåka er tynnere: et hint av det som er under skinner gjennom.
          ctx.drawImage(this.hent(i, i, avdekketInnhold(spill, this.verden, i), str), px, py, KORT, KORT);
          const t = borstAnim.get(i);
          const rist = t ? Math.max(0, 1 - (naa - t) / 250) : 0;
          ctx.globalAlpha = innhold.take === 2 ? 0.78 : 0.5;
          ctx.drawImage(this.hent(-1 - i, i, { ukjent: true }, str), px + Math.sin(naa / 20) * rist * 4, py, KORT, KORT);
          ctx.globalAlpha = 1;
          continue;
        }
        ctx.drawImage(this.hent(innhold.ukjent ? -1 - i : i, i, innhold, str), px, py, KORT, KORT);
      }
    }

    // Pulserende ringer som viser hva man kan trykke på (bare helt i starten)
    if (hint?.length) {
      const puls = 0.5 + 0.5 * Math.sin(naa / 250);
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(255, 228, 120, ${0.35 + 0.5 * puls})`;
      for (const i of hint) {
        const x = (i % B) * RUTE + RUTE / 2, y = Math.floor(i / B) * RUTE + RUTE / 2;
        ctx.beginPath();
        ctx.arc(x, y, RUTE * (0.36 + 0.06 * puls), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

export { BAKGRUNN };
