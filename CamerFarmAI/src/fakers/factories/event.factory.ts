// src/fakers/factories/event.factory.ts
import { faker } from '@faker-js/faker';
import { Event, EventType } from '../../models/Event.entity';
import { SensorType } from '../../models/Sensor.entity';

export interface CreateEventOptions {
  type?: EventType;
  sensorId?: string;
  actuatorId?: string;
  description?: string;
  date?: Date;
}

/**
 * Descriptions réalistes selon le type d'événement
 */
const EVENT_DESCRIPTIONS: Record<EventType, (sensorType?: SensorType, actuatorName?: string) => string> = {
  [EventType.SEUIL_DEPASSE]: (sensorType) => {
    const sensorNames: Record<SensorType, string> = {
      [SensorType.TEMPERATURE]: 'Température',
      [SensorType.SOIL_MOISTURE]: 'Humidité du sol',
      [SensorType.CO2_LEVEL]: 'Niveau de CO2',
      [SensorType.WATER_LEVEL]: 'Niveau d\'eau',
      [SensorType.LUMINOSITY]: 'Luminosité',
    };
    const sensorName = sensorType ? sensorNames[sensorType] : 'Capteur';
    const isAbove = faker.datatype.boolean();
    return `${sensorName} a ${isAbove ? 'dépassé le seuil maximum' : 'descendu en dessous du seuil minimum'}. Action requise.`;
  },
  [EventType.ACTIONNEUR_ACTIVE]: (_, actuatorName) => {
    const name = actuatorName || 'Actionneur';
    return `${name} a été activé automatiquement pour corriger les conditions environnementales.`;
  },
  [EventType.ACTIONNEUR_DESACTIVE]: (_, actuatorName) => {
    const name = actuatorName || 'Actionneur';
    return `${name} a été désactivé. Les conditions sont revenues à la normale.`;
  },
  [EventType.MODE_CHANGED]: () => {
    const modes = ['automatique', 'manuel'];
    const from = faker.helpers.arrayElement(modes);
    const to = modes.find(m => m !== from)!;
    return `Le mode de contrôle de la plantation a été changé de ${from} à ${to}.`;
  },
};

/**
 * Factory pour générer des événements avec des données réalistes
 */
export class EventFactory {
  /**
   * Génère un événement avec des données réalistes
   */
  static create(options: CreateEventOptions = {}): Partial<Event> {
    const {
      type = faker.helpers.arrayElement([
        EventType.SEUIL_DEPASSE,
        EventType.ACTIONNEUR_ACTIVE,
        EventType.ACTIONNEUR_DESACTIVE,
        EventType.MODE_CHANGED,
      ]),
      sensorId,
      actuatorId,
      description,
      date = faker.date.recent({ days: 30 }),
    } = options;

    // Générer une description si non fournie
    const finalDescription = description || EVENT_DESCRIPTIONS[type]();

    const event: Partial<Event> = {
      type,
      description: finalDescription,
      date,
    };

    // Ajouter sensorId ou actuatorId selon le type
    if (type === EventType.SEUIL_DEPASSE && sensorId) {
      event.sensorId = sensorId;
    } else if ((type === EventType.ACTIONNEUR_ACTIVE || type === EventType.ACTIONNEUR_DESACTIVE) && actuatorId) {
      event.actuatorId = actuatorId;
    }

    return event;
  }

  /**
   * Génère plusieurs événements
   */
  static createBatch(count: number, options: CreateEventOptions = {}): Partial<Event>[] {
    const events: Partial<Event>[] = [];

    for (let i = 0; i < count; i++) {
      const event = this.create(options);
      events.push(event);
    }

    return events;
  }

  /**
   * Génère un événement de seuil dépassé
   */
  static createThresholdExceeded(sensorId: string, sensorType?: SensorType): Partial<Event> {
    return this.create({
      type: EventType.SEUIL_DEPASSE,
      sensorId,
      description: EVENT_DESCRIPTIONS[EventType.SEUIL_DEPASSE](sensorType),
    });
  }

  /**
   * Génère un événement d'actionneur activé
   */
  static createActuatorActivated(actuatorId: string, actuatorName?: string): Partial<Event> {
    return this.create({
      type: EventType.ACTIONNEUR_ACTIVE,
      actuatorId,
      description: EVENT_DESCRIPTIONS[EventType.ACTIONNEUR_ACTIVE](undefined, actuatorName),
    });
  }

  /**
   * Génère un événement d'actionneur désactivé
   */
  static createActuatorDeactivated(actuatorId: string, actuatorName?: string): Partial<Event> {
    return this.create({
      type: EventType.ACTIONNEUR_DESACTIVE,
      actuatorId,
      description: EVENT_DESCRIPTIONS[EventType.ACTIONNEUR_DESACTIVE](undefined, actuatorName),
    });
  }

  /**
   * Génère un événement de changement de mode
   */
  static createModeChanged(): Partial<Event> {
    return this.create({
      type: EventType.MODE_CHANGED,
      description: EVENT_DESCRIPTIONS[EventType.MODE_CHANGED](),
    });
  }

  /**
   * Génère des événements pour une période donnée
   */
  static createForPeriod(startDate: Date, endDate: Date, count: number, options: Omit<CreateEventOptions, 'date'> = {}): Partial<Event>[] {
    const events: Partial<Event>[] = [];
    const timeRange = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const randomTime = startDate.getTime() + Math.random() * timeRange;
      const event = this.create({
        ...options,
        date: new Date(randomTime),
      });
      events.push(event);
    }

    // Trier par date
    events.sort((a, b) => a.date!.getTime() - b.date!.getTime());

    return events;
  }
}

