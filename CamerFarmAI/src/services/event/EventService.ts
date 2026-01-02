// src/services/event/EventService.ts
import { AppDataSource } from '../../config/database';
import { Event, EventType } from '../../models/Event.entity';
import { Notification, NotificationCanal } from '../../models/Notification.entity';
import { User } from '../../models/User.entity';
import { NotificationServiceFactory } from '../notification/NotificationServiceFactory';
import { Sensor, SensorStatus } from '../../models/Sensor.entity';
import { Plantation } from '../../models/Plantation.entity';

export class EventService {
  /**
   * Crée un événement dans la base de données
   */
  static async createEvent(
    type: EventType,
    description: string,
    sensorId?: string,
    actuatorId?: string
  ): Promise<Event> {
    const eventRepository = AppDataSource.getRepository(Event);
    
    const event = eventRepository.create({
      type,
      description,
      sensorId: sensorId || undefined,
      actuatorId: actuatorId || undefined,
    });

    return await eventRepository.save(event);
  }

  /**
   * Traite un événement en créant des notifications pour tous les canaux
   * et en les envoyant aux utilisateurs concernés
   * 
   * Les notifications sont envoyées simultanément via WEB et EMAIL (si disponible).
   * Si un canal échoue, les autres continuent de fonctionner.
   */
  static async processEvent(event: Event, userIds: string[]): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    const userRepository = AppDataSource.getRepository(User);

    // Récupérer les utilisateurs concernés
    const users = await userRepository.find({
      where: userIds.map(id => ({ id })),
    });

    if (users.length === 0) {
      console.warn(`⚠️  Aucun utilisateur trouvé pour l'événement ${event.id}`);
      return;
    }

    // Pour chaque utilisateur, créer des notifications pour chaque canal
    const notifications: Notification[] = [];

    for (const user of users) {
      // Notification Web (toujours créée et envoyée)
      const webNotification = notificationRepository.create({
        canal: NotificationCanal.WEB,
        eventId: event.id,
        userId: user.id,
      });
      notifications.push(webNotification);

      // Notification Email (créée si l'utilisateur a un email)
      if (user.email) {
        const emailNotification = notificationRepository.create({
          canal: NotificationCanal.EMAIL,
          eventId: event.id,
          userId: user.id,
        });
        notifications.push(emailNotification);
      } else {
        console.log(`ℹ️  Utilisateur ${user.id} n'a pas d'adresse email - notification EMAIL ignorée`);
      }
    }

    // Sauvegarder toutes les notifications
    const savedNotifications = await notificationRepository.save(notifications);
    
    console.log(`📨 Envoi de ${savedNotifications.length} notification(s) pour l'événement ${event.id} (${event.type})`);

    // Envoyer les notifications via les services appropriés
    // Chaque canal est envoyé indépendamment - si un échoue, les autres continuent
    const results = {
      web: { success: 0, error: 0 },
      email: { success: 0, error: 0 },
    };

    for (const notification of savedNotifications) {
      try {
        const service = NotificationServiceFactory.create(notification.canal);
        await service.envoyerNotification(notification);
        
        // Compter les succès par canal
        if (notification.canal === NotificationCanal.WEB) {
          results.web.success++;
        } else if (notification.canal === NotificationCanal.EMAIL) {
          results.email.success++;
        }
      } catch (error: any) {
        // Compter les erreurs par canal
        if (notification.canal === NotificationCanal.WEB) {
          results.web.error++;
        } else if (notification.canal === NotificationCanal.EMAIL) {
          results.email.error++;
        }
        
        console.error(`❌ Erreur lors de l'envoi de la notification ${notification.id} (${notification.canal}):`, error?.message || error);
        // La notification a déjà été marquée comme erreur dans le service
        // Ne pas propager l'erreur pour permettre aux autres canaux de continuer
      }
    }

    // Log récapitulatif
    const totalSuccess = results.web.success + results.email.success;
    const totalError = results.web.error + results.email.error;
    
    if (totalSuccess > 0) {
      console.log(`✅ Notifications envoyées: WEB=${results.web.success}/${results.web.success + results.web.error}, EMAIL=${results.email.success}/${results.email.success + results.email.error}`);
    }
    
    if (totalError > 0) {
      console.warn(`⚠️  ${totalError} notification(s) n'ont pas pu être envoyées (voir les erreurs ci-dessus)`);
    }
  }

  /**
   * Vérifie les seuils d'un capteur et crée un événement si nécessaire
   */
  static async checkSensorThresholds(
    sensor: any,
    reading: any
  ): Promise<Event | null> {
    // Si le capteur n'a pas de seuils définis, ne rien faire
    if (!sensor.seuilMin && !sensor.seuilMax) {
      return null;
    }

    const value = reading.value;
    let eventType: EventType | null = null;
    let description = '';

    // Vérifier si la valeur dépasse les seuils
    if (sensor.seuilMin !== null && value < sensor.seuilMin) {
      eventType = EventType.SEUIL_DEPASSE;
      description = `Le capteur ${sensor.type} a enregistré une valeur (${value}) inférieure au seuil minimum (${sensor.seuilMin})`;
    } else if (sensor.seuilMax !== null && value > sensor.seuilMax) {
      eventType = EventType.SEUIL_DEPASSE;
      description = `Le capteur ${sensor.type} a enregistré une valeur (${value}) supérieure au seuil maximum (${sensor.seuilMax})`;
    }

    if (eventType) {
      return await this.createEvent(eventType, description, sensor.id);
    }

    return null;
  }

  /**
   * Crée un événement et envoie des notifications lorsqu'un capteur change de statut
   */
  static async notifySensorStatusChange(
    sensor: Sensor,
    newStatus: SensorStatus,
    plantation: Plantation
  ): Promise<void> {
    let eventType: EventType;
    let description: string;
    
    if (newStatus === SensorStatus.ACTIVE) {
      eventType = EventType.SENSOR_ACTIVE;
      description = `Le capteur ${sensor.type} du champ "${plantation.name}" est maintenant actif`;
    } else {
      eventType = EventType.SENSOR_INACTIVE;
      description = `Le capteur ${sensor.type} du champ "${plantation.name}" est devenu inactif (aucune lecture depuis plus d'1 heure)`;
    }
    
    // Créer l'événement
    const event = await this.createEvent(eventType, description, sensor.id);
    
    // Envoyer les notifications au propriétaire de la plantation
    await this.processEvent(event, [plantation.ownerId]);
  }
}

