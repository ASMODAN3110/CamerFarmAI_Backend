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
 * @swagger
 * tags:
 *   name: Admin
 *   description: Opérations administratives
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Récupérer tous les utilisateurs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de tous les utilisateurs
 */
router.get('/users', adminController.getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Obtenir les détails de l'utilisateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get('/users/:id', validateUUID('id'), adminController.getUserById);

/**
 * @swagger
 * /admin/users/technicians:
 *   post:
 *     summary: Créer un technicien
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *         description: Technicien créé avec succès
 */
router.post(
  '/users/technicians',
  validateCreateTechnician,
  sanitizeInput,
  adminController.createTechnician
);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Supprimer l'utilisateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 */
router.delete('/users/:id', validateUUID('id'), adminController.deleteUser);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut de l'utilisateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Statut de l'utilisateur mis à jour
 */
router.patch(
  '/users/:id/status',
  validateUUID('id'),
  validateUpdateStatus,
  sanitizeInput,
  adminController.updateUserStatus
);

export default router;

