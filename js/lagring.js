// Spillerprofiler og lagring i localStorage. Hver spiller har sin egen øy.
// iPad kan slette lagrede data etter lang tids inaktivitet, men for en prøve er det godt nok.

import { tilData, fraData } from './regler.js';

const PROFILER = 'oya-profiler';
const SPILL = (id) => `oya-spill-${id}`;

function les(nokkel, standard) {
  try {
    const s = localStorage.getItem(nokkel);
    return s ? JSON.parse(s) : standard;
  } catch {
    return standard;
  }
}

function skriv(nokkel, verdi) {
  try { localStorage.setItem(nokkel, JSON.stringify(verdi)); } catch { /* privat modus e.l. */ }
}

/** [{ id, navn, avatar, nivaa, dag }] – nyeste først. */
export const profiler = () => les(PROFILER, []);

export function lagre(id, spill) {
  skriv(SPILL(id), tilData(spill));
  const liste = profiler().filter((p) => p.id !== id);
  liste.unshift({ id, navn: spill.navn, avatar: spill.avatar, nivaa: spill.nivaa, dag: spill.dag, oyNr: spill.oyNr ?? 1 });
  skriv(PROFILER, liste);
}

export const hent = (id) => fraData(les(SPILL(id), null));

export function slett(id) {
  try { localStorage.removeItem(SPILL(id)); } catch { /* ignorer */ }
  skriv(PROFILER, profiler().filter((p) => p.id !== id));
}

export const nyId = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
