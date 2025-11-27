// src/controllers/plantation.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Plantation, PlantationStatus } from '../models/Plantation.entity';

const plantationRepo = AppDataSource.getRepository(Plantation);

// Charger SensorData dynamiquement pour éviter les problèmes de référence circulaire
const getSensorRepo = () => {
  const { SensorData } = require('../models/SensorData.entity');
  return AppDataSource.getRepository(SensorData);
};

type CreateOrUpdatePayload = {
  name?: string;
  location?: string;
  area?: number;
  cropType?: string;
  coordinates?: { lat: number; lng: number };
  status?: PlantationStatus;
};

const formatPlantationResponse = (plantation: Plantation) => ({
  id: plantation.id,
  name: plantation.name,
  location: plantation.location,
  area: plantation.area ?? null,
  createdAt: plantation.createdAt?.toISOString?.() ?? plantation.createdAt,
  status: plantation.status,
  cropType: plantation.cropType,
  ownerId: plantation.ownerId,
  updatedAt: plantation.updatedAt?.toISOString?.() ?? plantation.updatedAt,
});

export const create = async (req: Request, res: Response) => {
  const { name, location, area, cropType, coordinates, status }: CreateOrUpdatePayload = req.body;
  const ownerId = req.user!.id;

  const plantation = plantationRepo.create({
    name,
    location,
    area,
    cropType,
    coordinates,
    ownerId,
    status: status ?? PlantationStatus.ACTIVE,
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
  const latestData = await sensorRepo.findOne({
    where: { plantationId: plantation.id },
    order: { timestamp: 'DESC' },
  });

  return res.json({
    ...formatPlantationResponse(plantation),
    latestSensorData: latestData,
  });
};

export const getAll = async (_req: Request, res: Response) => {
  const plantations = await plantationRepo.find({ relations: ['owner'] });
  return res.json(plantations.map(formatPlantationResponse));
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, area, cropType, coordinates, status }: CreateOrUpdatePayload = req.body;

  const plantation = await plantationRepo.findOne({
    where: { id, ownerId: req.user!.id },
  });

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  Object.assign(plantation, {
    name,
    location,
    area,
    cropType,
    coordinates,
    ...(status ? { status } : {}),
  });
  await plantationRepo.save(plantation);

  return res.json(formatPlantationResponse(plantation));
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plantation = await plantationRepo.findOne({
    where: { id, ownerId: req.user!.id },
  });

  if (!plantation) {
    return res.status(404).json({ message: 'Champ non trouvé' });
  }

  await plantationRepo.remove(plantation);
  return res.status(204).send();
};