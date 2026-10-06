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
   Feil svar koster ingenting (prøv igjen), og hvert riktig svar spiller en bit av «Happy Birthday».
4. **Skattene**: sølv, gull og edelsteiner (topas, ametyst, smaragd, safir, rubin, diamant).
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

## Mulige neste steg
- Flytte eller rive bygg man har satt ut, og «Mine bygg» i butikken
- Små animasjoner på byggene (vindmølla snurrer, raketten skytes opp, pariserhjulet går rundt)
- Telling også i butikken (mynter som telles opp én og én for de minste)
- Flere regnearter for de eldste (tallforståelse, klokka, penger)
- PWA (ikon og bruk uten nett) når spillet er klart til å installeres
