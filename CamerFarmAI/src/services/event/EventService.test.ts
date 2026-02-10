// src/services/event/EventService.test.ts
import { EventService } from './EventService';
import { Event, EventType } from '../../models/Event.entity';
import { SensorType } from '../../models/Sensor.entity';
import { AppDataSource } from '../../config/database';

// Mock AppDataSource
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('EventService.checkSensorThresholds', () => {
  let mockEventRepository: any;
  let mockEvent: Event;

  beforeEach(() => {
    // Créer un mock d'événement
    mockEvent = {
      id: 'event-id-123',
      type: EventType.SEUIL_DEPASSE,
      description: 'Test event',
      sensorId: 'sensor-id-123',
      date: new Date(),
    } as Event;

    // Mock du repository d'événements
    mockEventRepository = {
      create: jest.fn().mockReturnValue(mockEvent),
      save: jest.fn().mockResolvedValue(mockEvent),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockEventRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cas sans seuils définis', () => {
    it('devrait retourner null si aucun seuil n\'est défini (seuilMin et seuilMax null)', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: null,
        seuilMax: null,
      };

      const reading = {
        id: 'reading-id-123',
        value: 25.5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('devrait retourner null si aucun seuil n\'est défini (seuilMin et seuilMax undefined)', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: undefined,
        seuilMax: undefined,
      };

      const reading = {
        id: 'reading-id-123',
        value: 25.5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Valeurs dans les limites', () => {
    it('devrait retourner null si la valeur est dans les limites (entre seuilMin et seuilMax)', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 20,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('devrait retourner null si la valeur est égale au seuilMin', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 10,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('devrait retourner null si la valeur est égale au seuilMax', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 30,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('devrait retourner null si seul seuilMin est défini et la valeur est supérieure', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: null,
      };

      const reading = {
        id: 'reading-id-123',
        value: 25,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('devrait retourner null si seul seuilMax est défini et la valeur est inférieure', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: null,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 20,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).toBeNull();
      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Valeurs en dessous du seuil minimum', () => {
    it('devrait créer un événement si la valeur est inférieure au seuilMin', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur temperature a enregistré une valeur (5) inférieure au seuil minimum (10)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });

    it('devrait créer un événement avec le nom de la plantation si fourni', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.SOIL_MOISTURE,
        seuilMin: 20,
        seuilMax: 80,
      };

      const reading = {
        id: 'reading-id-123',
        value: 15,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading, 'Mon Champ');

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur soilMoisture du champ "Mon Champ" a enregistré une valeur (15) inférieure au seuil minimum (20)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });

    it('devrait créer un événement même si seul seuilMin est défini', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.CO2_LEVEL,
        seuilMin: 400,
        seuilMax: null,
      };

      const reading = {
        id: 'reading-id-123',
        value: 350,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur co2Level a enregistré une valeur (350) inférieure au seuil minimum (400)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });
  });

  describe('Valeurs au-dessus du seuil maximum', () => {
    it('devrait créer un événement si la valeur est supérieure au seuilMax', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 35,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur temperature a enregistré une valeur (35) supérieure au seuil maximum (30)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });

    it('devrait créer un événement avec le nom de la plantation si fourni', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.WATER_LEVEL,
        seuilMin: 10,
        seuilMax: 100,
      };

      const reading = {
        id: 'reading-id-123',
        value: 120,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading, 'Champ Test');

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur waterLevel du champ "Champ Test" a enregistré une valeur (120) supérieure au seuil maximum (100)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });

    it('devrait créer un événement même si seul seuilMax est défini', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.LUMINOSITY,
        seuilMin: null,
        seuilMax: 1000,
      };

      const reading = {
        id: 'reading-id-123',
        value: 1200,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur luminosity a enregistré une valeur (1200) supérieure au seuil maximum (1000)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
      expect(mockEventRepository.save).toHaveBeenCalled();
    });
  });

  describe('Priorité des seuils', () => {
    it('devrait vérifier seuilMin en premier si les deux seuils sont dépassés (valeur très basse)', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5, // En dessous des deux seuils
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      // Devrait créer un événement pour seuilMin (vérifié en premier)
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        type: EventType.SEUIL_DEPASSE,
        description: 'Le capteur temperature a enregistré une valeur (5) inférieure au seuil minimum (10)',
        sensorId: 'sensor-id-123',
        actuatorId: undefined,
      });
    });

    it('ne devrait pas créer d\'événement pour seuilMax si seuilMin est déjà dépassé', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      await EventService.checkSensorThresholds(sensor, reading);

      // Ne devrait créer qu'un seul événement (pour seuilMin)
      expect(mockEventRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Différents types de capteurs', () => {
    it('devrait fonctionner avec un capteur de température', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 15,
        seuilMax: 25,
      };

      const reading = {
        id: 'reading-id-123',
        value: 12,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SEUIL_DEPASSE,
          description: expect.stringContaining('temperature'),
        })
      );
    });

    it('devrait fonctionner avec un capteur d\'humidité du sol', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.SOIL_MOISTURE,
        seuilMin: 20,
        seuilMax: 80,
      };

      const reading = {
        id: 'reading-id-123',
        value: 90,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SEUIL_DEPASSE,
          description: expect.stringContaining('soilMoisture'),
        })
      );
    });

    it('devrait fonctionner avec un capteur de niveau de CO2', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.CO2_LEVEL,
        seuilMin: 400,
        seuilMax: 1000,
      };

      const reading = {
        id: 'reading-id-123',
        value: 1200,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SEUIL_DEPASSE,
          description: expect.stringContaining('co2Level'),
        })
      );
    });

    it('devrait fonctionner avec un capteur de niveau d\'eau', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.WATER_LEVEL,
        seuilMin: 10,
        seuilMax: 100,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SEUIL_DEPASSE,
          description: expect.stringContaining('waterLevel'),
        })
      );
    });

    it('devrait fonctionner avec un capteur de luminosité', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.LUMINOSITY,
        seuilMin: 100,
        seuilMax: 1000,
      };

      const reading = {
        id: 'reading-id-123',
        value: 50,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SEUIL_DEPASSE,
          description: expect.stringContaining('luminosity'),
        })
      );
    });
  });

  describe('Valeurs numériques', () => {
    it('devrait gérer correctement les valeurs décimales', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10.5,
        seuilMax: 30.75,
      };

      const reading = {
        id: 'reading-id-123',
        value: 9.25,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/9\.25.*10\.5|10\.5.*9\.25/),
        })
      );
    });

    it('devrait gérer correctement les valeurs négatives', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: -10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: -15,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/-15.*-10|-10.*-15/),
        })
      );
    });

    it('devrait gérer correctement les grandes valeurs', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.CO2_LEVEL,
        seuilMin: 400,
        seuilMax: 10000,
      };

      const reading = {
        id: 'reading-id-123',
        value: 15000,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);
      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/15000.*10000|10000.*15000/),
        })
      );
    });
  });

  describe('Nom de plantation optionnel', () => {
    it('devrait créer un événement sans nom de plantation si non fourni', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Le capteur temperature a enregistré une valeur (5) inférieure au seuil minimum (10)',
        })
      );
    });

    it('devrait inclure le nom de la plantation dans la description si fourni', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading, 'Mon Super Champ');

      expect(result).not.toBeNull();
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Le capteur temperature du champ "Mon Super Champ" a enregistré une valeur (5) inférieure au seuil minimum (10)',
        })
      );
    });

    it('devrait gérer une chaîne vide comme nom de plantation', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading, '');

      expect(result).not.toBeNull();
      // Avec une chaîne vide, le texte de plantation ne devrait pas être ajouté
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Le capteur temperature a enregistré une valeur (5) inférieure au seuil minimum (10)',
        })
      );
    });
  });

  describe('Retour de l\'événement créé', () => {
    it('devrait retourner l\'événement créé par createEvent', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 5,
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).toBe(mockEvent);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(EventType.SEUIL_DEPASSE);
      expect(result?.sensorId).toBe('sensor-id-123');
    });

    it('devrait retourner null si aucun événement n\'est créé', async () => {
      const sensor = {
        id: 'sensor-id-123',
        type: SensorType.TEMPERATURE,
        seuilMin: 10,
        seuilMax: 30,
      };

      const reading = {
        id: 'reading-id-123',
        value: 20, // Dans les limites
        sensorId: 'sensor-id-123',
      };

      const result = await EventService.checkSensorThresholds(sensor, reading);

      expect(result).toBeNull();
    });
  });
});
