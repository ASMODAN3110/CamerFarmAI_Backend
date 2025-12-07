// src/routes/auth.routes.ts
import { Router } from 'express';
import * as authController from '../controllers/auth.controllers';
import { protectRoute } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { avatarUpload } from '../middleware/upload.middleware';

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
 * @route   POST /api/v1/auth/register
 * @desc    Inscription d'un nouvel utilisateur (agriculteur, conseiller, admin)
 * @access  Public
 * @SRS     EF-07 - Sécurité et Gestion des Utilisateurs
 * @Jira    CA-40, CA-41
 */
authRouter.post('/register', validateRegister, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Connexion utilisateur → retourne accessToken + refreshToken (HttpOnly cookie) ou temporaryToken si 2FA activé
 * @access  Public
 * @SRS     EF-07
 * @Jira    CA-40
 */
authRouter.post('/login', validateLogin, authController.login);

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
 * @route   POST /api/v1/auth/login/verify-2fa
 * @desc    Vérifier le code 2FA et compléter la connexion
 * @access  Public
 * @SRS     EF-07
 * @Jira    CA-40
 */
authRouter.post('/login/verify-2fa', validateVerify2FA, authController.verifyTwoFactorLogin);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rafraîchir le token d'accès avec le refresh token
 * @access  Public (mais vérifie le cookie refreshToken)
 * @Jira    CA-40
 */
authRouter.post('/refresh', authController.refresh);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Récupérer les informations de l'utilisateur connecté
 * @access  Privé (protégé par JWT)
 * @Jira    CA-42
 */
authRouter.get('/me', protectRoute, authController.getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Déconnexion → efface le cookie refreshToken
 * @access  Privé
 * @Jira    CA-40
 */
authRouter.post('/logout', protectRoute, authController.logout);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @access  Privé (protégé par JWT)
 * @Jira    CA-42
 */
authRouter.put('/profile', protectRoute, validateUpdateProfile, authController.updateProfile);

/**
 * @route   POST /api/v1/auth/profile/avatar
 * @desc    Upload de l'avatar de l'utilisateur connecté
 * @access  Privé (protégé par JWT)
 * @Body    multipart/form-data (champ \"avatar\" : fichier image)
 */
authRouter.post(
  '/profile/avatar',
  protectRoute,
  avatarUpload.single('avatar'),
  authController.uploadAvatar
);

/**
 * @route   GET /api/v1/auth/2fa/generate
 * @desc    Générer un secret 2FA et un QR code pour l'utilisateur connecté
 * @access  Privé (protégé par JWT)
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
 * @route   POST /api/v1/auth/2fa/enable
 * @desc    Activer le 2FA pour l'utilisateur connecté
 * @access  Privé (protégé par JWT)
 */
authRouter.post('/2fa/enable', protectRoute, validateTwoFactorToken, authController.enableTwoFactor);

/**
 * @route   POST /api/v1/auth/2fa/disable
 * @desc    Désactiver le 2FA pour l'utilisateur connecté
 * @access  Privé (protégé par JWT)
 */
authRouter.post('/2fa/disable', protectRoute, validateTwoFactorToken, authController.disableTwoFactor);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    (Optionnel Sprint 2) Demande de réinitialisation mot de passe par SMS
 * @access  Public
 */
// authRouter.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    (Optionnel Sprint 2) Réinitialisation avec code SMS
 * @access  Public
 */
// authRouter.post('/reset-password', authController.resetPassword);

export default authRouter;