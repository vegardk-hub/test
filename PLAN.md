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
   Nederst i butikken velger man **farge på taket** på leiren. Den samme fargen brukes på **alle flaggene** på øya (leiren, telt, sirkustelt, tårn, borg, havn, seilbåt og landsbyer).
   Det finnes ni farger (`js/stil/spillerfarge.js`), og valget lagres per spiller.
6. **Kjøp bygg** og sett dem ut der du vil på øya. Det er 20 bygg fra bålplass (10) til borg (400).
7. **Sola** er dagens budsjett (50 trykk for 🧒, 70 for 🐣). Om natta kan man fange stjerneskudd (stjernestøv kan selges).

## Hjelpere (2026-10-06)
- For hvert **femte bygg** man setter opp (totalt, på alle øyene) kommer det en hjelper: Ola, Siri og Per (høyst tre, `HJELPER` i `ting.js`).
  De kommer ut av leiren og vinker når de kommer.
- **Hver morgen** går hjelperne ut av døra på leiren, hver til sin type ting (tre, stein, jern, korn, sau, fisk), og helst forskjellige typer.
  De går til den nærmeste av typen og jobber med verktøy (øks, hakke, ljå, fiskestang, saks). Så høstes tingen, det den gir, flyr ned i forrådet, og de går hjem igjen.
- Hver hjelper samler **én ting per dag**. Det de ikke rakk, gjøres ferdig før neste morgen, og turen starter på nytt hvis man åpner spillet midt i den.
  Det er reglene (`planleggOppdrag`, `hjelperFerdig`) som bestemmer, og skjermen viser bare turen.

## Skolen og Theos oppfinnelser (2026-10-06)
- **Skole** (500 mynter, én per øy) i butikken. Ut kommer et smart barn med briller som **heter det samme som spilleren**, og som går rundt i nærheten av skolen.
- **Med 5–7 dagers mellomrom** (med skole på øya, og det er en overraskelse når) får barnet en **lyspære over hodet**, og en ny oppfinnelse dukker opp i butikken.
  Et «💡❓»-kort viser hvor mange dager det er til neste idé. Trykker man på barnet, sier det hva det tenker på, og teksten står til man trykker på barnet igjen.
- **12 oppfinnelser** (`OPPFINNELSER` i `ting.js`, tegnet i `js/stil/oppfinnelser.js`, alle animert):
  drage (20), boblemaskin (25), trampoline (35, salto når man trykker), godterimaskin (45), iskiosk (60), sjokoladefontene (75), hoppeslott (90),
  vannsklie (110), karusell (130), regnbuemaskin (150), danserobot (175) og flygende tallerken som henter en ku (200).
  Rekkefølgen er tilfeldig, og hver oppfinnelse kommer bare én gang.

## Læreren leser kunnskapstekster (2026-10-07)
- Ut av skolen kommer også **lærer Frida** (grønn genser, grått hår, rød bok), som går rolig rundt rett ved skolen.
  Trykker man på henne, åpnes «📚 Lærer Frida forteller»: hun leser en kunnskapstekst høyt, og setningen hun leser, lyser opp.
- Tekstene er hentet fra **Lesestjerna** (`js/data/kunnskap.js`, 199 sanne tekster i fem emner, uten vitsene).
  Man kan velge emne (🚀 krefter og rommet, 🦔 alt som lever, 🧠 mennesker, 💡 oppfinnelser, 🏆 rekorder, eller 🎲 litt av alt),
  høre den samme teksten igjen eller få en ny. Ingen tekst kommer igjen før alle i emnet er hørt, og de letteste kommer først. 🐣 Liten får nivå 1–2.
- **Stemmen** (`js/stemme.js`) velges som i Lesestjerna: «Microsoft Finn Online (Natural)» i Edge på PC, ellers en forbedret («Enhanced»/«Premium») stemme,
  så en norsk nettstemme, så hvilken som helst norsk stemme. På iPad bruker alle nettlesere (også Edge) Apples talemotor, altså Nora
  (last ned den forbedrede Nora-stemmen under Innstillinger → Tilgjengelighet → Opplest innhold → Stemmer → Norsk for best lyd). Tallene i tellingen bruker samme stemme.
- Barnet på skolen sier bare «Nå har jeg ikke flere ting å finne opp.» når alle tolv er funnet.

## Personene snakker når man trykker på dem (2026-10-07)
- Det kommer ingen automatiske meldinger om hjelperne eller barnet på skolen. Trykker man på en person, kommer en snakkeboble som blir stående til man trykker hvor som helst (det trykket gjør ikke noe annet på brettet, men en annen person åpner sin egen boble).
  - Hjelper på vei ut: «Jeg skal slå korn!». Mens den jobber: «Nå slår jeg korn …». På vei hjem: «Jeg fikk 2 korn! Nå går jeg hjem.»
  - Ny hjelper (står og vinker ved leiren i 12 sekunder): «Hei! Jeg heter Ola …»
  - Barnet på skolen: «Hmm … jeg tenker på noe nytt!» (ikke når ideen kommer).

## Foreldrekontroll (menyen → 🔒 For foreldre, eller «🔒 For foreldre» på startsiden)
- **Foreldrekode:** første gang løser man et voksent gangestykke og lager en firesifret kode (skrives to ganger). Etter det kreves koden.
  «Glemt koden?» gir et vanskeligere stykke (for eksempel 39 × 6), og så kan man lage en ny kode. Koden gjelder for hele enheten (`oya-foreldrekode`).
- **Kreativmodus** (per spiller): alle bygg, havn, skole og seilbåt er gratis. Butikken viser «Gratis» og «🎨 Kreativmodus». Alle oppfinnelsene er låst opp (uten at barnet «finner dem på», så de låses igjen når modusen slås av). Havna krever fortsatt 20 ulike bygg.
- **Spillere:** foreldrene kan fjerne spillere (med bekreftelse). «Slett spilleren» er tatt ut av barnas meny. Koden kan endres samme sted.
- Per spiller: **pluss** og **minus** (tall opp til 5/10/20/50/100), **gange** og **deling** (tabell opp til 2/3/4/5/10).
- Ganging har av og til **× 0** på alle nivåer (10 %), og **× 10** også på nivåene 2–5 (15 %). Ganging med 6–9 kommer først når man velger 10.
- **Standard for nye spillere:** 🐣 Liten får bare pluss opp til 5 (velg blant tre svar), 🧒 Stor får bare ganging opp til 5 (talltastatur).
- Hurtigvalg fra HEX: 4–5 år, 6–8 år og 9–10 år.
- **Svarmåte**: velg blant tre svar (for de minste) eller skriv svaret på talltastatur.
- **Telling**: vis tallene, og les dem høyt (norsk stemme på iPad).
- **Statistikk** (eget panel):
  - Matte: stykker løst, riktige på første forsøk, riktige av alle svar (og antall feil), kister åpnet, og en tabell per regneart.
  - Spilling: alle trykk i spillet, tid i spillet (telles i steg på 10 sekunder mens spillet er framme), dager, og trykk som brukte sol.
  - På øya: ruter avdekket, ting samlet, skattekryss gravd fram, stjerneskudd, bygg, mynter tjent, hjelpere og hva de har samlet, sanger lært, oppfinnelser, tekster læreren har lest, og øyer.

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

## Mer aktive hjelpere (2026-10-08)
- Hver hjelper går **fire turer om dagen** (`HJELPER.turer`). Når alle er hjemme fra en tur, hviler de 2,5 sekunder og går ut igjen (`nesteRunde`).
  Det de ikke rekker før dagen er over (turen de er ute på, og turene de har igjen), kommer i forrådet neste morgen.
- Hjelperne går til den tingen av sin type som ligger **lengst unna**, så barnet får ha de nærmeste i fred. De går litt fortere enn før.
- **Nye ting dukker opp lenger og lenger unna leiren** (`SPAWN`): den første om morgenen ca. 2 ruter unna, og hver neste av samme type 1,5 ruter lenger ut.
  Hver morgen begynner det nær leiren igjen.

## Natt av og på (2026-10-08)
- Knappen øverst til høyre (der sangboka sto) skrur **natta av og på**: 🌙 = natta er på (som før), ☀️ = natta er av.
- **Med natta av** (`spill.evigDag`) brukes det ingen solstråler, det blir aldri kveld, og sola står stille midt på himmelen. «Dag N» og soltallet skjules.
  Dagene går likevel videre **i det stille** for hvert 50. trykk (70 for 🐣), uten nattskjerm: ting vokser fram igjen, hjelperne går ut, skattekryssene kommer og barnet på skolen får ideer.
  «🌙 Legg deg nå» i menyen virker fortsatt, for den som vil fange stjerneskudd.
- **Sangboka** ligger nå i menyen («🎵 Sangboka»).

## Tak på kryss og ressurser (2026-10-07)
- Høyst **10 skattekryss** ute samtidig (`KRYSS.maks`). Nye kryss kommer bare når det er plass.
- Høyst **3 klikkbare ting av hver type** (tre, stein, jern, korn, sau, fisk) samtidig (`MAKS_PER_TYPE`, `fyllOpp` i `regler.js`).
  De som er ute, blir stående til de er høstet. Når det blir plass, kommer den nærmeste ledige av typen fram (ting man har begynt på, først). Kister regnes ikke med.

## Skattekryss og stjernegrense (2026-10-06)
- **Annenhver natt** (før dag 3, 5, 7 …) dukker det opp **3 røde skattekryss** på avdekkede, tomme landruter.
- Trykk **4 ganger** på et kryss for å grave (det telles 1, 2, 3, 4, hullet blir større), og så **spretter en kiste fram**. Den åpnes med mattestykker som de andre.
  Når kista er åpnet, blir ruta tom igjen, og det kan komme nye kryss der senere. Graving koster sol, som andre trykk.
- **Høyst 10 stjerneskudd per natt.** Teksten viser «✨ 3 av 10». Ved 10 kommer det ikke flere, og etter noen sekunder blir det morgen.

## Havn og Neonøya (2026-10-06)
- Når **alle de 20 ulike byggene** står på øya, låses **havna** opp i butikken (150 mynter). Butikken viser hvor mange man har, for eksempel «🔒 19 av 20».
  Havna må stå på land rett ved sjøen.
- Trykk på havna for å **bygge en seilbåt** (250 mynter). Deretter kan man velge mellom **«Seil til en ny øy!»** og **«Bli her litt til»**. Seilturen er frivillig.
- **Seilturen** er en tegnet film på 4,2 sekunder (`js/seiltur.js`): båten legger ut fra stranda, ligger i vannet (bølgene foran dekker skroget) og vugger med kjølvann. Øya man forlater glir bakover, og den nye kommer inn. Himmel, sol, hav og øyer går gradvis over mellom vanlig dag og neon (synthwave-sol, stjerner og lysende rutenett), med glitter i overgangen. Den nye øya lages med samme generator og ny seed, og **man går i land på en landrute ved havet**.
  Man tar med seg forrådet og myntene. Den gamle øya lagres i `spill.oyer`, men man kan ikke reise tilbake ennå.
- **Øy 2 er Neonøya** (`OY_STIL` i `ting.js`): mørk bakke, kort med lysende kanter, alle ting og bygg i sterke neonfarger med glød,
  lilla himmel med en stripete sol, og menyer og knapper i neon.
- Teknikk (`js/stil/neon.js`): tegnekoden er den samme. Canvas-konteksten lappes, så hver farge byttes til en neonfarge når den settes,
  ut fra hvilket lag som tegnes (bakke, kant eller figur, satt i `ruter.js`). Gløden lages av et nedskalert bilde som legges oppå med «lighter».
- Byggekatalogen kan vise neonutgaven: `katalog.html?neon`.
- **Seile tilbake** (2026-10-06): båten følger med fra øy til øy. Knappen ⛵ i toppen (og havna) åpner **sjøkartet** med alle øyene man har funnet.
  Derfra kan man seile tilbake når som helst, og alt er som man forlot det. Ting har vokst fram igjen mens man var borte, og man tar med seg forrådet og myntene.
  Hver havn kan finne **én** ny øy, så for å finne øy 3 må man sette opp alle 20 byggene og en havn på øy 2. Seiling til en kjent øy fyller ikke opp sola.

## Mulige neste steg
- Flere stiler for øy 3, 4 … (for eksempel is, godteri eller verdensrommet). Nå blir øy 3 og videre også neon.
- Flytte eller rive bygg man har satt ut, og «Mine bygg» i butikken
- Telling også i butikken (mynter som telles opp én og én for de minste)
- Flere regnearter for de eldste (tallforståelse, klokka, penger)
- PWA (ikon og bruk uten nett) når spillet er klart til å installeres
