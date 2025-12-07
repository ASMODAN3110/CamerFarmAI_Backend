# Backend - Application Web ETSIA

## Vue d'ensemble

Ce projet est une application backend Node.js/Express/TypeScript qui suit une architecture modulaire et organisée. Il implémente un système d'authentification complet avec JWT pour une application de gestion agricole.

## Prérequis

- Node.js >= 18.17 (LTS recommandé)
- npm >= 10
- PostgreSQL >= 14
- Un fichier `.env` correctement renseigné (voir section Configuration)
- Consultez `requirements.txt` pour la liste complète et à jour des dépendances côté backend et des outils nécessaires.

## Structure des dossiers

```
Backend/
├── node_modules/          # Dépendances npm installées
├── package.json           # Configuration npm et dépendances
├── package-lock.json      # Verrouillage des versions des dépendances
├── tsconfig.json          # Configuration TypeScript
├── .env                   # Variables d'environnement (non versionné)
├── .gitignore            # Fichiers à ignorer par Git
├── README.md              # Documentation du projet
└── src/                   # Code source de l'application
    ├── config/            # Configuration
    │   └── database.ts    # Configuration TypeORM
    ├── controllers/       # Contrôleurs HTTP
    │   ├── auth.controllers.ts
    │   ├── plantation.controller.ts
    │   ├── event.controller.ts
    │   └── notification.controller.ts
    ├── middleware/        # Middlewares Express
    │   ├── auth.middleware.ts
    │   └── upload.middleware.ts
    ├── migrations/        # Migrations de base de données
    │   └── 1700000005000-SeedUserWithDevices.ts
    ├── models/            # Entités TypeORM
    │   ├── User.entity.ts
    │   ├── Plantation.entity.ts
    │   ├── Sensor.entity.ts
    │   ├── SensorReading.entity.ts
    │   └── Actuator.entity.ts
    ├── routes/            # Définition des routes API
    │   ├── auth.routes.ts
    │   ├── plantation.routes.ts
    │   ├── event.routes.ts
    │   └── notification.routes.ts
    ├── services/          # Services métier
    │   ├── auth.service.ts
    │   ├── event/         # Services d'événements
    │   │   ├── EventService.ts
    │   │   └── ThresholdService.ts
    │   └── notification/  # Services de notifications
    │       ├── NotificationService.abstract.ts
    │       ├── NotificationServiceFactory.ts
    │       ├── EmailNotificationService.ts
    │       ├── WebNotificationService.ts
    │       └── WhatsAppNotificationService.ts
    ├── types/             # Types TypeScript (DTOs)
    │   └── auth.types.ts
    ├── utils/             # Utilitaires
    │   └── HttpException.ts
    └── index.ts           # Point d'entrée de l'application
```

## Description des dossiers

### `/src/config`
Contient les fichiers de configuration de l'application :
- `database.ts` - Configuration TypeORM pour PostgreSQL

### `/src/controllers`
Contient les contrôleurs qui gèrent les requêtes HTTP :
- `auth.controllers.ts` - Authentification (register, login, refresh, profil…)
- `plantation.controller.ts` - Gestion des plantations, capteurs et actionneurs
- `event.controller.ts` - Gestion des événements système (seuils dépassés, actionneurs activés/désactivés)
- `notification.controller.ts` - Gestion des notifications utilisateurs (WEB, EMAIL, WHATSAPP)

### `/src/middleware`
Contient les middlewares Express personnalisés :
- `auth.middleware.ts` - Protection des routes, authentification JWT, gestion des rôles
- `upload.middleware.ts` - Gestion des uploads de fichiers (avatars utilisateurs)

### `/src/migrations`
Contient les scripts de migration de base de données :
- `1700000005000-SeedUserWithDevices.ts` - Création d'un utilisateur de test avec 1 plantation, 2 actionneurs et 1 capteur
- `1700000006000-AddNewPlantationWithSensors.ts` - Ajout d'un nouveau champ à l'utilisateur de test avec 2 capteurs et 3 actionneurs
- `1700000007000-AddSensorToNewPlantation.ts` - Ajout d'un capteur supplémentaire à la plantation "Nouveau Champ de Test"
- `1700000008000-SeedSensorReadings.ts` - Ajout de lectures de capteurs (24 lectures par capteur) pour les plantations "Champ de test" et "Nouveau Champ de Test"
- `1700000009000-CreateEventsAndNotifications.ts` - Création des tables `events` et `notifications` avec leurs relations
- `1700000010000-AddIsReadToNotifications.ts` - Ajout des colonnes `isRead` et `dateLu` à la table `notifications` pour gérer l'état de lecture
- `1700000011000-AddNotificationsForPauline.ts` - Ajout de 5 notifications variées (WEB, EMAIL, WHATSAPP) pour l'utilisateur Pauline Ndoumbé
- `1700000012000-AddWebNotificationsForPauline.ts` - Ajout de 5 notifications WEB non lues pour l'utilisateur Pauline Ndoumbé
- `1700000013000-AddMoreWebNotificationsForPauline.ts` - Ajout de 5 notifications WEB non lues supplémentaires pour l'utilisateur Pauline Ndoumbé
- `1700000014000-AddModeToPlantationsAndModeChangedEvent.ts` - Ajout du champ `mode` (automatic/manual) aux plantations et du type d'événement `mode_changed`
- `1700000015000-SeedSensorReadingsForChampManiocNord.ts` - Ajout de 48 lectures de capteurs (une toutes les 30 minutes sur 24h) pour la plantation "Champ de manioc Nord" de l'utilisateur Pauline Ndoumbé

### `/src/models`
Contient les entités TypeORM :
- `User.entity.ts` - Utilisateur (hashage, rôles)
- `Plantation.entity.ts` - Champs agricoles et relations capteurs/actionneurs
- `Sensor.entity.ts` - Capteurs physiques (type, statut) liés à une plantation
- `SensorReading.entity.ts` - Lectures de capteurs (valeurs mesurées) liées à un capteur
- `Actuator.entity.ts` - Actionneurs (pompe, ventilateur, éclairage, statut)
- `Event.entity.ts` - Événements système (seuil dépassé, actionneur activé/désactivé)
- `Notification.entity.ts` - Notifications utilisateurs (WEB, EMAIL, WHATSAPP) avec gestion de l'état de lecture

### `/src/routes`
Contient la définition des routes de l'API :
- `auth.routes.ts` - Authentification avec validation
- `plantation.routes.ts` - CRUD plantations + capteurs/actionneurs
- `event.routes.ts` - Routes pour consulter les événements système
- `notification.routes.ts` - Routes pour gérer les notifications utilisateurs

### `/src/services`
Contient la logique métier réutilisable :
- `auth.service.ts` - Service d'authentification (inscription, validation, génération de tokens)
- `event/EventService.ts` - Service de gestion des événements système
- `event/ThresholdService.ts` - Service de gestion des seuils et alertes
- `notification/NotificationService.abstract.ts` - Classe abstraite pour les services de notification
- `notification/NotificationServiceFactory.ts` - Factory pour créer les services de notification appropriés
- `notification/EmailNotificationService.ts` - Service d'envoi d'emails via nodemailer
- `notification/WebNotificationService.ts` - Service de notifications web (stockage en base)
- `notification/WhatsAppNotificationService.ts` - Service d'envoi de notifications WhatsApp via Twilio

### `/src/types`
Contient les DTOs (Data Transfer Objects) :
- `auth.types.ts` - Types pour RegisterDto et LoginDto

### `/src/utils`
Contient les utilitaires :
- `HttpException.ts` - Classe d'exception HTTP personnalisée

## Technologies utilisées

### Backend
- **Node.js** - Runtime JavaScript
- **TypeScript** - Langage de programmation typé
- **Express** - Framework web pour Node.js
- **TypeORM** - ORM pour PostgreSQL
- **PostgreSQL** - Base de données relationnelle

### Sécurité & Authentification
- **JWT (jsonwebtoken)** - Tokens d'authentification (access token + refresh token)
- **bcrypt** - Hashage des mots de passe (12 rounds)
- **Helmet** - Sécurisation des en-têtes HTTP
- **express-validator** - Validation des données d'entrée (validation stricte des mots de passe)
- **cookie-parser** - Gestion des cookies HTTP (pour les refresh tokens)

### Notifications
- **nodemailer** - Envoi d'emails (SMTP/SendGrid)
- **twilio** - Envoi de notifications WhatsApp

### Outils de développement
- **ts-node** - Exécution TypeScript
- **nodemon** - Redémarrage automatique du serveur
- **dotenv** - Gestion des variables d'environnement
- **CORS** - Gestion des Cross-Origin Resource Sharing

## Installation

1. **Cloner le dépôt**
   ```bash
   git clone <url-du-projet> && cd Backend/CamerFarmAI
   ```
2. **Installer les dépendances**
   ```bash
   npm install
   ```
3. **Configurer les variables d'environnement** (voir section suivante)
4. **Initialiser la base de données**
   ```bash
   npm run migration:run
   ```
   > Ce script exécute les migrations disponibles, notamment `1700000005000-SeedUserWithDevices` qui crée un utilisateur de test avec une plantation, des capteurs et des actionneurs.
5. **Lancer le serveur en développement**
   ```bash
   npm run dev
   ```

> Astuce : utilisez `npm ci` sur vos environnements CI/CD pour garantir la reproductibilité basée sur `package-lock.json`.

## Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

> 📧 **Configuration Email** : Pour configurer les notifications par email avec Gmail (SMTP), consultez le guide détaillé dans [CONFIGURATION_EMAIL.md](./CONFIGURATION_EMAIL.md)

```env
# Base de données
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=votre_secret_jwt_super_securise
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Serveur
PORT=3000
NODE_ENV=development

# Frontend (optionnel, par défaut: http://localhost:5173)
FRONTEND_URL=http://localhost:5173

# Email (pour les notifications)
# Option 1: SMTP standard (Gmail)
# IMPORTANT: Pour Gmail, vous devez utiliser un "mot de passe d'application" et non votre mot de passe normal
# Voir CONFIGURATION_EMAIL.md pour les instructions détaillées
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application_gmail
SMTP_FROM=noreply@camerfarmai.com

# Option 2: SendGrid (alternative)
# SENDGRID_HOST=smtp.sendgrid.net
# SENDGRID_USER=apikey
# SENDGRID_API_KEY=votre_cle_api_sendgrid
# SENDGRID_FROM=noreply@camerfarmai.com

# WhatsApp (pour les notifications via Twilio)
TWILIO_ACCOUNT_SID=votre_account_sid_twilio
TWILIO_AUTH_TOKEN=votre_auth_token_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Jeu de données de démonstration

### Migration `1700000005000-SeedUserWithDevices.ts`

Cette migration crée un utilisateur de test avec :
- **1 utilisateur** : Test User (`test.user@example.com`, mot de passe: `Password!123`)
- **1 plantation** : "Champ de test" à Douala
- **2 actionneurs** : 
  - Pompe principale (type: `pump`, status: `active`)
  - Ventilateur nord (type: `fan`, status: `active`)
- **1 capteur** : Capteur de température (type: `temperature`, status: `active`)

**Identifiants de connexion :**
- Email : `test.user@example.com`
- Téléphone : `690123456`
- Mot de passe : `Password!123`

### Migration `1700000006000-AddNewPlantationWithSensors.ts`

Cette migration ajoute un nouveau champ à l'utilisateur `test.user@example.com` avec :
- **1 nouvelle plantation** : "Nouveau Champ de Test" à Yaoundé (30 000 m² / 3.0 ha, cacao)
- **2 capteurs** :
  - Capteur de température (type: `temperature`, status: `active`)
  - Capteur d'humidité du sol (type: `soilMoisture`, status: `active`)
- **3 actionneurs** (créés automatiquement) :
  - Pompe principale (type: `pump`, status: `active`)
  - Ventilateur nord (type: `fan`, status: `inactive`)
  - Éclairage LED (type: `light`, status: `active`)

**Note** : Cette migration nécessite que la migration `1700000005000-SeedUserWithDevices.ts` ait été exécutée au préalable.

### Migration `1700000007000-AddSensorToNewPlantation.ts`

Cette migration ajoute un capteur supplémentaire à la plantation "Nouveau Champ de Test" :
- **1 nouveau capteur** : Capteur de CO2 (type: `co2Level`, status: `active`) ou le premier type disponible qui n'existe pas encore

**Note** : Cette migration nécessite que la migration `1700000006000-AddNewPlantationWithSensors.ts` ait été exécutée au préalable.

### Migration `1700000008000-SeedSensorReadings.ts`

Cette migration ajoute des lectures de capteurs pour les plantations "Champ de test" et "Nouveau Champ de Test" :
- **24 lectures par capteur** : Une lecture par heure sur les dernières 24 heures
- **Valeurs réalistes** : Générées selon le type de capteur avec variations temporelles
  - Température : 22-32°C
  - Humidité du sol : 40-70%
  - CO2 : 400-800 ppm
  - Niveau d'eau : 60-90%
  - Luminosité : 150-800 lux (simulation jour/nuit)

**Note** : Cette migration nécessite que les migrations précédentes aient été exécutées au préalable.

### Migration `1700000009000-CreateEventsAndNotifications.ts`

Cette migration crée les tables nécessaires au système d'événements et de notifications :
- **Table `events`** : Stocke les événements système (seuil dépassé, actionneur activé/désactivé)
- **Table `notifications`** : Stocke les notifications envoyées aux utilisateurs via différents canaux (WEB, EMAIL, WHATSAPP)

**Note** : Cette migration doit être exécutée avant les migrations suivantes qui utilisent les notifications.

### Migration `1700000010000-AddIsReadToNotifications.ts`

Cette migration ajoute la fonctionnalité de marquage "lu/non lu" aux notifications :
- **Colonne `isRead`** : Boolean indiquant si la notification a été lue (défaut: `false`)
- **Colonne `dateLu`** : Date de lecture de la notification (nullable)
- **Index** : Création d'un index sur `isRead` pour améliorer les performances des requêtes

**Note** : Cette migration vérifie automatiquement si les colonnes existent déjà avant de les créer (compatibilité avec `synchronize: true`).

### Migration `1700000011000-AddNotificationsForPauline.ts`

Cette migration ajoute des notifications de test pour l'utilisateur Pauline Ndoumbé (`pauline@example.com`) :
- **5 événements variés** : Seuils dépassés, actionneurs activés/désactivés
- **5 notifications** : Mélange de canaux (WEB, EMAIL, WHATSAPP) avec différents états de lecture (2 lues, 3 non lues)

**Note** : Cette migration nécessite que l'utilisateur `pauline@example.com` existe dans la base de données.

### Migration `1700000012000-AddWebNotificationsForPauline.ts`

Cette migration ajoute 5 notifications WEB non lues pour l'utilisateur Pauline Ndoumbé :
- **5 événements** : Température critique, humidité basse, irrigation activée, luminosité élevée, éclairage désactivé
- **5 notifications WEB** : Toutes non lues (`isRead = false`)

**Note** : Cette migration nécessite que l'utilisateur `pauline@example.com` existe dans la base de données.

### Migration `1700000013000-AddMoreWebNotificationsForPauline.ts`

Cette migration ajoute 5 notifications WEB non lues supplémentaires pour l'utilisateur Pauline Ndoumbé :
- **5 événements** : Niveau d'eau critique, pompe activée, CO2 élevé, ventilation activée, température du sol élevée
- **5 notifications WEB** : Toutes non lues (`isRead = false`)

**Note** : Cette migration nécessite que l'utilisateur `pauline@example.com` existe dans la base de données.

### Migration `1700000015000-SeedSensorReadingsForChampManiocNord.ts`

Cette migration ajoute des lectures de capteurs pour la plantation "Champ de manioc Nord" de l'utilisateur Pauline Ndoumbé :
- **48 lectures par capteur** : Une lecture toutes les 30 minutes sur les dernières 24 heures
- **Valeurs adaptées au manioc** : Températures optimales (25-30°C), humidité du sol (50-70%), etc.
- **Variations réalistes** : Cycles jour/nuit pour la température et la luminosité, variations progressives pour l'humidité
- **Types de capteurs supportés** : température, soilMoisture, co2Level, waterLevel, luminosity

**Note** : Cette migration nécessite que :
- L'utilisateur `pauline@example.com` existe dans la base de données
- La plantation "Champ de manioc Nord" existe pour cet utilisateur
- La plantation possède des capteurs (créés automatiquement lors de la création de la plantation)

Pour exécuter toutes les migrations :
```bash
npm run migration:run
```

Pour annuler la dernière migration :
```bash
npm run migration:revert
```

## Scripts disponibles

```bash
npm run dev              # Démarrer le serveur en mode développement
npm run migration:run    # Exécuter les migrations
npm run migration:revert # Annuler la dernière migration
npm run migration:generate # Générer une nouvelle migration
```

## API Endpoints

### Note importante sur les unités de superficie

Le champ `area` (superficie) dans les plantations est **toujours stocké en m² (mètres carrés)** dans la base de données.

Le frontend permet aux utilisateurs de saisir la superficie dans différentes unités :
- **m²** (mètres carrés) - unité par défaut
- **ha** (hectares) - 1 ha = 10 000 m²
- **acre** - 1 acre ≈ 4 047 m²
- **km²** (kilomètres carrés) - 1 km² = 1 000 000 m²

Le frontend effectue automatiquement la conversion en m² avant d'envoyer les données à l'API. Les valeurs retournées par l'API sont également en m².

**Exemples de conversion :**
- 2.3 ha = 23 000 m²
- 3.0 ha = 30 000 m²
- 1 acre ≈ 4 047 m²
- 0.5 km² = 500 000 m²

### Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/register` | Inscription d'un nouvel utilisateur | Public |
| POST | `/login` | Connexion utilisateur | Public |
| POST | `/refresh` | Rafraîchir le token d'accès | Public |
| GET | `/me` | Récupérer les infos de l'utilisateur connecté | Privé |
| PUT | `/profile` | Mettre à jour le profil utilisateur | Privé |
| POST | `/profile/avatar` | Upload de l'avatar utilisateur (multipart/form-data) | Privé |
| POST | `/logout` | Déconnexion | Privé |

### Plantations & Monitoring (`/api/v1/plantations`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/` | Créer une plantation pour l'utilisateur connecté | Privé (FARMER) |
| GET | `/my` | Lister les plantations de l'utilisateur | Privé (FARMER) |
| GET | `/:id` | Détails d'une plantation + capteurs/actionneurs liés | Privé (FARMER propriétaire) |
| PATCH | `/:id` | Mettre à jour une plantation | Privé (FARMER propriétaire) |
| DELETE | `/:id` | Supprimer une plantation | Privé (FARMER propriétaire) |
| POST | `/:id/sensors` | Créer un capteur pour la plantation | Privé (FARMER propriétaire) |
| GET | `/:id/sensors` | Lister les capteurs de la plantation | Privé (FARMER propriétaire) |
| PATCH | `/:id/sensors/:sensorId` | Mettre à jour un capteur (statut) | Privé (FARMER propriétaire) |
| POST | `/:id/sensors/:sensorId/readings` | Ajouter une lecture à un capteur | Privé (FARMER propriétaire) |
| GET | `/:id/sensors/:sensorId/readings` | Obtenir les lectures d'un capteur | Privé (FARMER propriétaire) |
| POST | `/:id/actuators` | Ajouter un actionneur (pompe, ventilateur, éclairage, etc.) | Privé (FARMER propriétaire) |
| GET | `/:id/actuators` | Lister les actionneurs du champ | Privé (FARMER propriétaire) |
| PATCH | `/:id/actuators/:actuatorId` | Mettre à jour un actionneur | Privé (FARMER propriétaire) |
| GET | `/` | Lister toutes les plantations (avec propriétaire) | Privé (TECHNICIAN, ADMIN) |

### Événements (`/api/v1/events`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/my` | Lister tous les événements de l'utilisateur (toutes ses plantations) | Privé (FARMER) |
| GET | `/plantation/:id` | Lister les événements d'une plantation spécifique | Privé (FARMER propriétaire) |
| GET | `/:eventId` | Obtenir les détails d'un événement spécifique | Privé (FARMER propriétaire) |

### Notifications (`/api/v1/notifications`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/my` | Lister les notifications de l'utilisateur connecté (option: `?unreadOnly=true`) | Privé |
| GET | `/stats` | Obtenir les statistiques des notifications (total, envoyées, en attente, erreurs, non lues) | Privé |
| GET | `/:notificationId` | Obtenir une notification spécifique | Privé |
| PATCH | `/:notificationId/read` | Marquer une notification comme lue | Privé |
| DELETE | `/:id` | Supprimer une notification | Privé |

## Guide complet des API - Test avec Postman

### Configuration Postman

1. **Créer un environnement Postman** :
   - Variable `base_url` : `http://localhost:3000/api/v1`
   - Variable `accessToken` : (sera remplie après login)

2. **Collection Postman** : Créer une collection "CamerFarmAI API"

---

## Routes d'authentification (`/api/v1/auth`)

### 1. POST `/api/v1/auth/register` - Inscription

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/auth/register`
- **Headers** : `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "phone": "690123456",
  "password": "Password!123",
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com"
}
```

**Réponse 201 Created :**
```json
{
  "success": true,
  "message": "Inscription réussie",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "690123456",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "farmer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erreur 400 Bad Request :**
```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    {
      "msg": "Le numéro de téléphone est requis",
      "param": "phone"
    }
  ]
}
```

**Règles de validation du mot de passe :**
- Minimum 8 caractères
- Au moins une lettre majuscule (A-Z)
- Au moins une lettre minuscule (a-z)
- Au moins un nombre (0-9)
- Au moins un caractère spécial (!@#$%^&*(),.?":{}|<>)

**Exemple d'erreur de validation du mot de passe :**
```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    {
      "type": "field",
      "msg": "Le mot de passe doit contenir au moins 8 caractères",
      "path": "password",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Le mot de passe doit contenir au moins une lettre majuscule",
      "path": "password",
      "location": "body"
    }
  ]
}
```

---

### 2. POST `/api/v1/auth/login` - Connexion

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/auth/login`
- **Headers** : `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "email": "bruno.farmer@example.com",
  "password": "Password!123"
}
```

**Réponse 200 OK :**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "690000003",
      "email": "bruno.farmer@example.com",
      "firstName": "Pierre",
      "lastName": "Agriculteur",
      "role": "farmer",
      "createdAt": "2025-11-28T08:00:00.000Z",
      "updatedAt": "2025-11-28T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Important** : Copier le `accessToken` et l'ajouter dans la variable d'environnement Postman `accessToken` pour les requêtes suivantes.

**Erreur 401 Unauthorized :**
```json
{
  "success": false,
  "message": "Identifiants invalides"
}
```

---

### 3. POST `/api/v1/auth/refresh` - Rafraîchir le token

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/auth/refresh`
- **Headers** : Aucun (utilise le cookie `refreshToken`)

**Réponse 200 OK :**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4. GET `/api/v1/auth/me` - Profil utilisateur

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/auth/me`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "690000003",
    "email": "bruno.farmer@example.com",
    "firstName": "Pierre",
    "lastName": "Agriculteur",
    "role": "farmer",
    "createdAt": "2025-11-28T08:00:00.000Z",
    "updatedAt": "2025-11-28T08:00:00.000Z"
  }
}
```

---

### 5. PUT `/api/v1/auth/profile` - Mettre à jour le profil

**Configuration Postman :**
- **Method** : `PUT`
- **URL** : `{{base_url}}/auth/profile`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "firstName": "Pierre",
  "lastName": "Agriculteur Modifié",
  "email": "nouveau.email@example.com",
  "phone": "690999999"
}
```

**Réponse 200 OK :**
```json
{
  "success": true,
  "message": "Profil mis à jour avec succès",
  "data": {
    "id": "uuid",
    "phone": "690999999",
    "email": "nouveau.email@example.com",
    "firstName": "Pierre",
    "lastName": "Agriculteur Modifié",
    "role": "farmer"
  }
}
```

---

### 6. POST `/api/v1/auth/profile/avatar` - Upload avatar

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/auth/profile/avatar`
- **Headers** : `Authorization: Bearer {{accessToken}}`
- **Body** : `form-data`
  - Clé : `avatar` (type: File)
  - Valeur : Sélectionner un fichier image

**Réponse 200 OK :**
```json
{
  "success": true,
  "message": "Avatar uploadé avec succès",
  "data": {
    "avatarUrl": "/uploads/avatars/uuid-timestamp-filename.jpg"
  }
}
```

---

### 7. POST `/api/v1/auth/logout` - Déconnexion

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/auth/logout`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

## Routes de plantations (`/api/v1/plantations`)

**⚠️ Toutes les routes nécessitent** : `Authorization: Bearer {{accessToken}}`

### 8. POST `/api/v1/plantations` - Créer une plantation

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/plantations`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "name": "Champ Bafoussam",
  "location": "Bafoussam",
  "area": 23000,
  "cropType": "cacao"
}
```

**Note importante** : Le champ `area` doit être envoyé en **m² (mètres carrés)**. Le frontend gère automatiquement la conversion depuis différentes unités (m², ha, acre, km²) avant l'envoi à l'API.

**Réponse 201 Created :**
```json
{
  "id": "uuid",
  "name": "Champ Bafoussam",
  "location": "Bafoussam",
  "area": 23000,
  "createdAt": "2025-11-28T10:00:00.000Z",
  "cropType": "cacao",
  "ownerId": "uuid",
  "updatedAt": "2025-11-28T10:00:00.000Z"
}
```

**Note** : 
- 5 capteurs (un de chaque type) et 3 actionneurs sont créés automatiquement.
- La superficie (`area`) est stockée en m² dans la base de données. Le frontend permet de saisir dans différentes unités (m², ha, acre, km²) et effectue la conversion automatiquement.

---

### 9. GET `/api/v1/plantations/my` - Mes plantations

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations/my`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
[
  {
    "id": "uuid",
    "name": "Champ Bafoussam",
    "location": "Bafoussam",
    "area": 23000,
    "createdAt": "2025-11-28T10:00:00.000Z",
    "cropType": "cacao",
    "ownerId": "uuid",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  }
]
```

**Note** : La superficie est retournée en m². Le frontend peut convertir cette valeur pour l'affichage dans l'unité choisie par l'utilisateur.

---

### 10. GET `/api/v1/plantations/:id` - Détails d'une plantation

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations/{{plantationId}}`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
{
  "id": "uuid",
  "name": "Champ Bafoussam",
  "location": "Bafoussam",
  "area": 23000,
  "createdAt": "2025-11-28T10:00:00.000Z",
  "cropType": "cacao",
  "ownerId": "uuid",
  "updatedAt": "2025-11-28T10:00:00.000Z",
  "sensors": [
    {
      "id": "uuid",
      "type": "temperature",
      "status": "active",
      "plantationId": "uuid",
      "createdAt": "2025-11-28T10:00:00.000Z",
      "updatedAt": "2025-11-28T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "type": "soilMoisture",
      "status": "active",
      "plantationId": "uuid",
      "createdAt": "2025-11-28T10:00:00.000Z",
      "updatedAt": "2025-11-28T10:00:00.000Z"
    }
  ],
  "actuators": [
    {
      "id": "uuid",
      "name": "Pompe principale",
      "type": "pump",
      "status": "active",
      "metadata": {
        "flowRate": "25L/min",
        "power": "300W"
      },
      "plantationId": "uuid",
      "createdAt": "2025-11-28T10:00:00.000Z",
      "updatedAt": "2025-11-28T10:00:00.000Z"
    }
  ],
  "latestReadings": [
    {
      "sensorId": "uuid",
      "sensorType": "temperature",
      "latestReading": {
        "value": 27.5,
        "timestamp": "2025-11-28T11:00:00.000Z"
      }
    }
  ],
  "hasSensors": true,
  "hasActuators": true
}
```

**Erreur 404 Not Found :**
```json
{
  "message": "Champ non trouvé"
}
```

---

### 11. PATCH `/api/v1/plantations/:id` - Mettre à jour une plantation

**Configuration Postman :**
- **Method** : `PATCH`
- **URL** : `{{base_url}}/plantations/{{plantationId}}`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "name": "Champ Bafoussam Modifié",
  "location": "Bafoussam Centre",
  "area": 30000
}
```

**Note** : Le champ `area` doit être envoyé en m². Le frontend gère la conversion depuis différentes unités.

**Réponse 200 OK :**
```json
{
  "id": "uuid",
  "name": "Champ Bafoussam Modifié",
  "location": "Bafoussam Centre",
  "area": 30000,
  "createdAt": "2025-11-28T10:00:00.000Z",
  "cropType": "cacao",
  "ownerId": "uuid",
  "updatedAt": "2025-11-28T10:30:00.000Z"
}
```

---

### 12. DELETE `/api/v1/plantations/:id` - Supprimer une plantation

**Configuration Postman :**
- **Method** : `DELETE`
- **URL** : `{{base_url}}/plantations/{{plantationId}}`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 204 No Content** (pas de body)

---

## Routes de capteurs (`/api/v1/plantations/:id/sensors`)

### 13. POST `/api/v1/plantations/:id/sensors` - Créer un capteur

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/sensors`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "type": "temperature",
  "status": "active"
}
```

**Types valides** : `temperature`, `soilMoisture`, `co2Level`, `waterLevel`, `luminosity`

**Réponse 201 Created :**
```json
{
  "id": "uuid",
  "type": "temperature",
  "status": "active",
  "plantationId": "uuid",
  "createdAt": "2025-11-28T10:00:00.000Z",
  "updatedAt": "2025-11-28T10:00:00.000Z"
}
```

**Erreur 400 Bad Request :**
```json
{
  "message": "Le champ type est obligatoire pour un capteur."
}
```

---

### 14. GET `/api/v1/plantations/:id/sensors` - Lister les capteurs

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/sensors`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
[
  {
    "id": "uuid",
    "type": "temperature",
    "status": "active",
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "type": "soilMoisture",
    "status": "active",
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "type": "co2Level",
    "status": "active",
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "type": "waterLevel",
    "status": "active",
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "type": "luminosity",
    "status": "active",
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  }
]
```

---

### 15. PATCH `/api/v1/plantations/:id/sensors/:sensorId` - Mettre à jour un capteur

**Configuration Postman :**
- **Method** : `PATCH`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/sensors/{{sensorId}}`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "status": "inactive"
}
```

**Réponse 200 OK :**
```json
{
  "id": "uuid",
  "type": "temperature",
  "status": "inactive",
  "plantationId": "uuid",
  "createdAt": "2025-11-28T10:00:00.000Z",
  "updatedAt": "2025-11-28T10:30:00.000Z"
}
```

---

## Routes de lectures de capteurs (`/api/v1/plantations/:id/sensors/:sensorId/readings`)

### 16. POST `/api/v1/plantations/:id/sensors/:sensorId/readings` - Ajouter une lecture

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/sensors/{{sensorId}}/readings`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "value": 27.5
}
```

**Réponse 201 Created :**
```json
{
  "id": "uuid",
  "value": 27.5,
  "sensorId": "uuid",
  "timestamp": "2025-11-28T11:00:00.000Z"
}
```

**Erreur 400 Bad Request :**
```json
{
  "message": "Le champ value est obligatoire et doit être numérique."
}
```

---

### 17. GET `/api/v1/plantations/:id/sensors/:sensorId/readings` - Obtenir les lectures

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/sensors/{{sensorId}}/readings`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
{
  "sensor": {
    "id": "uuid",
    "type": "temperature",
    "status": "active"
  },
  "readings": [
    {
      "id": "uuid",
      "value": 27.5,
      "sensorId": "uuid",
      "timestamp": "2025-11-28T11:00:00.000Z"
    },
    {
      "id": "uuid",
      "value": 26.8,
      "sensorId": "uuid",
      "timestamp": "2025-11-28T10:30:00.000Z"
    },
    {
      "id": "uuid",
      "value": 28.2,
      "sensorId": "uuid",
      "timestamp": "2025-11-28T10:00:00.000Z"
    }
  ]
}
```

**Note** : Retourne les 100 dernières lectures, triées par timestamp décroissant.

---

## Routes d'actionneurs (`/api/v1/plantations/:id/actuators`)

### 18. POST `/api/v1/plantations/:id/actuators` - Créer un actionneur

**Configuration Postman :**
- **Method** : `POST`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/actuators`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "name": "Pompe de secours",
  "type": "pump",
  "status": "active",
  "metadata": {
    "flowRate": "30L/min",
    "power": "350W"
  }
}
```

**Types valides** : `pump`, `fan`, `light`

**Réponse 201 Created :**
```json
{
  "id": "uuid",
  "name": "Pompe de secours",
  "type": "pump",
  "status": "active",
  "metadata": {
    "flowRate": "30L/min",
    "power": "350W"
  },
  "plantationId": "uuid",
  "createdAt": "2025-11-28T10:00:00.000Z",
  "updatedAt": "2025-11-28T10:00:00.000Z"
}
```

---

### 19. GET `/api/v1/plantations/:id/actuators` - Lister les actionneurs

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/actuators`
- **Headers** : `Authorization: Bearer {{accessToken}}`

**Réponse 200 OK :**
```json
[
  {
    "id": "uuid",
    "name": "Pompe principale",
    "type": "pump",
    "status": "active",
    "metadata": {
      "flowRate": "25L/min",
      "power": "300W"
    },
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "Ventilateur nord",
    "type": "fan",
    "status": "inactive",
    "metadata": {
      "speedLevels": 3,
      "power": "150W"
    },
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "Éclairage LED",
    "type": "light",
    "status": "active",
    "metadata": {
      "spectrum": "full",
      "power": "100W"
    },
    "plantationId": "uuid",
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  }
]
```

---

### 20. PATCH `/api/v1/plantations/:id/actuators/:actuatorId` - Mettre à jour un actionneur

**Configuration Postman :**
- **Method** : `PATCH`
- **URL** : `{{base_url}}/plantations/{{plantationId}}/actuators/{{actuatorId}}`
- **Headers** : 
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Body** (raw JSON) :
```json
{
  "status": "active",
  "metadata": {
    "flowRate": "35L/min",
    "power": "400W"
  }
}
```

**Réponse 200 OK :**
```json
{
  "id": "uuid",
  "name": "Pompe principale",
  "type": "pump",
  "status": "active",
  "metadata": {
    "flowRate": "35L/min",
    "power": "400W"
  },
  "plantationId": "uuid",
  "createdAt": "2025-11-28T10:00:00.000Z",
  "updatedAt": "2025-11-28T10:30:00.000Z"
}
```

---

## Routes administrateur/technicien (`/api/v1/plantations`)

### 21. GET `/api/v1/plantations` - Lister toutes les plantations

**Configuration Postman :**
- **Method** : `GET`
- **URL** : `{{base_url}}/plantations`
- **Headers** : `Authorization: Bearer {{accessToken}}`
- **⚠️ Accès** : Uniquement TECHNICIAN ou ADMIN

**Réponse 200 OK :**
```json
[
  {
    "id": "uuid",
    "name": "Champ Bafoussam",
    "location": "Bafoussam",
    "area": 23000,
    "createdAt": "2025-11-28T10:00:00.000Z",
    "cropType": "cacao",
    "ownerId": "uuid",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  }
]
```

**Note** : La superficie est retournée en m².

**Erreur 403 Forbidden** (si pas admin/technicien) :
```json
{
  "message": "Vous n'avez pas la permission d'accéder à cette ressource"
}
```

---

## Codes de statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès - Requête traitée avec succès |
| 201 | Créé - Ressource créée avec succès |
| 204 | Pas de contenu - Suppression réussie |
| 400 | Requête invalide - Données manquantes ou invalides |
| 401 | Non autorisé - Token manquant ou invalide |
| 403 | Interdit - Permissions insuffisantes |
| 404 | Non trouvé - Ressource introuvable |
| 409 | Conflit - Ressource déjà existante (ex: email/phone déjà utilisé) |
| 500 | Erreur serveur - Erreur interne |

---

## Astuces Postman

1. **Variables d'environnement** : Utiliser `{{base_url}}` et `{{accessToken}}` pour éviter de répéter les valeurs
2. **Tests automatiques** : Ajouter des scripts dans l'onglet "Tests" pour extraire automatiquement le token :
```javascript
if (pm.response.code === 200) {
  const jsonData = pm.response.json();
  if (jsonData.data && jsonData.data.accessToken) {
    pm.environment.set("accessToken", jsonData.data.accessToken);
  }
}
```
3. **Collection Runner** : Exécuter toutes les requêtes d'une collection en séquence
4. **Pré-requis** : Créer un dossier "Auth" dans la collection avec les requêtes d'authentification en premier

#### Exemple : ajouter un actionneur
```bash
POST /api/v1/plantations/<plantationId>/actuators
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Pompe de secours",
  "type": "pump",
  "status": "inactive",
  "metadata": {
    "power": "300W"
  }
}
```

### Exemples de requêtes

#### Inscription
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "690123456",
  "password": "monMotDePasse123",
  "firstName": "Pauline",
  "lastName": "Ndoumbé",
  "email": "pauline@example.com"
}
```

#### Connexion
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "pauline@example.com",
  "password": "monMotDePasse123"
}
```

#### Récupérer mon profil (protégé)
```bash
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

#### Rafraîchir le token
```bash
POST /api/v1/auth/refresh
Cookie: refreshToken=<refresh_token>
```

#### Mettre à jour le profil
```bash
PUT /api/v1/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Pauline",
  "lastName": "Ndoumbé",
  "email": "nouveau@example.com",
  "phone": "690123456"
}
```

#### Upload de l'avatar utilisateur
```bash
POST /api/v1/auth/profile/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form-data:
  avatar: <fichier image>
```

Réponse:
```json
{
  "success": true,
  "message": "Avatar uploadé avec succès",
  "data": {
    "userId": "<uuid>",
    "avatarUrl": "http://localhost:3000/uploads/avatars/<nom-du-fichier>"
  }
}
```

#### Déconnexion
```bash
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### Exemples d'appels depuis le frontend

#### Configuration de base (fetch avec credentials)

```typescript
// Configuration de l'URL de base
const API_BASE_URL = 'http://localhost:3000/api/v1';

// Fonction utilitaire pour les appels API
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Nécessaire pour envoyer/recevoir les cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}
```

#### Inscription
```typescript
const registerData = await apiCall('/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    phone: '690123456',
    password: 'monMotDePasse123',
    firstName: 'Pauline',
    lastName: 'Ndoumbé',
    email: 'pauline@example.com'
  })
});

// Le refreshToken est automatiquement stocké dans un cookie HttpOnly
// L'accessToken est retourné dans la réponse
localStorage.setItem('accessToken', registerData.data.accessToken);
```

#### Connexion
```typescript
const loginData = await apiCall('/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'pauline@example.com',
    password: 'monMotDePasse123'
  })
});

// Le refreshToken est automatiquement stocké dans un cookie HttpOnly
// L'accessToken est retourné dans la réponse
localStorage.setItem('accessToken', loginData.data.accessToken);
```

#### Récupérer le profil (protégé)
```typescript
const profile = await apiCall('/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

#### Rafraîchir le token
```typescript
// Le refreshToken est automatiquement envoyé via le cookie
const refreshData = await apiCall('/auth/refresh', {
  method: 'POST'
});

// Mettre à jour l'accessToken
localStorage.setItem('accessToken', refreshData.accessToken);
```

#### Mettre à jour le profil
```typescript
const updatedProfile = await apiCall('/auth/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  body: JSON.stringify({
    firstName: 'Pauline',
    lastName: 'Ndoumbé',
    email: 'nouveau@example.com',
    phone: '690123456'
  })
});
```

#### Déconnexion
```typescript
await apiCall('/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// Nettoyer le token local
localStorage.removeItem('accessToken');
```

**Note importante** : Le frontend doit configurer `credentials: 'include'` dans toutes les requêtes fetch pour que les cookies HttpOnly soient envoyés automatiquement.

### Gestion des rôles

#### Créer un utilisateur avec un rôle spécifique

Par défaut, l'inscription crée des utilisateurs avec le rôle `FARMER`. Pour créer des techniciens ou administrateurs :

1. **Créer l'utilisateur via l'API** `/register`
2. **Modifier le rôle en base de données** :

```sql
-- Pour un technicien
UPDATE users SET role = 'technician' WHERE email = 'technicien@example.com';

-- Pour un administrateur
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

#### Tester le login avec différents rôles

**Technicien :**
```json
POST /api/v1/auth/login
{
  "email": "technicien@example.com",
  "password": "motdepasse123"
}
```

**Administrateur :**
```json
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "motdepasse123"
}
```

#### Utiliser le middleware restrictTo

Pour protéger une route avec un rôle spécifique :

```typescript
import { restrictTo } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.entity';

// Route accessible uniquement aux administrateurs
router.get('/admin-only', protectRoute, restrictTo(UserRole.ADMIN), handler);

// Route accessible aux techniciens et administrateurs
router.get('/staff-only', protectRoute, restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN), handler);
```

## Architecture

Cette structure suit le pattern **MVC (Model-View-Controller)** adapté pour une API REST :
- **Models** : Entités TypeORM (User)
- **Controllers** : Gestion des requêtes et réponses HTTP
- **Routes** : Définition des endpoints avec validation
- **Services** : Logique métier réutilisable
- **Middleware** : Authentification, validation, gestion des erreurs
- **Types** : DTOs pour la validation des données

## Niveau d'avancement

###  Implémenté

- [x] Configuration TypeORM avec PostgreSQL
- [x] Modèle User avec hashage automatique des mots de passe
- [x] Système d'authentification complet (JWT)
- [x] Inscription utilisateur
- [x] Connexion utilisateur
- [x] Rafraîchissement de token
- [x] Récupération du profil utilisateur
- [x] Déconnexion
- [x] Middleware de protection des routes
- [x] Validation des données avec express-validator
- [x] Validation stricte des mots de passe (8 caractères min, majuscule, minuscule, nombre, caractère spécial)
- [x] Validation stricte des mots de passe (8 caractères min, majuscule, minuscule, nombre, caractère spécial)
- [x] Gestion des erreurs HTTP personnalisées
- [x] Support des cookies HttpOnly pour les refresh tokens
- [x] Migration de base de données
- [x] Système de rôles avec enum (FARMER, TECHNICIAN, ADMIN)
- [x] Middleware de restriction par rôle (restrictTo)
- [x] Système d'événements (seuils dépassés, actionneurs activés/désactivés, changement de mode)
- [x] Système de notifications multi-canaux (WEB, EMAIL, WHATSAPP)
- [x] Gestion de l'état de lecture des notifications
- [x] Services de notification avec factory pattern
- [x] Mode automatique/manuel pour les plantations

###  En cours / À faire

- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Réinitialisation de mot de passe
- [ ] Gestion des langues (fr, en, pidgin)
- [ ] Rate limiting
- [ ] Logging avancé
- [ ] Gestion des fichiers uploads

## Sécurité

-  Mots de passe hashés avec bcrypt (12 rounds)
-  Tokens JWT avec expiration
-  Refresh tokens dans des cookies HttpOnly
-  Validation des données d'entrée
-  Protection CORS configurée
-  Headers de sécurité avec Helmet

## Base de données

### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique (clé primaire) |
| phone | VARCHAR | Numéro de téléphone (unique) |
| email | VARCHAR | Email (unique, nullable) |
| firstName | VARCHAR | Prénom (nullable) |
| lastName | VARCHAR | Nom (nullable) |
| role | ENUM | Rôle utilisateur (voir UserRole ci-dessous) |
| password | VARCHAR | Mot de passe hashé |
| createdAt | TIMESTAMP | Date de création |
| updatedAt | TIMESTAMP | Date de mise à jour |

### Table `plantations`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant du champ |
| ownerId | UUID | Référence vers `users.id` |
| name | VARCHAR | Nom du champ |
| location | VARCHAR | Localisation |
| area | DECIMAL(10,2) | Superficie en m² (mètres carrés). Le frontend permet de saisir dans différentes unités (m², ha, acre, km²) et convertit automatiquement en m² avant l'envoi à l'API. |
| cropType | VARCHAR | Culture principale |
| mode | ENUM | Mode de fonctionnement : `automatic` (défaut) ou `manual` |
| coordinates | JSONB | Coordonnées optionnelles |
| createdAt / updatedAt | TIMESTAMP | Timestamps |

### Table `sensors`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant du capteur |
| type | ENUM | Type de capteur : `temperature`, `soilMoisture`, `co2Level`, `waterLevel`, `luminosity` |
| status | ENUM | `active` ou `inactive` |
| plantationId | UUID | Référence vers le champ |
| createdAt / updatedAt | TIMESTAMP | Timestamps |

### Table `sensor_readings`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant de la lecture |
| value | DECIMAL(10,2) | Valeur mesurée |
| sensorId | UUID | Référence vers le capteur |
| timestamp | TIMESTAMP | Date de la mesure |

### Table `actuators`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant de l'actionneur |
| plantationId | UUID | Référence vers le champ |
| name | VARCHAR | Nom (Pompe principale, etc.) |
| type | VARCHAR | Catégorie (`pump`, `fan`, `light`, …) |
| status | ENUM | `active` / `inactive` |
| metadata | JSONB | Informations complémentaires |
| createdAt / updatedAt | TIMESTAMP | Timestamps |

### Table `events`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant de l'événement |
| type | ENUM | Type d'événement : `threshold_exceeded`, `actuator_activated`, `actuator_deactivated`, `mode_changed` |
| date | TIMESTAMP | Date de l'événement |
| description | TEXT | Description de l'événement |
| sensorId | UUID | Référence vers le capteur (nullable) |
| actuatorId | UUID | Référence vers l'actionneur (nullable) |
| metadata | JSONB | Données supplémentaires (valeurs, seuils, etc.) |
| createdAt / updatedAt | TIMESTAMP | Timestamps |

### Table `notifications`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant de la notification |
| userId | UUID | Référence vers l'utilisateur |
| eventId | UUID | Référence vers l'événement |
| type | ENUM | Type de canal : `WEB`, `EMAIL`, `WHATSAPP` |
| statut | ENUM | Statut : `EN_ATTENTE`, `ENVOYEE`, `ERREUR` |
| dateEnvoi | TIMESTAMP | Date d'envoi |
| isRead | BOOLEAN | Indique si la notification a été lue (défaut: `false`) |
| dateLu | TIMESTAMP | Date de lecture (nullable) |
| message | TEXT | Message de la notification |
| createdAt / updatedAt | TIMESTAMP | Timestamps |

### Enum UserRole

L'application utilise un enum TypeScript pour les rôles :

```typescript
export enum UserRole {
  FARMER = 'farmer',        // Agriculteur (rôle par défaut)
  TECHNICIAN = 'technician', // Technicien/Conseiller
  ADMIN = 'admin',          // Administrateur
}
```

**Note** : Par défaut, tous les nouveaux utilisateurs sont créés avec le rôle `FARMER`. Pour créer des techniciens ou administrateurs, vous devez modifier le rôle en base de données après l'inscription.

## Notes importantes

- Le point d'entrée de l'application est `src/index.ts`
- Les variables d'environnement doivent être configurées dans `.env`
- La synchronisation automatique de la base de données est activée en développement (`synchronize: true`)
- Les tokens d'accès expirent après 15 minutes (configurable via `ACCESS_TOKEN_EXPIRES_IN`)
- Les refresh tokens expirent après 7 jours (configurable via `REFRESH_TOKEN_EXPIRES_IN`)
- Le serveur démarre sur le port 3000 par défaut (configurable via `PORT`)
- Les nouveaux utilisateurs sont créés avec le rôle `FARMER` par défaut
- L'authentification utilise JWT avec support des cookies HttpOnly pour les refresh tokens
- L'enum `UserRole` est utilisé pour garantir la cohérence des rôles dans toute l'application
- Le CORS est configuré pour accepter les requêtes depuis le frontend (par défaut `http://localhost:5173`, configurable via `FRONTEND_URL`)
- Les cookies HttpOnly sont activés avec `credentials: true` pour permettre l'authentification cross-origin
- En développement, les cookies utilisent `sameSite: 'lax'` pour fonctionner correctement avec le frontend

## Développement

Pour démarrer le serveur en mode développement :

```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

## Contribution

Ce projet fait partie du livrable de la Phase 3, Partie 2 du projet ETSIA.
