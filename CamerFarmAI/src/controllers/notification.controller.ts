// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification, NotificationStatut } from '../models/Notification.entity';

const notificationRepository = AppDataSource.getRepository(Notification);

// Lister les notifications de l'utilisateur connecté
export const getMyNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { unreadOnly } = req.query; // Optionnel : ?unreadOnly=true

  const where: any = { userId };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const notifications = await notificationRepository.find({
    where,
    relations: ['event', 'event.sensor', 'event.actuator'],
    order: { dateEnvoi: 'DESC' },
    take: 50, // Limiter à 50 dernières notifications
  });

  return res.json(notifications);
};

// Obtenir une notification spécifique
export const getNotification = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.id;

  const notification = await notificationRepository.findOne({
    where: { id: notificationId, userId },
    relations: ['event', 'event.sensor', 'event.actuator'],
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification non trouvée' });
  }

  return res.json(notification);
};

// Marquer une notification comme lue
export const markAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.id;

  const notification = await notificationRepository.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification non trouvée' });
  }

  notification.isRead = true;
  notification.dateLu = new Date();
  await notificationRepository.save(notification);

  return res.json(notification);
};

// Obtenir les statistiques des notifications
export const getNotificationStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [total, envoyees, enAttente, erreurs, nonLues] = await Promise.all([
    notificationRepository.count({ where: { userId } }),
    notificationRepository.count({ where: { userId, statut: NotificationStatut.ENVOYEE } }),
    notificationRepository.count({ where: { userId, statut: NotificationStatut.EN_ATTENTE } }),
    notificationRepository.count({ where: { userId, statut: NotificationStatut.ERREUR } }),
    notificationRepository.count({ where: { userId, isRead: false } }),
  ]);

  return res.json({
    total,
    envoyees,
    enAttente,
    erreurs,
    nonLues,
  });
};

// Supprimer une notification
export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Vérifier que la notification existe et appartient à l'utilisateur
  const notification = await notificationRepository.findOne({
    where: { id, userId },
  });

  if (!notification) {
    return res.status(404).json({ 
      success: false,
      message: 'Notification non trouvée ou accès refusé' 
    });
  }

  // Supprimer la notification
  await notificationRepository.remove(notification);

  return res.json({ 
    success: true,
    message: 'Notification supprimée avec succès' 
  });
};

