// src/services/notification/EmailNotificationService.ts
import * as nodemailer from 'nodemailer';
import { NotificationService } from './NotificationService.abstract';
import { Notification, NotificationStatut } from '../../models/Notification.entity';
import { AppDataSource } from '../../config/database';

export class EmailNotificationService extends NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    
    // Configuration du transporteur email
    // Support pour SMTP standard ou SendGrid
    const smtpHost = process.env.SMTP_HOST || process.env.SENDGRID_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || process.env.SENDGRID_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SENDGRID_API_KEY;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true pour 465, false pour les autres ports
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
    });
  }

  async envoyerNotification(notification: Notification): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    try {
      // Charger l'événement et l'utilisateur avec leurs relations
      const event = await AppDataSource.getRepository(require('../../models/Event.entity').Event)
        .findOne({ where: { id: notification.eventId } });
      const user = await AppDataSource.getRepository(require('../../models/User.entity').User)
        .findOne({ where: { id: notification.userId } });

      if (!event || !user || !user.email) {
        notification.statut = NotificationStatut.ERREUR;
        await notificationRepository.save(notification);
        throw new Error('Événement, utilisateur ou email manquant');
      }

      const subject = `Alerte: ${event.type}`;
      const text = `Bonjour ${user.firstName || user.phone},\n\n${event.description}\n\nDate: ${event.date.toLocaleString('fr-FR')}`;
      const html = `
        <h2>Alerte: ${event.type}</h2>
        <p>Bonjour ${user.firstName || user.phone},</p>
        <p>${event.description}</p>
        <p><strong>Date:</strong> ${event.date.toLocaleString('fr-FR')}</p>
      `;

      const smtpUser = process.env.SMTP_USER || process.env.SENDGRID_USER;
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SENDGRID_FROM || smtpUser || 'noreply@camerfarmai.com',
        to: user.email,
        subject,
        text,
        html,
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

