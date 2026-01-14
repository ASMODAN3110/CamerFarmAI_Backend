// src/routes/notification.routes.ts
import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { protectRoute } from '../middleware/auth.middleware';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications
 */

/**
 * @swagger
 * /notifications/my:
 *   get:
 *     summary: Récupérer mes notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des notifications
 */
router.get('/my', notificationController.getMyNotifications);

/**
 * @swagger
 * /notifications/web:
 *   get:
 *     summary: Récupérer les notifications web
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des notifications web
 */
router.get('/web', notificationController.getWebNotifications);

/**
 * @swagger
 * /notifications/stats:
 *   get:
 *     summary: Obtenir les statistiques des notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des notifications
 */
router.get('/stats', notificationController.getNotificationStats);

/**
 * @swagger
 * /notifications/{notificationId}:
 *   get:
 *     summary: Obtenir les détails de la notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la notification
 *       404:
 *         description: Notification non trouvée
 */
router.get('/:notificationId', validateUUID('notificationId'), notificationController.getNotification);

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Marquer la notification comme lue
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 */
router.patch('/:notificationId/read', validateUUID('notificationId'), notificationController.markAsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Supprimer la notification
 *     tags: [Notifications]
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
 *         description: Notification supprimée
 */
router.delete('/:id', validateUUID('id'), notificationController.deleteNotification);

export default router;

