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
   **Stykket hører til kista** (`stykkeFor`): det er det samme, med de samme svaralternativene, hver gang man åpner kista – helt til det er løst.
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
- `js/museum.js` – museumsrommet: 3D-edelsteiner, glassmontre og samlingstavla
- Test: `node test/regler.test.js`

## Animasjoner (2026-10-06)
- **Byggene lever** (`LIV` i `js/stil/pynt.js`): flagg blafrer, bålet flakker med gnister, røyk fra pipa, vindmølla og pariserhjulet går rundt,
  fontenen spruter, ballongen dupper, fyrtårnet feier med lys, fugler flyr rundt trehuset og stavkirka, værhanen snur seg, snøen daler, ildfluer svever.
- **Trykk på et bygg i nærbildet**: alt går fortere en stund, og **raketten skytes opp** og lander igjen.
- **Dyrene lever**: sauene beiter, puster, logrer og blunker. Hjorten løfter hodet og vipper med halen, og fiskene spreller.
- Teknikk: kortet med det som står stille lagres som før, og bare det som beveger seg tegnes på nytt hver gang skjermen tegnes, og bare for ruter man ser.

## Stor sangbok og tilfeldige melodier (2026-10-08, v1.45)
- **44 melodier** (`js/data/melodier.js`): 26 klassiske stykker (Beethoven, Mozart, Bach, Grieg, Vivaldi, Tsjajkovskij, Brahms, Strauss, Pachelbel,
  Offenbach, Rossini, Bizet, Haydn, Dvořák, Wagner, Holst) og 18 sanger og viser (de sju barnesangene fra før, Ja, vi elsker, Glade jul, Bjelleklang,
  Greensleeves, Amazing Grace m.fl.). Alle er uten opphavsrett. Hver melodi er skrevet med toner **og rytme**.
- **Hver ting på øya får en tilfeldig melodi** (ny hver gang noe vokser fram). Ett trykk = én tone, som før: den lille tingen spiller starten,
  den mellomste litt mer, og den store hele melodien. Instrumentet følger fortsatt tingen (hogg, treblokk, ambolt …). Kistene har sin faste sang.
- **Sangboka ligger i stavkirka**: trykk på stavkirka for å gå inn. (Den kan også åpnes fra menyen.) Den viser alle melodiene i to grupper,
  med komponist. Melodier man ikke har funnet, står som «???». ♪ / ♪♪ / ♪♪♪ viser hvor mye man har lært.
- **Trykk på en melodi** (hele raden) for å høre det man har lært av den, spilt med orgelklang i riktig rytme. Et nytt trykk stopper.
- Meldinger: «Ny melodi i sangboka: …» første gang, og «Nå kan du hele …» når en stor ting er trykket ferdig.
- Det hjelperne samler inn, gir ingen melodier – barnet må trykke selv.

## Høyst ti kister på øya (2026-10-08, v1.43)
- Det er aldri mer enn **10 uåpnede kister** på øya (`MAKS_KISTER`). Skattekryssene regnes med, siden de blir til kister når man graver.
- Når det er fullt, kommer det ingen nye kister når man børster bort tåke, og ingen nye kryss om natta.
  Kister som lå under tåka fra før, ligger skjult (`skjult` på ruta) og kommer fram én og én når en annen kiste er åpnet, nærmest leiren først.
- Gamle lagringer med flere enn ti: de ti nærmeste vises (og dem man har begynt på), resten venter. Kryss det ikke er plass til, tas bort.

## Ryddeskjermen er fjernet (2026-10-08, v1.42)
- Skjermen som kom når det lå ti uåpnede kister på øya (og krevde at fem ble åpnet), er tatt bort. Den trengs ikke nå som
  metallene og edelsteinene i museet gir barna lyst til å åpne kister. Uåpnede kister blir bare liggende.

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

## 22 metaller og 36 edelsteiner med sjeldenhet (2026-10-08)
- **20 nye metaller** og **30 nye edelsteiner/smykkesteiner** (`VARER` i `ting.js`), i tillegg til sølv, gull og de seks steinene fra før.
  Alle finnes på ordentlig, med fargen de har i naturen. Det finnes bare åtte egentlige edelmetaller (gull, sølv og de seks i platinagruppen),
  så lista er fylt opp med andre ekte metaller (kobber, tinn, sink, nikkel, titan, krom, kobolt, wolfram, vismut, niob, tantal, indium, rhenium)
  og elektrum, som er en naturlig blanding av gull og sølv.
- **Sjeldenhet** (`SJELDENHET`): grad 1–5 = vanlig, uvanlig, sjelden, svært sjelden, legendarisk. Hver grad trekkes en tredel så ofte
  som den forrige (vekt 81, 27, 9, 3, 1 per ting). Per trekk og per edelstein: 6,7 % · 2,2 % · 0,74 % · 0,25 % · 0,09 %.
- **Kistene** (`KISTE`, `trekkSkatt`): liten = én ting (metall eller edelstein), stor = 1 metall + 2 edelsteiner, kjempe = 2 + 2 og én
  edelstein som er minst «uvanlig». Større kister har mer «lykke», som løfter sjansen for de sjeldne.
- **Prisene** (4–300 mynter) er satt slik at en kiste er verdt omtrent det samme som før i snitt (ca. 13, 52 og 108 mynter),
  selv om det er færre ting i den. De sjeldne er verdt mest. (v1.39: færre ting og tre ganger så bratt sjeldenhet, etter brukertest.)
  Finner man noe som er minst «sjelden», står det i meldingen («★★★★ Du fant aleksandritt – svært sjelden!»).
- **Nye slag kommer litt etter litt** (v1.40, `NYFUNN` og `kisteinnhold` i `regler.js`): kistene gir mest av slagene man allerede kjenner
  (`spill.kjent`). Et nytt slag kommer først når man har løst nok **regnestykker i kister** siden forrige nye slag: ca. 5 for et vanlig,
  8 for et uvanlig, 12 for et sjeldent, 18 for et svært sjeldent og 26 for et legendarisk (± 30 %). De vanlige kommer stort sett først,
  men innimellom kommer et sjeldnere tidlig. De tre første slagene kommer fortere. I snitt: 3 slag etter 10 stykker, 9 etter 50,
  16 etter 100, 28 etter 200, og hele samlingen (58 slag) etter ca. 650 stykker. Graden trekkes som før (også for slag man ikke kjenner);
  kjenner man ingen av graden, får man nærmeste lavere grad. Derfor er kistene verdt mindre i starten (ca. 8, 27 og 46 mynter)
  og mer etter hvert (ca. 19, 62 og 128). Et nytt slag ropes opp: «🆕 Nytt funn: jaspis! ★ vanlig.»
  Gamle lagringer kjenner det de har i forrådet og museet.
- **Forrådet** nederst har én rute for alle metallene og én for alle edelsteinene (det er for mange slag til en rute hver).
  I butikken står de hver for seg, med stjerner og sjeldenhet.
- **Museet** har sju **saler** med høyst ni montre: Metaller 1–3 (stjernestøvet står i den første) og Edelsteiner 1–4, fra de vanligste
  til de sjeldneste. Knappene ◀ ▶ nederst bytter sal. Stjernene på sokkelen viser sjeldenheten, og nærbildet skriver den med ord.
  **Samlingen** viser alle 59 på én tavle (spørsmålstegn for dem man ikke har), med «18 av 59 slag funnet».
- Nye fasonger og stoffer i `museum.js`: markise, prinsesse, trillion, oktaeder, kuppel og cabochon, krystallstav, terning, barre og
  trommelpolert stein; steiner man ikke ser gjennom (med bånd for agat, malakitt og tigerøye), perle, opal med fargespill,
  og aleksandritt som skifter mellom grønn og rød mens den snurrer.

## Museet (2026-10-08)
- **Museum** er et nytt bygg som er **gratis** (`MUSEUM` i `ting.js`), ett per øy. Det står først i butikken.
- **Skattene man selger** (stjernestøv, sølv, gull og edelsteinene) blir ikke borte: de telles i `spill.museum` (vare → antall).
  Samlingen hører til spilleren og følger med fra øy til øy. Råvarer (tre, stein, korn …) havner ikke der.
  Alt som selges fra og med v1.35 telles, også før museet er bygget. Det som ble solgt før, er det ingen oversikt over.
- **Trykk på museet** for å gå inn i et rom med ni **glassmontre** på sokler (to rekker liggende, tre rekker stående). I hver monter
  svever tingen over en dreieskive og **snurrer sakte** i lyset fra en lampe. Har man mange (3, 10, 25), ligger det flere små på skiva.
  Tomme montre viser en mørk skygge og et spørsmålstegn.
- **Trykk på en monter** for å se tingen stort, med navn og antall. **Navnet leses høyt** (for både Liten og Stor, når lyden er på). **Trykk på tingen** der, så snurrer den fort og det spruter gnister.
- Knappen **📖 Samlingen** viser alt samlet på en fløyelstavle med gullramme: hver ting, navnet og antallet, og summen nederst.
- 🐣 Liten har også tekst i museet (barnet øver seg på å lese), og navnene på steinene og metallene står med STORE BOKSTAVER.
- I **kreativmodus** vises alle tingene i montrene (også dem man ikke har solgt), så det er lett å se på dem. Antallet er det ekte.
- Teknikk (`js/museum.js`): edelsteinene og klumpene er små **3D-former med flate fasetter** (brilliant, oval, smaragdslip, dråpe, sekskant,
  krystallklynge og to klumper laget av en kule med kuler og søkk). Hver fasett får farge etter hvilken vei den vender mot lyset.
  Edelsteinene tegnes med baksiden først og en halvt gjennomsiktig forside oppå, så det ser ut som lyset kastes rundt inni; fasetter
  som treffer lyset, får et stjerneglimt. Diamanten har regnbuefarger («ild»). Stjernestøvet står i et glass med kork, med korn som virvler.
  Rommet, soklene og glasset tegnes én gang i to lag (bak og foran tingene); bare tingene og lyset tegnes hver gang.
  Brettet tegnes ikke mens museet er åpent.

## Mulige neste steg
- Flere stiler for øy 3, 4 … (for eksempel is, godteri eller verdensrommet). Nå blir øy 3 og videre også neon.
- Flytte eller rive bygg man har satt ut, og «Mine bygg» i butikken
- Telling også i butikken (mynter som telles opp én og én for de minste)
- Flere regnearter for de eldste (tallforståelse, klokka, penger)
- PWA (ikon og bruk uten nett) når spillet er klart til å installeres
