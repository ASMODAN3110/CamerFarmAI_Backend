# Guide de Configuration Email - SMTP Gmail

Ce guide vous explique comment configurer les notifications email avec Gmail (SMTP standard).

## 📋 Prérequis

- Un compte Gmail
- Accès à la configuration de sécurité de votre compte Google

## 🔧 Étapes de Configuration

### Étape 1 : Activer l'authentification à deux facteurs (2FA)

1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. Cliquez sur **Sécurité** dans le menu de gauche
3. Sous **Connexion à Google**, activez la **Validation en deux étapes**

### Étape 2 : Générer un mot de passe d'application

1. Toujours dans la section **Sécurité** de votre compte Google
2. Faites défiler jusqu'à **Connexion à Google**
3. Cliquez sur **Mots de passe des applications** (ou [lien direct](https://myaccount.google.com/apppasswords))
4. Sélectionnez **Application** : "Courrier"
5. Sélectionnez **Appareil** : "Autre (nom personnalisé)"
6. Entrez un nom (ex: "CamerFarmAI Backend")
7. Cliquez sur **Générer**
8. **Copiez le mot de passe généré** (16 caractères sans espaces) - vous ne pourrez plus le voir après !

### Étape 3 : Configurer le fichier .env

1. Copiez le fichier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Ouvrez le fichier `.env` et configurez les variables SMTP :

   ```env
   # Email (pour les notifications)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=votre_email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   SMTP_FROM=noreply@camerfarmai.com
   ```

   **Important :**
   - `SMTP_USER` : Votre adresse email Gmail complète (ex: `monemail@gmail.com`)
   - `SMTP_PASS` : Le mot de passe d'application généré à l'étape 2 (les 16 caractères)
   - `SMTP_FROM` : L'adresse qui apparaîtra comme expéditeur (peut être différente de SMTP_USER)

### Étape 4 : Tester la configuration

1. Redémarrez votre serveur :
   ```bash
   npm run dev
   ```

2. Créez un événement qui déclenche une notification (par exemple, changez le mode d'une plantation)

3. Vérifiez les logs du serveur pour voir si l'email a été envoyé

4. Vérifiez votre boîte de réception (et les spams si nécessaire)

## 🔍 Dépannage

### Erreur : "Invalid login"

- Vérifiez que vous utilisez bien le **mot de passe d'application** et non votre mot de passe Gmail normal
- Assurez-vous que la validation en deux facteurs est activée
- Vérifiez que le mot de passe d'application n'a pas d'espaces

### Erreur : "Connection timeout"

- Vérifiez votre connexion internet
- Vérifiez que le port 587 n'est pas bloqué par votre firewall
- Essayez le port 465 avec `secure: true` (modifiez `SMTP_PORT=465`)

### Les emails ne sont pas reçus

- Vérifiez le dossier spam/courrier indésirable
- Vérifiez les logs du serveur pour voir les erreurs
- Vérifiez que l'utilisateur a bien un email dans la base de données
- Vérifiez la table `notifications` pour voir le statut (envoyee, en_attente, erreur)

## 📧 Autres fournisseurs SMTP

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=votre_email@outlook.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=noreply@camerfarmai.com
```

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=votre_email@yahoo.com
SMTP_PASS=votre_mot_de_passe_application
SMTP_FROM=noreply@camerfarmai.com
```

### Serveur SMTP personnalisé

```env
SMTP_HOST=votre.serveur.smtp.com
SMTP_PORT=587
SMTP_USER=votre_utilisateur
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=noreply@camerfarmai.com
```

## 🔒 Sécurité

- ⚠️ **Ne commitez JAMAIS** le fichier `.env` dans Git (il est déjà dans `.gitignore`)
- ⚠️ Utilisez toujours des **mots de passe d'application** pour Gmail, pas votre mot de passe principal
- ⚠️ En production, utilisez des variables d'environnement sécurisées (ex: AWS Secrets Manager, Azure Key Vault)

## 📚 Ressources

- [Documentation nodemailer](https://nodemailer.com/about/)
- [Mots de passe d'application Google](https://support.google.com/accounts/answer/185833)
- [Configuration SMTP Gmail](https://support.google.com/a/answer/176600)

