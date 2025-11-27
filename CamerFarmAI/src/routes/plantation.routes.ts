// src/routes/plantation.routes.ts
import { Router } from 'express';
import * as plantationController from '../controllers/plantation.controller';
import { protectRoute, restrictTo } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.entity';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// CRUD Plantation (agriculteur peut gérer ses champs)
router.post('/', plantationController.create);
router.get('/my', plantationController.getMyPlantations);
router.get('/:id', plantationController.getOne);
router.patch('/:id', plantationController.update);
router.delete('/:id', plantationController.remove);

// Conseiller/admin peut tout voir
router.get('/', restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN), plantationController.getAll);

export default router;