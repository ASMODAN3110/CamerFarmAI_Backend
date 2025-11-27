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
    │   └── auth.controllers.ts
    ├── middleware/        # Middlewares Express
    │   └── auth.middleware.ts
    ├── migrations/        # Migrations de base de données
    │   └── 1700000000000-CreateUsersTable.ts
    ├── models/            # Entités TypeORM
    │   └── User.entity.ts
    ├── routes/            # Définition des routes API
    │   └── auth.routes.ts
    ├── services/          # Services métier
    │   └── auth.service.ts
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
- `auth.controllers.ts` - Gestion de l'authentification (register, login, refresh, me, logout)

### `/src/middleware`
Contient les middlewares Express personnalisés :
- `auth.middleware.ts` - Protection des routes, authentification JWT, gestion des rôles

### `/src/migrations`
Contient les scripts de migration de base de données :
- `1700000000000-CreateUsersTable.ts` - Création de la table users

### `/src/models`
Contient les entités TypeORM :
- `User.entity.ts` - Modèle utilisateur avec hashage automatique du mot de passe (bcrypt, 12 rounds) et enum `UserRole`

### `/src/routes`
Contient la définition des routes de l'API :
- `auth.routes.ts` - Routes d'authentification avec validation

### `/src/services`
Contient la logique métier réutilisable :
- `auth.service.ts` - Service d'authentification (inscription, validation, génération de tokens)

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
- **express-validator** - Validation des données d'entrée
- **cookie-parser** - Gestion des cookies HTTP (pour les refresh tokens)

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
5. **Lancer le serveur en développement**
   ```bash
   npm run dev
   ```

> Astuce : utilisez `npm ci` sur vos environnements CI/CD pour garantir la reproductibilité basée sur `package-lock.json`.

## Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

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
```

## Scripts disponibles

```bash
npm run dev              # Démarrer le serveur en mode développement
npm run migration:run    # Exécuter les migrations
npm run migration:revert # Annuler la dernière migration
npm run migration:generate # Générer une nouvelle migration
```

## API Endpoints

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
- [x] Gestion des erreurs HTTP personnalisées
- [x] Support des cookies HttpOnly pour les refresh tokens
- [x] Migration de base de données
- [x] Système de rôles avec enum (FARMER, TECHNICIAN, ADMIN)
- [x] Middleware de restriction par rôle (restrictTo)

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
