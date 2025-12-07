// src/services/event/ThresholdService.ts
import { Sensor } from '../../models/Sensor.entity';
import { SensorReading } from '../../models/SensorReading.entity';
import { EventService } from './EventService';
import { AppDataSource } from '../../config/database';
import { Plantation } from '../../models/Plantation.entity';

export class ThresholdService {
  /**
   * Vérifie si une lecture de capteur dépasse les seuils et crée un événement si nécessaire
   */
  static async checkThresholds(
    sensor: Sensor,
    reading: SensorReading
  ): Promise<void> {
    // Vérifier les seuils et créer un événement si nécessaire
    const event = await EventService.checkSensorThresholds(sensor, reading);

    if (event) {
      // Récupérer le propriétaire de la plantation pour lui envoyer les notifications
      const plantationRepository = AppDataSource.getRepository(Plantation);
      const plantation = await plantationRepository.findOne({
        where: { id: sensor.plantationId },
        relations: ['owner'],
      });

      if (plantation && plantation.owner) {
        // Traiter l'événement et envoyer les notifications au propriétaire
        await EventService.processEvent(event, [plantation.owner.id]);
      }
    }
  }
}

