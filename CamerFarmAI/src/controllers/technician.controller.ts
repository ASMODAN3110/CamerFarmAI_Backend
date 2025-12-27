// src/controllers/technician.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { Plantation } from '../models/Plantation.entity';
import { Actuator } from '../models/Actuator.entity';
import { Like } from 'typeorm';

const userRepo = AppDataSource.getRepository(User);
const plantationRepo = AppDataSource.getRepository(Plantation);
const actuatorRepo = AppDataSource.getRepository(Actuator);

// Charger Sensor et SensorReading dynamiquement pour éviter les problèmes de référence circulaire
const getSensorModule = () => require('../models/Sensor.entity');
const getSensorReadingModule = () => require('../models/SensorReading.entity');

const getSensorRepo = () => {
  const { Sensor } = getSensorModule();
  return AppDataSource.getRepository(Sensor);
};

const getSensorReadingRepo = () => {
  const { SensorReading } = getSensorReadingModule();
  return AppDataSource.getRepository(SensorReading);
};

/**
 * Met à jour les statuts des capteurs d'une plantation basés sur leur dernière lecture.
 * Un capteur devient INACTIVE s'il n'a pas reçu de nouvelle lecture depuis 1 heure.
 * @param plantationId - ID de la plantation
 */
const updateSensorStatuses = async (plantationId: string) => {
  const sensorRepo = getSensorRepo();
  const sensorReadingRepo = getSensorReadingRepo();
  const { SensorStatus } = getSensorModule();

  // Récupérer la plantation avec son propriétaire pour les notifications
  const plantation = await plantationRepo.findOne({
    where: { id: plantationId },
    relations: ['owner'],
  });

  if (!plantation) {
    return;
  }

  // Récupérer tous les capteurs de la plantation
  const sensors = await sensorRepo.find({
    where: { plantationId },
  });

  if (sensors.length === 0) {
    return;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 heure en millisecondes

  // Mettre à jour les statuts des capteurs
  for (const sensor of sensors) {
    // Stocker l'ancien statut pour détecter les changements
    const oldStatus = sensor.status;

    // Récupérer la dernière lecture du capteur
    const latestReading = await sensorReadingRepo.findOne({
      where: { sensorId: sensor.id },
      order: { timestamp: 'DESC' },
    });

    if (latestReading) {
      // Si la dernière lecture date de plus d'1 heure, marquer comme inactif
      if (latestReading.timestamp < oneHourAgo) {
        if (sensor.status !== SensorStatus.INACTIVE) {
          sensor.status = SensorStatus.INACTIVE;
          await sensorRepo.save(sensor);
          
          // Créer un événement et envoyer une notification si le statut a changé
          if (oldStatus !== SensorStatus.INACTIVE) {
            try {
              const { EventService } = require('../services/event/EventService');
              await EventService.notifySensorStatusChange(sensor, SensorStatus.INACTIVE, plantation);
            } catch (error) {
              console.error('Erreur lors de la création de la notification de changement de statut:', error);
            }
          }
        }
      } else {
        // Si la dernière lecture est récente, s'assurer que le capteur est actif
        if (sensor.status !== SensorStatus.ACTIVE) {
          sensor.status = SensorStatus.ACTIVE;
          await sensorRepo.save(sensor);
          
          // Créer un événement et envoyer une notification si le statut a changé
          if (oldStatus !== SensorStatus.ACTIVE) {
            try {
              const { EventService } = require('../services/event/EventService');
              await EventService.notifySensorStatusChange(sensor, SensorStatus.ACTIVE, plantation);
            } catch (error) {
              console.error('Erreur lors de la création de la notification de changement de statut:', error);
            }
          }
        }
      }
    }
    // Si le capteur n'a aucune lecture, on le laisse dans son état actuel (par défaut ACTIVE)
  }
};

const formatPlantationResponse = (plantation: Plantation) => ({
  id: plantation.id,
  name: plantation.name,
  location: plantation.location,
  area: plantation.area ?? null,
  createdAt: plantation.createdAt?.toISOString?.() ?? plantation.createdAt,
  cropType: plantation.cropType,
  mode: plantation.mode,
  ownerId: plantation.ownerId,
  updatedAt: plantation.updatedAt?.toISOString?.() ?? plantation.updatedAt,
});

/**
 * Récupère les statistiques globales pour le dashboard technique
 */
export const getStats = async (_req: Request, res: Response) => {
  try {
    // Compter les agriculteurs (users avec role FARMER)
    const farmersCount = await userRepo.count({
      where: { role: UserRole.FARMER },
    });

    // Compter les plantations
    const plantationsCount = await plantationRepo.count();

    // Mettre à jour les statuts des capteurs pour toutes les plantations
    const allPlantations = await plantationRepo.find();
    for (const plantation of allPlantations) {
      await updateSensorStatuses(plantation.id);
    }

    // Compter les capteurs actifs et totaux
    const sensorRepo = getSensorRepo();
    const { SensorStatus } = getSensorModule();
    
    const totalSensors = await sensorRepo.count();
    const activeSensors = await sensorRepo.count({
      where: { status: SensorStatus.ACTIVE },
    });

    // Compter les actionneurs
    const actuatorsCount = await actuatorRepo.count();

    return res.json({
      farmers: farmersCount,
      plantations: plantationsCount,
      activeSensors,
      totalSensors,
      actuators: actuatorsCount,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupère la liste des agriculteurs avec recherche optionnelle
 */
export const getFarmers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const searchTerm = search as string | undefined;

    // Construire la condition de recherche
    let whereCondition: any = { role: UserRole.FARMER };

    if (searchTerm) {
      whereCondition = [
        { role: UserRole.FARMER, firstName: Like(`%${searchTerm}%`) },
        { role: UserRole.FARMER, lastName: Like(`%${searchTerm}%`) },
      ];
    }

    // Récupérer les agriculteurs
    const farmers = await userRepo.find({
      where: whereCondition,
      relations: ['plantations'],
      select: ['id', 'firstName', 'lastName', 'phone', 'email'],
    });

    // Formater la réponse avec le nombre de plantations et la location
    const farmersWithStats = farmers.map((farmer) => {
      // Les plantations sont déjà chargées via la relation
      const plantations = farmer.plantations || [];
      
      // Récupérer la location depuis la première plantation ou null
      const location = plantations.length > 0 ? plantations[0].location : null;

      return {
        id: farmer.id,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        location: location || null,
        plantationsCount: plantations.length,
      };
    });

    return res.json(farmersWithStats);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des agriculteurs:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupère les plantations d'un agriculteur spécifique
 */
export const getFarmerPlantations = async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;

    // Vérifier que l'utilisateur existe et est un FARMER
    const farmer = await userRepo.findOne({
      where: { id: farmerId, role: UserRole.FARMER },
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Agriculteur non trouvé' });
    }

    // Récupérer toutes les plantations de l'agriculteur
    const plantations = await plantationRepo.find({
      where: { ownerId: farmerId },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    // Mettre à jour les statuts des capteurs pour chaque plantation
    for (const plantation of plantations) {
      await updateSensorStatuses(plantation.id);
    }

    // Formater la réponse
    return res.json(plantations.map(formatPlantationResponse));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des plantations:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

