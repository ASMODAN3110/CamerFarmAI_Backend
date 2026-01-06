// src/services/notification/password-reset-email-templates.ts

/**
 * Génère le template HTML et texte pour un email de réinitialisation de mot de passe
 */
export function generatePasswordResetEmailTemplate(resetLink: string, userName: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - CamerFarmAI</title>
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
        <h2 style="margin: 0 0 20px 0; color: #2c5530; font-size: 20px;">🔐 Réinitialisation de votre mot de passe</h2>
        
        <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.5;">
          Bonjour ${userName || 'Utilisateur'},
        </p>
        
        <p style="margin: 0 0 20px 0; color: #333333; font-size: 15px; line-height: 1.6;">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #2c5530; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        
        <p style="margin: 20px 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </p>
        <p style="margin: 0 0 20px 0; color: #2c5530; font-size: 12px; word-break: break-all;">
          ${resetLink}
        </p>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
            <strong>⏰ Important :</strong> Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez simplement cet email.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
          Ceci est un email automatique de CamerFarmAI.<br>
          Pour des raisons de sécurité, ne partagez jamais ce lien avec quelqu'un d'autre.
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

🔐 Réinitialisation de votre mot de passe

Bonjour ${userName || 'Utilisateur'},

Vous avez demandé à réinitialiser votre mot de passe. Utilisez le lien ci-dessous pour créer un nouveau mot de passe :

${resetLink}

⏰ Important : Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez simplement cet email.

---
Ceci est un email automatique de CamerFarmAI.
Pour des raisons de sécurité, ne partagez jamais ce lien avec quelqu'un d'autre.

© ${new Date().getFullYear()} CamerFarmAI. Tous droits réservés.
  `.trim();

  return { html, text };
}

