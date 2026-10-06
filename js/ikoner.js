// Ikoner for varene. Vanlige ting bruker emoji; edelsteiner og metallbarrer tegnes
// som små SVG-er i sin egen farge, så de ser like ut på alle maskiner.

import { VARER } from './data/ting.js';
import { lys, mork } from './stil/lavpoly.js';

function edelstein(f) {
  return `<svg class="ikon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="6,4 18,4 15,10 9,10" fill="${lys(f, 0.45)}"/>
    <polygon points="6,4 9,10 1,10" fill="${lys(f, 0.2)}"/>
    <polygon points="18,4 23,10 15,10" fill="${f}"/>
    <polygon points="1,10 9,10 12,22" fill="${mork(f, 0.05)}"/>
    <polygon points="9,10 15,10 12,22" fill="${lys(f, 0.1)}"/>
    <polygon points="15,10 23,10 12,22" fill="${mork(f, 0.3)}"/>
    <polygon points="8,5.5 11,5.5 9.5,8" fill="#ffffff" opacity="0.7"/>
  </svg>`;
}

function barre(f) {
  return `<svg class="ikon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="7,7 19,7 22,12 4,12" fill="${lys(f, 0.35)}"/>
    <polygon points="4,12 22,12 22,17 4,17" fill="${f}"/>
    <polygon points="19,7 22,12 22,17 19,12" fill="${mork(f, 0.25)}"/>
    <polygon points="9,8.2 14,8.2 13,10" fill="#ffffff" opacity="0.6"/>
  </svg>`;
}

/** HTML for ikonet til en vare (emoji eller SVG). */
export function ikon(vare) {
  if (vare === 'mynter') return '🪙';
  const v = VARER[vare];
  if (!v) return '';
  if (v.form === 'stein') return edelstein(v.farge);
  if (v.form === 'barre') return barre(v.farge);
  return v.ikon;
}
