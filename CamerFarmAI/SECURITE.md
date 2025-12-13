# Guide de Sécurité - CamerFarmAI Backend

Ce document décrit les mesures de sécurité implémentées dans l'application backend.

## 🔒 Mesures de Sécurité Implémentées

### 1. Rate Limiting (Protection contre les attaques par force brute)

**Fichier**: `src/middleware/rateLimit.middleware.ts`

- **Rate limiter général** : 100 requêtes par IP toutes les 15 minutes
- **Rate limiter authentification** : 5 tentatives de connexion par IP toutes les 15 minutes
- **Rate limiter refresh token** : 10 refresh par IP toutes les 15 minutes
- **Rate limiter 2FA** : 5 tentatives de vérification 2FA toutes les 15 minutes
- **Rate limiter inscription** : 3 inscriptions par IP par heure

### 2. Validation des Paramètres

**Fichier**: `src/middleware/validation.middleware.ts`

- Validation stricte des UUIDs dans les paramètres de route
- Validation des paramètres multiples (ex: `/:id/sensors/:sensorId`)
- Validation des query parameters numériques
- Messages d'erreur clairs pour les paramètres invalides

### 3. Sanitization des Inputs

**Fichier**: `src/middleware/sanitize.middleware.ts`

- Échappement des caractères spéciaux (protection XSS)
- Trim des espaces en début/fin
- Normalisation des emails
- Sanitization spécifique par type d'entité (plantation, capteur, actionneur)

### 4. Headers de Sécurité

**Fichier**: `src/middleware/security.middleware.ts`

- **Helmet** : Configuration complète des headers de sécurité
- **Content Security Policy** : Protection contre les injections XSS
- **X-Frame-Options** : Protection contre le clickjacking
- **X-Content-Type-Options** : Protection contre le MIME sniffing
- **Cache-Control** : Désactivation du cache pour les routes sensibles

### 5. Limites de Taille des Requêtes

- Limite globale : 10MB par requête
- Validation de la taille avant traitement
- Messages d'erreur clairs (HTTP 413)

### 6. Logging de Sécurité

- Logging automatique des tentatives d'accès non autorisées (401, 403)
- Enregistrement de l'IP, méthode HTTP, chemin, et utilisateur
- Facilite la détection d'attaques

### 7. Validation de l'Origine

- Vérification de l'origine des requêtes (protection CSRF basique)
- Liste blanche des origines autorisées
- Mode développement plus permissif

### 8. Authentification et Autorisation

**Fichier**: `src/middleware/auth.middleware.ts`

- **JWT** : Tokens sécurisés avec expiration
- **Protection des routes** : Middleware `protectRoute` obligatoire
- **Gestion des rôles** : Middleware `restrictTo` pour les permissions
- **Vérification utilisateur** : Vérification en base de données à chaque requête

### 9. Validation des Données

**Fichier**: `src/routes/auth.routes.ts` et autres

- **express-validator** : Validation stricte des données d'entrée
- **Validation des mots de passe** : Complexité requise (8 caractères, majuscule, minuscule, nombre, caractère spécial)
- **Validation des emails** : Format email valide
- **Validation des téléphones** : Format téléphone valide

### 10. Protection des Fichiers Uploadés

**Fichier**: `src/middleware/upload.middleware.ts`

- **Types de fichiers autorisés** : Images uniquement (PNG, JPG, JPEG, GIF, WEBP)
- **Taille maximale** : 5MB par fichier
- **Validation du MIME type** : Vérification du type réel du fichier
- **Noms de fichiers sécurisés** : Prévention des injections de chemin

## 📋 Routes Protégées

### Routes d'Authentification (`/api/v1/auth`)

- ✅ Rate limiting strict (5 tentatives/15min)
- ✅ Sanitization des inputs
- ✅ Validation complète des données
- ✅ Protection contre force brute

### Routes de Plantations (`/api/v1/plantations`)

- ✅ Authentification obligatoire
- ✅ Validation des UUIDs
- ✅ Sanitization des inputs
- ✅ Vérification de propriété (seul le propriétaire peut modifier)

### Routes d'Événements (`/api/v1/events`)

- ✅ Authentification obligatoire
- ✅ Validation des UUIDs
- ✅ Vérification d'accès (seul le propriétaire peut voir ses événements)

### Routes de Notifications (`/api/v1/notifications`)

- ✅ Authentification obligatoire
- ✅ Validation des UUIDs
- ✅ Vérification d'accès (seul l'utilisateur peut voir ses notifications)

## 🛡️ Protection contre les Vulnérabilités

### Injection SQL
- ✅ **TypeORM** : Utilisation de requêtes paramétrées (protection automatique)
- ✅ Validation stricte des paramètres

### Injection XSS
- ✅ **Sanitization** : Échappement des caractères spéciaux
- ✅ **CSP** : Content Security Policy configurée
- ✅ **Helmet** : Headers de sécurité XSS

### CSRF
- ✅ **Validation d'origine** : Vérification de l'origine des requêtes
- ✅ **Cookies HttpOnly** : Protection des tokens dans les cookies

### Force Brute
- ✅ **Rate limiting** : Limitation stricte des tentatives de connexion
- ✅ **Logging** : Enregistrement des tentatives échouées

### DDoS
- ✅ **Rate limiting général** : 100 requêtes/IP/15min
- ✅ **Limite de taille** : 10MB max par requête

## 🔐 Variables d'Environnement Sécurisées

Assurez-vous que les variables suivantes sont définies et sécurisées :

```env
# JWT Secret (doit être long et aléatoire)
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire

# Frontend URL (pour CORS)
FRONTEND_URL=https://votre-frontend.com

# Base de données (ne jamais commiter)
DATABASE_URL=postgresql://...
```

## 📝 Bonnes Pratiques

1. **Ne jamais commiter** le fichier `.env`
2. **Utiliser des secrets forts** pour JWT_SECRET (minimum 32 caractères)
3. **Activer HTTPS** en production
4. **Mettre à jour régulièrement** les dépendances
5. **Monitorer les logs** de sécurité
6. **Configurer un firewall** au niveau serveur
7. **Utiliser des mots de passe d'application** pour SMTP (Gmail)

## 🚨 En Cas d'Attaque

1. Vérifier les logs de sécurité (`logSecurityEvents`)
2. Identifier les IPs suspectes
3. Bloquer les IPs si nécessaire (au niveau serveur/firewall)
4. Augmenter temporairement les limites de rate limiting
5. Notifier les utilisateurs si nécessaire

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet Documentation](https://helmetjs.github.io/)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [express-validator](https://express-validator.github.io/docs/)

