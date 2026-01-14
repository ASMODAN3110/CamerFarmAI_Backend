// src/routes/event.routes.ts
import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { protectRoute } from '../middleware/auth.middleware';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Gestion des événements
 */

/**
 * @swagger
 * /events/my:
 *   get:
 *     summary: Récupérer mes événements
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des événements de l'utilisateur
 */
router.get('/my', eventController.getMyEvents);

/**
 * @swagger
 * /events/plantation/{id}:
 *   get:
 *     summary: Récupérer les événements d'une plantation
 *     tags: [Events]
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
 *         description: Liste des événements de la plantation
 */
router.get('/plantation/:id', validateUUID('id'), eventController.getPlantationEvents);

/**
 * @swagger
 * /events/{eventId}:
 *   get:
 *     summary: Obtenir les détails de l'événement
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de l'événement
 *       404:
 *         description: Événement non trouvé
 */
router.get('/:eventId', validateUUID('eventId'), eventController.getEvent);

export default router;

