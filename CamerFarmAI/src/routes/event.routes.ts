// src/routes/event.routes.ts
import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { protectRoute } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// Routes pour les événements
router.get('/my', eventController.getMyEvents);
router.get('/plantation/:id', eventController.getPlantationEvents);
router.get('/:eventId', eventController.getEvent);

export default router;

