// src/services/password-reset.service.ts
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User.entity';
import * as nodemailer from 'nodemailer';
import { generatePasswordResetEmailTemplate } from './notification/password-reset-email-templates';

// Définir JWT_SECRET une seule fois au niveau du module
const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

export class PasswordResetService {
  /**
   * Génère un token JWT pour la réinitialisation de mot de passe
   * Expiration : 1 heure
   */
  static generateResetToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'password_reset', // Marqueur pour indiquer que c'est un token de réinitialisation
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h', // 1 heure
    } as SignOptions);
  }

  /**
   * Vérifie et décode un token de réinitialisation
   * Retourne userId si valide, null sinon
   */
  static verifyResetToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { type?: string };
      
      // Vérifier que c'est bien un token de réinitialisation
      if (decoded.type !== 'password_reset') {
        return null;
      }

      if (!decoded.sub) {
        return null;
      }

      return { userId: decoded.sub };
    } catch {
      return null;
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  static async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    // Vérifier que l'utilisateur a un email
    if (!user.email) {
      throw new Error('L\'utilisateur n\'a pas d\'adresse email configurée');
    }

    // Vérifier la configuration SMTP
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      throw new Error('SMTP n\'est pas configuré. Impossible d\'envoyer l\'email de réinitialisation.');
    }

    // Créer le transporteur Nodemailer
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

    const transporter = nodemailer.createTransport(transporterConfig);

    // Générer le lien de réinitialisation
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Préparer le nom de l'utilisateur
    const userName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.firstName || user.lastName || 'Utilisateur';

    // Générer le template d'email
    const { html, text } = generatePasswordResetEmailTemplate(resetLink, userName);

    // Préparer l'email
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@camerfarmai.com';
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: smtpFrom,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe - CamerFarmAI',
      html: html,
      text: text,
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de réinitialisation envoyé à ${user.email}`);
  }
}

