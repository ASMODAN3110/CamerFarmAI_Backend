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

// Statistiques globales
router.get('/stats', technicianController.getStats);

// Liste des agriculteurs avec recherche optionnelle
router.get('/farmers', technicianController.getFarmers);

// Plantations d'un agriculteur spécifique
router.get('/farmers/:farmerId/plantations', validateUUID('farmerId'), technicianController.getFarmerPlantations);

export default router;

