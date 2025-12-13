// src/routes/event.routes.ts
import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { protectRoute } from '../middleware/auth.middleware';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// Routes pour les événements
router.get('/my', eventController.getMyEvents);
router.get('/plantation/:id', validateUUID('id'), eventController.getPlantationEvents);
router.get('/:eventId', validateUUID('eventId'), eventController.getEvent);

export default router;

