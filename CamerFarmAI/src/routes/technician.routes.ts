// src/routes/technician.routes.ts
import { Router } from 'express';
import * as technicianController from '../controllers/technician.controller';
import { protectRoute, restrictTo } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.entity';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// Toutes les routes protégées et restreintes aux techniciens et admins
router.use(protectRoute);
router.use(restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN));

/**
 * @swagger
 * tags:
 *   name: Technician
 *   description: Opérations technicien
 */

/**
 * @swagger
 * /technician/stats:
 *   get:
 *     summary: Obtenir les statistiques technicien
 *     tags: [Technician]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques
 */
router.get('/stats', technicianController.getStats);

/**
 * @swagger
 * /technician/farmers:
 *   get:
 *     summary: Obtenir la liste des agriculteurs
 *     tags: [Technician]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des agriculteurs
 */
router.get('/farmers', technicianController.getFarmers);

/**
 * @swagger
 * /technician/farmers/{farmerId}/plantations:
 *   get:
 *     summary: Obtenir les plantations de l'agriculteur
 *     tags: [Technician]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des plantations
 */
router.get('/farmers/:farmerId/plantations', validateUUID('farmerId'), technicianController.getFarmerPlantations);

export default router;

