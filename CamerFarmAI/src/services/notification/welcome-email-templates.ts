// src/services/notification/welcome-email-templates.ts

/**
 * Convertit le rôle utilisateur en libellé lisible
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'farmer': 'Agriculteur',
    'technician': 'Technicien',
    'admin': 'Administrateur',
  };
  return labels[role] || role;
}

/**
 * Génère le template HTML et texte pour un email de bienvenue
 */
export function generateWelcomeEmailTemplate(
  userName: string,
  userEmail: string,
  userRole: string
): { html: string; text: string } {
  const roleLabel = getRoleLabel(userRole);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur CamerFarmAI</title>
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
        <h2 style="margin: 0 0 20px 0; color: #2c5530; font-size: 20px;">🎉 Bienvenue sur CamerFarmAI !</h2>
        
        <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.5;">
          Bonjour ${userName || 'Utilisateur'},
        </p>
        
        <p style="margin: 0 0 20px 0; color: #333333; font-size: 15px; line-height: 1.6;">
          Merci de vous être inscrit sur <strong>CamerFarmAI</strong> ! Nous sommes ravis de vous accueillir dans notre communauté d'agriculteurs connectés.
        </p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #2c5530; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px; font-weight: bold;">
            Informations de votre compte :
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
            <li><strong>Email :</strong> ${userEmail}</li>
            <li><strong>Rôle :</strong> ${roleLabel}</li>
            <li><strong>Date d'inscription :</strong> ${new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })}</li>
          </ul>
        </div>
        
        <h3 style="margin: 30px 0 15px 0; color: #2c5530; font-size: 18px;">🚀 Pour commencer</h3>
        
        <p style="margin: 0 0 15px 0; color: #333333; font-size: 15px; line-height: 1.6;">
          Voici quelques étapes pour bien démarrer avec CamerFarmAI :
        </p>
        
        <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
          <li style="margin-bottom: 10px;">Connectez-vous à votre compte avec votre email et votre mot de passe</li>
          <li style="margin-bottom: 10px;">Créez votre première plantation</li>
          <li style="margin-bottom: 10px;">Configurez vos capteurs et actionneurs</li>
          <li style="margin-bottom: 10px;">Activez les notifications pour rester informé de l'état de vos plantations</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background-color: #2c5530; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Se connecter à mon compte
          </a>
        </div>
        
        <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460; font-size: 14px; line-height: 1.6;">
            <strong>🔒 Sécurité :</strong> Pour protéger votre compte, ne partagez jamais vos identifiants. Vous pouvez activer l'authentification à deux facteurs (2FA) dans les paramètres de votre compte pour une sécurité renforcée.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
          Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.<br>
          L'équipe CamerFarmAI est là pour vous accompagner.
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

🎉 Bienvenue sur CamerFarmAI !

Bonjour ${userName || 'Utilisateur'},

Merci de vous être inscrit sur CamerFarmAI ! Nous sommes ravis de vous accueillir dans notre communauté d'agriculteurs connectés.

Informations de votre compte :
- Email : ${userEmail}
- Rôle : ${roleLabel}
- Date d'inscription : ${new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })}

🚀 Pour commencer

Voici quelques étapes pour bien démarrer avec CamerFarmAI :

1. Connectez-vous à votre compte avec votre email et votre mot de passe
2. Créez votre première plantation
3. Configurez vos capteurs et actionneurs
4. Activez les notifications pour rester informé de l'état de vos plantations

Lien de connexion : ${loginUrl}

🔒 Sécurité : Pour protéger votre compte, ne partagez jamais vos identifiants. Vous pouvez activer l'authentification à deux facteurs (2FA) dans les paramètres de votre compte pour une sécurité renforcée.

---
Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.
L'équipe CamerFarmAI est là pour vous accompagner.

© ${new Date().getFullYear()} CamerFarmAI. Tous droits réservés.
  `.trim();

  return { html, text };
}




