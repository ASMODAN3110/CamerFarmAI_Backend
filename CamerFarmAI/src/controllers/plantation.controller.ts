// src/controllers/plantation.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Plantation } from '../models/Plantation.entity';
import { Actuator, ActuatorStatus } from '../models/Actuator.entity';

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
    where: { id: req.params.id, ownerId: req.user!.id },
  });

  if (!plantation) return res.status(404).json({ message: 'Champ non trouvé' });

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
  const ownerId = req.user!.id;

  const plantation = await findOwnedPlantation(id, ownerId);
  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

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

  if (status !== undefined) {
    if (!Object.values(SensorStatus).includes(status as any)) {
      return res.status(400).json({
        message: `Le statut doit être l'un des suivants: ${Object.values(SensorStatus).join(', ')}`,
      });
    }
    sensor.status = status as any;
  }

  await sensorRepo.save(sensor);

  return res.json(sensor);
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

  Object.assign(actuator, {
    ...(name !== undefined ? { name } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  });

  await actuatorRepo.save(actuator);

  return res.json(actuator);
};
