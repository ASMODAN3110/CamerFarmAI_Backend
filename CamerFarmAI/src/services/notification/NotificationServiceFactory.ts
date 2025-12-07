// src/services/notification/NotificationServiceFactory.ts
import { NotificationService } from './NotificationService.abstract';
import { WebNotificationService } from './WebNotificationService';
import { EmailNotificationService } from './EmailNotificationService';
import { WhatsAppNotificationService } from './WhatsAppNotificationService';
import { NotificationCanal } from '../../models/Notification.entity';

export class NotificationServiceFactory {
  static create(canal: NotificationCanal): NotificationService {
    switch (canal) {
      case NotificationCanal.WEB:
        return new WebNotificationService();
      case NotificationCanal.EMAIL:
        return new EmailNotificationService();
      case NotificationCanal.WHATSAPP:
        return new WhatsAppNotificationService();
      default:
        throw new Error(`Canal de notification non supporté: ${canal}`);
    }
  }
}

