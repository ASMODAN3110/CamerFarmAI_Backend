# Guide de Configuration Google OAuth 2.0

Ce guide vous explique comment configurer l'authentification Google OAuth 2.0 pour CamerFarmAI.

## 📋 Prérequis

- Un compte Google
- Accès à [Google Cloud Console](https://console.cloud.google.com/)

## 🔧 Étapes de Configuration

### Étape 1 : Créer un projet dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur le sélecteur de projet en haut de la page
3. Cliquez sur **Nouveau projet**
4. Entrez un nom pour votre projet (ex: "CamerFarmAI")
5. Cliquez sur **Créer**

### Étape 2 : Activer l'API Google Identity

1. Dans le menu de gauche, allez dans **APIs & Services** > **Library**
2. Recherchez "Google+ API" ou "Identity Toolkit API"
3. Cliquez sur l'API et cliquez sur **Enable** (Activer)

**Note** : Google+ API est dépréciée mais fonctionne toujours. Vous pouvez aussi utiliser "Identity Toolkit API" si disponible.

### Étape 3 : Créer des identifiants OAuth 2.0

1. Dans le menu de gauche, allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** en haut de la page
3. Sélectionnez **OAuth client ID**

#### 3.1. Configurer l'écran de consentement OAuth (si demandé)

Si c'est la première fois que vous créez des identifiants OAuth :

1. Sélectionnez **External** (pour les tests) ou **Internal** (si vous avez Google Workspace)
2. Cliquez sur **CREATE**
3. Remplissez le formulaire :
   - **App name** : CamerFarmAI
   - **User support email** : Votre email
   - **Developer contact information** : Votre email
4. Cliquez sur **SAVE AND CONTINUE**
5. Pour les scopes, cliquez sur **SAVE AND CONTINUE** (les scopes par défaut suffisent)
6. Pour les utilisateurs de test, ajoutez votre email Google si nécessaire
7. Cliquez sur **SAVE AND CONTINUE** puis **BACK TO DASHBOARD**

#### 3.2. Créer l'OAuth Client ID

1. Dans **Application type**, sélectionnez **Web application**
2. Donnez un nom à votre client (ex: "CamerFarmAI Web Client")
3. Dans **Authorized JavaScript origins**, ajoutez :
   - `http://localhost:5173` (pour le développement)
   - `https://votre-domaine.com` (pour la production)
4. Dans **Authorized redirect URIs**, ajoutez :
   - `http://localhost:5173` (pour le développement)
   - `https://votre-domaine.com` (pour la production)
   
   **Note** : Pour l'authentification avec token ID (méthode utilisée), les redirect URIs ne sont pas strictement nécessaires, mais il est recommandé de les configurer.

5. Cliquez sur **CREATE**

### Étape 4 : Récupérer les identifiants

Après avoir créé le client OAuth, vous verrez une popup avec :
- **Client ID** : `xxxxx.apps.googleusercontent.com`
- **Client Secret** : `xxxxx`

**Important** : Copiez ces valeurs, vous ne pourrez plus voir le Client Secret après avoir fermé la popup.

### Étape 5 : Configurer le fichier .env

1. Ouvrez le fichier `.env` à la racine du projet
2. Ajoutez les variables suivantes :

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=votre_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre_client_secret
```

**Exemple** :
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
```

### Étape 6 : Exécuter la migration

Exécutez la migration pour ajouter le support Google dans la base de données :

```bash
npm run migration:run
```

## 🧪 Tester la Configuration

### Option 1 : Test via l'API

Vous pouvez tester l'endpoint directement avec un token ID Google :

```bash
curl -X POST http://localhost:3000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "votre_token_id_google"
  }'
```

### Option 2 : Test via le Frontend

Le frontend doit :
1. Intégrer le SDK Google Sign-In
2. Récupérer le token ID après authentification
3. Envoyer le token au backend via `POST /api/v1/auth/google`

## 🔍 Dépannage

### Erreur : "GOOGLE_CLIENT_ID n'est pas défini"

- Vérifiez que les variables d'environnement sont bien définies dans `.env`
- Redémarrez le serveur après avoir modifié `.env`

### Erreur : "Token Google invalide ou expiré"

- Vérifiez que le `GOOGLE_CLIENT_ID` dans `.env` correspond au Client ID utilisé par le frontend
- Les tokens ID expirent après 1 heure, demandez un nouveau token

### Erreur : "L'email Google n'est pas vérifié"

- L'utilisateur doit avoir un email Google vérifié
- Vérifiez que l'API Google+ ou Identity Toolkit est bien activée

### Erreur : "Un compte existe déjà avec cet email"

- Si un utilisateur existe déjà avec le même email via l'authentification locale, il ne peut pas se connecter avec Google
- L'utilisateur doit soit se connecter avec son mot de passe, soit utiliser un autre compte Google

## 🔒 Sécurité

- ⚠️ **Ne commitez JAMAIS** le fichier `.env` dans Git (il est déjà dans `.gitignore`)
- ⚠️ **Ne partagez JAMAIS** votre Client Secret publiquement
- ⚠️ En production, utilisez des variables d'environnement sécurisées (ex: AWS Secrets Manager, Azure Key Vault)
- ⚠️ Limitez les **Authorized JavaScript origins** et **Authorized redirect URIs** à vos domaines uniquement

## 📚 Ressources

- [Documentation Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Platform](https://developers.google.com/identity)
- [google-auth-library (npm)](https://www.npmjs.com/package/google-auth-library)

## 📝 Notes Importantes

1. **Mode de test** : Par défaut, Google OAuth est en mode test. Seuls les utilisateurs de test peuvent se connecter. Pour passer en production, vous devez soumettre votre application pour vérification dans Google Cloud Console.

2. **Quotas** : Google OAuth a des quotas par défaut. Pour augmenter les quotas, vous devrez peut-être activer la facturation dans Google Cloud Console.

3. **Scopes** : Par défaut, l'authentification Google demande les scopes de base (email, profile). Si vous avez besoin d'autres scopes, vous devrez les configurer dans le frontend.

## ✅ Checklist de Configuration

- [ ] Projet créé dans Google Cloud Console
- [ ] API Google+ ou Identity Toolkit activée
- [ ] Identifiants OAuth 2.0 créés (Application Web)
- [ ] Authorized JavaScript origins configurés
- [ ] Variables d'environnement ajoutées dans `.env`
- [ ] Migration exécutée (`npm run migration:run`)
- [ ] Serveur redémarré
- [ ] Test d'authentification réussi
