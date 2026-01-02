// src/routes/notification.routes.ts
import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { protectRoute } from '../middleware/auth.middleware';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// Routes pour les notifications
router.get('/my', notificationController.getMyNotifications);
router.get('/web', notificationController.getWebNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.get('/:notificationId', validateUUID('notificationId'), notificationController.getNotification);
router.patch('/:notificationId/read', validateUUID('notificationId'), notificationController.markAsRead);
router.delete('/:id', validateUUID('id'), notificationController.deleteNotification);

export default router;

