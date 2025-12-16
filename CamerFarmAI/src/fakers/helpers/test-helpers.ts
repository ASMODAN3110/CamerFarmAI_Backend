// src/fakers/helpers/test-helpers.ts
import { SensorType } from '../../models/Sensor.entity';
import { Sensor } from '../../models/Sensor.entity';
import { SensorReading } from '../../models/SensorReading.entity';
import { User } from '../../models/User.entity';
import { Plantation } from '../../models/Plantation.entity';
import { Actuator } from '../../models/Actuator.entity';
import { Event } from '../../models/Event.entity';
import { Notification } from '../../models/Notification.entity';
import { SensorReadingFactory } from '../factories/sensor-reading.factory';
import { SensorFactory } from '../factories/sensor.factory';
import { UserFactory } from '../factories/user.factory';
import { PlantationFactory } from '../factories/plantation.factory';
import { ActuatorFactory } from '../factories/actuator.factory';
import { EventFactory } from '../factories/event.factory';
import { NotificationFactory } from '../factories/notification.factory';
import { SeasonalSituation } from '../config/sensor-ranges.config';

/**
 * Crée une lecture de capteur factice unique
 */
export function createMockSensorReading(
  sensorType: SensorType,
  situation?: SeasonalSituation
): Partial<SensorReading> {
  return SensorReadingFactory.generate(sensorType, situation || 'transition');
}

/**
 * Crée plusieurs lectures de capteur factices
 */
export function createMockSensorReadings(
  sensorType: SensorType,
  count: number,
  situation?: SeasonalSituation
): Partial<SensorReading>[] {
  return SensorReadingFactory.generateSeries(sensorType, situation || 'transition', {
    count,
    hours: count, // Une lecture par heure
  });
}

/**
 * Crée un capteur factice complet avec ses lectures
 */
export function createMockSensorWithReadings(
  plantationId: string,
  sensorType: SensorType,
  readingsCount: number = 24,
  situation?: SeasonalSituation,
  options?: {
    withThresholds?: boolean;
    sensorId?: string;
  }
): {
  sensor: Partial<Sensor>;
  readings: Partial<SensorReading>[];
} {
  const { withThresholds = true, sensorId } = options || {};
  
  // Créer le capteur
  const sensorData: Partial<Sensor> = withThresholds
    ? SensorFactory.createWithThresholds({
        plantationId,
        type: sensorType,
      })
    : SensorFactory.createSimple(plantationId, sensorType);

  // Utiliser l'ID fourni ou générer un UUID
  if (sensorId) {
    sensorData.id = sensorId;
  }

  // Créer les lectures
  const readings = SensorReadingFactory.generateSeries(sensorType, situation || 'transition', {
    count: readingsCount,
    hours: readingsCount,
    sensorId: sensorId || sensorData.id as string,
  });

  return {
    sensor: sensorData,
    readings,
  };
}

/**
 * Crée plusieurs capteurs avec leurs lectures pour une plantation
 */
export function createMockSensorsWithReadings(
  plantationId: string,
  sensorTypes: SensorType[] = [
    SensorType.TEMPERATURE,
    SensorType.SOIL_MOISTURE,
    SensorType.CO2_LEVEL,
    SensorType.WATER_LEVEL,
    SensorType.LUMINOSITY,
  ],
  readingsCount: number = 24,
  situation?: SeasonalSituation
): {
  sensors: Partial<Sensor>[];
  readings: Partial<SensorReading>[];
} {
  const sensors = SensorFactory.createBatch(plantationId, sensorTypes);
  const allReadings: Partial<SensorReading>[] = [];

  sensors.forEach((sensor) => {
    const readings = SensorReadingFactory.generateSeries(
      sensor.type!,
      situation || 'transition',
      {
        count: readingsCount,
        hours: readingsCount,
        sensorId: sensor.id as string,
      }
    );
    allReadings.push(...readings);
  });

  return {
    sensors,
    readings: allReadings,
  };
}

/**
 * Crée un capteur factice simple (sans seuils, pour tests rapides)
 */
export function createMockSensor(
  plantationId: string,
  sensorType: SensorType
): Partial<Sensor> {
  return SensorFactory.createSimple(plantationId, sensorType);
}

/**
 * Crée plusieurs capteurs factices simples
 */
export function createMockSensors(
  plantationId: string,
  sensorTypes: SensorType[] = [
    SensorType.TEMPERATURE,
    SensorType.SOIL_MOISTURE,
    SensorType.CO2_LEVEL,
    SensorType.WATER_LEVEL,
    SensorType.LUMINOSITY,
  ]
): Partial<Sensor>[] {
  return sensorTypes.map((type) => createMockSensor(plantationId, type));
}

/**
 * Crée un écosystème complet de test (user + plantation + sensors + readings + actuators + events + notifications)
 */
export async function createCompleteTestData(options: {
  readingsPerSensor?: number;
  sensorsPerPlantation?: number;
  actuatorsPerPlantation?: number;
  eventsCount?: number;
  notificationsPerEvent?: number;
  situation?: SeasonalSituation;
} = {}): Promise<{
  user: Partial<User>;
  plantation: Partial<Plantation>;
  sensors: Partial<Sensor>[];
  readings: Partial<SensorReading>[];
  actuators: Partial<Actuator>[];
  events: Partial<Event>[];
  notifications: Partial<Notification>[];
}> {
  const {
    readingsPerSensor = 24,
    sensorsPerPlantation = 5,
    actuatorsPerPlantation = 3,
    eventsCount = 5,
    notificationsPerEvent = 2,
    situation = 'transition',
  } = options;

  // 1. Créer un utilisateur
  const user = await UserFactory.create();

  // 2. Créer une plantation
  const plantation = PlantationFactory.create({
    ownerId: user.id as string,
  });

  // 3. Créer des capteurs
  const sensorTypes = Object.values(SensorType).slice(0, sensorsPerPlantation);
  const sensors = SensorFactory.createBatch(plantation.id as string, sensorTypes);

  // 4. Créer des lectures pour chaque capteur
  const readings: Partial<SensorReading>[] = [];
  for (const sensor of sensors) {
    const sensorReadings = SensorReadingFactory.generateSeries(
      sensor.type!,
      situation,
      {
        count: readingsPerSensor,
        hours: readingsPerSensor,
        sensorId: sensor.id as string,
      }
    );
    readings.push(...sensorReadings);
  }

  // 5. Créer des actionneurs
  const actuators = ActuatorFactory.createBatch(
    plantation.id as string,
    actuatorsPerPlantation
  );

  // 6. Créer des événements
  const events: Partial<Event>[] = [];
  for (let i = 0; i < eventsCount; i++) {
    if (i % 2 === 0 && sensors.length > 0) {
      // Événement de seuil dépassé
      const sensor = sensors[i % sensors.length];
      const event = EventFactory.createThresholdExceeded(
        sensor.id as string,
        sensor.type
      );
      events.push(event);
    } else if (actuators.length > 0) {
      // Événement d'actionneur
      const actuator = actuators[i % actuators.length];
      const isActivated = i % 2 === 1;
      const event = isActivated
        ? EventFactory.createActuatorActivated(actuator.id as string, actuator.name)
        : EventFactory.createActuatorDeactivated(actuator.id as string, actuator.name);
      events.push(event);
    }
  }

  // 7. Créer des notifications
  const notifications: Partial<Notification>[] = [];
  for (const event of events) {
    for (let i = 0; i < notificationsPerEvent; i++) {
      const notification = NotificationFactory.create({
        eventId: event.id as string,
        userId: user.id as string,
      });
      notifications.push(notification);
    }
  }

  return {
    user,
    plantation,
    sensors,
    readings,
    actuators,
    events,
    notifications,
  };
}

/**
 * Crée plusieurs utilisateurs avec leurs plantations complètes
 */
export async function createMultipleUsersWithPlantations(
  userCount: number,
  plantationsPerUser: number = 1,
  options: {
    readingsPerSensor?: number;
    sensorsPerPlantation?: number;
    situation?: SeasonalSituation;
  } = {}
): Promise<{
  users: Partial<User>[];
  plantations: Partial<Plantation>[];
  sensors: Partial<Sensor>[];
  readings: Partial<SensorReading>[];
}> {
  const {
    readingsPerSensor = 24,
    sensorsPerPlantation = 5,
    situation = 'transition',
  } = options;

  const users = await UserFactory.createBatch(userCount);
  const plantations: Partial<Plantation>[] = [];
  const sensors: Partial<Sensor>[] = [];
  const readings: Partial<SensorReading>[] = [];

  for (const user of users) {
    for (let i = 0; i < plantationsPerUser; i++) {
      const plantation = PlantationFactory.create({
        ownerId: user.id as string,
      });
      plantations.push(plantation);

      const sensorTypes = Object.values(SensorType).slice(0, sensorsPerPlantation);
      const plantationSensors = SensorFactory.createBatch(
        plantation.id as string,
        sensorTypes
      );
      sensors.push(...plantationSensors);

      for (const sensor of plantationSensors) {
        const sensorReadings = SensorReadingFactory.generateSeries(
          sensor.type!,
          situation,
          {
            count: readingsPerSensor,
            hours: readingsPerSensor,
            sensorId: sensor.id as string,
          }
        );
        readings.push(...sensorReadings);
      }
    }
  }

  return {
    users,
    plantations,
    sensors,
    readings,
  };
}
