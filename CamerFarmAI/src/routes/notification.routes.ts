// src/routes/notification.routes.ts
import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { protectRoute } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// Routes pour les notifications
router.get('/my', notificationController.getMyNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.get('/:notificationId', notificationController.getNotification);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;

