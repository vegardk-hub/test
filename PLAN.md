# Skatteøya – plan og status (2026-10-06)

Et koselig utforskings- og byggespill for barn på iPad, med læring bygget inn:
**man teller** når man trykker på ting, **man regner** for å åpne skattekister,
og **man handler** med skattene man finner. Idéene om generasjoner og tidssprang
(«Øya i hundre år») er tatt ut.

Live: https://vegardk-hub.github.io/test/ · prøveark: `proveark.html` · byggekatalog: `katalog.html`

---

## Spilløkka
1. **Børst bort tåka** – 3 strøk per rute. Hvert strøk viser et tall (1, 2, 3).
2. **Trykk på ting** – tre, stein, jern, fisk, korn og sauer finnes i tre størrelser.
   Hvert trykk er **én tone i en barnesang** og **ett tall**, som telles opp til tallet som fjerner tingen.
   Små ting spiller starten av sangen, store spiller hele.
3. **Skattekister åpnes med mattestykker** – liten kiste 1 stykke, stor 2, kjempekiste 3.
   **Ca. hver femte rute** man avdekker skjuler en kiste (4–6 ruter mellom hver, aldri i vannet), så det blir mye regning.
   Feil svar koster ingenting (prøv igjen), og hvert riktig svar spiller en bit av «Happy Birthday».
4. **Skattene**: stjernestøv (3 mynter), sølv, gull og edelsteiner (topas, ametyst, smaragd, safir, rubin, diamant).
5. **Butikken** (trykk på leiren eller 🏪): selg skatter og råvarer for mynter. Salgsraden viser regnestykket, for eksempel «4 × 20 = 80».
6. **Kjøp bygg** og sett dem ut der du vil på øya. Det er 20 bygg fra bålplass (10) til borg (400).
7. **Sola** er dagens budsjett (50 trykk for 🧒, 70 for 🐣). Om natta kan man fange stjerneskudd (stjernestøv kan selges).

## Foreldrekontroll (menyen → 🔒 For foreldre, bak et voksent gangestykke)
- Per spiller: **pluss** og **minus** (tall opp til 5/10/20/50/100), **gange** og **deling** (tabell opp til 2/3/4/5/10).
- Hurtigvalg fra HEX: 4–5 år, 6–8 år og 9–10 år.
- **Svarmåte**: velg blant tre svar (for de minste) eller skriv svaret på talltastatur.
- **Telling**: vis tallene, og les dem høyt (norsk stemme på iPad).
- **Statistikk**: antall løste stykker, andel riktige på første forsøk og fordeling per regneart.

## Gjenbrukt fra HEX (`C:\Vegard\Claude\hex-game`)
- Oppgavegeneratoren i `matte.js` (pluss bygges fra svaret og ned, minus gir aldri svar under 1, ekte minustegn, aldri samme stykke to ganger på rad).
- Talltastaturet (1–9, ⌫, 0, ✓), og at feil svar bare gir et rist og «prøv igjen».
- Aldersnivåene som hurtigvalg, og statistikk over riktige svar på første forsøk.

## Filer
- `js/regler.js` – alle regler uten DOM (tåke, ting, kister med matte, salg, kjøp og plassering, lagring versjon 2 med overføring fra versjon 1)
- `js/matte.js` – mattestykker og svaralternativer
- `js/data/ting.js` – alle tall: ting, varer og priser, kisteinnhold, de 20 byggene
- `js/stil/pynt.js` – tegningene av byggene · `js/ikoner.js` – ikonene for edelsteiner og barrer
- `js/main.js` – skjermen (nærbilde, teller, regnepanel, butikk, foreldrekontroll)
- Test: `node test/regler.test.js`

## Animasjoner (2026-10-06)
- **Byggene lever** (`LIV` i `js/stil/pynt.js`): flagg blafrer, bålet flakker med gnister, røyk fra pipa, vindmølla og pariserhjulet går rundt,
  fontenen spruter, ballongen dupper, fyrtårnet feier med lys, fugler flyr rundt trehuset og stavkirka, værhanen snur seg, snøen daler, ildfluer svever.
- **Trykk på et bygg i nærbildet**: alt går fortere en stund, og **raketten skytes opp** og lander igjen.
- **Dyrene lever**: sauene beiter, puster, logrer og blunker. Hjorten løfter hodet og vipper med halen, og fiskene spreller.
- Teknikk: kortet med det som står stille lagres som før, og bare det som beveger seg tegnes på nytt hver gang skjermen tegnes, og bare for ruter man ser.

## Skattekryss og stjernegrense (2026-10-06)
- **Annenhver natt** (før dag 3, 5, 7 …) dukker det opp **3 røde skattekryss** på avdekkede, tomme landruter.
- Trykk **4 ganger** på et kryss for å grave (det telles 1, 2, 3, 4, hullet blir større), og så **spretter en kiste fram**. Den åpnes med mattestykker som de andre.
  Når kista er åpnet, blir ruta tom igjen, og det kan komme nye kryss der senere. Graving koster sol, som andre trykk.
- **Høyst 10 stjerneskudd per natt.** Teksten viser «✨ 3 av 10». Ved 10 kommer det ikke flere, og etter noen sekunder blir det morgen.

## Havn og Neonøya (2026-10-06)
- Når **alle de 20 ulike byggene** står på øya, låses **havna** opp i butikken (150 mynter). Butikken viser hvor mange man har, for eksempel «🔒 19 av 20».
  Havna må stå på land rett ved sjøen.
- Trykk på havna for å **bygge en seilbåt** (250 mynter). Deretter kan man velge mellom **«Seil til en ny øy!»** og **«Bli her litt til»**. Seilturen er frivillig.
- Seilturen er en liten animasjon. Den nye øya lages med samme generator og ny seed, og **man går i land på en landrute ved havet**.
  Man tar med seg forrådet og myntene. Den gamle øya lagres i `spill.oyer`, men man kan ikke reise tilbake ennå.
- **Øy 2 er Neonøya** (`OY_STIL` i `ting.js`): mørk bakke, kort med lysende kanter, alle ting og bygg i sterke neonfarger med glød,
  lilla himmel med en stripete sol, og menyer og knapper i neon.
- Teknikk (`js/stil/neon.js`): tegnekoden er den samme. Canvas-konteksten lappes, så hver farge byttes til en neonfarge når den settes,
  ut fra hvilket lag som tegnes (bakke, kant eller figur, satt i `ruter.js`). Gløden lages av et nedskalert bilde som legges oppå med «lighter».
- Byggekatalogen kan vise neonutgaven: `katalog.html?neon`.

## Mulige neste steg
- Reise tilbake til de gamle øyene, og flere stiler for øy 3, 4 … (for eksempel is, godteri eller verdensrommet)
- Flytte eller rive bygg man har satt ut, og «Mine bygg» i butikken
- Telling også i butikken (mynter som telles opp én og én for de minste)
- Flere regnearter for de eldste (tallforståelse, klokka, penger)
- PWA (ikon og bruk uten nett) når spillet er klart til å installeres
