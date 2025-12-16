// src/fakers/factories/sensor.factory.ts
import { Sensor, SensorType, SensorStatus } from '../../models/Sensor.entity';
import { SENSOR_RANGES } from '../config/sensor-ranges.config';

export interface CreateSensorOptions {
  plantationId: string;
  type: SensorType;
  status?: SensorStatus;
  seuilMin?: number;
  seuilMax?: number;
}

/**
 * Factory pour générer des capteurs avec des seuils réalistes
 */
export class SensorFactory {
  /**
   * Définit des seuils cohérents selon le type de capteur
   * Les seuils sont basés sur les plages normales pour la situation de transition
   */
  static getDefaultThresholds(sensorType: SensorType): { min: number; max: number } {
    const range = SENSOR_RANGES[sensorType].transition;
    
    // Les seuils sont généralement un peu plus larges que la plage normale
    // pour éviter trop d'alertes, mais restent dans les limites min/max
    const margin = (range.normalMax - range.normalMin) * 0.2;
    
    return {
      min: Math.max(range.min, range.normalMin - margin),
      max: Math.min(range.max, range.normalMax + margin),
    };
  }

  /**
   * Crée un capteur avec des seuils réalistes
   */
  static createWithThresholds(
    options: CreateSensorOptions
  ): Partial<Sensor> {
    const { plantationId, type, status = SensorStatus.ACTIVE, seuilMin, seuilMax } = options;
    
    let finalSeuilMin: number;
    let finalSeuilMax: number;
    
    if (seuilMin !== undefined && seuilMax !== undefined) {
      finalSeuilMin = seuilMin;
      finalSeuilMax = seuilMax;
    } else {
      const defaults = this.getDefaultThresholds(type);
      finalSeuilMin = seuilMin ?? defaults.min;
      finalSeuilMax = seuilMax ?? defaults.max;
    }

    // S'assurer que min < max
    if (finalSeuilMin >= finalSeuilMax) {
      const temp = finalSeuilMin;
      finalSeuilMin = finalSeuilMax - 1;
      finalSeuilMax = temp + 1;
    }

    return {
      type,
      status,
      plantationId,
      seuilMin: Number(finalSeuilMin.toFixed(2)),
      seuilMax: Number(finalSeuilMax.toFixed(2)),
    };
  }

  /**
   * Crée plusieurs capteurs pour une plantation
   */
  static createBatch(
    plantationId: string,
    types: SensorType[] = [
      SensorType.TEMPERATURE,
      SensorType.SOIL_MOISTURE,
      SensorType.CO2_LEVEL,
      SensorType.WATER_LEVEL,
      SensorType.LUMINOSITY,
    ],
    options: {
      status?: SensorStatus;
      withThresholds?: boolean;
    } = {}
  ): Partial<Sensor>[] {
    const { status = SensorStatus.ACTIVE, withThresholds = true } = options;
    
    return types.map((type) => {
      if (withThresholds) {
        return this.createWithThresholds({
          plantationId,
          type,
          status,
        });
      }
      
      return {
        type,
        status,
        plantationId,
      };
    });
  }

  /**
   * Crée un capteur simple sans seuils (pour tests)
   */
  static createSimple(
    plantationId: string,
    type: SensorType,
    status: SensorStatus = SensorStatus.ACTIVE
  ): Partial<Sensor> {
    return {
      type,
      status,
      plantationId,
    };
  }
}
