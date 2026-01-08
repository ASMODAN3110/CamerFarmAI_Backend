// src/controllers/plantation.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Plantation } from '../models/Plantation.entity';
import { Actuator, ActuatorStatus } from '../models/Actuator.entity';
import { UserRole } from '../models/User.entity';

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

type CreateOrUpdatePayload = {
  name?: string;
  location?: string;
  area?: number;
  cropType?: string;
  coordinates?: { lat: number; lng: number };
  mode?: string;
};

type SensorReadingPayload = {
  value: number;
};

type CreateSensorPayload = {
  type: string;
  status?: string;
};

type UpdateSensorPayload = {
  status?: string;
};

type UpdateSensorThresholdPayload = {
  seuilMin: number;
  seuilMax: number;
};

type CreateActuatorPayload = {
  name: string;
  type: string;
  status?: ActuatorStatus;
  metadata?: Record<string, any>;
};

type UpdateActuatorPayload = Partial<CreateActuatorPayload>;

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

const createDefaultSensors = async (plantationId: string) => {
  const sensorRepo = getSensorRepo();
  const { SensorType, SensorStatus } = getSensorModule();

  const sensorTypes = [
    SensorType.TEMPERATURE,
    SensorType.SOIL_MOISTURE,
    SensorType.CO2_LEVEL,
    SensorType.WATER_LEVEL,
    SensorType.LUMINOSITY,
  ];

  await sensorRepo.insert(
    sensorTypes.map(type => ({
      type,
      status: SensorStatus.ACTIVE,
      plantationId,
    }))
  );
};

const DEFAULT_ACTUATORS: CreateActuatorPayload[] = [
  {
    name: 'Pompe principale',
    type: 'pump',
    status: ActuatorStatus.ACTIVE,
    metadata: { flowRate: '25L/min', power: '300W' },
  },
  {
    name: 'Ventilateur nord',
    type: 'fan',
    status: ActuatorStatus.INACTIVE,
    metadata: { speedLevels: 3, power: '150W' },
  },
  {
    name: 'Éclairage LED',
    type: 'light',
    status: ActuatorStatus.ACTIVE,
    metadata: { spectrum: 'full', power: '100W' },
  },
];

const createDefaultActuators = async (plantationId: string) => {
  await actuatorRepo.insert(
    DEFAULT_ACTUATORS.map(actuator => ({
      ...actuator,
      plantationId,
    }))
  );
};

const findOwnedPlantation = async (plantationId: string, ownerId: string) => {
  return plantationRepo.findOne({
    where: { id: plantationId, ownerId },
  });
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

export const create = async (req: Request, res: Response) => {
  const { name, location, area, cropType, coordinates }: CreateOrUpdatePayload = req.body;
  const ownerId = req.user!.id;

  const plantation = plantationRepo.create({
    name,
    location,
    area,
    cropType,
    coordinates,
    ownerId,
  });

  await plantationRepo.save(plantation);
  await createDefaultSensors(plantation.id);
  await createDefaultActuators(plantation.id);
  return res.status(201).json(formatPlantationResponse(plantation));
};

export const getMyPlantations = async (req: Request, res: Response) => {
  const plantations = await plantationRepo.find({
    where: { ownerId: req.user!.id },
    order: { createdAt: 'DESC' },
  });
  return res.json(plantations.map(formatPlantationResponse));
};

export const getOne = async (req: Request, res: Response) => {
  const plantation = await plantationRepo.findOne({
    where: { id: req.params.id },
    relations: ['owner'],
  });

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  // Vérifier les permissions : propriétaire, technicien ou admin
  const isOwner = plantation.ownerId === req.user!.id;
  const isTechnicianOrAdmin = req.user!.role === UserRole.TECHNICIAN || req.user!.role === UserRole.ADMIN;

  if (!isOwner && !isTechnicianOrAdmin) {
    return res.status(403).json({ message: 'Accès interdit' });
  }

  // Mettre à jour les statuts des capteurs avant de les récupérer
  await updateSensorStatuses(plantation.id);

  const sensorRepo = getSensorRepo();
  const sensorReadingRepo = getSensorReadingRepo();

  const [sensors, actuators] = await Promise.all([
    sensorRepo.find({
      where: { plantationId: plantation.id },
      order: { createdAt: 'ASC' },
    }),
    actuatorRepo.find({
    where: { plantationId: plantation.id },
      order: { createdAt: 'DESC' },
    }),
  ]);

  // Récupérer les dernières lectures pour chaque capteur
  const latestReadings = await Promise.all(
    sensors.map(async (sensor) => {
      const latestReading = await sensorReadingRepo.findOne({
        where: { sensorId: sensor.id },
    order: { timestamp: 'DESC' },
  });
      return {
        sensorId: sensor.id,
        sensorType: sensor.type,
        latestReading: latestReading ? {
          value: latestReading.value,
          timestamp: latestReading.timestamp,
        } : null,
      };
    })
  );

  return res.json({
    ...formatPlantationResponse(plantation),
    sensors,
    actuators,
    latestReadings,
    hasSensors: sensors.length > 0,
    hasActuators: actuators.length > 0,
  });
};

export const getAll = async (_req: Request, res: Response) => {
  const plantations = await plantationRepo.find({ relations: ['owner'] });
  return res.json(plantations.map(formatPlantationResponse));
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, area, cropType, coordinates, mode }: CreateOrUpdatePayload = req.body;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  // Sauvegarder l'ancien mode pour détecter les changements
  const oldMode = plantation.mode;

  Object.assign(plantation, {
    name,
    location,
    area,
    cropType,
    coordinates,
    ...(mode !== undefined ? { mode } : {}),
  });
  await plantationRepo.save(plantation);

  // Générer un événement si le mode a changé
  if (mode !== undefined && mode !== oldMode) {
    try {
      const { EventService } = require('../services/event/EventService');
      const { EventType } = require('../models/Event.entity');
      const { PlantationMode } = require('../models/Plantation.entity');

      const modeLabel = mode === PlantationMode.AUTOMATIC ? 'automatique' : 'manuel';
      const oldModeLabel = oldMode === PlantationMode.AUTOMATIC ? 'automatique' : 'manuel';
      
      const description = `Le mode de contrôle de la plantation "${plantation.name}" a été changé de ${oldModeLabel} à ${modeLabel}`;

      const event = await EventService.createEvent(
        EventType.MODE_CHANGED,
        description,
        undefined,
        undefined
      );

      // Traiter l'événement et envoyer les notifications au propriétaire
      await EventService.processEvent(event, [ownerId]);
    } catch (error) {
      // Ne pas faire échouer la requête si la génération d'événement échoue
      console.error('Erreur lors de la génération de l\'événement:', error);
    }
  }

  return res.json(formatPlantationResponse(plantation));
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plantation = await findOwnedPlantation(id, req.user!.id);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  await plantationRepo.remove(plantation);
  return res.status(204).send();
};

// Gestion des capteurs
export const createSensor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const plantation = await findOwnedPlantation(id, ownerId);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const { type, status }: CreateSensorPayload = req.body;

  if (!type) {
    return res.status(400).json({
      message: 'Le champ type est obligatoire pour un capteur.',
    });
  }

  const sensorRepo = getSensorRepo();
  const { SensorType, SensorStatus } = getSensorModule();

  // Vérifier que le type est valide
  if (!Object.values(SensorType).includes(type as any)) {
    return res.status(400).json({
      message: `Le type doit être l'un des suivants: ${Object.values(SensorType).join(', ')}`,
    });
  }

  const sensor = sensorRepo.create({
    type: type as any,
    status: status ? (status as any) : SensorStatus.ACTIVE,
    plantationId: plantation.id,
  });

  await sensorRepo.save(sensor);

  return res.status(201).json(sensor);
};

export const getSensors = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plantation = await plantationRepo.findOne({
    where: { id },
  });

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  // Vérifier les permissions : propriétaire, technicien ou admin
  const isOwner = plantation.ownerId === req.user!.id;
  const isTechnicianOrAdmin = req.user!.role === UserRole.TECHNICIAN || req.user!.role === UserRole.ADMIN;

  if (!isOwner && !isTechnicianOrAdmin) {
    return res.status(403).json({ message: 'Accès interdit' });
  }

  // Mettre à jour les statuts des capteurs avant de les récupérer
  await updateSensorStatuses(plantation.id);

  const sensorRepo = getSensorRepo();
  const sensors = await sensorRepo.find({
    where: { plantationId: plantation.id },
    order: { createdAt: 'ASC' },
  });

  return res.json(sensors);
};

export const updateSensor = async (req: Request, res: Response) => {
  const { id, sensorId } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const sensorRepo = getSensorRepo();
  const { SensorStatus } = getSensorModule();

  const sensor = await sensorRepo.findOne({
    where: { id: sensorId, plantationId: plantation.id },
  });

  if (!sensor) {
    return res.status(404).json({ message: 'Capteur non trouvé' });
  }

  const { status }: UpdateSensorPayload = req.body;

  // Stocker l'ancien statut pour détecter les changements
  const oldStatus = sensor.status;

  if (status !== undefined) {
    if (!Object.values(SensorStatus).includes(status as any)) {
      return res.status(400).json({
        message: `Le statut doit être l'un des suivants: ${Object.values(SensorStatus).join(', ')}`,
      });
    }
    sensor.status = status as any;
  }

  await sensorRepo.save(sensor);

  // Créer un événement et envoyer une notification si le statut a changé
  if (status !== undefined && oldStatus !== sensor.status) {
    try {
      // Récupérer la plantation avec son propriétaire pour les notifications
      const plantationWithOwner = await plantationRepo.findOne({
        where: { id: plantation.id },
        relations: ['owner'],
      });
      
      if (plantationWithOwner) {
        const { EventService } = require('../services/event/EventService');
        await EventService.notifySensorStatusChange(sensor, sensor.status, plantationWithOwner);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la notification de changement de statut:', error);
    }
  }

  return res.json(sensor);
};

export const updateSensorThresholds = async (req: Request, res: Response) => {
  const { id, sensorId } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const sensorRepo = getSensorRepo();
  const sensor = await sensorRepo.findOne({
    where: { id: sensorId, plantationId: plantation.id },
  });

  if (!sensor) {
    return res.status(404).json({ message: 'Capteur non trouvé' });
  }

  // Les valeurs sont déjà validées par le middleware validateSensorThresholds
  const { seuilMin, seuilMax }: UpdateSensorThresholdPayload = req.body;

  // Sauvegarder les anciens seuils pour la description de l'événement
  const oldSeuilMin = sensor.seuilMin;
  const oldSeuilMax = sensor.seuilMax;

  try {
    sensor.modifierSeuil(seuilMin, seuilMax);
    await sensorRepo.save(sensor);
    
    // Vérifier si les seuils ont réellement changé avant de créer un événement
    const thresholdsChanged = 
      oldSeuilMin !== sensor.seuilMin || oldSeuilMax !== sensor.seuilMax;

    // Générer un événement si les seuils ont changé
    if (thresholdsChanged) {
      try {
        const { EventService } = require('../services/event/EventService');
        const { EventType } = require('../models/Event.entity');

        // Construire la description de l'événement
        let description = `Les seuils du capteur ${sensor.type}`;
        
        // Gérer le cas où les seuils sont définis pour la première fois
        if (oldSeuilMin === null && oldSeuilMax === null) {
          description += ` ont été définis : Min ${sensor.seuilMin}, Max ${sensor.seuilMax}`;
        } else {
          // Construire la description avec les changements
          const changes: string[] = [];
          
          if (oldSeuilMin !== sensor.seuilMin) {
            if (oldSeuilMin === null) {
              changes.push(`Min : ${sensor.seuilMin} (nouveau)`);
            } else {
              changes.push(`Min : ${oldSeuilMin} → ${sensor.seuilMin}`);
            }
          }
          
          if (oldSeuilMax !== sensor.seuilMax) {
            if (oldSeuilMax === null) {
              changes.push(`Max : ${sensor.seuilMax} (nouveau)`);
            } else {
              changes.push(`Max : ${oldSeuilMax} → ${sensor.seuilMax}`);
            }
          }
          
          if (changes.length > 0) {
            description += ` ont été modifiés : ${changes.join(', ')}`;
          } else {
            description += ` ont été modifiés`;
          }
        }

        const event = await EventService.createEvent(
          EventType.THRESHOLD_CHANGED,
          description,
          sensor.id
        );

        // Traiter l'événement et envoyer les notifications au propriétaire
        await EventService.processEvent(event, [ownerId]);
      } catch (error) {
        // Ne pas faire échouer la requête si la génération d'événement échoue
        console.error('Erreur lors de la génération de l\'événement:', error);
      }
    }
    
    return res.json({
      id: sensor.id,
      type: sensor.type,
      status: sensor.status,
      seuilMin: sensor.seuilMin,
      seuilMax: sensor.seuilMax,
      plantationId: sensor.plantationId,
      createdAt: sensor.createdAt,
      updatedAt: sensor.updatedAt,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || 'Erreur lors de la modification des seuils.',
    });
  }
};

// Gestion des lectures de capteurs
export const addSensorReading = async (req: Request, res: Response) => {
  const { id, sensorId } = req.params;
  const ownerId = req.user!.id;
  const plantation = await findOwnedPlantation(id, ownerId);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const { value }: SensorReadingPayload = req.body;

  if (typeof value !== 'number') {
    return res.status(400).json({
      message: 'Le champ value est obligatoire et doit être numérique.',
    });
  }

  const sensorRepo = getSensorRepo();
  const sensorReadingRepo = getSensorReadingRepo();

  const sensor = await sensorRepo.findOne({
    where: { id: sensorId, plantationId: plantation.id },
  });

  if (!sensor) {
    return res.status(404).json({ message: 'Capteur non trouvé' });
  }

  const reading = sensorReadingRepo.create({
    value,
    sensorId: sensor.id,
  });

  await sensorReadingRepo.save(reading);

  // Activer automatiquement le capteur s'il était inactif
  const { SensorStatus } = getSensorModule();
  const oldStatus = sensor.status;
  if (sensor.status !== SensorStatus.ACTIVE) {
    sensor.status = SensorStatus.ACTIVE;
    await sensorRepo.save(sensor);
    
    // Créer un événement et envoyer une notification si le statut a changé
    if (oldStatus !== SensorStatus.ACTIVE) {
      try {
        // Récupérer la plantation avec son propriétaire pour les notifications
        const plantationWithOwner = await plantationRepo.findOne({
          where: { id: plantation.id },
          relations: ['owner'],
        });
        
        if (plantationWithOwner) {
          const { EventService } = require('../services/event/EventService');
          await EventService.notifySensorStatusChange(sensor, SensorStatus.ACTIVE, plantationWithOwner);
        }
      } catch (error) {
        console.error('Erreur lors de la création de la notification de changement de statut:', error);
      }
    }
  }

  // Vérifier automatiquement les seuils et créer un événement si nécessaire
  try {
    const { ThresholdService } = require('../services/event/ThresholdService');
    await ThresholdService.checkThresholds(sensor, reading);
  } catch (error) {
    // Ne pas faire échouer la requête si la vérification de seuil échoue
    console.error('Erreur lors de la vérification des seuils:', error);
  }

  return res.status(201).json(reading);
};

export const getSensorReadings = async (req: Request, res: Response) => {
  const { id, sensorId } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const sensorRepo = getSensorRepo();
  const sensorReadingRepo = getSensorReadingRepo();

  const sensor = await sensorRepo.findOne({
    where: { id: sensorId, plantationId: plantation.id },
  });

  if (!sensor) {
    return res.status(404).json({ message: 'Capteur non trouvé' });
  }

  const readings = await sensorReadingRepo.find({
    where: { sensorId: sensor.id },
    order: { timestamp: 'DESC' },
    take: 100, // Limiter à 100 dernières lectures
  });

  return res.json({
    sensor: {
      id: sensor.id,
      type: sensor.type,
      status: sensor.status,
    },
    readings,
  });
};

export const addActuator = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const plantation = await findOwnedPlantation(id, ownerId);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const { name, type, status, metadata }: CreateActuatorPayload = req.body;

  if (!name || !type) {
    return res.status(400).json({
      message: 'Les champs name et type sont obligatoires pour un actionneur.',
    });
  }

  const actuator = actuatorRepo.create({
    name,
    type,
    status: status ?? ActuatorStatus.INACTIVE,
    metadata,
    plantationId: plantation.id,
  });

  await actuatorRepo.save(actuator);

  return res.status(201).json(actuator);
};

export const getActuators = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const actuators = await actuatorRepo.find({
    where: { plantationId: plantation.id },
    order: { createdAt: 'DESC' },
  });

  return res.json(actuators);
};

export const updateActuator = async (req: Request, res: Response) => {
  const { id, actuatorId } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const actuator = await actuatorRepo.findOne({
    where: { id: actuatorId, plantationId: plantation.id },
  });

  if (!actuator) {
    return res.status(404).json({ message: 'Actionneur non trouvé' });
  }

  const { name, type, status, metadata }: UpdateActuatorPayload = req.body;

  // Sauvegarder l'ancien statut pour détecter les changements
  const oldStatus = actuator.status;

  Object.assign(actuator, {
    ...(name !== undefined ? { name } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  });

  await actuatorRepo.save(actuator);

  // Générer un événement si le statut a changé
  if (status !== undefined && status !== oldStatus) {
    try {
      const { EventService } = require('../services/event/EventService');
      const { EventType } = require('../models/Event.entity');
      const { ActuatorStatus } = require('../models/Actuator.entity');

      const eventType = status === ActuatorStatus.ACTIVE 
        ? EventType.ACTIONNEUR_ACTIVE 
        : EventType.ACTIONNEUR_DESACTIVE;
      
      const description = status === ActuatorStatus.ACTIVE
        ? `L'actionneur "${actuator.name}" (${actuator.type}) a été activé`
        : `L'actionneur "${actuator.name}" (${actuator.type}) a été désactivé`;

      const event = await EventService.createEvent(
        eventType,
        description,
        undefined,
        actuator.id
      );

      // Traiter l'événement et envoyer les notifications au propriétaire
      await EventService.processEvent(event, [ownerId]);
    } catch (error) {
      // Ne pas faire échouer la requête si la génération d'événement échoue
      console.error('Erreur lors de la génération de l\'événement:', error);
    }
  }

  return res.json(actuator);
};
