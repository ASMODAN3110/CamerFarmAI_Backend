# Backend - CamerFarmAI

## Vue d'ensemble

Application backend Node.js/Express/TypeScript pour la gestion agricole intelligente au Cameroun. Système d'authentification complet avec JWT, gestion des plantations, capteurs, actionneurs, événements et notifications multi-canaux.

## Prérequis

- Node.js >= 18.17 (LTS recommandé)
- npm >= 10
- PostgreSQL >= 14
- Fichier `.env` correctement configuré

## Structure des dossiers

```
Backend/
├── src/
│   ├── config/            # Configuration (database.ts)
│   ├── controllers/       # Contrôleurs HTTP
│   ├── middleware/        # Middlewares Express (auth, validation, security, sanitize, upload)
│   ├── migrations/        # Migrations TypeORM
│   ├── models/            # Entités TypeORM
│   ├── routes/            # Définition des routes API
│   ├── services/         # Services métier (auth, event, notification)
│   ├── scripts/           # Scripts utilitaires (seed-mais-sensor-data.ts)
│   ├── types/            # Types TypeScript (DTOs)
│   ├── utils/            # Utilitaires
│   └── index.ts          # Point d'entrée
├── package.json
├── tsconfig.json
└── .env                  # Variables d'environnement (non versionné)
```

## Installation

1. **Cloner le dépôt et installer les dépendances**
   ```bash
   git clone <url-du-projet> && cd Backend/CamerFarmAI
   npm install
   ```

2. **Configurer les variables d'environnement**
   Créez un fichier `.env` à la racine avec les variables suivantes :
   
   > 📧 **Configuration Email** : Consultez [CONFIGURATION_EMAIL.md](./CONFIGURATION_EMAIL.md) pour la configuration SMTP Gmail

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
FRONTEND_URL=http://localhost:5173

# Email (SMTP) - Optionnel
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application_gmail
SMTP_FROM=noreply@camerfarmai.com  # Optionnel (défaut: SMTP_USER)

# Google OAuth 2.0 - Optionnel
GOOGLE_CLIENT_ID=votre_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre_client_secret
```

3. **Initialiser la base de données**
```bash
npm run migration:run
```

4. **Démarrer le serveur**
```bash
   npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

## Scripts disponibles

```bash
npm run dev                  # Démarrer le serveur en mode développement
npm run migration:run        # Exécuter les migrations
npm run migration:revert    # Annuler la dernière migration
npm run migration:generate  # Générer une nouvelle migration
npm run seed:mais          # Générer des données de capteurs pour la plantation Maïs de Test User
npm run test:email         # Tester la configuration SMTP et l'envoi d'emails
```

## Technologies utilisées

- **Node.js** + **TypeScript** - Runtime et langage
- **Express** - Framework web
- **TypeORM** - ORM pour PostgreSQL
- **PostgreSQL** - Base de données
- **JWT** - Authentification (access + refresh tokens)
- **bcrypt** - Hashage des mots de passe
- **Helmet** - Sécurisation des headers HTTP
- **express-validator** - Validation des données
- **nodemailer** - Envoi d'emails via SMTP (notifications email)
- **multer** - Upload de fichiers

## API Endpoints

### Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/register` | Inscription d'un nouvel utilisateur | Public |
| POST | `/login` | Connexion utilisateur | Public |
| POST | `/login/verify-2fa` | Vérifier le code 2FA et compléter la connexion | Public |
| POST | `/refresh` | Rafraîchir le token d'accès | Public |
| POST | `/forgot-password` | Demande de réinitialisation de mot de passe (envoie un email) | Public |
| POST | `/reset-password` | Réinitialiser le mot de passe avec token | Public |
| POST | `/google/login` | Connexion avec Google OAuth 2.0 (utilisateur existant) | Public |
| POST | `/google/register` | Inscription avec Google OAuth 2.0 (nouvel utilisateur) | Public |
| POST | `/google` | Authentification Google (legacy - trouve ou crée) | Public |
| GET | `/me` | Récupérer les infos de l'utilisateur connecté | Privé |
| PUT | `/profile` | Mettre à jour le profil utilisateur | Privé |
| POST | `/profile/avatar` | Upload de l'avatar utilisateur | Privé |
| POST | `/logout` | Déconnexion | Privé |
| GET | `/2fa/generate` | Générer un secret 2FA et QR code | Privé |
| POST | `/2fa/enable` | Activer le 2FA | Privé |
| POST | `/2fa/disable` | Désactiver le 2FA | Privé |

**Authentification Google OAuth 2.0 :**

Les endpoints `/auth/google/login` et `/auth/google/register` permettent respectivement de se connecter et de s'inscrire avec un compte Google.

**Format de requête :**
```json
POST /api/v1/auth/google/login
POST /api/v1/auth/google/register
Content-Type: application/json

{
  "idToken": "token_id_google_obtenu_depuis_le_frontend"
}
```

**Réponses :**

- **200 (login)** / **201 (register)** : Succès
  ```json
  {
    "success": true,
    "message": "Connexion Google réussie" | "Inscription Google réussie",
    "data": {
      "user": {
        "id": "uuid",
        "phone": "string | null",
        "firstName": "string | null",
        "lastName": "string | null",
        "email": "string | null",
        "role": "farmer" | "technician" | "admin",
        "avatarUrl": "string | null",
        "authProvider": "google"
      },
      "accessToken": "jwt_token"
    }
  }
  ```

- **404 (login)** : Aucun compte trouvé → rediriger vers l'inscription
- **409 (register)** : Compte existe déjà → rediriger vers la connexion
- **401** : Token Google invalide ou expiré

> 📘 **Configuration** : Consultez [CONFIGURATION_GOOGLE_OAUTH.md](./CONFIGURATION_GOOGLE_OAUTH.md) pour la configuration complète de Google OAuth 2.0

### Plantations (`/api/v1/plantations`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/` | Créer une plantation | Privé (FARMER) |
| GET | `/my` | Lister les plantations de l'utilisateur | Privé (FARMER) |
| GET | `/:id` | Détails d'une plantation + capteurs/actionneurs | Privé (FARMER propriétaire) |
| PATCH | `/:id` | Mettre à jour une plantation | Privé (FARMER propriétaire) |
| DELETE | `/:id` | Supprimer une plantation | Privé (FARMER propriétaire) |
| GET | `/` | Lister toutes les plantations | Privé (TECHNICIAN, ADMIN) |

### Capteurs (`/api/v1/plantations/:id/sensors`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/:id/sensors` | Créer un capteur | Privé (FARMER propriétaire) |
| GET | `/:id/sensors` | Lister les capteurs | Privé (FARMER propriétaire) |
| PATCH | `/:id/sensors/:sensorId` | Mettre à jour un capteur (statut) | Privé (FARMER propriétaire) |
| PATCH | `/:id/sensors/:sensorId/thresholds` | Configurer les seuils d'un capteur | Privé (FARMER propriétaire) |
| POST | `/:id/sensors/:sensorId/readings` | Ajouter une lecture (active automatiquement le capteur) | Privé (FARMER propriétaire) |
| GET | `/:id/sensors/:sensorId/readings` | Obtenir les lectures d'un capteur | Privé (FARMER propriétaire) |

**Note sur les statuts des capteurs :**
- Les statuts (`ACTIVE`/`INACTIVE`) sont mis à jour automatiquement lors des appels à `GET /:id` et `GET /:id/sensors`
- **Désactivation automatique** : Un capteur devient `INACTIVE` s'il n'a pas reçu de lecture depuis **1 heure**
- **Activation automatique** : Un capteur redevient `ACTIVE` dès qu'une nouvelle lecture est ajoutée via `POST /:id/sensors/:sensorId/readings`
- **Notifications** : Le propriétaire reçoit une notification (WEB, EMAIL) à chaque changement de statut
- **Modification manuelle** : Le statut peut être modifié manuellement via `PATCH /:id/sensors/:sensorId` avec `{ "status": "active" | "inactive" }`

### Actionneurs (`/api/v1/plantations/:id/actuators`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/:id/actuators` | Ajouter un actionneur | Privé (FARMER propriétaire) |
| GET | `/:id/actuators` | Lister les actionneurs | Privé (FARMER propriétaire) |
| PATCH | `/:id/actuators/:actuatorId` | Mettre à jour un actionneur | Privé (FARMER propriétaire) |

### Événements (`/api/v1/events`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/my` | Lister tous les événements de l'utilisateur | Privé (FARMER) |
| GET | `/plantation/:id` | Lister les événements d'une plantation | Privé (FARMER propriétaire) |
| GET | `/:eventId` | Obtenir les détails d'un événement | Privé (FARMER propriétaire) |

### Notifications (`/api/v1/notifications`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/my` | Lister les notifications (option: `?unreadOnly=true`) | Privé |
| GET | `/web` | Lister uniquement les notifications web (option: `?unreadOnly=true`) | Privé |
| GET | `/stats` | Statistiques des notifications (total, envoyees, enAttente, erreurs, nonLues, lues, parCanal) | Privé |
| GET | `/:notificationId` | Obtenir une notification spécifique | Privé |
| PATCH | `/:notificationId/read` | Marquer une notification comme lue | Privé |
| DELETE | `/:id` | Supprimer une notification | Privé |

**Format de réponse pour GET /api/v1/notifications/stats :**
```json
{
  "total": 150,
  "envoyees": 140,
  "enAttente": 5,
  "erreurs": 5,
  "nonLues": 25,
  "lues": 125,
  "parCanal": {
    "web": 100,
    "email": 30
  }
}
```

**Notes importantes :**
- Les notifications incluent les relations `event.sensor.plantation` et `event.actuator.plantation` pour l'enrichissement des données
- Les notifications email sont créées automatiquement si l'utilisateur a une adresse email
- Les notifications sont limitées à 50 par défaut, triées par date décroissante

### Dashboard Technique (`/api/v1/technician`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/stats` | Statistiques globales (agriculteurs, champs, capteurs actifs/inactifs, actionneurs) | Privé (TECHNICIAN, ADMIN) |
| GET | `/farmers` | Lister les agriculteurs avec recherche optionnelle. Formats supportés : `?search=terme` (simple) ou `?search[]=mot1&search[]=mot2` (multi-mots). Recherche dans firstName, lastName et location. | Privé (TECHNICIAN, ADMIN) |
| GET | `/farmers/:farmerId/plantations` | Lister les plantations d'un agriculteur spécifique | Privé (TECHNICIAN, ADMIN) |

**Note** : Les statuts des capteurs sont automatiquement mis à jour avant le calcul des statistiques et lors de la récupération des plantations.

#### Recherche d'agriculteurs pour `/technician/farmers`

L'endpoint `/api/v1/technician/farmers` supporte deux formats de recherche :

**Format 1 (principal) : Chaîne simple avec espaces préservés**
```
GET /api/v1/technician/farmers?search=Jean
GET /api/v1/technician/farmers?search=Jean Dupont
GET /api/v1/technician/farmers?search=Yaoundé
```
- Paramètre : `search` (chaîne)
- Comportement : Recherche le **terme complet** (avec espaces préservés) dans les champs pertinents
- Les espaces font partie du terme de recherche
- Recherche caractère par caractère (le frontend envoie chaque caractère tapé avec debounce)
- Exemple : `search=Jean Dupont` recherche "Jean Dupont" comme terme complet (pas "Jean" ou "Dupont" séparément)

**Format 2 (rétrocompatible) : Tableau de mots (recherche OR)**
```
GET /api/v1/technician/farmers?search[]=Jean&search[]=Dupont
```
- Paramètre : `search[]` (tableau)
- Comportement : Recherche **OR** sur chaque mot du tableau
- Exemple : `search[]=Jean&search[]=Dupont` trouve les agriculteurs contenant "Jean" **OU** "Dupont"

**Champs de recherche :**
- `firstName` (prénom de l'agriculteur)
- `lastName` (nom de l'agriculteur)
- `location` (localisation des plantations de l'agriculteur)

**Logique de recherche :**
- **Format 1** : Recherche du terme complet dans au moins un champ
- **Format 2** : Un agriculteur correspond si **au moins un mot** correspond dans **au moins un champ**
- La recherche est **case-insensitive** (insensible à la casse)

**Format de réponse :**
```json
[
{
    "id": "uuid",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+237612345678",
    "location": "Douala",
    "plantationsCount": 3
  }
]
```

### Administration (`/api/v1/admin`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/users` | Lister tous les utilisateurs (agriculteurs et techniciens) | Privé (ADMIN uniquement) |
| GET | `/users/:id` | Récupérer les détails d'un utilisateur avec ses plantations | Privé (ADMIN uniquement) |
| POST | `/users/technicians` | Créer un compte technicien | Privé (ADMIN uniquement) |
| PATCH | `/users/:id/status` | Activer ou désactiver un compte utilisateur | Privé (ADMIN uniquement) |
| DELETE | `/users/:id` | Supprimer un utilisateur (et ses plantations en cascade) | Privé (ADMIN uniquement) |

**Format de réponse pour GET /api/v1/admin/users :**
```json
{
  "success": true,
  "data": [
    {
    "id": "uuid",
      "phone": "+237612345678",
      "email": "user@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "farmer",
      "twoFactorEnabled": false,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "plantationsCount": 3
    }
  ]
}
```

**Format de réponse pour GET /api/v1/admin/users/:id :**
```json
{
  "success": true,
  "data": {
  "id": "uuid",
    "phone": "+237612345678",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
      "role": "farmer",
      "twoFactorEnabled": false,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "plantations": [
  {
    "id": "uuid",
        "name": "Champ de manioc",
        "location": "Douala",
        "cropType": "manioc"
  }
]
  }
}
```

**Format de requête pour POST /api/v1/admin/users/technicians :**
```json
{
  "phone": "+237612345678",
  "password": "MotDePasse123!",
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "technicien@example.com"
}
```

**Format de requête pour PATCH /api/v1/admin/users/:id/status :**
```json
{
  "isActive": false
}
```

**Format de réponse pour PATCH /api/v1/admin/users/:id/status :**
```json
{
  "success": true,
  "message": "Statut du compte mis à jour avec succès",
  "data": {
  "id": "uuid",
    "isActive": false
  }
}
```

**Notes importantes :**
- Seuls les utilisateurs avec le rôle ADMIN peuvent accéder à ces endpoints
- La suppression d'un utilisateur supprime automatiquement toutes ses plantations (cascade)
- Il est impossible de supprimer un compte ADMIN
- Il est impossible de modifier le statut d'un compte ADMIN (activation/désactivation)
- Les comptes ADMIN ne sont pas listés dans `/users` (seulement FARMER et TECHNICIAN)
- **Désactivation de compte** :
  - Un compte désactivé (`isActive: false`) ne peut plus se connecter au système (erreur 401 avec message explicite)
  - Les tokens existants d'un compte désactivé sont invalidés au prochain appel API (vérification dans le middleware `protectRoute`)
  - La vérification du statut se fait à chaque connexion et à chaque requête authentifiée
  - Un compte peut être réactivé par un ADMIN via `PATCH /admin/users/:id/status` avec `{ "isActive": true }`
- Le champ `isActive` est inclus dans les réponses de `/users` et `/users/:id`

## Fonctionnalités principales

### Authentification
- Inscription et connexion avec JWT (connexion par email)
- Authentification Google OAuth 2.0 avec distinction connexion/inscription
  - `/auth/google/login` : Connexion pour utilisateurs existants
  - `/auth/google/register` : Inscription pour nouveaux utilisateurs
- Authentification à deux facteurs (2FA) avec TOTP
- Refresh tokens dans des cookies HttpOnly
- Gestion des rôles (FARMER, TECHNICIAN, ADMIN)
- Upload d'avatar utilisateur
- Système d'activation/désactivation des comptes (`isActive`)
  - Désactivation possible uniquement par un ADMIN (via `PATCH /admin/users/:id/status`)
  - Un compte ADMIN ne peut pas être désactivé (protection)
  - Un compte désactivé ne peut plus se connecter (erreur 401 avec message explicite)
  - Les tokens existants d'un compte désactivé sont invalidés au prochain appel API
  - Vérification du statut à chaque connexion et requête authentifiée
- Réinitialisation de mot de passe par email avec token JWT temporaire (expiration 1h)
- Email de bienvenue automatique lors de l'inscription (si email fourni et SMTP configuré)

### Gestion des plantations
- CRUD complet des plantations
- Mode automatique/manuel pour chaque plantation
- Superficie en m² (conversion automatique depuis différentes unités côté frontend)

### Capteurs et monitoring
- 5 types de capteurs : température, humidité du sol, CO2, niveau d'eau, luminosité
- Configuration des seuils min/max par capteur (statiques)
- **Seuils saisonniers** : configuration de seuils différents selon les saisons (saison sèche, saison des pluies, harmattan, transition)
- Vérification automatique des seuils lors des lectures
- Génération d'événements lorsque les seuils sont dépassés
- Historique des lectures (100 dernières)
- **Gestion automatique des statuts** : 
  - Les capteurs passent automatiquement à `INACTIVE` s'ils n'envoient pas de valeur depuis **1 heure**
  - Les capteurs redeviennent `ACTIVE` automatiquement dès qu'une nouvelle lecture est ajoutée
  - La vérification des statuts se fait lors des appels API (`GET /plantations/:id`, `GET /plantations/:id/sensors`, etc.)
  - Modification manuelle possible via `PATCH /plantations/:id/sensors/:sensorId`
- **Notifications de changement de statut** : Le propriétaire de la plantation reçoit automatiquement des notifications (WEB, EMAIL) lorsque ses capteurs changent de statut (ACTIVE ↔ INACTIVE)

### Actionneurs
- Types : pompe, ventilateur, éclairage
- Gestion du statut (actif/inactif)
- Génération d'événements lors des changements de statut

### Événements
- Types : seuil dépassé, changement de seuils, actionneur activé/désactivé (manuellement), changement de mode, capteur actif/inactif
- Descriptions détaillées incluant le nom de la plantation
- Association automatique aux notifications

### Notifications
- Multi-canaux : WEB, EMAIL
- Gestion de l'état de lecture (lu/non lu)
- Statistiques complètes des notifications (total, envoyees, enAttente, erreurs, nonLues, lues, parCanal)
- Envoi automatique lors d'événements
- **Contenu enrichi** : Les messages de notification incluent désormais automatiquement le **nom de la plantation** concernée (ex: "Le capteur... du champ 'Ma Plantation'...") pour un meilleur contexte.
- **Notifications Email** : Envoi automatique d'emails via SMTP (Gmail, etc.) avec templates HTML
- **Notifications Web** : Affichage dans l'interface web avec endpoint dédié `/web`
- Enrichissement automatique avec informations de plantation, capteurs et actionneurs
- Isolation des canaux : si un canal échoue, les autres continuent de fonctionner

## Configuration des seuils de capteurs

Les capteurs peuvent avoir des seuils min/max configurés pour déclencher des alertes automatiques.

### Seuils statiques

Les seuils peuvent être configurés de manière statique via l'endpoint :

```
PATCH /api/v1/plantations/:id/sensors/:sensorId/thresholds
```

**Body :**
```json
{
  "seuilMin": 20.0,
  "seuilMax": 35.0
}
```

**Validation :**
- `seuilMin` et `seuilMax` sont requis
- Valeurs numériques positives
- `seuilMax` doit être strictement supérieur à `seuilMin`

### Seuils saisonniers

Les capteurs peuvent également avoir des seuils saisonniers configurés dans le champ `metadata`. Ces seuils varient selon les saisons :

- **Saison sèche (dry_season)** : Nov-Déc-Jan-Fév
- **Transition** : Mar-Avr
- **Saison des pluies (rainy_season)** : Mai-Juin-Juil-Août
- **Harmattan** : Sep-Oct

Les seuils saisonniers sont stockés dans `metadata.seasonalThresholds` avec la structure :
```json
{
  "seasonalThresholds": {
    "dry_season": { "min": 28, "max": 35 },
    "rainy_season": { "min": 22, "max": 28 },
    "harmattan": { "min": 15, "max": 25 },
    "transition": { "min": 20, "max": 30 }
  },
  "currentSeason": "dry_season"
  }
```

Les seuils par défaut (`seuilMin`/`seuilMax`) sont mis à jour automatiquement selon la saison actuelle lors de la migration.

**Comportement :**
- Lorsqu'une lecture dépasse les seuils, un événement de type `seuil_depasse` est créé automatiquement
- Des notifications sont envoyées au propriétaire de la plantation via les canaux configurés

## Jeu de données de test

### Utilisateur de test

**Identifiants :**
- Email : `test.user@example.com`
- Téléphone : `690123456`
- Mot de passe : `Password!123`

Créé automatiquement par la migration `1700000005000-SeedUserWithDevices.ts`

### Script de génération de données

Le script `seed:mais` génère des données de capteurs variées pour la plantation "Maïs" de l'utilisateur Test User :

```bash
npm run seed:mais
```

**Caractéristiques :**
- ~2000 lectures réparties sur 75 jours
- Variations saisonnières (saison sèche, saison des pluies, harmattan, transition)
- 60% valeurs normales, 20% edge cases, 20% alertes
- Variations temporelles (jour/nuit)
- Transitions progressives entre lectures

## Migrations disponibles

| Migration | Description |
|-----------|-------------|
| `1700000005000` | Création utilisateur de test avec plantation, capteurs et actionneurs |
| `1700000006000` | Ajout nouvelle plantation avec capteurs et actionneurs |
| `1700000007000` | Ajout capteur supplémentaire |
| `1700000008000` | Ajout lectures de capteurs (24h) |
| `1700000009000` | Création tables events et notifications |
| `1700000010000` | Ajout colonnes isRead et dateLu aux notifications |
| `1700000011000` | Notifications de test pour Pauline |
| `1700000012000` | Notifications WEB supplémentaires |
| `1700000013000` | Plus de notifications WEB |
| `1700000014000` | Ajout mode aux plantations et événement mode_changed |
| `1700000015000` | Lectures pour "Champ de manioc Nord" |
| `1700000016000` | Ajout authentification 2FA |
| `1700000017000` | Ajout capteurs manquants et seuils saisonniers pour "Champ de test" |
| `1700000018000` | Ajout lectures de capteurs pour "Nouveau Champ de Test" |
| `1700000019000` | Activation des capteurs inactifs via lectures récentes |
| `1700000020000` | Ajout champ isActive aux utilisateurs (activation/désactivation) |

## Base de données

### Tables principales

- **users** : Utilisateurs (phone, email, password hashé, role, 2FA, isActive)
- **plantations** : Plantations (name, location, area en m², cropType, mode)
- **sensors** : Capteurs (type, status, seuilMin, seuilMax, metadata JSONB pour seuils saisonniers)
- **sensor_readings** : Lectures de capteurs (value, timestamp)
- **actuators** : Actionneurs (name, type, status, metadata)
- **events** : Événements système (type, description, sensorId, actuatorId)
- **notifications** : Notifications utilisateurs (canal, statut, isRead, dateLu)

### Note importante : Unités de superficie

Le champ `area` est **toujours stocké en m²** dans la base de données. Le frontend gère la conversion depuis différentes unités (m², ha, acre, km²) avant l'envoi à l'API.

## Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- Tokens JWT avec expiration (15 min access, 7 jours refresh)
- Refresh tokens dans des cookies HttpOnly
- Validation stricte des données d'entrée
- Protection CORS configurée
- Headers de sécurité avec Helmet
- Sanitization des inputs (protection XSS)
- Validation des UUIDs dans les routes
- Limite de taille des requêtes (10MB)
- Authentification 2FA optionnelle

Consultez [SECURITE.md](./SECURITE.md) pour plus de détails.

## Niveau d'avancement

### ✅ Implémenté

- [x] Authentification JWT complète avec refresh tokens
- [x] Authentification Google OAuth 2.0 (connexion et inscription séparées)
- [x] Authentification à deux facteurs (2FA) avec TOTP
- [x] Gestion des rôles (FARMER, TECHNICIAN, ADMIN)
- [x] CRUD plantations avec mode automatique/manuel
- [x] Gestion des capteurs (5 types) avec configuration de seuils statiques et saisonniers
- [x] Gestion automatique des statuts des capteurs (ACTIVE/INACTIVE basés sur l'activité)
- [x] Gestion des actionneurs (pompe, ventilateur, éclairage)
- [x] Système d'événements (seuils, actionneurs, mode)
- [x] Notifications multi-canaux (WEB, EMAIL)
- [x] Notifications email avec templates HTML et configuration SMTP
- [x] Upload d'avatar utilisateur
- [x] Script de génération de données de test (`seed:mais`)
- [x] Dashboard technique pour les techniciens (statistiques, liste des agriculteurs, champs par agriculteur)
- [x] Fonctionnalités administrateur (gestion des utilisateurs, création de techniciens, activation/désactivation de comptes)
- [x] Système d'activation/désactivation des comptes utilisateurs (`isActive`)

### 🔄 En cours / À faire

- [ ] Tests unitaires et d'intégration
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Rate limiting avancé
- [ ] Logging structuré

## Installation et Exécution avec Docker

Le projet inclut une configuration Docker complète pour faciliter le déploiement et garantir un environnement d'exécution cohérent.

### Prérequis
- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)

### 1. Construire l'image Docker

Exécutez cette commande à la racine du projet pour créer l'image :

```bash
docker build -t camerfarmai-backend .
```

### 2. Démarrer le conteneur

Une fois l'image construite, lancez le conteneur en utilisant votre fichier `.env` pour la configuration :

```bash
docker run -p 3000:3000 --env-file .env --name backend camerfarmai-backend
```

### ⚠️ Connexion à la Base de Données depuis Docker

Si votre base de données PostgreSQL tourne sur votre machine hôte (en dehors de Docker), le conteneur ne peut pas y accéder via `localhost` (qui réfère au conteneur lui-même).

*   **Windows / Mac** : Remplacez `localhost` par `host.docker.internal` dans votre variable `DATABASE_URL`.
    *   Exemple : `DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/camerfarm`
*   **Linux** : Utilisez l'adresse IP de l'interface Docker (souvent `172.17.0.1`) ou ajoutez l'argument `--network="host"` à la commande `docker run`.

### Architecture du Dockerfile

Le `Dockerfile` utilise une approche **multi-stage** pour optimiser la sécurité et la taille de l'image :
1.  **Builder Stage** : Image complète node pour installer les dépendances et compiler le TypeScript.
2.  **Production Stage** : Image `alpine` légère contenant uniquement le code compilé (`dist/`) et les dépendances de production.
    *   Exécution en tant qu'utilisateur non-root (`nodejs`)
    *   Gestion correcte des signaux système via `dumb-init`
    *   Healthcheck intégré pour vérifier l'état de l'API

## Déploiement Production (Frontend Vercel + Backend VPS)

Configuration finale pour la production, connectant le Frontend Vercel au Backend hébergé sur le VPS.

### 1. Architecture

*   **Frontend (Vercel)** : `https://camerfarmaif.vercel.app`
*   **Backend (VPS - Docker)** : `https://backend.camerfarm.strife-cyber.org`
*   **DB (VPS - Docker)** : PostgreSQL interne au réseau Docker du VPS

### 2. Procédure de mise à jour

#### Étape 1 : Mettre à jour le Frontend (Vercel)

Dans Vercel > Settings > Environment Variables :
1.  **VITE_API_URL** : `https://backend.camerfarm.strife-cyber.org/api/v1`
    *(Note : Le suffixe `/api/v1` est recommandé)*
2.  Sauvegarder et **Redéployer** (Deployments > Redeploy).

#### Étape 2 : Mettre à jour le Backend (VPS)

Pour appliquer les dernières modifications (comme les correctifs CORS) sur le VPS :

1.  Se connecter en SSH :
    ```bash
    ssh user@ip_vps
    ```
2.  Aller dans le dossier du projet :
    ```bash
    cd /opt/apps/CamerFarmAI_Backend/CamerFarmAI
    ```
3.  Récupérer le code :
    ```bash
    git pull origin main
    ```
4.  Reconstruire et relancer les conteneurs :
    ```bash
    docker compose up -d --build
    ```
    *(Le flag `--build` est crucial pour recompiler le code TypeScript)*

### 3. Résolution des problèmes courants

*   **Erreur CORS** : Si vous voyez `No 'Access-Control-Allow-Origin'`, c'est que le VPS utilise une ancienne version du code. Faites `git pull` et `docker compose up -d --build`.
*   **Erreur GitHub (Dubious Ownership)** : Si `git pull` échoue avec cette erreur, lancez :
    ```bash
    git config --global --add safe.directory /opt/apps/CamerFarmAI_Backend/CamerFarmAI
    ```

## Déploiement Hybride (Dev Local + Frontend Vercel)

Cette configuration permet de faire communiquer le **Frontend hébergé sur Vercel** (Production/Preview) avec votre **Backend local** et votre **Base de données locale**.

C'est idéal pour débugger le frontend en conditions réelles sans déployer le backend.

### 1. Architecture

*   **Frontend (Vercel)** : `https://camerfarmaif.vercel.app` (HTTPS)
*   **Tunnel (Ngrok)** : `https://xxxx.ngrok-free.app` (HTTPS) -> `http://localhost:3000`
*   **Backend (Local)** : `http://localhost:3000`
*   **DB (Local)** : `localhost:5432`

### 2. Prérequis : Ngrok

L'outil **ngrok** est nécessaire pour exposer votre port local 3000 sur internet en HTTPS (requis car Vercel est en HTTPS).

1.  **Installation** : Téléchargez sur [ngrok.com](https://ngrok.com) ou via `choco install ngrok`.
2.  **Compte** : Créez un compte gratuit sur ngrok.com pour obtenir votre `authtoken`.
3.  **Configuration** :
    ```bash
    ngrok config add-authtoken VOTRE_TOKEN
    ```

### 3. Lancer le tunnel

Chaque fois que vous voulez travailler dans ce mode :

1.  Lancez votre backend local : `npm run dev`
2.  Dans un autre terminal, lancez le tunnel :
    ```bash
    ngrok http 3000
    ```
3.  Copiez l'URL HTTPS fournie (ex: `https://umbral-cecila-materially.ngrok-free.dev`).

### 4. Configuration Frontend Vercel

Sur votre dashboard Vercel (Settings > Environment Variables) :

1.  Modifiez la variable `VITE_API_URL` (ou `NEXT_PUBLIC_API_URL`).
2.  Valeur : Votre URL Ngrok **sans slash final** (ex: `https://umbral-cecila-materially.ngrok-free.dev`).
3.  **Redéployez** l'application (Deployments > Redeploy) pour appliquer le changement.

### 5. Fallback Routes (Robustesse)

Pour simplifier la configuration, le backend a été configuré pour être flexible sur les URLs. Il accepte les requêtes sur :
*   `/api/v1/...` (Standard)
*   `/` (Racine, ex: `/auth/register` au lieu de `/api/v1/auth/register`)

Cela permet au frontend de fonctionner même si la variable d'environnement oublie le suffixe `/api/v1`.

## Documentation complémentaire

- [CONFIGURATION_EMAIL.md](./CONFIGURATION_EMAIL.md) - Guide de configuration SMTP Gmail
- [CONFIGURATION_GOOGLE_OAUTH.md](./CONFIGURATION_GOOGLE_OAUTH.md) - Guide de configuration Google OAuth 2.0
- [DOCUMENTATION_NOTIFICATIONS_EMAIL.md](./DOCUMENTATION_NOTIFICATIONS_EMAIL.md) - Documentation technique complète du système de notifications par email
- [SECURITE.md](./SECURITE.md) - Mesures de sécurité détaillées
- [README_FRONTEND_ADMIN.md](./README_FRONTEND_ADMIN.md) - Documentation complète pour le frontend sur les fonctionnalités administrateur

## Contribution

Ce projet fait partie du livrable de la Phase 3, Partie 3 du projet ETSIA.
