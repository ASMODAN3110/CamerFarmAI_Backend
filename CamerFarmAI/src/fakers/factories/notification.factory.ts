// src/fakers/factories/notification.factory.ts
import { faker } from '@faker-js/faker';
import { Notification, NotificationCanal, NotificationStatut } from '../../models/Notification.entity';

export interface CreateNotificationOptions {
  eventId: string;
  userId: string;
  canal?: NotificationCanal;
  statut?: NotificationStatut;
  dateEnvoi?: Date;
  isRead?: boolean;
  dateLu?: Date;
}

/**
 * Factory pour générer des notifications avec des données réalistes
 */
export class NotificationFactory {
  /**
   * Génère une notification avec des données réalistes
   */
  static create(options: CreateNotificationOptions): Partial<Notification> {
    const {
      eventId,
      userId,
      canal = faker.helpers.arrayElement([NotificationCanal.WEB, NotificationCanal.EMAIL, NotificationCanal.WHATSAPP]),
      statut = faker.helpers.arrayElement([
        NotificationStatut.ENVOYEE,
        NotificationStatut.EN_ATTENTE,
        NotificationStatut.ERREUR,
      ]),
      dateEnvoi = faker.date.recent({ days: 7 }),
      isRead = faker.datatype.boolean({ probability: 0.6 }),
      dateLu,
    } = options;

    // Si la notification est lue, elle doit avoir une dateLu
    const finalIsRead = isRead;
    const finalDateLu = finalIsRead 
      ? (dateLu || faker.date.between({ from: dateEnvoi, to: new Date() }))
      : undefined;

    // Si le statut est ERREUR, la notification ne devrait généralement pas être lue
    const finalStatut = statut;
    const finalIsReadAdjusted = finalStatut === NotificationStatut.ERREUR 
      ? false 
      : finalIsRead;

    return {
      canal,
      statut: finalStatut,
      eventId,
      userId,
      dateEnvoi,
      isRead: finalIsReadAdjusted,
      dateLu: finalIsReadAdjusted ? finalDateLu : undefined,
    };
  }

  /**
   * Génère plusieurs notifications
   */
  static createBatch(count: number, options: CreateNotificationOptions): Partial<Notification>[] {
    const notifications: Partial<Notification>[] = [];

    for (let i = 0; i < count; i++) {
      const notification = this.create(options);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Génère une notification web
   */
  static createWeb(options: Omit<CreateNotificationOptions, 'canal'>): Partial<Notification> {
    return this.create({ ...options, canal: NotificationCanal.WEB });
  }

  /**
   * Génère une notification email
   */
  static createEmail(options: Omit<CreateNotificationOptions, 'canal'>): Partial<Notification> {
    return this.create({ ...options, canal: NotificationCanal.EMAIL });
  }

  /**
   * Génère une notification WhatsApp
   */
  static createWhatsApp(options: Omit<CreateNotificationOptions, 'canal'>): Partial<Notification> {
    return this.create({ ...options, canal: NotificationCanal.WHATSAPP });
  }

  /**
   * Génère une notification envoyée
   */
  static createSent(options: Omit<CreateNotificationOptions, 'statut'>): Partial<Notification> {
    return this.create({ ...options, statut: NotificationStatut.ENVOYEE });
  }

  /**
   * Génère une notification en attente
   */
  static createPending(options: Omit<CreateNotificationOptions, 'statut'>): Partial<Notification> {
    return this.create({ ...options, statut: NotificationStatut.EN_ATTENTE });
  }

  /**
   * Génère une notification avec erreur
   */
  static createError(options: Omit<CreateNotificationOptions, 'statut'>): Partial<Notification> {
    return this.create({ ...options, statut: NotificationStatut.ERREUR });
  }

  /**
   * Génère une notification lue
   */
  static createRead(options: Omit<CreateNotificationOptions, 'isRead' | 'dateLu'>): Partial<Notification> {
    return this.create({ ...options, isRead: true });
  }

  /**
   * Génère une notification non lue
   */
  static createUnread(options: Omit<CreateNotificationOptions, 'isRead' | 'dateLu'>): Partial<Notification> {
    return this.create({ ...options, isRead: false });
  }

  /**
   * Génère des notifications pour un événement et plusieurs utilisateurs
   */
  static createForEventAndUsers(
    eventId: string,
    userIds: string[],
    options: Omit<CreateNotificationOptions, 'eventId' | 'userId'> = {}
  ): Partial<Notification>[] {
    const notifications: Partial<Notification>[] = [];

    for (const userId of userIds) {
      const notification = this.create({
        eventId,
        userId,
        ...options,
      });
      notifications.push(notification);
    }

    return notifications;
  }
}

