// src/controllers/event.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event.entity';
import { Plantation } from '../models/Plantation.entity';

const eventRepository = AppDataSource.getRepository(Event);
const plantationRepository = AppDataSource.getRepository(Plantation);

// Lister les événements d'une plantation
export const getPlantationEvents = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;

  // Vérifier que la plantation appartient à l'utilisateur
  const plantation = await plantationRepository.findOne({
    where: { id, ownerId },
  });

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  // Récupérer les événements liés aux capteurs et actionneurs de cette plantation
  const events = await eventRepository
    .createQueryBuilder('event')
    .leftJoinAndSelect('event.sensor', 'sensor')
    .leftJoinAndSelect('event.actuator', 'actuator')
    .where('sensor.plantationId = :plantationId', { plantationId: plantation.id })
    .orWhere('actuator.plantationId = :plantationId', { plantationId: plantation.id })
    .orderBy('event.date', 'DESC')
    .take(100)
    .getMany();

  return res.json(events);
};

// Obtenir un événement spécifique
export const getEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const ownerId = req.user!.id;

  const event = await eventRepository.findOne({
    where: { id: eventId },
    relations: ['sensor', 'actuator', 'notifications'],
  });

  if (!event) {
    return res.status(404).json({ message: 'Événement non trouvé' });
  }

  // Vérifier que l'utilisateur a accès à cet événement (via la plantation)
  let hasAccess = false;
  if (event.sensor) {
    const plantation = await plantationRepository.findOne({
      where: { id: event.sensor.plantationId, ownerId },
    });
    hasAccess = !!plantation;
  }
  if (event.actuator) {
    const plantation = await plantationRepository.findOne({
      where: { id: event.actuator.plantationId, ownerId },
    });
    hasAccess = hasAccess || !!plantation;
  }

  if (!hasAccess) {
    return res.status(403).json({ message: 'Accès refusé à cet événement' });
  }

  return res.json(event);
};

// Lister tous les événements de l'utilisateur (toutes ses plantations)
export const getMyEvents = async (req: Request, res: Response) => {
  const ownerId = req.user!.id;

  // Récupérer toutes les plantations de l'utilisateur
  const plantations = await plantationRepository.find({
    where: { ownerId },
    select: ['id'],
  });

  const plantationIds = plantations.map(p => p.id);

  if (plantationIds.length === 0) {
    return res.json([]);
  }

  // Récupérer les événements liés aux capteurs et actionneurs de ces plantations
  const events = await eventRepository
    .createQueryBuilder('event')
    .leftJoinAndSelect('event.sensor', 'sensor')
    .leftJoinAndSelect('event.actuator', 'actuator')
    .where('sensor.plantationId IN (:...ids)', { ids: plantationIds })
    .orWhere('actuator.plantationId IN (:...ids)', { ids: plantationIds })
    .orderBy('event.date', 'DESC')
    .take(100)
    .getMany();

  return res.json(events);
};

