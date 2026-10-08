// Melodiene som spilles når man trykker på ting på øya, og som samles i sangboka.
// Alle er gamle og uten opphavsrett (komponistene døde for lenge siden, eller melodien er en folketone).
//
// Skrivemåte: én tone er navn + oktav (C4 = midt på pianoet), med # eller b for halvtoner.
// Lengden står etter tonen: ingenting = ett slag, «,» = et halvt, «;» = et kvart,
// «-» = ett slag til (C4- er to slag, C4-- tre), «.» = halvannen gang så lang. «r» er en pause.
// Loddrette streker er bare for oversiktens skyld.
//
// tempo = slag i minuttet. deler = hvor mange toner den lille og den mellomste tingen spiller
// (den store spiller hele melodien). gruppe: 'klassisk' eller 'sang'.

export const MELODIER = {
  // ------------------------------------------------------------------ Klassisk
  ode: { navn: 'Ode til gleden', av: 'Ludwig van Beethoven', gruppe: 'klassisk', tempo: 132, deler: [8, 15],
    noter: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4. D4, D4- | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4. C4, C4-` },
  elise: { navn: 'Für Elise', av: 'Ludwig van Beethoven', gruppe: 'klassisk', tempo: 250, deler: [9, 17],
    noter: `E5 D#5 | E5 D#5 E5 B4 D5 C5 | A4- r C4 E4 A4 | B4- r E4 G#4 B4 | C5- r E4 E5 D#5 |
      E5 D#5 E5 B4 D5 C5 | A4- r C4 E4 A4 | B4- r E4 C5 B4 | A4---` },
  skjebne: { navn: 'Skjebnesymfonien', av: 'Ludwig van Beethoven', gruppe: 'klassisk', tempo: 150, deler: [4, 8],
    noter: `r, G4, G4, G4, | Eb4--- | r, F4, F4, F4, | D4--- r | r, G4, G4, G4, | Eb4, Ab4, Ab4, Ab4, | G4, Eb5, Eb5, Eb5, | C5---` },
  nattmusikk: { navn: 'En liten nattmusikk', av: 'Wolfgang Amadeus Mozart', gruppe: 'klassisk', tempo: 132, deler: [4, 9],
    noter: `G4 r, D4, G4 r, D4, | G4, D4, G4, B4, D5- | C5 r, A4, C5 r, A4, | C5, A4, F#4, A4, D4-` },
  sym40: { navn: 'Symfoni nr. 40', av: 'Wolfgang Amadeus Mozart', gruppe: 'klassisk', tempo: 200, deler: [6, 10],
    noter: `Eb4, D4, | D4 Eb4, D4, D4 Eb4, D4, | D4 Bb4 r Bb4, A4, | G4 G4, F4, Eb4 Eb4, D4, | C4 C4-` },
  tyrkisk: { navn: 'Tyrkisk marsj', av: 'Wolfgang Amadeus Mozart', gruppe: 'klassisk', tempo: 126, deler: [5, 10],
    noter: `B4; A4; G#4; A4; C5 r | D5; C5; B4; C5; E5 r | F5; E5; D#5; E5; B5; A5; G#5; A5; B5; A5; G#5; A5; C6-` },
  sonate: { navn: 'Sonate i C-dur', av: 'Wolfgang Amadeus Mozart', gruppe: 'klassisk', tempo: 126, deler: [4, 7],
    noter: `C4- E4 G4 | B3. C4; D4; C4- r | A4- G4 C5 | G4 F4, E4; F4; E4-` },
  menuett: { navn: 'Menuett i G-dur', av: 'Christian Petzold (fra Bachs notebok)', gruppe: 'klassisk', tempo: 126, deler: [8, 16],
    noter: `D5 G4, A4, B4, C5, | D5 G4 G4 | E5 C5, D5, E5, F#5, | G5 G4 G4 | C5 D5, C5, B4, A4, | B4 C5, B4, A4, G4, |
      F#4 G4, A4, B4, G4, | B4 A4-` },
  jesus: { navn: 'Jesus, du min glede', av: 'Johann Sebastian Bach', gruppe: 'klassisk', tempo: 200, deler: [8, 17],
    noter: `r G4 A4 | B4 D5 C5 C5 E5 D5 D5 G5 F#5 | G5 D5 B4 G4 A4 B4 | C5 D5 E5 D5 C5 B4 | A4 B4 G4 F#4 G4 A4 |
      D4 F#4 A4 C5 B4 A4 | B4 G4--` },
  toccata: { navn: 'Toccata og fuge i d-moll', av: 'Johann Sebastian Bach', gruppe: 'klassisk', tempo: 100, deler: [3, 9],
    noter: `A4; G4; A4--- r | G4; F4; E4; D4; C#4- D4--- r | A3; G3; A3--- r | E3, F3, C#3, D3---` },
  preludium: { navn: 'Preludium i C-dur', av: 'Johann Sebastian Bach', gruppe: 'klassisk', tempo: 280, deler: [8, 16],
    noter: `C4 E4 G4 C5 E5 G4 C5 E5 | C4 D4 A4 D5 F5 A4 D5 F5 | B3 D4 G4 D5 F5 G4 D5 F5 | C4 E4 G4 C5 E5 G4 C5 E5-` },
  vuggesang: { navn: 'Vuggesang', av: 'Johannes Brahms', gruppe: 'klassisk', tempo: 96, deler: [6, 13],
    noter: `E4, E4, | G4. E4, E4 | G4- E4, G4, | C5 B4. A4, | A4 G4 D4, E4, | F4 D4 D4, E4, | F4- D4, F4, | B4, A4, G4 B4 | C5-` },
  morgen: { navn: 'Morgenstemning', av: 'Edvard Grieg', gruppe: 'klassisk', tempo: 180, deler: [6, 14],
    noter: `G4 E4 D4 C4 D4 E4 | G4 E4 D4 C4 D4, E4, D4, E4, | G4 E4 G4 A4 E4 A4 | G4 E4 D4 C4--` },
  dovregubben: { navn: 'I Dovregubbens hall', av: 'Edvard Grieg', gruppe: 'klassisk', tempo: 126, deler: [7, 13],
    noter: `A3, B3, C4, D4, E4, C4, E4 | Eb4, B3, Eb4 D4, Bb3, D4 | A3, B3, C4, D4, E4, C4, E4, A4, | G4, E4, C4, E4, G4-` },
  vaaren: { navn: 'Våren', av: 'Antonio Vivaldi', gruppe: 'klassisk', tempo: 100, deler: [7, 15],
    noter: `C4, | E4, E4, E4, D4; C4; G4. G4; F4; | E4, E4, E4, D4; C4; G4. G4; F4; | E4, F4; G4; F4, E4, D4-` },
  svanesjoen: { navn: 'Svanesjøen', av: 'Pjotr Tsjajkovskij', gruppe: 'klassisk', tempo: 92, deler: [5, 9],
    noter: `E5- A4, B4, C5, D5, | E5. C5, E5. C5, | E5. A4, C5, A4, F4, C5, | A4---` },
  sukkerfe: { navn: 'Sukkerfeens dans', av: 'Pjotr Tsjajkovskij', gruppe: 'klassisk', tempo: 120, deler: [6, 12],
    noter: `G4, E4, G4 F#4 D#4 E4 | D4; D4; D4, C#4; C#4; C#4, C4; C4; C4, B3, E4, C4, E4, B3-` },
  donau: { navn: 'An der schönen blauen Donau', av: 'Johann Strauss d.y.', gruppe: 'klassisk', tempo: 168, deler: [9, 18],
    noter: `C4 | C4 E4 G4 | G4- G5 | G5 r E5 | E5 r C4 | C4 E4 G4 | G4- G5 | G5 r F5 | F5 r B3 | B3 D4 A4 | A4- A5 | A5 r F5 | F5 r` },
  kanon: { navn: 'Kanon i D', av: 'Johann Pachelbel', gruppe: 'klassisk', tempo: 108, deler: [8, 16],
    noter: `E5- D5- C5- B4- | A4- G4- A4- B4- | C5- B4- A4- G4- | F4- E4- F4- D4- |
      C4, E4, G4, F4, E4, C4, E4, D4, | C4, A3, C4, G4, F4, A4, G4, F4,` },
  cancan: { navn: 'Cancan', av: 'Jacques Offenbach', gruppe: 'klassisk', tempo: 152, deler: [7, 13],
    noter: `C4- D4, F4, E4, D4, | G4 G4 G4, A4, E4, F4, | D4 D4 D4, F4, E4, D4, | C4, C5, B4, A4, G4, F4, E4, D4, | C4-` },
  tell: { navn: 'Wilhelm Tell-ouverturen', av: 'Gioachino Rossini', gruppe: 'klassisk', tempo: 132, deler: [11, 22],
    noter: `G4; G4; G4, G4; G4; G4, G4; G4; C5, D5, E5, | G4; G4; G4, G4; G4; C5, E5; E5; D5, B4, G4, |
      G4; G4; G4, G4; G4; G4, G4; G4; C5, D5, E5, | C5; E5; G5- F5; E5; D5; C5, E5, C5` },
  toreador: { navn: 'Toreadorsangen', av: 'Georges Bizet', gruppe: 'klassisk', tempo: 112, deler: [5, 10],
    noter: `C5 D5,. C5; A4 A4 | A4,. G4; A4,. Bb4; A4- | Bb4 G4,. C5; A4- | F4 D4,. G4; C4-` },
  paukeslaget: { navn: 'Symfonien med paukeslaget', av: 'Joseph Haydn', gruppe: 'klassisk', tempo: 116, deler: [7, 14],
    noter: `C4, C4, E4, E4, G4, G4, E4 | F4, F4, D4, D4, B3, B3, G3 | C4, C4, E4, E4, G4, G4, E4 | C5, C5, F#4, F#4, G4-` },
  largo: { navn: 'Largo fra «Fra den nye verden»', av: 'Antonín Dvořák', gruppe: 'klassisk', tempo: 72, deler: [6, 11],
    noter: `E4. G4, G4- | E4. D4, C4- | D4. E4, G4. E4, | D4--- | E4. G4, G4- | E4. D4, C4- | D4 E4 D4 C4 | C4---` },
  brudekoret: { navn: 'Brudekoret', av: 'Richard Wagner', gruppe: 'klassisk', tempo: 96, deler: [4, 8],
    noter: `C4 F4. F4, F4- | C4 G4. E4, F4- | C4 F4. Bb4, Bb4 A4. G4, | F4 E4. F4, G4-` },
  jupiter: { navn: 'Jupiter fra «Planetene»', av: 'Gustav Holst', gruppe: 'klassisk', tempo: 76, deler: [7, 15],
    noter: `E4, G4, | A4. C5, B4,. G4; | C5, D5, C5 B4 | A4, B4, A4 G4 | E4- E4, G4, | A4. C5, B4,. G4; | C5, D5, E5 E5 | E5, D5, C5 D5 | C5-` },

  // ------------------------------------------------------------------ Sanger og viser
  ro: { navn: 'Ro, ro, ro din båt', av: 'Barnesang', gruppe: 'sang', tempo: 180, deler: [5, 10],
    noter: `C4-- C4-- | C4- D4 E4-- | E4- D4 E4- F4 | G4----- | C5 C5 C5 G4 G4 G4 | E4 E4 E4 C4 C4 C4 | G4- F4 E4- D4 | C4-----` },
  baa: { navn: 'Bæ, bæ, lille lam', av: 'Barnesang', gruppe: 'sang', tempo: 116, deler: [7, 14],
    noter: `C4 C4 G4 G4 A4 A4 G4- | F4 F4 E4 E4 D4 D4 C4- | G4 G4 F4 F4 E4 E4 D4- | G4 G4 F4 F4 E4 E4 D4- |
      C4 C4 G4 G4 A4 A4 G4- | F4 F4 E4 E4 D4 D4 C4-` },
  jakob: { navn: 'Fader Jakob', av: 'Barnesang', gruppe: 'sang', tempo: 120, deler: [8, 14],
    noter: `C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4- | E4 F4 G4- | G4, A4, G4, F4, E4 C4 | G4, A4, G4, F4, E4 C4 | C4 G3 C4- | C4 G3 C4-` },
  macdonald: { navn: 'Old MacDonald', av: 'Barnesang', gruppe: 'sang', tempo: 132, deler: [12, 25],
    noter: `C4 C4 C4 G3 | A3 A3 G3- | E4 E4 D4 D4 | C4-- G3 | C4 C4 C4 G3 | A3 A3 G3- | E4 E4 D4 D4 | C4-- G3, G3, |
      C4 C4 C4 G3, G3, | C4 C4 C4- | C4, C4, C4 C4, C4, C4 | C4, C4, C4, C4, C4 C4 | C4 C4 C4 G3 | A3 A3 G3- | E4 E4 D4 D4 | C4--` },
  petter: { navn: 'Lille Petter Edderkopp', av: 'Barnesang', gruppe: 'sang', tempo: 132, deler: [13, 23],
    noter: `G3, | C4 C4, C4 D4, | E4. E4 E4, | D4 C4, D4 E4, | C4-. | E4. E4 F4, | G4-. | G4 F4, E4 F4, | G4 E4- |
      C4. C4 D4, | E4-. | E4 D4, C4 D4, | E4 C4- | G3 G3, C4 C4, | C4 D4, E4. | E4 E4, D4 C4, | D4 E4, C4-.` },
  mary: { navn: 'Mary Had a Little Lamb', av: 'Barnesang', gruppe: 'sang', tempo: 126, deler: [7, 13],
    noter: `E4. D4, C4 D4 | E4 E4 E4- | D4 D4 D4- | E4 G4 G4- | E4. D4, C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4---` },
  bursdag: { navn: 'Happy Birthday', av: 'Bursdagssang', gruppe: 'sang', tempo: 120, deler: [6, 12],
    noter: `G4,. G4; A4 G4 C5 B4- | G4,. G4; A4 G4 D5 C5- | G4,. G4; G5 E5 C5 B4 A4 | F5,. F5; E5 C5 D5 C5-` },
  lisa: { navn: 'Lisa gikk til skolen', av: 'Barnesang', gruppe: 'sang', tempo: 120, deler: [6, 16],
    noter: `C4 D4 E4 F4 | G4- G4- | A4 A4 A4 A4 | G4--- | A4 A4 A4 A4 | G4--- | F4 F4 F4 F4 | E4- E4- | D4 D4 D4 D4 | C4---` },
  bjornen: { navn: 'Bjørnen sover', av: 'Barnesang', gruppe: 'sang', tempo: 120, deler: [8, 13],
    noter: `C4 C4 C4 E4 | D4 D4 D4 F4 | E4 E4 D4 D4 | C4--- | E4 E4 E4 E4 | G4- F4- | D4 D4 D4 D4 | F4- E4- |
      C4 C4 C4 E4 | D4 D4 D4 F4 | E4 E4 D4 D4 | C4---` },
  allefugler: { navn: 'Alle fugler', av: 'Tysk folketone', gruppe: 'sang', tempo: 120, deler: [8, 14],
    noter: `C4. E4, G4 C5 | A4 C5. A4, G4 | F4. G4, E4 C4 | D4- C4- | G4 G4 F4 F4 | E4 G4, E4, D4- | G4 G4 F4 F4 | E4 G4, E4, D4-` },
  london: { navn: 'London Bridge', av: 'Engelsk barnesang', gruppe: 'sang', tempo: 120, deler: [7, 13],
    noter: `G4. A4, G4 F4 | E4 F4 G4- | D4 E4 F4- | E4 F4 G4- | G4. A4, G4 F4 | E4 F4 G4- | D4- G4- | E4 C4-` },
  susanna: { navn: 'Oh! Susanna', av: 'Stephen Foster', gruppe: 'sang', tempo: 132, deler: [6, 15],
    noter: `C4, D4, | E4 G4 G4. A4, | G4 E4 C4. D4, | E4 E4 D4 C4 | D4-- C4, D4, | E4 G4 G4. A4, | G4 E4 C4. D4, | E4 E4 D4 D4 | C4--` },
  yankee: { navn: 'Yankee Doodle', av: 'Amerikansk folketone', gruppe: 'sang', tempo: 200, deler: [7, 14],
    noter: `C4 C4 D4 E4 | C4 E4 D4 G3 | C4 C4 D4 E4 | C4- B3- | C4 C4 D4 E4 | F4 E4 D4 C4 | B3 G3 A3 B3 | C4- C4-` },
  greensleeves: { navn: 'Greensleeves', av: 'Engelsk folketone', gruppe: 'sang', tempo: 150, deler: [8, 19],
    noter: `A4 | C5- D5 E5. F5, E5 | D5- B4 G4. A4, B4 | C5- A4 A4. G#4, A4 | B4- G#4 E4- A4 |
      C5- D5 E5. F5, E5 | D5- B4 G4. A4, B4 | C5. B4, A4 G#4. F#4, G#4 | A4--` },
  amazing: { navn: 'Amazing Grace', av: 'Folketone', gruppe: 'sang', tempo: 92, deler: [8, 16],
    noter: `G4 | C5- E5, C5, | E5- D5 | C5- A4 | G4- G4 | C5- E5, C5, | E5- D5 | G5-- | E5 | G5. E5, G5, E5, | C5- G4 |
      A4. C5, C5, A4, | G4- G4 | C5- E5, C5, | E5- D5 | C5--` },
  javielsker: { navn: 'Ja, vi elsker', av: 'Rikard Nordraak', gruppe: 'sang', tempo: 100, deler: [8, 13],
    noter: `G4. F4, E4 D4 | C4 D4 E4 F4 | G4. A4, G4 F4 | E4-- r | A4. G4, F4 E4 | D4 E4 F4 G4 | G4. A4, A4 B4 | C5--` },
  bjelleklang: { navn: 'Bjelleklang', av: 'James Pierpont', gruppe: 'sang', tempo: 160, deler: [7, 11],
    noter: `E4 E4 E4- | E4 E4 E4- | E4 G4 C4. D4, | E4--- | F4 F4 F4. F4, | F4 E4 E4 E4, E4, | E4 D4 D4 E4 | D4- G4-` },
  gladejul: { navn: 'Glade jul', av: 'Franz Gruber', gruppe: 'sang', tempo: 132, deler: [8, 14],
    noter: `G4. A4, G4 E4-- | G4. A4, G4 E4-- | D5- D5 B4-- | C5- C5 G4-- | A4- A4 C5. B4, A4 | G4. A4, G4 E4--` },
};
