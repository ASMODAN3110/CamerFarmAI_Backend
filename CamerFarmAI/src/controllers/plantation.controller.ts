// src/controllers/plantation.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Plantation } from '../models/Plantation.entity';
import { Actuator, ActuatorStatus } from '../models/Actuator.entity';

const plantationRepo = AppDataSource.getRepository(Plantation);
const actuatorRepo = AppDataSource.getRepository(Actuator);

// Charger SensorData dynamiquement pour éviter les problèmes de référence circulaire
const getSensorModule = () => require('../models/SensorData.entity');
const getSensorRepo = () => {
  const { SensorData } = getSensorModule();
  return AppDataSource.getRepository(SensorData);
};

type CreateOrUpdatePayload = {
  name?: string;
  location?: string;
  area?: number;
  cropType?: string;
  coordinates?: { lat: number; lng: number };
};

type SensorDataPayload = {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  luminosity?: number;
  status?: string;
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
  ownerId: plantation.ownerId,
  updatedAt: plantation.updatedAt?.toISOString?.() ?? plantation.updatedAt,
});

const findOwnedPlantation = async (plantationId: string, ownerId: string) => {
  return plantationRepo.findOne({
    where: { id: plantationId, ownerId },
  });
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
    where: { id: req.params.id, ownerId: req.user!.id },
  });

  if (!plantation) return res.status(404).json({ message: 'Champ non trouvé' });

  // Bonus : dernières données capteurs
  const sensorRepo = getSensorRepo();
  const [latestData, sensors, actuators] = await Promise.all([
    sensorRepo.findOne({
      where: { plantationId: plantation.id },
      order: { timestamp: 'DESC' },
    }),
    sensorRepo.find({
      where: { plantationId: plantation.id },
      order: { timestamp: 'DESC' },
      take: 50,
    }),
    actuatorRepo.find({
      where: { plantationId: plantation.id },
      order: { createdAt: 'DESC' },
    }),
  ]);

  return res.json({
    ...formatPlantationResponse(plantation),
    latestSensorData: latestData,
    sensors,
    actuators,
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
  const { name, location, area, cropType, coordinates }: CreateOrUpdatePayload = req.body;

  const plantation = await findOwnedPlantation(id, req.user!.id);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  Object.assign(plantation, {
    name,
    location,
    area,
    cropType,
    coordinates,
  });
  await plantationRepo.save(plantation);

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

export const addSensorData = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const plantation = await findOwnedPlantation(id, ownerId);

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const { temperature, humidity, soilMoisture, luminosity, status }: SensorDataPayload = req.body;

  if (
    typeof temperature !== 'number' ||
    typeof humidity !== 'number' ||
    typeof soilMoisture !== 'number'
  ) {
    return res.status(400).json({
      message: 'Les champs temperature, humidity et soilMoisture sont obligatoires et doivent être numériques.',
    });
  }

  const sensorRepo = getSensorRepo();
  const { SensorStatus } = getSensorModule();

  const record = sensorRepo.create({
    temperature,
    humidity,
    soilMoisture,
    luminosity,
    status: status ?? SensorStatus.ACTIVE,
    plantationId: plantation.id,
  });

  await sensorRepo.save(record);

  return res.status(201).json(record);
};

export const getSensorData = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  const sensorRepo = getSensorRepo();
  const records = await sensorRepo.find({
    where: { plantationId: plantation.id },
    order: { timestamp: 'DESC' },
  });

  return res.json(records);
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

  Object.assign(actuator, {
    ...(name !== undefined ? { name } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  });

  await actuatorRepo.save(actuator);

  return res.json(actuator);
};