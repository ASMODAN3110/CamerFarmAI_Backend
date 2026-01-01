# Documentation - Notifications par Email

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Composants principaux](#composants-principaux)
4. [Flux de données](#flux-de-données)
5. [Configuration](#configuration)
6. [Templates d'email](#templates-demail)
7. [Types d'événements](#types-dévénements)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Exemples d'utilisation](#exemples-dutilisation)
10. [Tests](#tests)

---

## Vue d'ensemble

Le système de notifications par email permet d'envoyer automatiquement des emails aux utilisateurs lorsqu'un événement se produit dans le système (seuil dépassé, actionneur activé, etc.). 

**Caractéristiques principales :**
- ✅ Envoi automatique via SMTP (Gmail, etc.)
- ✅ Templates HTML et texte brut
- ✅ Service optionnel (fonctionne même si SMTP n'est pas configuré)
- ✅ Gestion d'erreurs robuste
- ✅ Support de plusieurs types d'événements
- ✅ Enrichissement automatique avec les informations de plantation, capteurs et actionneurs

---

## Architecture

### Structure des fichiers

```
src/
├── services/
│   ├── notification/
│   │   ├── EmailNotificationService.ts      # Service d'envoi d'emails
│   │   ├── email-templates.ts               # Templates HTML/text
│   │   ├── NotificationService.abstract.ts  # Classe abstraite
│   │   └── NotificationServiceFactory.ts    # Factory pour créer les services
│   └── event/
│       └── EventService.ts                  # Gestion des événements
├── models/
│   ├── Notification.entity.ts                  # Modèle de notification
│   └── Event.entity.ts                     # Modèle d'événement
└── controllers/
    └── plantation.controller.ts             # Déclencheurs d'événements
```

### Diagramme de flux

```
┌─────────────────┐
│  Événement      │ (seuil dépassé, actionneur activé, etc.)
│  se produit     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EventService    │
│ createEvent()   │ ──► Crée un événement en base
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EventService    │
│ processEvent()  │ ──► Pour chaque utilisateur concerné :
└────────┬────────┘     1. Crée notification WEB
         │             2. Crée notification EMAIL (si user.email existe)
         │
         ▼
┌─────────────────┐
│ Notification    │
│ ServiceFactory  │ ──► Crée EmailNotificationService
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EmailNotification│
│ Service         │ ──► 1. Récupère event, user, sensor/actuator
│ envoyerNotification()│  2. Génère template HTML/text
└────────┬────────┘     3. Envoie via Nodemailer
         │             4. Met à jour statut notification
         │
         ▼
┌─────────────────┐
│  SMTP Server    │ (Gmail, etc.)
│  Envoie email   │
└─────────────────┘
```

---

## Composants principaux

### 1. EmailNotificationService

**Fichier :** `src/services/notification/EmailNotificationService.ts`

**Responsabilités :**
- Configuration du transporteur SMTP (Nodemailer)
- Envoi d'emails avec templates HTML et texte
- Gestion des erreurs et mise à jour du statut des notifications
- Récupération des données nécessaires (event, user, sensor, actuator, plantation)

**Méthodes principales :**

```typescript
class EmailNotificationService extends NotificationService {
  // Vérifie si SMTP est configuré
  isConfigured(): boolean

  // Envoie une notification email
  async envoyerNotification(notification: Notification): Promise<void>
}
```

**Configuration SMTP :**
- Port 587 : STARTTLS avec `requireTLS: true`
- Port 465 : SSL avec `secure: true`
- TLS : `rejectUnauthorized: false` (pour accepter les certificats auto-signés en développement)

### 2. EventService

**Fichier :** `src/services/event/EventService.ts`

**Responsabilités :**
- Création d'événements dans la base de données
- Traitement des événements et création de notifications
- Envoi des notifications via les services appropriés

**Méthodes principales :**

```typescript
class EventService {
  // Crée un événement
  static async createEvent(
    type: EventType,
    description: string,
    sensorId?: string,
    actuatorId?: string
  ): Promise<Event>

  // Traite un événement et envoie les notifications
  static async processEvent(event: Event, userIds: string[]): Promise<void>
}
```

**Logique de création de notifications :**
- Pour chaque utilisateur concerné :
  - Crée toujours une notification WEB
  - Crée une notification EMAIL **uniquement si** `user.email` existe
- Envoie les notifications via `NotificationServiceFactory`
- Si un canal échoue, les autres continuent de fonctionner

### 3. NotificationServiceFactory

**Fichier :** `src/services/notification/NotificationServiceFactory.ts`

**Responsabilités :**
- Création des services de notification selon le canal
- Pattern Factory pour l'instanciation des services

```typescript
class NotificationServiceFactory {
  static create(canal: NotificationCanal): NotificationService {
    switch (canal) {
      case NotificationCanal.WEB:
        return new WebNotificationService();
      case NotificationCanal.EMAIL:
        return new EmailNotificationService();
      // ...
    }
  }
}
```

### 4. Templates d'email

**Fichier :** `src/services/notification/email-templates.ts`

**Fonctions :**
- `generateEmailTemplate(variables)`: Génère le HTML et le texte brut
- `getEventTypeLabel(eventType)`: Convertit le type d'événement en libellé lisible

**Variables disponibles dans les templates :**
- `eventType`: Type d'événement (seuil_depasse, actionneur_active, etc.)
- `eventTypeLabel`: Libellé lisible (🚨 Alerte : Seuil Dépassé, etc.)
- `description`: Description de l'événement
- `date`: Date formatée en français
- `userName`: Nom complet de l'utilisateur
- `plantationName`: Nom de la plantation (optionnel)
- `sensorType`: Type de capteur (optionnel)
- `actuatorName`: Nom de l'actionneur (optionnel)
- `actuatorType`: Type d'actionneur (optionnel)

---

## Flux de données

### 1. Déclenchement d'un événement

**Exemple : Activation d'un actionneur**

```typescript
// src/controllers/plantation.controller.ts
export const updateActuator = async (req: Request, res: Response) => {
  // ... mise à jour de l'actionneur ...
  
  if (status !== undefined && status !== oldStatus) {
    // Créer un événement
    const event = await EventService.createEvent(
      EventType.ACTIONNEUR_ACTIVE,
      `L'actionneur "${actuator.name}" (${actuator.type}) a été activé`,
      undefined,
      actuator.id
    );

    // Traiter l'événement et envoyer les notifications
    await EventService.processEvent(event, [ownerId]);
  }
}
```

### 2. Création des notifications

**Dans EventService.processEvent() :**

```typescript
for (const user of users) {
  // Notification Web (toujours créée)
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
  }
}
```

### 3. Envoi de l'email

**Dans EmailNotificationService.envoyerNotification() :**

1. **Vérification de la configuration SMTP**
   ```typescript
   if (!this.isConfigured()) {
     notification.statut = NotificationStatut.ERREUR;
     throw new Error('Email (SMTP) n\'est pas configuré');
   }
   ```

2. **Récupération des données**
   - Event (type, description, date)
   - User (email, firstName, lastName)
   - Sensor (si event.sensorId existe) + Plantation
   - Actuator (si event.actuatorId existe) + Plantation

3. **Génération du template**
   ```typescript
   const { html, text } = generateEmailTemplate({
     eventType: event.type,
     eventTypeLabel: getEventTypeLabel(event.type),
     description: event.description,
     date: formattedDate,
     userName: `${user.firstName} ${user.lastName}`,
     plantationName: sensor?.plantation?.name || actuator?.plantation?.name,
     // ...
   });
   ```

4. **Envoi via Nodemailer**
   ```typescript
   await this.transporter!.sendMail({
     from: smtpFrom,
     to: user.email,
     subject: `${eventTypeLabel} - CamerFarmAI`,
     html: html,
     text: text,
   });
   ```

5. **Mise à jour du statut**
   ```typescript
   notification.statut = NotificationStatut.ENVOYEE;
   await notificationRepository.save(notification);
   ```

---

## Configuration

### Variables d'environnement requises

**Fichier :** `.env`

```env
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
SMTP_FROM=noreply@camerfarmai.com  # Optionnel (défaut: SMTP_USER)
```

### Configuration Gmail

Pour utiliser Gmail, vous devez :

1. **Activer la validation en deux étapes** sur votre compte Gmail
2. **Créer un mot de passe d'application** :
   - Aller dans : https://myaccount.google.com/apppasswords
   - Sélectionner "Autre (nom personnalisé)" → "CamerFarmAI"
   - Copier le mot de passe généré (16 caractères)
   - Utiliser ce mot de passe dans `SMTP_PASS` (pas votre mot de passe principal)

3. **Configuration recommandée :**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # Mot de passe d'application (16 caractères)
   SMTP_FROM=votre-email@gmail.com  # Ou une autre adresse autorisée
   ```

### Ports supportés

- **Port 587 (STARTTLS)** : Recommandé pour Gmail
  - `secure: false`
  - `requireTLS: true`
  - `tls: { rejectUnauthorized: false }`

- **Port 465 (SSL)** : Alternative
  - `secure: true`
  - `tls: { rejectUnauthorized: false }`

### Service optionnel

Le service email est **optionnel** :
- Si SMTP n'est pas configuré, le service se désactive automatiquement
- Les notifications EMAIL ne sont pas créées si SMTP n'est pas configuré
- Les autres canaux (WEB) continuent de fonctionner normalement
- Aucune erreur fatale n'est levée si SMTP est manquant

---

## Templates d'email

### Structure du template

Le template génère deux versions :
- **HTML** : Version formatée avec styles inline
- **Text** : Version texte brut pour les clients email simples

### Variables disponibles

```typescript
interface EmailTemplateVariables {
  eventType: string;           // 'seuil_depasse', 'actionneur_active', etc.
  eventTypeLabel: string;      // '🚨 Alerte : Seuil Dépassé', etc.
  description: string;         // Description complète de l'événement
  date: string;                // Date formatée en français
  userName: string;            // Nom complet de l'utilisateur
  plantationName?: string;     // Nom de la plantation (si disponible)
  sensorType?: string;         // Type de capteur (si disponible)
  actuatorName?: string;       // Nom de l'actionneur (si disponible)
  actuatorType?: string;       // Type d'actionneur (si disponible)
}
```

### Exemple de template HTML

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Notification - CamerFarmAI</title>
</head>
<body>
  <h1>🌾 CamerFarmAI</h1>
  <h2>🚨 Alerte : Seuil Dépassé</h2>
  <p>Bonjour Jean Dupont,</p>
  <div>
    Le capteur de température a dépassé le seuil de 30°C
  </div>
  <p><strong>Plantation :</strong> Manioc Nord</p>
  <p><strong>Date :</strong> 15 janvier 2024 à 10:30</p>
</body>
</html>
```

### Personnalisation

Pour modifier les templates, éditez `src/services/notification/email-templates.ts` :

```typescript
export function generateEmailTemplate(variables: EmailTemplateVariables) {
  // Modifier le HTML ici
  const html = `...`;
  
  // Modifier le texte brut ici
  const text = `...`;
  
  return { html, text };
}
```

---

## Types d'événements

### Événements supportés

| Type | Libellé | Déclencheur | Données disponibles |
|------|---------|-------------|-------------------|
| `seuil_depasse` | 🚨 Alerte : Seuil Dépassé | Capteur dépasse seuil min/max | sensor, plantation |
| `actionneur_active` | ✅ Actionneur Activé | Actionneur activé manuellement | actuator, plantation |
| `actionneur_desactive` | ⏸️ Actionneur Désactivé | Actionneur désactivé manuellement | actuator, plantation |
| `mode_changed` | 🔄 Changement de Mode | Mode de plantation changé | plantation |
| `sensor_active` | ✅ Capteur Actif | Capteur devient actif | sensor, plantation |
| `sensor_inactive` | ⚠️ Capteur Inactif | Capteur devient inactif | sensor, plantation |

### Ajout d'un nouveau type d'événement

1. **Ajouter le type dans `Event.entity.ts` :**
   ```typescript
   export enum EventType {
     // ... types existants
     NOUVEAU_TYPE = 'nouveau_type',
   }
   ```

2. **Ajouter le libellé dans `email-templates.ts` :**
   ```typescript
   export function getEventTypeLabel(eventType: string): string {
     const labels: Record<string, string> = {
       // ... labels existants
       'nouveau_type': '📧 Nouveau Type d\'Événement',
     };
     return labels[eventType] || `Notification : ${eventType}`;
   }
   ```

3. **Créer l'événement dans votre code :**
   ```typescript
   const event = await EventService.createEvent(
     EventType.NOUVEAU_TYPE,
     'Description de l\'événement',
     sensorId,  // optionnel
     actuatorId // optionnel
   );
   
   await EventService.processEvent(event, [userId]);
   ```

---

## Gestion des erreurs

### Erreurs possibles

1. **SMTP non configuré**
   - **Symptôme** : Notification avec statut `ERREUR`
   - **Message** : "Email (SMTP) n'est pas configuré"
   - **Solution** : Configurer les variables SMTP dans `.env`

2. **Utilisateur sans email**
   - **Symptôme** : Notification EMAIL non créée
   - **Message** : "Utilisateur X n'a pas d'adresse email - notification EMAIL ignorée"
   - **Solution** : Ajouter un email au profil utilisateur

3. **Erreur d'envoi SMTP**
   - **Symptôme** : Notification avec statut `ERREUR`
   - **Causes possibles** :
     - Mot de passe d'application invalide (Gmail)
     - 2FA non activée (Gmail)
     - Certificat SSL invalide
     - Serveur SMTP inaccessible
   - **Solution** : Vérifier la configuration SMTP et les logs

4. **Événement ou utilisateur non trouvé**
   - **Symptôme** : Notification avec statut `ERREUR`
   - **Message** : "Événement non trouvé" ou "Utilisateur non trouvé"
   - **Solution** : Vérifier l'intégrité des données

### Statuts de notification

```typescript
enum NotificationStatut {
  EN_ATTENTE = 'en_attente',  // Notification créée, en attente d'envoi
  ENVOYEE = 'envoyee',         // Email envoyé avec succès
  ERREUR = 'erreur',          // Erreur lors de l'envoi
}
```

### Gestion des erreurs dans le code

```typescript
try {
  await this.transporter!.sendMail(mailOptions);
  notification.statut = NotificationStatut.ENVOYEE;
} catch (error: any) {
  notification.statut = NotificationStatut.ERREUR;
  console.error(`❌ Erreur lors de l'envoi:`, error?.message);
  // L'erreur est capturée mais ne bloque pas les autres canaux
}
```

### Isolation des canaux

Si l'envoi d'email échoue :
- ✅ La notification WEB continue de fonctionner
- ✅ Les autres notifications email ne sont pas affectées
- ✅ Le système continue de fonctionner normalement
- ✅ L'erreur est loggée pour diagnostic

---

## Exemples d'utilisation

### Exemple 1 : Seuil de capteur dépassé

```typescript
// Dans plantation.controller.ts - addSensorReading()
const event = await EventService.createEvent(
  EventType.SEUIL_DEPASSE,
  `Le capteur de température a dépassé le seuil de ${sensor.seuilMax}°C`,
  sensor.id,
  undefined
);

await EventService.processEvent(event, [plantation.ownerId]);
```

**Résultat :**
- Email envoyé au propriétaire de la plantation
- Sujet : "🚨 Alerte : Seuil Dépassé - CamerFarmAI"
- Contenu : Description + nom de la plantation + type de capteur

### Exemple 2 : Activation d'un actionneur

```typescript
// Dans plantation.controller.ts - updateActuator()
if (status === ActuatorStatus.ACTIVE && status !== oldStatus) {
  const event = await EventService.createEvent(
    EventType.ACTIONNEUR_ACTIVE,
    `L'actionneur "${actuator.name}" (${actuator.type}) a été activé`,
    undefined,
    actuator.id
  );

  await EventService.processEvent(event, [ownerId]);
}
```

**Résultat :**
- Email envoyé au propriétaire
- Sujet : "✅ Actionneur Activé - CamerFarmAI"
- Contenu : Description + nom de la plantation + nom et type de l'actionneur

### Exemple 3 : Changement de mode de plantation

```typescript
// Dans plantation.controller.ts - update()
if (mode !== undefined && mode !== oldMode) {
  const event = await EventService.createEvent(
    EventType.MODE_CHANGED,
    `Le mode de contrôle de la plantation "${plantation.name}" a été changé de ${oldModeLabel} à ${modeLabel}`,
    undefined,
    undefined
  );

  await EventService.processEvent(event, [ownerId]);
}
```

**Résultat :**
- Email envoyé au propriétaire
- Sujet : "🔄 Changement de Mode - CamerFarmAI"
- Contenu : Description du changement de mode

---

## Tests

### Script de test

**Fichier :** `src/scripts/test-email.ts`

**Commande :**
```bash
npm run test:email
```

**Ce que fait le script :**
1. Vérifie les variables d'environnement SMTP
2. Initialise la base de données
3. Vérifie la configuration du service Email
4. Crée/récupère un utilisateur de test avec email
5. Crée un événement de test
6. Envoie une notification email
7. Affiche le résultat

**Exemple de sortie :**
```
🧪 Test de configuration Email (SMTP)

📋 Vérification des variables d'environnement...
✅ Variables d'environnement trouvées
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: votre-email@gmail.com

🔌 Connexion à la base de données...
✅ Connexion à la base de données réussie

📧 Vérification du service Email...
✅ Service Email configuré

👤 Recherche d'un utilisateur avec une adresse email...
✅ Utilisateur trouvé: Jean Dupont (jean.dupont@example.com)

📝 Création d'un événement de test...
✅ Événement créé: abc-123-def-456

📨 Création d'une notification Email...
✅ Notification créée: xyz-789-uvw-012

📤 Envoi de l'email...
   Destinataire: jean.dupont@example.com
   Événement: mode_changed

✅ EMAIL CONFIGURÉ ET TESTÉ AVEC SUCCÈS !
   📧 Vérifiez la boîte de réception de: jean.dupont@example.com
```

### Tests manuels

1. **Tester l'envoi d'email :**
   ```bash
   npm run test:email
   ```

2. **Vérifier les notifications en base :**
   ```sql
   SELECT * FROM notifications WHERE canal = 'email' ORDER BY "dateEnvoi" DESC LIMIT 10;
   ```

3. **Vérifier les statuts :**
   ```sql
   SELECT statut, COUNT(*) 
   FROM notifications 
   WHERE canal = 'email' 
   GROUP BY statut;
   ```

---

## Points importants

### 1. Service optionnel

Le service email est **optionnel** :
- Si SMTP n'est pas configuré, le système fonctionne normalement
- Seules les notifications WEB sont créées
- Aucune erreur fatale n'est levée

### 2. Condition de création

Une notification EMAIL n'est créée **que si** :
- L'utilisateur a une adresse email (`user.email !== null`)
- SMTP est correctement configuré

### 3. Isolation des canaux

Les canaux de notification sont **indépendants** :
- Si l'email échoue, la notification WEB continue
- Si la notification WEB échoue, l'email continue
- Les erreurs ne se propagent pas entre canaux

### 4. Enrichissement automatique

Le service enrichit automatiquement les emails avec :
- Nom de la plantation (via sensor ou actuator)
- Type de capteur/actionneur
- Nom de l'actionneur
- Date formatée en français
- Nom complet de l'utilisateur

### 5. Templates HTML

Les emails sont envoyés en **HTML avec version texte** :
- HTML : Version formatée avec styles inline
- Text : Version texte brut
- Compatible avec tous les clients email

---

## Dépannage

### Problème : Emails non envoyés

**Vérifications :**
1. Variables SMTP configurées dans `.env`
2. Mot de passe d'application valide (Gmail)
3. 2FA activée sur le compte Gmail
4. Utilisateur a une adresse email
5. Logs du serveur pour les erreurs

**Commandes utiles :**
```bash
# Tester la configuration
npm run test:email

# Vérifier les notifications en erreur
# Dans la console backend, chercher les messages :
# "❌ Erreur lors de l'envoi de la notification email"
```

### Problème : Certificat SSL invalide

**Solution :** La configuration actuelle utilise `rejectUnauthorized: false` pour accepter les certificats auto-signés. Si vous rencontrez encore des erreurs SSL, vérifiez :
- Que le port est correct (587 pour STARTTLS, 465 pour SSL)
- Que `requireTLS: true` est défini pour le port 587

### Problème : Emails dans les spams

**Solutions :**
- Utiliser un domaine personnalisé avec SPF/DKIM configurés
- Éviter les mots-clés de spam dans le sujet
- Limiter la fréquence d'envoi
- Utiliser un service d'email transactionnel (SendGrid, Mailgun, etc.)

---

## Améliorations futures

### Suggestions d'amélioration

1. **Queue d'envoi** : Utiliser une queue (Bull, RabbitMQ) pour les envois asynchrones
2. **Retry automatique** : Réessayer automatiquement les envois échoués
3. **Rate limiting** : Limiter le nombre d'emails par utilisateur/jour
4. **Templates personnalisables** : Permettre aux utilisateurs de personnaliser les templates
5. **Préférences utilisateur** : Permettre de désactiver les notifications email
6. **Service d'email transactionnel** : Intégrer SendGrid, Mailgun, etc.
7. **Tracking** : Suivre l'ouverture et les clics des emails

---

## Références

- **Nodemailer** : https://nodemailer.com/
- **Gmail SMTP** : https://support.google.com/a/answer/176600
- **Configuration Gmail** : Voir `CONFIGURATION_EMAIL.md`
- **Documentation frontend** : Voir `README_FRONTEND_ADMIN.md` (section notifications)

---

**Dernière mise à jour :** Janvier 2024

