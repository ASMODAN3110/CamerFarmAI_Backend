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
 *   description: Event management
 */

/**
 * @swagger
 * /events/my:
 *   get:
 *     summary: Get my events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's events
 */
router.get('/my', eventController.getMyEvents);

/**
 * @swagger
 * /events/plantation/{id}:
 *   get:
 *     summary: Get events for a plantation
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
 *         description: List of plantation events
 */
router.get('/plantation/:id', validateUUID('id'), eventController.getPlantationEvents);

/**
 * @swagger
 * /events/{eventId}:
 *   get:
 *     summary: Get event details
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
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:eventId', validateUUID('eventId'), eventController.getEvent);

export default router;

