// src/scripts/seed-mais-sensor-data.ts
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Plantation } from '../models/Plantation.entity';
import { Sensor, SensorType } from '../models/Sensor.entity';
import { SensorReading } from '../models/SensorReading.entity';

const TARGET_USER_PHONE = '690123456';
const TARGET_USER_EMAIL = 'test.user@example.com';
const TARGET_PLANTATION_NAME = 'Maïs';
const TARGET_READINGS_COUNT = 2000;
const DAYS_SPAN = 75; // Répartir sur 75 jours pour avoir des variations saisonnières

// Plages de valeurs par saison et type de capteur
type SeasonalSituation = 'dry_season' | 'rainy_season' | 'harmattan' | 'transition';

interface SensorRanges {
  normalMin: number;
  normalMax: number;
  extremeMin: number;
  extremeMax: number;
}

const SENSOR_RANGES: Record<SensorType, Record<SeasonalSituation, SensorRanges>> = {
  [SensorType.TEMPERATURE]: {
    dry_season: { normalMin: 28, normalMax: 35, extremeMin: 25, extremeMax: 38 },
    rainy_season: { normalMin: 22, normalMax: 28, extremeMin: 20, extremeMax: 30 },
    harmattan: { normalMin: 15, normalMax: 25, extremeMin: 12, extremeMax: 28 },
    transition: { normalMin: 20, normalMax: 30, extremeMin: 18, extremeMax: 32 },
  },
  [SensorType.SOIL_MOISTURE]: {
    dry_season: { normalMin: 30, normalMax: 50, extremeMin: 25, extremeMax: 55 },
    rainy_season: { normalMin: 60, normalMax: 85, extremeMin: 55, extremeMax: 90 },
    harmattan: { normalMin: 20, normalMax: 40, extremeMin: 15, extremeMax: 45 },
    transition: { normalMin: 40, normalMax: 65, extremeMin: 35, extremeMax: 70 },
  },
  [SensorType.CO2_LEVEL]: {
    dry_season: { normalMin: 450, normalMax: 800, extremeMin: 400, extremeMax: 1000 },
    rainy_season: { normalMin: 450, normalMax: 800, extremeMin: 400, extremeMax: 1000 },
    harmattan: { normalMin: 450, normalMax: 800, extremeMin: 400, extremeMax: 1000 },
    transition: { normalMin: 450, normalMax: 800, extremeMin: 400, extremeMax: 1000 },
  },
  [SensorType.WATER_LEVEL]: {
    dry_season: { normalMin: 40, normalMax: 70, extremeMin: 30, extremeMax: 75 },
    rainy_season: { normalMin: 70, normalMax: 90, extremeMin: 60, extremeMax: 95 },
    harmattan: { normalMin: 35, normalMax: 60, extremeMin: 25, extremeMax: 65 },
    transition: { normalMin: 55, normalMax: 80, extremeMin: 45, extremeMax: 85 },
  },
  [SensorType.LUMINOSITY]: {
    dry_season: { normalMin: 300, normalMax: 1000, extremeMin: 200, extremeMax: 1200 },
    rainy_season: { normalMin: 300, normalMax: 1000, extremeMin: 200, extremeMax: 1200 },
    harmattan: { normalMin: 300, normalMax: 1000, extremeMin: 200, extremeMax: 1200 },
    transition: { normalMin: 300, normalMax: 1000, extremeMin: 200, extremeMax: 1200 },
  },
};

/**
 * Trouve l'utilisateur par phone ou email
 */
async function findUser(): Promise<User> {
  const userRepository = AppDataSource.getRepository(User);
  
  // Essayer d'abord par phone
  let user = await userRepository.findOne({ where: { phone: TARGET_USER_PHONE } });
  
  // Si pas trouvé, essayer par email
  if (!user) {
    user = await userRepository.findOne({ where: { email: TARGET_USER_EMAIL } });
  }
  
  if (!user) {
    throw new Error(
      `Utilisateur non trouvé avec phone: ${TARGET_USER_PHONE} ou email: ${TARGET_USER_EMAIL}`
    );
  }
  
  console.log(`✓ Utilisateur trouvé: ${user.firstName || ''} ${user.lastName || ''} (${user.phone})`);
  return user;
}

/**
 * Trouve la plantation "Maïs" pour un utilisateur
 */
async function findPlantation(userId: string): Promise<Plantation> {
  const plantationRepository = AppDataSource.getRepository(Plantation);
  
  // Chercher toutes les plantations de l'utilisateur
  const plantations = await plantationRepository.find({
    where: { ownerId: userId },
  });
  
  // Chercher d'abord par nom exact "Maïs", puis par nom contenant "maïs", puis par cropType
  const targetLower = TARGET_PLANTATION_NAME.toLowerCase();
  
  // Priorité 1: Nom exactement "Maïs"
  let plantation = plantations.find(
    (p) => p.name.toLowerCase() === targetLower || p.name.toLowerCase() === 'mais'
  );
  
  // Priorité 2: Nom contenant "Maïs"
  if (!plantation) {
    plantation = plantations.find(
      (p) => p.name.toLowerCase().includes(targetLower) || p.name.toLowerCase().includes('mais')
    );
  }
  
  // Priorité 3: cropType = "maïs"
  if (!plantation) {
    plantation = plantations.find(
      (p) => p.cropType?.toLowerCase() === targetLower || p.cropType?.toLowerCase() === 'mais'
    );
  }
  
  if (!plantation) {
    throw new Error(
      `Plantation "Maïs" non trouvée pour l'utilisateur ${userId}`
    );
  }
  
  console.log(`✓ Plantation trouvée: ${plantation.name} (${plantation.cropType})`);
  return plantation;
}

/**
 * Récupère tous les capteurs d'une plantation
 */
async function getSensors(plantationId: string): Promise<Sensor[]> {
  const sensorRepository = AppDataSource.getRepository(Sensor);
  const sensors = await sensorRepository.find({
    where: { plantationId },
  });
  
  if (sensors.length === 0) {
    console.warn(`⚠ Aucun capteur trouvé pour cette plantation. Les capteurs doivent être créés via l'API ou une migration.`);
  } else {
    console.log(`✓ ${sensors.length} capteur(s) trouvé(s)`);
  }
  
  return sensors;
}

/**
 * Détermine la situation saisonnière selon la date (simulation sur 75 jours)
 */
function getSeasonalSituation(dayIndex: number, totalDays: number): SeasonalSituation {
  const progress = dayIndex / totalDays;
  
  // Répartir les saisons sur la période
  if (progress < 0.25) {
    return 'dry_season';
  } else if (progress < 0.5) {
    return 'transition';
  } else if (progress < 0.75) {
    return 'rainy_season';
  } else {
    return 'harmattan';
  }
}

/**
 * Génère une valeur normale pour un type de capteur et une situation
 */
function generateNormalValue(sensorType: SensorType, situation: SeasonalSituation): number {
  const range = SENSOR_RANGES[sensorType][situation];
  return Number((Math.random() * (range.normalMax - range.normalMin) + range.normalMin).toFixed(2));
}

/**
 * Génère une valeur edge case (proche des limites)
 */
function generateEdgeValue(sensorType: SensorType, situation: SeasonalSituation): number {
  const range = SENSOR_RANGES[sensorType][situation];
  const useMin = Math.random() < 0.5;
  
  if (useMin) {
    // Proche du minimum
    return Number((range.extremeMin + Math.random() * (range.normalMin - range.extremeMin) * 0.3).toFixed(2));
  } else {
    // Proche du maximum
    return Number((range.normalMax + Math.random() * (range.extremeMax - range.normalMax) * 0.3).toFixed(2));
  }
}

/**
 * Génère une valeur d'alerte (dépassant les seuils)
 */
function generateAlertValue(sensorType: SensorType, situation: SeasonalSituation, sensor: Sensor): number {
  const range = SENSOR_RANGES[sensorType][situation];
  const aboveThreshold = Math.random() < 0.5;
  
  if (sensor.seuilMin !== undefined && sensor.seuilMax !== undefined) {
    // Si le capteur a des seuils, générer une valeur qui les dépasse
    if (aboveThreshold) {
      // Au-dessus du seuil max
      const excess = (range.extremeMax - sensor.seuilMax) * (0.1 + Math.random() * 0.3);
      return Number((sensor.seuilMax + excess).toFixed(2));
    } else {
      // En-dessous du seuil min
      const deficit = (sensor.seuilMin - range.extremeMin) * (0.1 + Math.random() * 0.3);
      return Number((sensor.seuilMin - deficit).toFixed(2));
    }
  } else {
    // Pas de seuils définis, utiliser les extrêmes
    if (aboveThreshold) {
      return Number((range.normalMax + (range.extremeMax - range.normalMax) * (0.5 + Math.random() * 0.5)).toFixed(2));
    } else {
      return Number((range.normalMin - (range.normalMin - range.extremeMin) * (0.5 + Math.random() * 0.5)).toFixed(2));
    }
  }
}

/**
 * Applique les variations temporelles selon l'heure
 */
function applyTemporalVariation(
  value: number,
  sensorType: SensorType,
  hour: number
): number {
  switch (sensorType) {
    case SensorType.TEMPERATURE: {
      // Température : plus basse la nuit, pic à midi
      const isDay = hour >= 6 && hour <= 18;
      if (isDay) {
        // Variation sinusoïdale avec pic à midi (12h)
        const progress = (hour - 6) / 12; // 0 à 1
        const multiplier = 0.85 + Math.sin(progress * Math.PI) * 0.3; // 0.85 à 1.15
        return Number((value * multiplier).toFixed(2));
      } else {
        // Nuit : 0.75 à 0.85 du jour
        const multiplier = 0.75 + Math.random() * 0.1;
        return Number((value * multiplier).toFixed(2));
      }
    }
    
    case SensorType.LUMINOSITY: {
      // Luminosité : très faible la nuit, pic à midi
      const isDay = hour >= 6 && hour <= 18;
      if (isDay) {
        // Variation sinusoïdale avec pic à midi
        const progress = (hour - 6) / 12; // 0 à 1
        const multiplier = 0.3 + Math.sin(progress * Math.PI) * 0.7; // 0.3 à 1.0
        return Number((value * multiplier).toFixed(2));
      } else if (hour >= 20 || hour < 6) {
        // Nuit : très faible
        return Number((Math.random() * 200).toFixed(2));
      } else {
        // Lever/coucher : 100-600 lux
        return Number((100 + Math.random() * 500).toFixed(2));
      }
    }
    
    case SensorType.SOIL_MOISTURE: {
      // Légère variation selon l'heure (rosée matinale, évaporation)
      if (hour >= 5 && hour <= 8) {
        // Rosée matinale : légère augmentation
        return Number((value * 1.05).toFixed(2));
      } else if (hour >= 12 && hour <= 15) {
        // Évaporation : légère diminution
        return Number((value * 0.95).toFixed(2));
      }
      return value;
    }
    
    case SensorType.CO2_LEVEL: {
      // Variation avec photosynthèse (plus bas le jour)
      const isDay = hour >= 6 && hour <= 18;
      if (isDay) {
        // Photosynthèse : légère diminution
        return Number((value * 0.95).toFixed(2));
      }
      return value;
    }
    
    case SensorType.WATER_LEVEL: {
      // Stable avec légères variations
      return Number((value + (Math.random() - 0.5) * 2).toFixed(2));
    }
    
    default:
      return value;
  }
}

/**
 * Génère des lectures variées pour un capteur
 */
function generateVariedReadings(
  sensor: Sensor,
  count: number,
  daysSpan: number
): Partial<SensorReading>[] {
  const readings: Partial<SensorReading>[] = [];
  const startDate = new Date(Date.now() - daysSpan * 24 * 60 * 60 * 1000);
  const intervalMs = (daysSpan * 24 * 60 * 60 * 1000) / count;
  
  // Répartition des types de valeurs : 60% normales, 20% edge, 20% alertes
  const normalCount = Math.floor(count * 0.6);
  const edgeCount = Math.floor(count * 0.2);
  const alertCount = count - normalCount - edgeCount;
  
  // Créer un tableau avec la répartition
  const valueTypes: Array<'normal' | 'edge' | 'alert'> = [
    ...Array(normalCount).fill('normal' as const),
    ...Array(edgeCount).fill('edge' as const),
    ...Array(alertCount).fill('alert' as const),
  ];
  
  // Mélanger pour avoir une distribution aléatoire
  for (let i = valueTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [valueTypes[i], valueTypes[j]] = [valueTypes[j], valueTypes[i]];
  }
  
  let previousValue: number | null = null;
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startDate.getTime() + i * intervalMs);
    const hour = timestamp.getHours();
    const dayIndex = Math.floor(i / (count / daysSpan));
    const situation = getSeasonalSituation(dayIndex, daysSpan);
    
    // Parfois utiliser une situation aléatoire pour plus de variation (30% du temps)
    const useRandomSituation = Math.random() < 0.3;
    const finalSituation: SeasonalSituation = useRandomSituation
      ? (['dry_season', 'rainy_season', 'harmattan', 'transition'] as SeasonalSituation[])[
          Math.floor(Math.random() * 4)
        ]
      : situation;
    
    const valueType = valueTypes[i];
    let value: number;
    
    // Générer la valeur selon le type
    switch (valueType) {
      case 'normal':
        value = generateNormalValue(sensor.type, finalSituation);
        break;
      case 'edge':
        value = generateEdgeValue(sensor.type, finalSituation);
        break;
      case 'alert':
        value = generateAlertValue(sensor.type, finalSituation, sensor);
        break;
      default:
        value = generateNormalValue(sensor.type, finalSituation);
    }
    
    // Appliquer variation temporelle
    value = applyTemporalVariation(value, sensor.type, hour);
    
    // Appliquer variation progressive si on a une valeur précédente (pour valeurs normales)
    if (previousValue !== null && valueType === 'normal') {
      const range = SENSOR_RANGES[sensor.type][finalSituation];
      const variationAmount = (range.normalMax - range.normalMin) * 0.15;
      const randomVariation = (Math.random() - 0.5) * 2 * variationAmount;
      
      let newValue = previousValue + randomVariation;
      
      // S'assurer que la valeur reste dans les limites normales
      if (sensor.type === SensorType.LUMINOSITY) {
        const isNight = hour >= 20 || hour < 6;
        if (!isNight) {
          newValue = Math.max(range.normalMin, Math.min(range.normalMax, newValue));
        }
      } else {
        newValue = Math.max(range.normalMin, Math.min(range.normalMax, newValue));
      }
      
      value = Number(newValue.toFixed(2));
    }
    
    // S'assurer que la valeur reste dans les limites extrêmes
    const range = SENSOR_RANGES[sensor.type][finalSituation];
    if (sensor.type !== SensorType.LUMINOSITY || (hour >= 6 && hour <= 18)) {
      value = Math.max(range.extremeMin, Math.min(range.extremeMax, value));
    }
    
    readings.push({
      sensorId: sensor.id,
      value: Number(value.toFixed(2)),
      timestamp,
    });
    
    previousValue = value;
  }
  
  return readings;
}

/**
 * Sauvegarde les lectures par batch
 */
async function saveReadingsInBatches(
  readings: Partial<SensorReading>[],
  batchSize: number = 100
): Promise<void> {
  const sensorReadingRepository = AppDataSource.getRepository(SensorReading);
  
  for (let i = 0; i < readings.length; i += batchSize) {
    const batch = readings.slice(i, i + batchSize);
    const entities = batch.map((reading) =>
      sensorReadingRepository.create({
        sensorId: reading.sensorId!,
        value: reading.value!,
        timestamp: reading.timestamp!,
      })
    );
    
    await sensorReadingRepository.save(entities);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(readings.length / batchSize);
    console.log(`  ✓ Batch ${batchNum}/${totalBatches}: ${entities.length} lectures sauvegardées`);
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🔌 Connexion à la base de données...');
    await AppDataSource.initialize();
    console.log('✓ Connexion établie\n');
    
    // 1. Trouver l'utilisateur
    const user = await findUser();
    
    // 2. Trouver la plantation
    const plantation = await findPlantation(user.id);
    
    // 3. Récupérer les capteurs
    console.log('\n📡 Récupération des capteurs...');
    const sensors = await getSensors(plantation.id);
    
    if (sensors.length === 0) {
      throw new Error('Aucun capteur disponible pour cette plantation. Veuillez créer des capteurs d\'abord.');
    }
    
    console.log(`✓ ${sensors.length} capteur(s) disponible(s)\n`);
    
    // 4. Générer les lectures pour chaque capteur
    const readingsPerSensor = Math.ceil(TARGET_READINGS_COUNT / sensors.length);
    console.log(`📊 Génération de ~${TARGET_READINGS_COUNT} lectures sur ${DAYS_SPAN} jours...`);
    console.log(`   (~${readingsPerSensor} lectures par capteur)\n`);
    
    const allReadings: Partial<SensorReading>[] = [];
    const readingsBySensor: Record<string, number> = {};
    
    for (const sensor of sensors) {
      console.log(`  Génération pour ${sensor.type}...`);
      const readings = generateVariedReadings(sensor, readingsPerSensor, DAYS_SPAN);
      allReadings.push(...readings);
      readingsBySensor[sensor.type] = readings.length;
      console.log(`    ✓ ${readings.length} lectures générées`);
    }
    
    // 5. Sauvegarder par batch
    console.log(`\n💾 Sauvegarde de ${allReadings.length} lectures...`);
    await saveReadingsInBatches(allReadings, 100);
    
    // 6. Résumé
    console.log('\n✅ Génération terminée !\n');
    console.log('📈 Résumé:');
    console.log(`  - Plantation: ${plantation.name}`);
    console.log(`  - Capteurs: ${sensors.length}`);
    console.log(`  - Lectures totales: ${allReadings.length}`);
    console.log('\n  Répartition par capteur:');
    for (const [type, count] of Object.entries(readingsBySensor)) {
      console.log(`    - ${type}: ${count} lectures`);
    }
    console.log(`\n  Variations: ~60% normales, ~20% edge cases, ~20% alertes`);
    console.log(`  Période: ${DAYS_SPAN} jours avec variations saisonnières`);
    console.log(`  Saisons: dry_season, rainy_season, harmattan, transition`);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Exécuter le script
main();

