// src/fakers/helpers/scenario-helpers.ts
import { faker } from '@faker-js/faker';
import { SensorType } from '../../models/Sensor.entity';
import { SENSOR_RANGES, SeasonalSituation } from '../config/sensor-ranges.config';
import { selectSubScenario, ScenarioType } from '../config/scenarios.config';

/**
 * Génère une valeur normale pour un type de capteur et une situation
 */
export function generateNormalValue(sensorType: SensorType, situation: SeasonalSituation = 'transition'): number {
  const range = SENSOR_RANGES[sensorType][situation];
  return faker.number.float({
    min: range.normalMin,
    max: range.normalMax,
    fractionDigits: 2,
  });
}

/**
 * Génère une valeur limite (edge case) pour un type de capteur et une situation
 */
export function generateEdgeValue(sensorType: SensorType, situation: SeasonalSituation = 'transition'): number {
  const range = SENSOR_RANGES[sensorType][situation];
  // Choisir aléatoirement entre min et max
  const useMin = faker.datatype.boolean();
  if (useMin) {
    return faker.number.float({
      min: range.min,
      max: range.min + (range.normalMin - range.min) * 0.1,
      fractionDigits: 2,
    });
  } else {
    return faker.number.float({
      min: range.max - (range.max - range.normalMax) * 0.1,
      max: range.max,
      fractionDigits: 2,
    });
  }
}

/**
 * Génère une valeur d'alerte (dépassant les seuils) pour un type de capteur
 */
export function generateAlertValue(sensorType: SensorType, situation: SeasonalSituation = 'transition', aboveThreshold: boolean = true): number {
  const range = SENSOR_RANGES[sensorType][situation];
  
  if (aboveThreshold) {
    // Valeur au-dessus du seuil maximum
    const excess = (range.max - range.normalMax) * faker.number.float({ min: 0.1, max: 0.5 });
    return faker.number.float({
      min: range.normalMax + excess * 0.5,
      max: range.max,
      fractionDigits: 2,
    });
  } else {
    // Valeur en-dessous du seuil minimum
    const deficit = (range.normalMin - range.min) * faker.number.float({ min: 0.1, max: 0.5 });
    return faker.number.float({
      min: range.min,
      max: range.normalMin - deficit * 0.5,
      fractionDigits: 2,
    });
  }
}

/**
 * Génère une valeur selon un scénario donné
 */
export function generateValueByScenario(
  sensorType: SensorType,
  scenario: ScenarioType,
  situation?: SeasonalSituation
): number {
  const finalSituation = situation || faker.helpers.arrayElement(['dry_season', 'rainy_season', 'harmattan', 'transition'] as SeasonalSituation[]);
  const subScenario = selectSubScenario(scenario);

  switch (subScenario) {
    case 'normal':
      return generateNormalValue(sensorType, finalSituation);
    case 'edge':
      return generateEdgeValue(sensorType, finalSituation);
    case 'alert':
      return generateAlertValue(sensorType, finalSituation, faker.datatype.boolean());
    case 'seasonal':
      return generateNormalValue(sensorType, finalSituation);
    default:
      return generateNormalValue(sensorType, finalSituation);
  }
}

/**
 * Génère une situation saisonnière aléatoire
 */
export function generateRandomSeasonalSituation(): SeasonalSituation {
  return faker.helpers.arrayElement(['dry_season', 'rainy_season', 'harmattan', 'transition'] as SeasonalSituation[]);
}

/**
 * Génère des seuils pour un capteur selon un scénario
 */
export function generateThresholdsByScenario(
  sensorType: SensorType,
  scenario: ScenarioType,
  situation: SeasonalSituation = 'transition'
): { min: number; max: number } {
  const range = SENSOR_RANGES[sensorType][situation];
  const subScenario = selectSubScenario(scenario);

  switch (subScenario) {
    case 'normal':
      // Seuils dans la plage normale avec une marge
      const normalMargin = (range.normalMax - range.normalMin) * 0.1;
      return {
        min: range.normalMin - normalMargin,
        max: range.normalMax + normalMargin,
      };
    case 'edge':
      // Seuils très proches des limites
      return {
        min: range.min + (range.normalMin - range.min) * 0.1,
        max: range.max - (range.max - range.normalMax) * 0.1,
      };
    case 'alert':
      // Seuils serrés pour déclencher plus d'alertes
      const alertMargin = (range.normalMax - range.normalMin) * 0.05;
      return {
        min: range.normalMin + alertMargin,
        max: range.normalMax - alertMargin,
      };
    case 'seasonal':
      // Seuils adaptés à la saison
      const seasonalMargin = (range.normalMax - range.normalMin) * 0.15;
      return {
        min: range.normalMin - seasonalMargin,
        max: range.normalMax + seasonalMargin,
      };
    default:
      const defaultMargin = (range.normalMax - range.normalMin) * 0.1;
      return {
        min: range.normalMin - defaultMargin,
        max: range.normalMax + defaultMargin,
      };
  }
}

