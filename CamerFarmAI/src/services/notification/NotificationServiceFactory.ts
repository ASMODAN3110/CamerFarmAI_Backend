// src/services/notification/NotificationServiceFactory.ts
import { NotificationService } from './NotificationService.abstract';
import { WebNotificationService } from './WebNotificationService';
import { WhatsAppNotificationService } from './WhatsAppNotificationService';
import { NotificationCanal } from '../../models/Notification.entity';

export class NotificationServiceFactory {
  static create(canal: NotificationCanal): NotificationService {
    switch (canal) {
      case NotificationCanal.WEB:
        return new WebNotificationService();
      case NotificationCanal.WHATSAPP:
        return new WhatsAppNotificationService();
      case NotificationCanal.EMAIL:
        // Les notifications email ne sont plus supportées
        throw new Error('Les notifications email ne sont plus supportées');
      default:
        throw new Error(`Canal de notification non supporté: ${canal}`);
    }
  }
}

