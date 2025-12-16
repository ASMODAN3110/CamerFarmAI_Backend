// src/fakers/config/sensor-ranges.config.ts
import { SensorType } from '../../models/Sensor.entity';

export type SeasonalSituation = 'dry_season' | 'rainy_season' | 'harmattan' | 'transition';

export interface SensorRange {
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
}

export interface SeasonalRanges {
  [key: string]: SensorRange;
}

/**
 * Configuration des plages de valeurs pour chaque type de capteur
 * selon les différentes situations saisonnières au Cameroun
 */
export const SENSOR_RANGES: Record<SensorType, SeasonalRanges> = {
  [SensorType.TEMPERATURE]: {
    dry_season: {
      min: 25,
      max: 38,
      normalMin: 28,
      normalMax: 35,
    },
    rainy_season: {
      min: 20,
      max: 30,
      normalMin: 22,
      normalMax: 28,
    },
    harmattan: {
      min: 12,
      max: 28,
      normalMin: 15,
      normalMax: 25,
    },
    transition: {
      min: 18,
      max: 32,
      normalMin: 20,
      normalMax: 30,
    },
  },
  [SensorType.SOIL_MOISTURE]: {
    dry_season: {
      min: 25,
      max: 55,
      normalMin: 30,
      normalMax: 50,
    },
    rainy_season: {
      min: 55,
      max: 90,
      normalMin: 60,
      normalMax: 85,
    },
    harmattan: {
      min: 15,
      max: 45,
      normalMin: 20,
      normalMax: 40,
    },
    transition: {
      min: 35,
      max: 70,
      normalMin: 40,
      normalMax: 65,
    },
  },
  [SensorType.CO2_LEVEL]: {
    dry_season: {
      min: 400,
      max: 1000,
      normalMin: 450,
      normalMax: 800,
    },
    rainy_season: {
      min: 400,
      max: 900,
      normalMin: 450,
      normalMax: 750,
    },
    harmattan: {
      min: 400,
      max: 1200,
      normalMin: 500,
      normalMax: 1000,
    },
    transition: {
      min: 400,
      max: 850,
      normalMin: 420,
      normalMax: 800,
    },
  },
  [SensorType.WATER_LEVEL]: {
    dry_season: {
      min: 30,
      max: 75,
      normalMin: 40,
      normalMax: 70,
    },
    rainy_season: {
      min: 60,
      max: 95,
      normalMin: 70,
      normalMax: 90,
    },
    harmattan: {
      min: 25,
      max: 65,
      normalMin: 35,
      normalMax: 60,
    },
    transition: {
      min: 45,
      max: 85,
      normalMin: 55,
      normalMax: 80,
    },
  },
  [SensorType.LUMINOSITY]: {
    dry_season: {
      min: 0,
      max: 1200,
      normalMin: 300,
      normalMax: 1100,
    },
    rainy_season: {
      min: 0,
      max: 1000,
      normalMin: 200,
      normalMax: 800,
    },
    harmattan: {
      min: 0,
      max: 1100,
      normalMin: 150,
      normalMax: 900,
    },
    transition: {
      min: 0,
      max: 1150,
      normalMin: 200,
      normalMax: 1000,
    },
  },
};

/**
 * Variations temporelles pour simuler jour/nuit et heures de la journée
 */
export interface TimeVariation {
  hour: number; // 0-23
  multiplier: number; // Multiplicateur pour ajuster les valeurs selon l'heure
}

export const TIME_VARIATIONS: Record<SensorType, TimeVariation[]> = {
  [SensorType.TEMPERATURE]: [
    { hour: 0, multiplier: 0.75 }, // Nuit froide
    { hour: 6, multiplier: 0.85 }, // Aube
    { hour: 12, multiplier: 1.15 }, // Midi chaud
    { hour: 18, multiplier: 1.0 }, // Soir
    { hour: 22, multiplier: 0.8 }, // Nuit
  ],
  [SensorType.SOIL_MOISTURE]: [
    { hour: 0, multiplier: 1.0 }, // Stable
    { hour: 6, multiplier: 1.05 }, // Rosée matinale
    { hour: 12, multiplier: 0.95 }, // Évaporation
    { hour: 18, multiplier: 1.0 }, // Stable
    { hour: 22, multiplier: 1.0 }, // Stable
  ],
  [SensorType.CO2_LEVEL]: [
    { hour: 0, multiplier: 1.0 }, // Stable
    { hour: 6, multiplier: 0.95 }, // Aube
    { hour: 12, multiplier: 1.05 }, // Photosynthèse
    { hour: 18, multiplier: 1.0 }, // Stable
    { hour: 22, multiplier: 1.0 }, // Stable
  ],
  [SensorType.WATER_LEVEL]: [
    { hour: 0, multiplier: 1.0 }, // Stable
    { hour: 6, multiplier: 1.0 }, // Stable
    { hour: 12, multiplier: 0.98 }, // Légère consommation
    { hour: 18, multiplier: 1.0 }, // Stable
    { hour: 22, multiplier: 1.0 }, // Stable
  ],
  [SensorType.LUMINOSITY]: [
    { hour: 0, multiplier: 0.1 }, // Nuit
    { hour: 6, multiplier: 0.5 }, // Lever du soleil
    { hour: 12, multiplier: 1.2 }, // Midi intense
    { hour: 18, multiplier: 0.6 }, // Coucher du soleil
    { hour: 22, multiplier: 0.1 }, // Nuit
  ],
};

/**
 * Obtient le multiplicateur pour une heure donnée
 */
export function getTimeMultiplier(sensorType: SensorType, hour: number): number {
  const variations = TIME_VARIATIONS[sensorType];
  // Trouver les deux points les plus proches
  for (let i = 0; i < variations.length - 1; i++) {
    if (hour >= variations[i].hour && hour < variations[i + 1].hour) {
      // Interpolation linéaire
      const ratio = (hour - variations[i].hour) / (variations[i + 1].hour - variations[i].hour);
      return variations[i].multiplier + (variations[i + 1].multiplier - variations[i].multiplier) * ratio;
    }
  }
  // Si après le dernier point, utiliser le dernier
  return variations[variations.length - 1].multiplier;
}
