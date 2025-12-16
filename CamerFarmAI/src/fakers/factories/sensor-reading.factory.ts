// src/fakers/factories/sensor-reading.factory.ts
import { faker } from '@faker-js/faker';
import { SensorType } from '../../models/Sensor.entity';
import { SensorReading } from '../../models/SensorReading.entity';
import {
  SENSOR_RANGES,
  SeasonalSituation,
  getTimeMultiplier,
} from '../config/sensor-ranges.config';

export interface GenerateOptions {
  count?: number;
  hours?: number;
  sensorId?: string;
  startTime?: Date;
  variation?: number; // Pourcentage de variation entre lectures consécutives (0-1)
}

/**
 * Factory pour générer des lectures de capteurs réalistes
 * selon différentes situations saisonnières au Cameroun
 */
export class SensorReadingFactory {
  /**
   * Génère une lecture unique pour un type de capteur et une situation donnée
   */
  static generate(
    sensorType: SensorType,
    situation: SeasonalSituation = 'transition',
    options: GenerateOptions = {}
  ): Partial<SensorReading> {
    const range = SENSOR_RANGES[sensorType][situation];
    const { startTime, sensorId } = options;
    
    // Utiliser la plage normale pour la plupart des valeurs
    let value = faker.number.float({
      min: range.normalMin,
      max: range.normalMax,
      fractionDigits: 2,
    });

    // Appliquer variation temporelle si une heure est fournie
    if (startTime) {
      const hour = startTime.getHours();
      const multiplier = getTimeMultiplier(sensorType, hour);
      
      // Pour la luminosité, appliquer une variation plus forte jour/nuit
      if (sensorType === SensorType.LUMINOSITY) {
        const isNight = hour >= 20 || hour < 6;
        if (isNight) {
          value = faker.number.float({
            min: 0,
            max: 200,
            fractionDigits: 2,
          });
        } else {
          value = faker.number.float({
            min: range.normalMin * multiplier,
            max: range.normalMax * multiplier,
            fractionDigits: 2,
          });
        }
      } else {
        value = value * multiplier;
        // S'assurer que la valeur reste dans les limites
        value = Math.max(range.min, Math.min(range.max, value));
      }
    }

    return {
      value: Number(value.toFixed(2)),
      sensorId: sensorId || faker.string.uuid(),
      timestamp: startTime || new Date(),
    };
  }

  /**
   * Génère une série de lectures cohérentes pour une période donnée
   */
  static generateSeries(
    sensorType: SensorType,
    situation: SeasonalSituation = 'transition',
    options: GenerateOptions = {}
  ): Partial<SensorReading>[] {
    const { count = 24, hours = 24, sensorId, startTime, variation = 0.1 } = options;
    const readings: Partial<SensorReading>[] = [];
    const range = SENSOR_RANGES[sensorType][situation];
    
    const start = startTime || new Date(Date.now() - hours * 60 * 60 * 1000);
    const intervalMs = (hours * 60 * 60 * 1000) / count;
    
    let previousValue: number | null = null;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(start.getTime() + i * intervalMs);
      const hour = timestamp.getHours();
      
      let value: number;
      
      if (previousValue === null) {
        // Première valeur : utiliser la méthode generate normale
        const reading = this.generate(sensorType, situation, { startTime: timestamp, sensorId });
        value = reading.value!;
      } else {
        // Valeurs suivantes : créer une variation cohérente
        const multiplier = getTimeMultiplier(sensorType, hour);
        
        // Variation progressive autour de la valeur précédente
        const variationAmount = (range.normalMax - range.normalMin) * variation;
        const randomVariation = faker.number.float({
          min: -variationAmount,
          max: variationAmount,
          fractionDigits: 2,
        });
        
        value = previousValue + randomVariation;
        
        // Pour la luminosité, gestion spéciale jour/nuit
        if (sensorType === SensorType.LUMINOSITY) {
          const isNight = hour >= 20 || hour < 6;
          if (isNight) {
            value = faker.number.float({
              min: 0,
              max: 200,
              fractionDigits: 2,
            });
          } else {
            // Assurer une transition progressive au lever/coucher du soleil
            if (hour >= 6 && hour < 8) {
              value = faker.number.float({
                min: 100,
                max: 400,
                fractionDigits: 2,
              });
            } else if (hour >= 18 && hour < 20) {
              value = faker.number.float({
                min: 200,
                max: 600,
                fractionDigits: 2,
              });
            } else {
              value = Math.max(range.normalMin * multiplier, Math.min(range.normalMax * multiplier, value));
            }
          }
        } else {
          // S'assurer que la valeur reste dans les limites
          value = Math.max(range.min, Math.min(range.max, value));
        }
      }

      readings.push({
        value: Number(value.toFixed(2)),
        sensorId: sensorId || faker.string.uuid(),
        timestamp,
      });

      previousValue = value;
    }

    return readings;
  }

  /**
   * Génère des lectures pour la saison sèche
   */
  static generateForDrySeason(
    sensorType: SensorType,
    options: GenerateOptions = {}
  ): Partial<SensorReading> | Partial<SensorReading>[] {
    if (options.count || options.hours) {
      return this.generateSeries(sensorType, 'dry_season', options);
    }
    return this.generate(sensorType, 'dry_season', options);
  }

  /**
   * Génère des lectures pour la saison des pluies
   */
  static generateForRainySeason(
    sensorType: SensorType,
    options: GenerateOptions = {}
  ): Partial<SensorReading> | Partial<SensorReading>[] {
    if (options.count || options.hours) {
      return this.generateSeries(sensorType, 'rainy_season', options);
    }
    return this.generate(sensorType, 'rainy_season', options);
  }

  /**
   * Génère des lectures pour l'harmattan
   */
  static generateForHarmattan(
    sensorType: SensorType,
    options: GenerateOptions = {}
  ): Partial<SensorReading> | Partial<SensorReading>[] {
    if (options.count || options.hours) {
      return this.generateSeries(sensorType, 'harmattan', options);
    }
    return this.generate(sensorType, 'harmattan', options);
  }

  /**
   * Génère des lectures pour une période de transition
   */
  static generateForTransition(
    sensorType: SensorType,
    options: GenerateOptions = {}
  ): Partial<SensorReading> | Partial<SensorReading>[] {
    if (options.count || options.hours) {
      return this.generateSeries(sensorType, 'transition', options);
    }
    return this.generate(sensorType, 'transition', options);
  }
}
