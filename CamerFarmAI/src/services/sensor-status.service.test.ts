import * as sensorStatusService from './sensor-status.service';
import { SensorStatus } from '../models/Sensor.entity';
import { EventService } from './event/EventService';
import { AppDataSource } from '../config/database';

jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('./event/EventService', () => ({
  EventService: {
    notifySensorStatusChange: jest.fn(),
  },
}));

describe('sensor-status.service', () => {
  const mockGetRepository = AppDataSource.getRepository as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('updateSensorStatusesForPlantation', () => {
    it('ne fait rien si la plantation n\'existe pas', async () => {
      mockGetRepository.mockImplementation((entity: any) => {
        if (entity.name === 'Plantation') {
          return { findOne: jest.fn().mockResolvedValue(null) };
        }
        if (entity.name === 'Sensor') {
          return { find: jest.fn() };
        }
        return { findOne: jest.fn() };
      });

      await sensorStatusService.updateSensorStatusesForPlantation('plantation-id');

      // Plantation + Sensor + SensorReading (appels TypeORM)
      expect(mockGetRepository).toHaveBeenCalledTimes(3);
      expect(EventService.notifySensorStatusChange).not.toHaveBeenCalled();
    });

    it('marque un capteur INACTIVE si aucune lecture n\'existe', async () => {
      const fixedNow = new Date('2026-05-10T12:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const plantationRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
      };
      const sensorRepo = {
        find: jest.fn().mockResolvedValue([
          { id: 's1', status: SensorStatus.ACTIVE, plantationId: 'p1' },
        ]),
        save: jest.fn().mockImplementation(async (s: any) => s),
      };
      const sensorReadingRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockGetRepository.mockImplementation((entity: any) => {
        // Ordre exact: Plantation, Sensor, SensorReading
        if (entity.name === 'Plantation') return plantationRepo;
        if (entity.name === 'Sensor') return sensorRepo;
        return sensorReadingRepo;
      });

      await sensorStatusService.updateSensorStatusesForPlantation('p1');

      expect(sensorRepo.save).toHaveBeenCalledTimes(1);
      const saved = sensorRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(SensorStatus.INACTIVE);
      expect(EventService.notifySensorStatusChange).toHaveBeenCalledTimes(1);
    });

    it('passe INACTIVE si la dernière lecture date de plus d\'1 heure', async () => {
      const fixedNow = new Date('2026-05-10T12:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const plantationRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'p1', name: 'Plant 1', owner: { id: 'u1' } }),
      };
      const sensorRepo = {
        find: jest.fn().mockResolvedValue([
          { id: 's1', status: SensorStatus.ACTIVE, plantationId: 'p1' },
        ]),
        save: jest.fn().mockImplementation(async (s: any) => s),
      };
      const sensorReadingRepo = {
        findOne: jest.fn().mockResolvedValue({
          timestamp: new Date(fixedNow - 2 * 60 * 60 * 1000),
        }),
      };

      mockGetRepository.mockImplementation((entity: any) => {
        if (entity.name === 'Plantation') return plantationRepo;
        if (entity.name === 'Sensor') return sensorRepo;
        return sensorReadingRepo;
      });

      await sensorStatusService.updateSensorStatusesForPlantation('p1');

      expect(sensorRepo.save).toHaveBeenCalledTimes(1);
      const saved = sensorRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(SensorStatus.INACTIVE);
      expect(EventService.notifySensorStatusChange).toHaveBeenCalledTimes(1);
    });

    it('laisse ACTIVE si la dernière lecture est récente (< 1h)', async () => {
      const fixedNow = new Date('2026-05-10T12:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const plantationRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
      };
      const sensorRepo = {
        find: jest.fn().mockResolvedValue([
          { id: 's1', status: SensorStatus.ACTIVE, plantationId: 'p1' },
        ]),
        save: jest.fn().mockImplementation(async (s: any) => s),
      };
      const sensorReadingRepo = {
        findOne: jest.fn().mockResolvedValue({
          timestamp: new Date(fixedNow - 30 * 60 * 1000),
        }),
      };

      mockGetRepository.mockImplementation((entity: any) => {
        if (entity.name === 'Plantation') return plantationRepo;
        if (entity.name === 'Sensor') return sensorRepo;
        return sensorReadingRepo;
      });

      await sensorStatusService.updateSensorStatusesForPlantation('p1');

      expect(sensorRepo.save).not.toHaveBeenCalled();
      expect(EventService.notifySensorStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('updateAllPlantationsSensorStatuses', () => {
    it('appelle updateSensorStatusesForPlantation pour chaque plantation', async () => {
      const plantationRepo = {
        find: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
        findOne: jest.fn().mockResolvedValue({ id: 'p', name: 'Plant', owner: { id: 'u1' } }),
      };

      const sensorRepo = {
        find: jest.fn().mockResolvedValue([]), // aucun capteur => early return dans updateSensorStatusesForPlantation
      };

      mockGetRepository.mockImplementation((entity: any) => {
        if (entity.name === 'Plantation') return plantationRepo;
        if (entity.name === 'Sensor') return sensorRepo;
        return { findOne: jest.fn() };
      });

      await sensorStatusService.updateAllPlantationsSensorStatuses();

      // On vérifie indirectement: find appelé pour lister toutes les plantations
      expect(plantationRepo.find).toHaveBeenCalledTimes(1);
      // Et les findOne sont appelés pour chaque plantation
      expect(plantationRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });
});

