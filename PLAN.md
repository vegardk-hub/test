# Bygg 2 – «Øya i hundre år» (plan, runde 3, 2026-10-06)

> `PLAN.md` beholdes som historikk.
> Runde 1 (norske eventyr) ble forkastet: ny drakt på kjente mekanikker.
> Runde 2 ga tre konsepter, og valget ble **«Øyene vi tegnet» + tidsspranget fra «Hundre år»**.

---

## 0. Beslutninger (2026-10-06)
| Tema | Valg | Hva det betyr |
|---|---|---|
| Konsept | **Tegnede øyer + tidssprang** | Øya eldes mellom generasjonene. Mens du spiller, bygger du for dem som kommer etter |
| Hvem tegner | **Mest tilfeldige øyer** | Generatoren lager øyene. Å tegne øya selv kommer som **bonus** i en sen fase |
| Alder | **Tre nivåer**: 🐣 under 6 år · 🧒 9 år og eldre · 🧑 voksen | Den samme øya og koden, men nivåene endrer regler, tall og grensesnitt |
| Økonomi | **Et helt nytt system** med trykking som kjerne («liten kiste 5 trykk, stor kiste 10») | Mynter, marked, produksjon per dag og handelsruter **skrotes** |
| Generasjonslengde | **Spilleren bestemmer** | Tidsuret blir klart etter en minstetid (for eksempel 5 dager), og så velger man selv når tiden skal gå |
| Flere spillere | **Én om gangen** | Hver spiller har sin egen øy med eget nivå (profiler). Kjempekista blir «bruk begge hender», ikke familietrykk |
| Gammelt spill | **Nytt eget repo** | `vegardk-hub/bygg` står urørt. Det nye spillet får eget repo og egen adresse (navn velges senere) |
| Før T1 | **Prøveark først** | `trykkprove.html` (ligger midlertidig i Bygg-mappen og bruker kortgrafikken derfra) |

---

## 1. Det nye økonomisystemet: **Hender · Sol · Arv**

> I et vanlig byggespill går det slik: bygg noe → det produserer av seg selv → tallene stiger.
> Her er det omvendt. **I første generasjon gjør du alt med hendene. Det du gjør, går i arv, og i neste generasjon har arven blitt til hjelpere, verktøy og maskiner.**
> Spillet går fra å trykke til å planlegge etter hvert som slekta vokser. Derfor passer det for en fireåring i starten og for en voksen senere.

### 1.1 Hender: alt du får, får du ved å trykke
- **Alt på brettet har et antall trykk.** Det vises som prikker (●●●○○) og ikke som tall for de minste.

  | Ting | Trykk | Gir (eksempel) |
  |---|---|---|
  | Tåkekort («børst bort tåka») | 3 | kortet snus |
  | Lite tre | 6 | 🪵 3 |
  | Stein | 8 | 🪨 3 |
  | Bærbusk / epletre | 4 | 🍎 2 |
  | **Liten kiste** | **5** | en liten overraskelse |
  | **Stor kiste** | **10** | en større overraskelse (frø, nøkkel, skatt, byggetegning) |
  | **Kjempekiste** | **30, flere fingre samtidig** | noe sjeldent. **Hele familien trykker sammen** |
  | Låst kiste | 10 + 🗝️ | det kista inneholder |
  | Bygge et hus | 12 hammerslag | huset står ferdig |

- **Hvert trykk er en tone.** En kiste spiller en kjent folketone (for eksempel «Fader Jakob» eller «Bæ, bæ, lille lam»), én tone per trykk.
  **Siste trykk er siste tone, og da spretter lokket opp.** Barn som ikke kan telle, *hører* hvor mye som er igjen.
  Ulike ting har ulike instrumenter: trær er trommer, steiner er treblokker, kister er xylofon.
- **Ting reagerer:** de vugger, sprekker og rister, og til slutt kommer det et lite smell der ting flyr inn i forrådet. Den hyppigste handlingen skal føles best.
- **Nærbilde:** når du trykker på en kiste, åpner den seg stort på skjermen, som en gave du skal pakke opp.
  Da er det plass til mange fingre samtidig, og dra og knip på kartet kommer ikke i veien.
- **Bevegelser (fra nivå 🧒):** **sveip** for å sage og meie (3 trykk på én gang), **hold** for å fiske og plante, **ring** for å grave og røre.
  Bevegelsene etterligner det man ville gjort i virkeligheten.

### 1.2 Sol: dagslyset er budsjettet
- Over brettet går **sola i en bue**. Hvert trykk flytter den litt (én solstråle). **Når sola går ned, er dagen over.** Det er fortsatt turbasert, og det er ingen klokke som tikker.
- Dette erstatter «Ny dag»-knappen og avdekkingsprisen. Det du betaler med, er **tid**. Barn forstår «sola går ned når du jobber».
- 🌙 **Natta er en liten bonusrunde:** stjerneskudd faller over brettet. Trykk på dem (det koster ikke sol), og du får ✨ **stjernestøv**,
  som brukes til trolldom og til de store byggene som tar flere generasjoner. Så kommer morgenen, og sola er full igjen.
- (Brettspillet *Photosynthesis* bruker sollys som valuta. Her er det tiden selv, ikke lyset, som er valutaen.)

### 1.3 Arv: tidsspranget gjør innsatsen om til framtid
- En **generasjon** varer et fast antall dager. Den siste kvelden er det **slektsfest**, og så kommer **tidsspranget**: 30 år går foran øynene dine.
- Hva som skjer i tidsspranget, avhenger av hva du gjorde:

  | Det du gjorde | Blir til |
  |---|---|
  | 🌰 plantet et frø (2 trykk) | et stort tre (et 10-trykkstre som gir mye). **Eik tar 2 generasjoner**, men blir en kjempeeik og et landemerke. Bjørk vokser fort |
  | 🍎 ga mat til en familie | **barna deres blir hjelpere** som trykker for deg hver dag (automatikk som går i arv) |
  | 🔨 bygde en hytte | den blir et hus, så en gård, og så en tun. Dette bruker nivåene og landsbystørrelsene vi allerede har |
  | 👆 trykket ofte på steder langs samme strek | **berøringskartet**: øya husker fingrene dine, og det blir **sti** der du har trykket mest, så **steinvei**, så **jernbane** (Foundation lager stier av fottrinn, men her kommer stiene av berøring og arv) |
  | 📦 **gravde ned en tidskapsel** med ting i | den kommer fram neste generasjon med **mer enn du la i** (frø har spiret). Man kan skrive en hilsen: «Til den som finner dette – hilsen pappa, 2026» |
  | 🏰 la en etasje på **arvebygget** | et byggverk som tar 3–4 generasjoner (fyrtårn, stavkirke, kjempetrehytte). **Oldebarnet legger den siste steinen** |

- **Epoker:** generasjon 1 er hånd og øks, generasjon 2 er sag og plog (sveip gir mer), generasjon 3 er vannhjul og tog (maskiner trykker for deg).
  Veier og jernbane fra prøvearket blir altså epokene.
- **Slektsalbumet:** hvert tidssprang gir et bilde av brettet. Man kan bla gjennom og se øya vokse over hundre år.

### 1.4 Hva man samler
- **Materialer:** 🪵 tre · 🪨 stein · 🍎 mat. De minste ser dem som hauger, ikke tall.
- **Frø** 🌰 (eik, bjørk, epletre, korn), **nøkler** 🗝️, **stjernestøv** ✨, **skatter** 💎. Skattene er samleobjekter i et lite slektsmuseum, og man kan bytte dem med skipet senere.
- **Ingen mynter.** Verdien ligger i tid (sola), hender (trykk) og arv.

### 1.5 Hvorfor dette er nytt
De enkelte delene har slektninger: klikkespill (Cookie Clicker), toner per trykk (Piano Tiles), sol som valuta (Photosynthesis), stier av fottrinn (Foundation).
**Det har jeg ikke funnet noe sted:** et byggespill der *de samme trykkene* er musikk, utforsking og budsjett, og der arven gjør hendenes arbeid om til automatikk generasjon for generasjon.
Det samme gjelder at hele familien kan trykke på samme kiste samtidig.

---

## 2. Tre nivåer på samme øy

| | 🐣 Under 6 år | 🧒 9 år og eldre | 🧑 Voksen |
|---|---|---|---|
| Hender | bare trykk | trykk + sveip, hold og ring | det samme, og å **holde** inne gir automatiske trykk (skåner fingrene) |
| Sol | ingen grense. Øya blir «søvnig» og legger seg selv | 40 solstråler per dag | 30 solstråler, og flere ting trenger nøkkel |
| Tall | prikker, hauger og toner | tall og ikoner | tall og oversikt over hva arven vil gi |
| Generasjon | når spira er stor, kommer **Tidsuret** fram | 8 dager | 8 dager. Planlegging over flere generasjoner |
| Valg | ingen valg kan bli feil | hva du bruker sola på | hva du investerer for barnebarna (eik eller bjørk, kapsel eller bruke nå) |
| Hjelpere | jobber av seg selv | du velger oppgave | timeplan og ruter. Hjelperne er det voksne spill handler om |
| Mål | finne, åpne og se ting vokse | arvebygget | **arvepoeng**: hvor rik arv du etterlater |
| Tekst | ingen, alt leses opp | korte ord | vanlig |

---

## 3. Øyer: tilfeldige, og eldre for hver gang
- Øyene lages av **generatoren** (som i dag). Tåka skjuler kister, folk, frø og arvebyggtomter.
- **Tidsspranget gjelder alle øyene.** Når du seiler tilbake til en øy, har den levd videre: trær har vokst, og hjelperne har samlet til deg.
- **Skipet** kommer i epoke 2 (sag og plog), og da kan man seile til nye øyer. Det man tar med, avhenger av lasterommet, som før.
- **Bonus i sen fase:** «Tegn en øy» (først med fingeren på iPaden, så med foto av papir), og flaskepost fra besteforeldre.

---

## 4. Behold · juster · skrot

**Behold**
- Kortgrafikken (`js/stil/*`), `brett.js`, kamera og zoom, kartgeneratoren, `lyd.js` (bygges ut med toner og instrumenter), `effekter.js`
- Veier og jernbane (blir epokene), nivåer og landsbystørrelser (blir aldring), skip og havkart (strukturen)
- Lagring med versjoner og lagrekode, PWA, testroboten i Node (den lærer å trykke)

**Juster**
- `kamera.js`: skille mellom trykk på en ting og dra eller knip på kartet. Nærbildet tar seg av det når flere fingre trykker
- `veinett.js`: stier lages av berøringskartet ved tidssprang, ikke ved at man bygger veier
- Havkartet: viser øyene som de ser ut i den generasjonen du er i

**Skrot**
- Mynter, avdekkingspris, marked, prisfall, handelsruter, produksjon per dag, oppdrag, sjekklista med 46 mål
- Råvarelinja med 7 tall. Taket på 100 i lageret
- «Ny dag»-knappen (sola tar over), hendelser som sprettopp-vinduer (de blir kister og nattbesøk)
- Kartverkstedet med Kenney-grafikken

---

## 5. Faser

| Fase | Innhold | Ferdig når |
|---|---|---|
| **T1** Trykkmotoren | Ting med prikker, vugging, sprekker og smell. Toner per trykk (folketoner). Små, store og kjempekister (flere fingre i nærbilde). Børst bort tåka. Sola og natta med stjerneskudd. Nivåvalg 🐣/🧒 | Barna trykker i 10 minutter og vil fortsette. **Beslutningspunkt** |
| **T2** Bygg med hender | Byggetegninger, hammerslag, verktøy som ganger trykkene, mat til familier, berøringskart | Første hytte står |
| **T3** Tidsspranget | Generasjonsløp, aldringsregler, animasjonen, tidskapsler med hilsen, slektsalbum | «Se, eika jeg plantet!» |
| **T4** Hjelpere og epoker | Automatikk som går i arv, sag og plog og maskiner, stier → steinvei → bane, arvebygget, 🧑-nivået med arvepoeng | En voksen planlegger 3 generasjoner fram |
| **T5** Hav og øyer | Skip, nye tilfeldige øyer som også eldes, «Tegn en øy» (bonus) | Seile tilbake til en øy som har vokst |
| **T6** Puss | Opplesing (nb-NO), blås bort tåka (mikrofon), ekte vær (valgfritt), iPad-test, balanse | Klar for familien |

**Lagring:** egen lagring i det nye repoet, med én lagret øy per spillerprofil. Det gamle spillet beholder sin egen.

## Prøveark (2026-10-06)
`trykkprove.html` + `js/trykkprove.js` + `js/trykk/toner.js` (og `tegnTomtKort` i `js/stil/ruter.js`):
- **Hender og sol:** tåke (3 børstestrøk), tre (6, «Alle fugler»), stein (7, «Bæ, bæ, lille lam»), liten kiste (5) og stor kiste (10, begge «Ro, ro, ro din båt»), kjempekiste (32, «Fader Jakob», flere fingre).
  Prikker for trykk, vugging, flis og gnister, lys som lekker ut av kista, lokket som spretter opp, ting som flyr ned i forrådet.
- **Sola:** 40 solstråler (🧒) / 60 (🐣). Himmelen går fra morgen til kveld. Natta har måne og stjerneskudd man fanger (✨), og «God morgen» fyller sola igjen.
- **Tidsspranget:** 6×4 kort fra 1926 til 2016. Spire → eik → kjempeeik med huske, leir → grend → bygd med kirke, sti → steinvei → jernbane,
  sådd åker → gård med låve og mølle, tidskapsel → brev fra oldemor (2 frø ble 4) → minnestein. Hjelpere: hogstbu, steinbrudd. Rullende årstall, løv i lufta, slektsalbum.
- **Nivå:** 🐣 har ingen tekst, større prikker, en sol med smilefjes og hauger i stedet for tall. 🧒 viser tall og navn.

---

## 6. Risiko
| Risiko | Tiltak |
|---|---|
| Trykking blir slitsomt eller kjedelig | sola begrenser trykk per dag, sveip gir mer, voksne kan holde inne, hjelpere tar over i generasjon 2. Mange ulike toner og overraskelser |
| Trykk på en ting forveksles med å dra kartet | trykk på en ting fanges med en gang (pointer capture). Nærbildet tar seg av flere fingre. Testes tidlig i T1 |
| iPad zoomer eller markerer ved raske trykk | `touch-action: none` / `manipulation`, `user-select: none`, ikke dobbelttrykk-zoom |
| Fireåringen blir lei | ingen valg kan bli feil, alt gir noe, tidsuret er synlig. Natta med stjerneskudd er en belønning |
| For stort prosjekt | T1 er et beslutningspunkt og kan spilles alene |

---

## Kilder (runde 3)
- Foundation – stier av fottrinn: https://www.pcgamesn.com/foundation/roads-desire-paths-city-builders
- Photosynthesis – sollys som valuta: https://en.wikipedia.org/wiki/Photosynthesis_(board_game)
- Piano Tiles / Catch Tiles – én tone per trykk: https://www.crazygames.com/game/catch-tiles-piano-game
- Flere spillere på én iPad (TapDown, opptil 10 fingre): https://apps.apple.com/gy/app/tapdown-multiplayergame/id6448701670
- Quiver / Draw Alive (tegninger som blir levende): https://apps.apple.com/us/app/quiver-3d-coloring-app/id650645305 · https://www.breezecreative.com/draw-alive
- Open-Meteo (vær uten nøkkel): https://open-meteo.com/

## Status T1 – trykkmotoren (2026-10-06)
Ligger i repoet `vegardk-hub/test` (https://vegardk-hub.github.io/test/, prøvearket på `proveark.html`).
- **Spillere:** profiler med navn, dyr og nivå (🐣/🧒), hver med egen øy (28×28, fra kartgeneratoren). Lagring i localStorage.
- **Tåka:** 3 børstestrøk per rute (hver koster sol). Tåka blir tynnere og viser et hint av det som er under. Kortet snus fram.
- **Ting:** skog → tre, ås/fjell → stein, malm → jern, vann → fisk, eng/bær → korn, sauer → ull, skatter → kister.
  Størrelsen trekkes 55/30/15 %. Trykk på en ting åpner et **nærbilde** der hvert trykk er én tone (flere fingre virker). Delvis fremgang lagres.
- **Utbytte** 2/5/12. Kister gir frø, nøkler, skatter og stjernestøv. Ting vokser fram igjen etter 2 dager (kister kommer ikke tilbake).
- **Sola:** 50 (🧒) / 70 (🐣) trykk per dag. Natta med stjerneskudd (✨), «God morgen» gir ny dag. «Legg deg nå» i menyen.
- **Sangboka:** viser hvilke sanger man har spilt (♪ liten, ♪♪ middels, ♪♪♪ hel sang).
- **Hjelp de første trykkene:** pulserende ringer på tåka, så på tingene.
- Filer: `js/regler.js` (regler uten DOM), `js/data/ting.js` (alle tall), `js/brett.js`, `js/figurer.js`, `js/main.js`, `js/lagring.js`. Test: `node test/regler.test.js`.
