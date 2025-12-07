// src/services/notification/NotificationService.abstract.ts
import { Notification } from '../../models/Notification.entity';

export abstract class NotificationService {
  abstract envoyerNotification(notification: Notification): Promise<void>;
}

