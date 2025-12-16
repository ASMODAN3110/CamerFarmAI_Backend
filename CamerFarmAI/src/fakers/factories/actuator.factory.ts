// src/fakers/factories/actuator.factory.ts
import { faker } from '@faker-js/faker';
import { Actuator, ActuatorStatus } from '../../models/Actuator.entity';

export type ActuatorType = 'pump' | 'fan' | 'sprinkler' | 'valve' | 'heater' | 'light';

export interface CreateActuatorOptions {
  plantationId: string;
  name?: string;
  type?: ActuatorType;
  status?: ActuatorStatus;
  metadata?: Record<string, any>;
}

/**
 * Métadonnées par défaut selon le type d'actionneur
 */
const ACTUATOR_METADATA: Record<ActuatorType, () => Record<string, any>> = {
  pump: () => ({
    flowRate: `${faker.number.int({ min: 15, max: 50 })}L/min`,
    power: `${faker.number.int({ min: 200, max: 500 })}W`,
    pressure: `${faker.number.float({ min: 2.0, max: 6.0, fractionDigits: 1 })} bar`,
  }),
  fan: () => ({
    speedLevels: faker.number.int({ min: 1, max: 5 }),
    power: `${faker.number.int({ min: 100, max: 300 })}W`,
    diameter: `${faker.number.int({ min: 30, max: 60 })}cm`,
  }),
  sprinkler: () => ({
    coverage: `${faker.number.int({ min: 5, max: 20 })}m`,
    waterFlow: `${faker.number.float({ min: 10, max: 40, fractionDigits: 1 })}L/min`,
    pattern: faker.helpers.arrayElement(['circular', 'rectangular', 'square']),
  }),
  valve: () => ({
    diameter: `${faker.number.int({ min: 1, max: 4 })}"`,
    material: faker.helpers.arrayElement(['PVC', 'metal', 'brass']),
    maxPressure: `${faker.number.float({ min: 4.0, max: 10.0, fractionDigits: 1 })} bar`,
  }),
  heater: () => ({
    power: `${faker.number.int({ min: 1000, max: 3000 })}W`,
    temperatureRange: `${faker.number.int({ min: 15, max: 30 })}-${faker.number.int({ min: 30, max: 50 })}°C`,
    type: faker.helpers.arrayElement(['electric', 'gas', 'solar']),
  }),
  light: () => ({
    power: `${faker.number.int({ min: 50, max: 200 })}W`,
    color: faker.helpers.arrayElement(['white', 'red', 'blue', 'full-spectrum']),
    type: faker.helpers.arrayElement(['LED', 'fluorescent', 'incandescent']),
  }),
};

/**
 * Noms par défaut selon le type d'actionneur
 */
const ACTUATOR_NAMES: Record<ActuatorType, () => string> = {
  pump: () => faker.helpers.arrayElement(['Pompe principale', 'Pompe secondaire', 'Pompe d\'irrigation', 'Pompe de drainage']),
  fan: () => faker.helpers.arrayElement(['Ventilateur nord', 'Ventilateur sud', 'Ventilateur est', 'Ventilateur ouest', 'Système de ventilation']),
  sprinkler: () => faker.helpers.arrayElement(['Arroseur zone 1', 'Arroseur zone 2', 'Système d\'arrosage', 'Sprinkler principal']),
  valve: () => faker.helpers.arrayElement(['Vanne principale', 'Vanne d\'irrigation', 'Vanne de contrôle', 'Vanne de sécurité']),
  heater: () => faker.helpers.arrayElement(['Chauffage serre', 'Radiateur', 'Système de chauffage']),
  light: () => faker.helpers.arrayElement(['Éclairage principal', 'Lampe de croissance', 'Éclairage LED']),
};

/**
 * Factory pour générer des actionneurs avec des données réalistes
 */
export class ActuatorFactory {
  /**
   * Génère un actionneur avec des données réalistes
   */
  static create(options: CreateActuatorOptions): Partial<Actuator> {
    const {
      plantationId,
      name,
      type = faker.helpers.arrayElement(['pump', 'fan', 'sprinkler', 'valve', 'heater', 'light'] as ActuatorType[]),
      status = faker.helpers.arrayElement([ActuatorStatus.ACTIVE, ActuatorStatus.INACTIVE]),
      metadata,
    } = options;

    const finalName = name || ACTUATOR_NAMES[type]();
    const finalMetadata = metadata || ACTUATOR_METADATA[type]();

    return {
      name: finalName,
      type,
      status,
      metadata: finalMetadata,
      plantationId,
    };
  }

  /**
   * Génère plusieurs actionneurs pour une plantation
   */
  static createBatch(plantationId: string, count: number, options: Omit<CreateActuatorOptions, 'plantationId'> = {}): Partial<Actuator>[] {
    const actuators: Partial<Actuator>[] = [];

    for (let i = 0; i < count; i++) {
      const actuator = this.create({
        plantationId,
        ...options,
      });
      actuators.push(actuator);
    }

    return actuators;
  }

  /**
   * Génère un actionneur actif
   */
  static createActive(options: Omit<CreateActuatorOptions, 'status'>): Partial<Actuator> {
    return this.create({ ...options, status: ActuatorStatus.ACTIVE });
  }

  /**
   * Génère un actionneur inactif
   */
  static createInactive(options: Omit<CreateActuatorOptions, 'status'>): Partial<Actuator> {
    return this.create({ ...options, status: ActuatorStatus.INACTIVE });
  }

  /**
   * Génère un ensemble d'actionneurs par défaut pour une plantation
   * (pompe, ventilateur, arroseur)
   */
  static createDefaultSet(plantationId: string): Partial<Actuator>[] {
    return [
      this.create({ plantationId, type: 'pump', status: ActuatorStatus.ACTIVE }),
      this.create({ plantationId, type: 'fan', status: ActuatorStatus.ACTIVE }),
      this.create({ plantationId, type: 'sprinkler', status: ActuatorStatus.ACTIVE }),
    ];
  }
}

