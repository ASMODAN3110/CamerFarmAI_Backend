import { ThresholdService } from './ThresholdService';
import { EventService } from './EventService';
import { AppDataSource } from '../../config/database';
import { Plantation } from '../../models/Plantation.entity';
import { Sensor } from '../../models/Sensor.entity';
import { SensorReading } from '../../models/SensorReading.entity';

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('./EventService', () => ({
  EventService: {
    checkSensorThresholds: jest.fn(),
    processEvent: jest.fn(),
  },
}));

describe('ThresholdService.checkThresholds', () => {
  const mockGetRepository = AppDataSource.getRepository as jest.Mock;
  const mockCheckSensorThresholds = (EventService.checkSensorThresholds as jest.Mock);
  const mockProcessEvent = (EventService.processEvent as jest.Mock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ne fait rien si la plantation n’existe pas', async () => {
    mockGetRepository.mockImplementation((entity: any) => {
      if (entity.name === 'Plantation') {
        return { findOne: jest.fn().mockResolvedValue(null) };
      }
      return {};
    });

    const sensor = { id: 's1', plantationId: 'p1' } as unknown as Sensor;
    const reading = { id: 'r1', sensorId: 's1' } as unknown as SensorReading;

    await ThresholdService.checkThresholds(sensor, reading);

    expect(mockCheckSensorThresholds).not.toHaveBeenCalled();
    expect(mockProcessEvent).not.toHaveBeenCalled();
  });

  it('appelle EventService.checkSensorThresholds puis processEvent si un event est retourné', async () => {
    const plantation = { id: 'p1', name: 'Plant 1', owner: { id: 'owner-1' } } as unknown as Plantation;

    mockGetRepository.mockImplementation((entity: any) => {
      if (entity.name === 'Plantation') {
        return { findOne: jest.fn().mockResolvedValue(plantation) };
      }
      return {};
    });

    const sensor = { id: 's1', plantationId: 'p1' } as unknown as Sensor;
    const reading = { id: 'r1', sensorId: 's1' } as unknown as SensorReading;

    const fakeEvent = { id: 'e1' } as any;
    mockCheckSensorThresholds.mockResolvedValue(fakeEvent);

    await ThresholdService.checkThresholds(sensor, reading);

    expect(mockCheckSensorThresholds).toHaveBeenCalledTimes(1);
    expect(mockCheckSensorThresholds).toHaveBeenCalledWith(sensor, reading, 'Plant 1');
    expect(mockProcessEvent).toHaveBeenCalledTimes(1);
    expect(mockProcessEvent).toHaveBeenCalledWith(fakeEvent, ['owner-1']);
  });

  it('n’appelle pas processEvent si checkSensorThresholds renvoie null', async () => {
    const plantation = { id: 'p1', name: 'Plant 1', owner: { id: 'owner-1' } } as unknown as Plantation;

    mockGetRepository.mockImplementation((entity: any) => {
      if (entity.name === 'Plantation') {
        return { findOne: jest.fn().mockResolvedValue(plantation) };
      }
      return {};
    });

    const sensor = { id: 's1', plantationId: 'p1' } as unknown as Sensor;
    const reading = { id: 'r1', sensorId: 's1' } as unknown as SensorReading;

    mockCheckSensorThresholds.mockResolvedValue(null);

    await ThresholdService.checkThresholds(sensor, reading);

    expect(mockCheckSensorThresholds).toHaveBeenCalledTimes(1);
    expect(mockProcessEvent).not.toHaveBeenCalled();
  });
});

