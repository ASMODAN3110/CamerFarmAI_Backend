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
 *   description: Technician operations
 */

/**
 * @swagger
 * /technician/stats:
 *   get:
 *     summary: Get technician stats
 *     tags: [Technician]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 */
router.get('/stats', technicianController.getStats);

/**
 * @swagger
 * /technician/farmers:
 *   get:
 *     summary: Get list of farmers
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
 *         description: List of farmers
 */
router.get('/farmers', technicianController.getFarmers);

/**
 * @swagger
 * /technician/farmers/{farmerId}/plantations:
 *   get:
 *     summary: Get farmer's plantations
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
 *         description: List of plantations
 */
router.get('/farmers/:farmerId/plantations', validateUUID('farmerId'), technicianController.getFarmerPlantations);

export default router;

