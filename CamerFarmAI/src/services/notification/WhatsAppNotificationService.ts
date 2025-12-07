// src/services/notification/WhatsAppNotificationService.ts
import twilio from 'twilio';
import { NotificationService } from './NotificationService.abstract';
import { Notification, NotificationStatut } from '../../models/Notification.entity';
import { AppDataSource } from '../../config/database';

export class WhatsAppNotificationService extends NotificationService {
  private client: twilio.Twilio;
  private whatsappNumber: string;

  constructor() {
    super();
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN doivent être définis dans les variables d\'environnement');
    }

    this.client = twilio(accountSid, authToken);
  }

  async envoyerNotification(notification: Notification): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    try {
      // Charger l'événement et l'utilisateur avec leurs relations
      const event = await AppDataSource.getRepository(require('../../models/Event.entity').Event)
        .findOne({ where: { id: notification.eventId } });
      const user = await AppDataSource.getRepository(require('../../models/User.entity').User)
        .findOne({ where: { id: notification.userId } });

      if (!event || !user || !user.phone) {
        notification.statut = NotificationStatut.ERREUR;
        await notificationRepository.save(notification);
        throw new Error('Événement, utilisateur ou téléphone manquant');
      }

      // Formater le numéro de téléphone pour WhatsApp (format: whatsapp:+237690123456)
      const toNumber = user.phone.startsWith('whatsapp:') 
        ? user.phone 
        : `whatsapp:+${user.phone.replace(/\D/g, '')}`;

      const message = `🚨 Alerte: ${event.type}\n\n${event.description}\n\nDate: ${event.date.toLocaleString('fr-FR')}`;

      await this.client.messages.create({
        from: this.whatsappNumber,
        to: toNumber,
        body: message,
      });

      notification.statut = NotificationStatut.ENVOYEE;
      await notificationRepository.save(notification);
    } catch (error) {
      notification.statut = NotificationStatut.ERREUR;
      await notificationRepository.save(notification);
      throw error;
    }
  }
}

