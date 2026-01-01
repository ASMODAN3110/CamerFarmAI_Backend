// src/services/notification/EmailNotificationService.ts
import * as nodemailer from 'nodemailer';
import { NotificationService } from './NotificationService.abstract';
import { Notification, NotificationStatut } from '../../models/Notification.entity';
import { AppDataSource } from '../../config/database';
import { Event } from '../../models/Event.entity';
import { User } from '../../models/User.entity';
import { Sensor } from '../../models/Sensor.entity';
import { Actuator } from '../../models/Actuator.entity';
import { generateEmailTemplate, getEventTypeLabel } from './email-templates';

export class EmailNotificationService extends NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfiguredFlag: boolean = false;

  constructor() {
    super();
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Ne pas lancer d'erreur si SMTP n'est pas configuré - rendre le service optionnel
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        const port = parseInt(smtpPort, 10);
        const secure = port === 465;

        const transporterConfig: any = {
          host: smtpHost,
          port: port,
          secure: secure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        };

        // Pour le port 587 (STARTTLS), ajouter la configuration TLS
        if (port === 587) {
          transporterConfig.requireTLS = true;
          transporterConfig.tls = {
            rejectUnauthorized: false, // Accepter les certificats auto-signés en développement
          };
        } else if (port === 465) {
          // Pour le port 465 (SSL), s'assurer que TLS est correctement configuré
          transporterConfig.tls = {
            rejectUnauthorized: false, // Accepter les certificats auto-signés en développement
          };
        }

        this.transporter = nodemailer.createTransport(transporterConfig);
        this.isConfiguredFlag = true;
      } catch (error) {
        console.warn('⚠️  Email (SMTP) non configuré. Les notifications email seront désactivées.');
        console.warn('   Pour activer les emails, configurez SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS dans .env');
        this.isConfiguredFlag = false;
      }
    } else {
      console.warn('⚠️  Email (SMTP) non configuré. Les notifications email seront désactivées.');
      console.warn('   Pour activer les emails, configurez SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS dans .env');
      this.isConfiguredFlag = false;
    }
  }

  /**
   * Vérifie si SMTP est correctement configuré
   */
  isConfigured(): boolean {
    return this.isConfiguredFlag && this.transporter !== null;
  }

  async envoyerNotification(notification: Notification): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    // Vérifier si SMTP est configuré
    if (!this.isConfigured()) {
      notification.statut = NotificationStatut.ERREUR;
      await notificationRepository.save(notification);
      console.error('❌ Email non configuré. Impossible d\'envoyer la notification email.');
      throw new Error('Email (SMTP) n\'est pas configuré. Vérifiez vos variables d\'environnement.');
    }

    try {
      // Charger l'événement et l'utilisateur avec leurs relations
      const eventRepository = AppDataSource.getRepository(Event);
      const userRepository = AppDataSource.getRepository(User);
      
      const event = await eventRepository.findOne({ where: { id: notification.eventId } });
      const user = await userRepository.findOne({ where: { id: notification.userId } });

      if (!event) {
        notification.statut = NotificationStatut.ERREUR;
        await notificationRepository.save(notification);
        throw new Error(`Événement non trouvé pour la notification ${notification.id}`);
      }

      if (!user) {
        notification.statut = NotificationStatut.ERREUR;
        await notificationRepository.save(notification);
        throw new Error(`Utilisateur non trouvé pour la notification ${notification.id}`);
      }

      if (!user.email) {
        notification.statut = NotificationStatut.ERREUR;
        await notificationRepository.save(notification);
        throw new Error(`L'utilisateur ${user.id} n'a pas d'adresse email configurée`);
      }

      // Récupérer les informations supplémentaires pour le template
      let plantationName: string | undefined;
      let sensorType: string | undefined;
      let actuatorName: string | undefined;
      let actuatorType: string | undefined;

      if (event.sensorId) {
        const sensorRepository = AppDataSource.getRepository(Sensor);
        const sensor = await sensorRepository.findOne({
          where: { id: event.sensorId },
          relations: ['plantation'],
        });
        if (sensor) {
          sensorType = sensor.type;
          if (sensor.plantation) {
            plantationName = sensor.plantation.name;
          }
        }
      }

      if (event.actuatorId) {
        const actuatorRepository = AppDataSource.getRepository(Actuator);
        const actuator = await actuatorRepository.findOne({
          where: { id: event.actuatorId },
          relations: ['plantation'],
        });
        if (actuator) {
          actuatorName = actuator.name;
          actuatorType = actuator.type;
          if (actuator.plantation) {
            plantationName = actuator.plantation.name;
          }
        }
      }

      // Si on n'a pas encore le nom de la plantation, essayer de le récupérer via sensorId ou actuatorId
      if (!plantationName && event.sensorId) {
        const sensorRepository = AppDataSource.getRepository(Sensor);
        const sensor = await sensorRepository.findOne({
          where: { id: event.sensorId },
          relations: ['plantation'],
        });
        if (sensor?.plantation) {
          plantationName = sensor.plantation.name;
        }
      }

      // Préparer les variables pour le template
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.lastName || 'Utilisateur';

      const eventTypeLabel = getEventTypeLabel(event.type);
      const formattedDate = event.date.toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      const templateVariables = {
        eventType: event.type,
        eventTypeLabel,
        description: event.description,
        date: formattedDate,
        userName,
        plantationName,
        sensorType,
        actuatorName,
        actuatorType,
      };

      // Générer le template
      const { html, text } = generateEmailTemplate(templateVariables);

      // Préparer l'email
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@camerfarmai.com';
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: smtpFrom,
        to: user.email,
        subject: `${eventTypeLabel} - CamerFarmAI`,
        html: html,
        text: text,
      };

      // Envoyer l'email
      await this.transporter!.sendMail(mailOptions);

      notification.statut = NotificationStatut.ENVOYEE;
      await notificationRepository.save(notification);
      console.log(`✅ Notification email envoyée avec succès à ${user.email}`);
    } catch (error: any) {
      notification.statut = NotificationStatut.ERREUR;
      await notificationRepository.save(notification);
      
      // Améliorer les messages d'erreur
      const errorMessage = error?.message || 'Erreur inconnue lors de l\'envoi email';
      console.error(`❌ Erreur lors de l'envoi de la notification email ${notification.id}:`, errorMessage);
      
      // Ne pas propager l'erreur pour ne pas bloquer les autres canaux
      throw new Error(`Erreur Email: ${errorMessage}`);
    }
  }
}

