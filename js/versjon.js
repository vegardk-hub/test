// Versjonsmerket nederst i alle vinduer. Øk tallet ved hver publisering,
// så det er lett å se om iPaden har fått den nyeste utgaven.

export const VERSJON = '1.42';
export const DATO = '2026-10-08';

/** Lager merket nede i hjørnet, og gir dialogene samme tekst (de ligger over alt annet). */
export function visVersjon() {
  const tekst = `v${VERSJON} · ${DATO}`;
  document.documentElement.style.setProperty('--versjon', `"${tekst}"`);
  const el = document.createElement('div');
  el.className = 'versjon';
  el.textContent = tekst;
  document.body.append(el);
}
