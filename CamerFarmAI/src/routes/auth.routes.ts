// src/routes/auth.routes.ts
import { Router } from 'express';
import * as authController from '../controllers/auth.controllers';
import { protectRoute } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { avatarUpload } from '../middleware/upload.middleware';
import { sanitizeInput } from '../middleware/sanitize.middleware';

const authRouter = Router();

// Middlewares de validation pour l'inscription
const validateRegister = [
  body('phone')
    .notEmpty()
    .withMessage('Le numéro de téléphone est requis')
    .isMobilePhone('any')
    .withMessage('Le numéro de téléphone doit être valide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/[a-z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre minuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un nombre')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
  body('firstName')
    .optional()
    .isString()
    .withMessage('Le prénom doit être une chaîne de caractères'),
  body('lastName')
    .optional()
    .isString()
    .withMessage('Le nom doit être une chaîne de caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('L\'email doit être valide'),
];

// Middlewares de validation pour la connexion
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('L\'email doit être valide'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
  body('twoFactorCode')
    .optional()
    .isString()
    .withMessage('Le code 2FA doit être une chaîne de caractères')
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code 2FA doit contenir 6 chiffres'),
];

// Middlewares de validation pour la mise à jour du profil
const validateUpdateProfile = [
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Le numéro de téléphone doit être valide'),
  body('firstName')
    .optional()
    .isString()
    .withMessage('Le prénom doit être une chaîne de caractères')
    .trim()
    .notEmpty()
    .withMessage('Le prénom ne peut pas être vide'),
  body('lastName')
    .optional()
    .isString()
    .withMessage('Le nom doit être une chaîne de caractères')
    .trim()
    .notEmpty()
    .withMessage('Le nom ne peut pas être vide'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('L\'email doit être valide'),
];

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion des utilisateurs
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur inscrit avec succès
 *       400:
 *         description: Erreur de validation
 */
authRouter.post('/register', validateRegister, sanitizeInput, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               twoFactorCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants invalides
 */
authRouter.post('/login', validateLogin, sanitizeInput, authController.login);

// Middleware de validation pour la vérification 2FA lors de la connexion
const validateVerify2FA = [
  body('temporaryToken')
    .notEmpty()
    .withMessage('Le token temporaire est requis')
    .isString()
    .withMessage('Le token temporaire doit être une chaîne de caractères'),
  body('twoFactorCode')
    .notEmpty()
    .withMessage('Le code 2FA est requis')
    .isString()
    .withMessage('Le code 2FA doit être une chaîne de caractères')
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code 2FA doit contenir 6 chiffres')
    .matches(/^\d+$/)
    .withMessage('Le code 2FA doit contenir uniquement des chiffres'),
];

/**
 * @swagger
 * /auth/login/verify-2fa:
 *   post:
 *     summary: Vérifier le code 2FA lors de la connexion
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - temporaryToken
 *               - twoFactorCode
 *             properties:
 *               temporaryToken:
 *                 type: string
 *               twoFactorCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA vérifié avec succès
 *       401:
 *         description: Code 2FA invalide
 */
authRouter.post('/login/verify-2fa', validateVerify2FA, authController.verifyTwoFactorLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *       401:
 *         description: Token de rafraîchissement invalide ou manquant
 */
authRouter.post('/refresh', authController.refresh);


/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: Vérification de l'état du serveur
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Le serveur est en bonne santé
 */
authRouter.get('/health', authController.health);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur actuel
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *       401:
 *         description: Non autorisé
 */
authRouter.get('/me', protectRoute, authController.getMe);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnecter l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
authRouter.post('/logout', protectRoute, authController.logout);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Mettre à jour le profil utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 */
authRouter.put('/profile', protectRoute, validateUpdateProfile, sanitizeInput, authController.updateProfile);

/**
 * @swagger
 * /auth/profile/avatar:
 *   post:
 *     summary: Télécharger l'avatar de l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar téléchargé avec succès
 */
authRouter.post(
  '/profile/avatar',
  protectRoute,
  avatarUpload.single('avatar'),
  authController.uploadAvatar
);

/**
 * @swagger
 * /auth/2fa/generate:
 *   get:
 *     summary: Générer le secret 2FA et le QR code
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Secret 2FA généré avec succès
 */
authRouter.get('/2fa/generate', protectRoute, authController.generateTwoFactorSecret);

// Middleware de validation pour les routes 2FA
const validateTwoFactorToken = [
  body('token')
    .notEmpty()
    .withMessage('Le code 2FA est requis')
    .isString()
    .withMessage('Le code 2FA doit être une chaîne de caractères')
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code 2FA doit contenir 6 chiffres')
    .matches(/^\d+$/)
    .withMessage('Le code 2FA doit contenir uniquement des chiffres'),
];

/**
 * @swagger
 * /auth/2fa/enable:
 *   post:
 *     summary: Activer la 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA activée avec succès
 */
authRouter.post('/2fa/enable', protectRoute, validateTwoFactorToken, authController.enableTwoFactor);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     summary: Désactiver la 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA désactivée avec succès
 */
authRouter.post('/2fa/disable', protectRoute, validateTwoFactorToken, authController.disableTwoFactor);

// Middlewares de validation pour la réinitialisation de mot de passe
const validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('L\'email doit être valide'),
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Le token de réinitialisation est requis')
    .isString()
    .withMessage('Le token doit être une chaîne de caractères'),
  body('newPassword')
    .notEmpty()
    .withMessage('Le nouveau mot de passe est requis')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/[a-z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre minuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un nombre')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
];

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Demander un email de réinitialisation de mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé
 */
authRouter.post('/forgot-password', validateForgotPassword, sanitizeInput, authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe avec le token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 */
authRouter.post('/reset-password', validateResetPassword, sanitizeInput, authController.resetPassword);

export default authRouter;
