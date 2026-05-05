import { Task } from './types';

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    type: 'percentage_of',
    text: 'Laske 20 % luvusta 150. Paljonko se on?',
    knownValues: { total: 150, percent: 20 },
    tokens: [
      { type: 'number', value: 150 },
      { type: 'operator', value: '*' },
      { type: 'fraction', numerator: 20, denominator: 100 }
    ],
    solution: '150 * (20/100)',
    explanation: 'Kun lasketaan tietty prosenttiosuus määrästä, kerrotaan kokonaisarvo prosenttikertoimella (p/100).'
  },
  {
    id: '2',
    type: 'percentage_share',
    text: 'Kuinka monta prosenttia 30 on luvusta 120?',
    knownValues: { part: 30, total: 120 },
    tokens: [
      { type: 'fraction', numerator: 30, denominator: 120 },
      { type: 'operator', value: '*' },
      { type: 'number', value: 100 }
    ],
    solution: '(30/120) * 100',
    explanation: 'Prosenttiosuus saadaan jakamalla osa (30) kokonaisuudella (120) ja muuntamalla se prosenteiksi kertomalla sadalla.'
  },
  {
    id: '3',
    type: 'percentage_change',
    text: 'Hinta nousi 40 eurosta 50 euroon (eli nousua oli 10 €). Kuinka monta prosenttia hinta nousi alkuperäisestä 40 eurosta?',
    knownValues: { change: 10, original: 40 },
    tokens: [
      { type: 'fraction', numerator: 10, denominator: 40 },
      { type: 'operator', value: '*' },
      { type: 'number', value: 100 }
    ],
    solution: '(10/40) * 100',
    explanation: 'Muutosprosentti lasketaan jakamalla muutoksen suuruus alkuperäisellä arvolla.'
  },
  {
    id: '4',
    type: 'new_value',
    text: 'Tuotteen hinta on 80 €. Sitä korotetaan 15 %. Mikä on uusi hinta?',
    knownValues: { base: 80, change: 15 },
    tokens: [
      { type: 'number', value: 80 },
      { type: 'operator', value: '*' },
      { type: 'operator', value: '(' },
      { type: 'number', value: 1 },
      { type: 'operator', value: '+' },
      { type: 'fraction', numerator: 15, denominator: 100 },
      { type: 'operator', value: ')' }
    ],
    solution: '80 * (1 + (15/100))',
    explanation: 'Uusi arvo lasketaan kertomalla alkuperäinen arvo muutostekijällä, joka on 1 + p/100.'
  },
  {
    id: '5',
    type: 'reverse_percentage',
    text: 'Luvusta 20 % on 30. Mikä on alkuperäinen luku (100 %)?',
    knownValues: { part: 30, percent: 20 },
    tokens: [
      { type: 'number', value: 30 },
      { type: 'operator', value: '/' },
      { type: 'operator', value: '(' },
      { type: 'fraction', numerator: 20, denominator: 100 },
      { type: 'operator', value: ')' }
    ],
    solution: '30 / (20/100)',
    explanation: 'Jos tiedämme osan (30) ja sen prosenttiarvon, saamme kokonaisuuden jakamalla osan prosenttikertoimella.'
  },
  {
    id: '6',
    type: 'base_value',
    text: 'Hinta laski 25 % ja on nyt 75 €. Mikä oli hinta ennen alennusta?',
    knownValues: { currentPrice: 75, discount: 25 },
    tokens: [
      { type: 'number', value: 75 },
      { type: 'operator', value: '/' },
      { type: 'operator', value: '(' },
      { type: 'number', value: 1 },
      { type: 'operator', value: '-' },
      { type: 'fraction', numerator: 25, denominator: 100 },
      { type: 'operator', value: ')' }
    ],
    solution: '75 / (1 - (25/100))',
    explanation: 'Alkuperäinen hinta saadaan jakamalla nykyinen hinta sitä vastaavalla muutostekijällä (1 - p/100).'
  }
];
