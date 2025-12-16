// src/fakers/helpers/cameroon-data.ts
/**
 * Données réalistes pour le Cameroun
 * Utilisées par les factories pour générer des données cohérentes
 */

export interface City {
  name: string;
  region: string;
  coordinates: { lat: number; lng: number };
}

export const CAMEROON_CITIES: City[] = [
  { name: 'Douala', region: 'Littoral', coordinates: { lat: 4.0511, lng: 9.7679 } },
  { name: 'Yaoundé', region: 'Centre', coordinates: { lat: 3.8480, lng: 11.5021 } },
  { name: 'Bafoussam', region: 'Ouest', coordinates: { lat: 5.4737, lng: 10.4176 } },
  { name: 'Garoua', region: 'Nord', coordinates: { lat: 9.3000, lng: 13.4000 } },
  { name: 'Maroua', region: 'Extrême-Nord', coordinates: { lat: 10.5954, lng: 14.3157 } },
  { name: 'Bamenda', region: 'Nord-Ouest', coordinates: { lat: 6.1167, lng: 10.1667 } },
  { name: 'Buea', region: 'Sud-Ouest', coordinates: { lat: 4.1550, lng: 9.2394 } },
  { name: 'Kribi', region: 'Sud', coordinates: { lat: 2.9400, lng: 9.9100 } },
  { name: 'Limbe', region: 'Sud-Ouest', coordinates: { lat: 4.0167, lng: 9.2000 } },
  { name: 'Ebolowa', region: 'Sud', coordinates: { lat: 2.9333, lng: 11.1500 } },
  { name: 'Bertoua', region: 'Est', coordinates: { lat: 4.5833, lng: 14.0833 } },
  { name: 'Nkongsamba', region: 'Littoral', coordinates: { lat: 4.9500, lng: 9.9333 } },
  { name: 'Dschang', region: 'Ouest', coordinates: { lat: 5.4500, lng: 10.0667 } },
  { name: 'Foumban', region: 'Ouest', coordinates: { lat: 5.7167, lng: 10.9167 } },
  { name: 'Kousseri', region: 'Extrême-Nord', coordinates: { lat: 12.0833, lng: 15.0333 } },
];

export const CAMEROON_CROPS: string[] = [
  'manioc',
  'maïs',
  'arachide',
  'cacao',
  'banane',
  'plantain',
  'igname',
  'patate douce',
  'riz',
  'haricot',
  'tomate',
  'oignon',
  'piment',
  'aubergine',
  'gombo',
  'courge',
  'pastèque',
  'ananas',
  'mangue',
  'avocat',
];

export const CAMEROON_REGIONS: string[] = [
  'Littoral',
  'Centre',
  'Ouest',
  'Nord',
  'Extrême-Nord',
  'Nord-Ouest',
  'Sud-Ouest',
  'Sud',
  'Est',
  'Adamaoua',
];

/**
 * Génère un numéro de téléphone camerounais réaliste
 * Format: +237 6XX XXX XXX ou 6XX XXX XXX
 */
export function generateCameroonPhoneNumber(withCountryCode: boolean = false): string {
  const prefixes = ['650', '651', '652', '653', '654', '655', '656', '657', '658', '659', '660', '661', '662', '663', '664', '665', '666', '667', '668', '669', '670', '671', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '693', '694', '695', '696', '697', '698', '699'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000).toString().substring(0, 6);
  
  if (withCountryCode) {
    return `+237 ${prefix} ${number.substring(0, 3)} ${number.substring(3)}`;
  }
  return `${prefix}${number}`;
}

/**
 * Génère une localisation camerounaise aléatoire
 */
export function getRandomCameroonLocation(): City {
  return CAMEROON_CITIES[Math.floor(Math.random() * CAMEROON_CITIES.length)];
}

/**
 * Génère un type de culture camerounais aléatoire
 */
export function getRandomCameroonCrop(): string {
  return CAMEROON_CROPS[Math.floor(Math.random() * CAMEROON_CROPS.length)];
}

/**
 * Génère une région camerounaise aléatoire
 */
export function getRandomCameroonRegion(): string {
  return CAMEROON_REGIONS[Math.floor(Math.random() * CAMEROON_REGIONS.length)];
}

