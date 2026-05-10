import { AppDataSource } from '../config/database';
import { Sensor, SensorStatus } from '../models/Sensor.entity';
import { SensorReading } from '../models/SensorReading.entity';
import { Plantation } from '../models/Plantation.entity';
import { EventService } from './event/EventService';

let isSyncRunning = false;

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function updateSensorStatusesForPlantation(
  plantationId: string
): Promise<void> {
  const plantationRepo = AppDataSource.getRepository(Plantation);
  const sensorRepo = AppDataSource.getRepository(Sensor);
  const sensorReadingRepo = AppDataSource.getRepository(SensorReading);

  const plantation = await plantationRepo.findOne({
    where: { id: plantationId },
    // ownerId est en colonne; la relation est juste pour compatibilité éventuelle
    relations: ['owner'],
  });

  if (!plantation) return;

  const sensors = await sensorRepo.find({
    where: { plantationId },
  });

  if (sensors.length === 0) return;

  const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS);

  for (const sensor of sensors) {
    const oldStatus = sensor.status;

    const latestReading = await sensorReadingRepo.findOne({
      where: { sensorId: sensor.id },
      order: { timestamp: 'DESC' },
    });

    // Cas important:
    // - si aucune lecture n'existe pour ce capteur, on ne peut pas calculer "dernier timestamp"
    //   => on marque INACTIVE pour éviter des statuts bloqués à ACTIVE.
    // - si une lecture existe, on compare au seuil 1 heure.
    const newStatus = latestReading
      ? latestReading.timestamp < oneHourAgo
        ? SensorStatus.INACTIVE
        : SensorStatus.ACTIVE
      : SensorStatus.INACTIVE;

    if (oldStatus === newStatus) continue;

    sensor.status = newStatus;
    await sensorRepo.save(sensor);

    // Notifications + événement uniquement lors d'un changement réel.
    await EventService.notifySensorStatusChange(sensor, newStatus, plantation);
  }
}

export async function updateAllPlantationsSensorStatuses(): Promise<void> {
  if (isSyncRunning) return;
  isSyncRunning = true;

  try {
    const plantationRepo = AppDataSource.getRepository(Plantation);
    const allPlantations = await plantationRepo.find();
    for (const plantation of allPlantations) {
      await updateSensorStatusesForPlantation(plantation.id);
    }
  } finally {
    isSyncRunning = false;
  }
}

