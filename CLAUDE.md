# Skatteøya
Koselig utforskings- og byggespill for barn (iPad), med læring bygget inn: telling når man trykker, regning for å åpne skattekister, handel i butikk.
Statisk PWA i ren HTML/CSS/JS med ES-moduler, ingen byggesteg. Les `PLAN.md` for spilløkka og status før større endringer.

## Kjøre og teste
- Forhåndsvisning: `oya` i `.claude/launch.json` (python http.server, port 8124).
- Røyktest: `node .dev/roykTest.mjs` (skal skrive «Røyktest OK»).
- Egne tester: `node test/regler.test.js` (skal slutte med «Alle tester ok»).
- Python-serveren lar nettleseren cache JS-moduler: kjør `fetch(fil, {cache:'reload'})` før reload ved testing.

## Publisering
- Repo `vegardk-hub/test`, gren `main`, live: https://vegardk-hub.github.io/test/
- Det finnes ingen service worker (`sw.js` hører til det andre spillet «Bygg»). Ingen cache-navn å øke.
- Ved utgivelse: øk `VERSJON` og `DATO` i `js/versjon.js` (vises som merke nederst i alle vinduer, så man ser om iPaden har siste utgave).
- Skillen `publiser-pwa` gjør publiseringen.

## Struktur
- Spillregler uten DOM: `js/regler.js` (også lagringsformat v2 med overføring fra v1). Mattestykker: `js/matte.js`.
- Innhold og tall: `js/data/ting.js` (ting, varer, priser, bygg), `js/data/melodier.js` (44 melodier), `js/data/kunnskap.js` (199 tekster til lærer Frida).
- Tegning: `js/stil/` (`pynt.js` byggene og `LIV`-animasjonene, `ruter.js`, `neon.js` for Neonøya), `js/figurer.js`, `js/museum.js`, `js/seiltur.js`.
- Skjermen og all UI-logikk: `js/main.js`. Lagring: `js/lagring.js`. Lyd/toner: `js/trykk/toner.js`, tale: `js/stemme.js`.
- `katalog.html` viser alle bygg (`?neon` for neonutgaven), `logo.html` er logotegning, `proveark.html` er prøveark for størrelser og sanger.

## Verdt å vite
- Reglene bestemmer alt; skjermen viser bare resultatet (f.eks. hjelpernes turer). Nye regler hører i `regler.js` og testes i `test/regler.test.js`.
- Stykket i en kiste er fast per kiste (`stykkeFor`) til det er løst; feil svar koster ingenting.
- Foreldrekontroll ligger bak voksent gangestykke og firesifret kode (`oya-foreldrekode`, per enhet). Kreativmodus gjør bygg gratis. «Slett spilleren» er bevisst tatt ut av barnas meny.
- Bevisst tak: høyst 10 uåpnede kister, 10 skattekryss, 3 ting per type, 10 stjerneskudd per natt, 3 hjelpere.
- Bevisst valgt bort: «hundre år»/generasjoner/tidssprang, og ryddeskjermen ved mange kister.
- 🐣 Liten og 🧒 Stor har ulike standarder (svar blant tre vs. talltastatur, 70 vs. 50 trykk per dag) og leser mer/mindre tekst.
- Ved headless-skjermbilder tegnes ikke lerreter som oppdateres hele tiden: bytt dem med `<img>` fra `toDataURL()`.
