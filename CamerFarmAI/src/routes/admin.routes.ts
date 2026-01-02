// src/routes/admin.routes.ts
import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { protectRoute, restrictTo } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.entity';
import { validateUUID } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { sanitizeInput } from '../middleware/sanitize.middleware';

const router = Router();

// Toutes les routes protégées et restreintes aux administrateurs
router.use(protectRoute);
router.use(restrictTo(UserRole.ADMIN));

// Middlewares de validation pour la mise à jour du statut
const validateUpdateStatus = [
  body('isActive')
    .notEmpty()
    .withMessage('Le statut isActive est requis')
    .isBoolean()
    .withMessage('isActive doit être un booléen'),
];

// Middlewares de validation pour la création de technicien
const validateCreateTechnician = [
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

/**
 * @route   GET /api/v1/admin/users
 * @desc    Récupère tous les utilisateurs (agriculteurs et techniciens)
 * @access  Privé (ADMIN uniquement)
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Récupère les détails d'un utilisateur spécifique avec ses plantations
 * @access  Privé (ADMIN uniquement)
 */
router.get('/users/:id', validateUUID('id'), adminController.getUserById);

/**
 * @route   POST /api/v1/admin/users/technicians
 * @desc    Crée un compte technicien
 * @access  Privé (ADMIN uniquement)
 */
router.post(
  '/users/technicians',
  validateCreateTechnician,
  sanitizeInput,
  adminController.createTechnician
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Supprime un utilisateur (et ses plantations en cascade)
 * @access  Privé (ADMIN uniquement)
 */
router.delete('/users/:id', validateUUID('id'), adminController.deleteUser);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Active ou désactive un compte utilisateur
 * @access  Privé (ADMIN uniquement)
 */
router.patch(
  '/users/:id/status',
  validateUUID('id'),
  validateUpdateStatus,
  sanitizeInput,
  adminController.updateUserStatus
);

export default router;

