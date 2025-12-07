// src/services/notification/WebNotificationService.ts
import { NotificationService } from './NotificationService.abstract';
import { Notification, NotificationStatut } from '../../models/Notification.entity';
import { AppDataSource } from '../../config/database';

export class WebNotificationService extends NotificationService {
  async envoyerNotification(notification: Notification): Promise<void> {
    // Pour les notifications web, on marque simplement la notification comme envoyée
    // car elle est déjà stockée en base de données et accessible via l'API
    const notificationRepository = AppDataSource.getRepository(Notification);
    notification.statut = NotificationStatut.ENVOYEE;
    await notificationRepository.save(notification);
  }
}

