// src/services/notification/email-templates.ts

export interface EmailTemplateVariables {
  eventType: string;
  eventTypeLabel: string;
  description: string;
  date: string;
  userName: string;
  plantationName?: string;
  sensorType?: string;
  actuatorName?: string;
  actuatorType?: string;
}

/**
 * Génère le template HTML pour un email de notification
 */
export function generateEmailTemplate(variables: EmailTemplateVariables): { html: string; text: string } {
  const { eventTypeLabel, description, date, userName, plantationName } = variables;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification - CamerFarmAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #2c5530;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🌾 CamerFarmAI</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px; background-color: #ffffff; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 20px 0; color: #2c5530; font-size: 20px;">${eventTypeLabel}</h2>
        
        <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.5;">
          Bonjour ${userName || 'Utilisateur'},
        </p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #2c5530; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6;">
            ${description}
          </p>
        </div>
        
        ${plantationName ? `
        <p style="margin: 15px 0; color: #666666; font-size: 14px;">
          <strong>Plantation :</strong> ${plantationName}
        </p>
        ` : ''}
        
        <p style="margin: 20px 0 10px 0; color: #666666; font-size: 14px;">
          <strong>Date :</strong> ${date}
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
          Ceci est une notification automatique de CamerFarmAI.<br>
          Vous recevez cet email car vous êtes propriétaire de cette plantation.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
        <p style="margin: 0; color: #999999; font-size: 12px;">
          © ${new Date().getFullYear()} CamerFarmAI. Tous droits réservés.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
🌾 CamerFarmAI

${eventTypeLabel}

Bonjour ${userName || 'Utilisateur'},

${description}

${plantationName ? `Plantation : ${plantationName}\n` : ''}
Date : ${date}

---
Ceci est une notification automatique de CamerFarmAI.
Vous recevez cet email car vous êtes propriétaire de cette plantation.

© ${new Date().getFullYear()} CamerFarmAI. Tous droits réservés.
  `.trim();

  return { html, text };
}

/**
 * Convertit le type d'événement en libellé lisible
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'seuil_depasse': '🚨 Alerte : Seuil Dépassé',
    'threshold_changed': '📊 Modification des Seuils',
    'actionneur_active': '✅ Actionneur Activé',
    'actionneur_desactive': '⏸️ Actionneur Désactivé',
    'mode_changed': '🔄 Changement de Mode',
    'sensor_active': '✅ Capteur Actif',
    'sensor_inactive': '⚠️ Capteur Inactif',
  };
  return labels[eventType] || `Notification : ${eventType}`;
}

