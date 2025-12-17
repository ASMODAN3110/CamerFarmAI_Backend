// src/routes/plantation.routes.ts
import { Router } from 'express';
import * as plantationController from '../controllers/plantation.controller';
import { protectRoute, restrictTo } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.entity';
import { validateUUID, validateMultipleUUIDs, validateSensorThresholds } from '../middleware/validation.middleware';
import { sanitizePlantationInput, sanitizeSensorInput, sanitizeActuatorInput } from '../middleware/sanitize.middleware';

const router = Router();

// Toutes les routes protégées
router.use(protectRoute);

// CRUD Plantation (agriculteur peut gérer ses champs)
router.post('/', sanitizePlantationInput, plantationController.create);
router.get('/my', plantationController.getMyPlantations);
router.get('/:id', validateUUID('id'), plantationController.getOne);
router.patch('/:id', validateUUID('id'), sanitizePlantationInput, plantationController.update);
router.delete('/:id', validateUUID('id'), plantationController.remove);

// Gestion des capteurs
router.post('/:id/sensors', validateUUID('id'), sanitizeSensorInput, plantationController.createSensor);
router.get('/:id/sensors', validateUUID('id'), plantationController.getSensors);
router.patch('/:id/sensors/:sensorId', validateMultipleUUIDs(['id', 'sensorId']), sanitizeSensorInput, plantationController.updateSensor);
router.patch('/:id/sensors/:sensorId/thresholds', validateMultipleUUIDs(['id', 'sensorId']), validateSensorThresholds, restrictTo(UserRole.FARMER), plantationController.updateSensorThresholds);

// Gestion des lectures de capteurs
router.post('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.addSensorReading);
router.get('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.getSensorReadings);

// Gestion des actionneurs
router.post('/:id/actuators', validateUUID('id'), sanitizeActuatorInput, plantationController.addActuator);
router.get('/:id/actuators', validateUUID('id'), plantationController.getActuators);
router.patch('/:id/actuators/:actuatorId', validateMultipleUUIDs(['id', 'actuatorId']), sanitizeActuatorInput, plantationController.updateActuator);

// Technicien/admin peut tout voir
router.get('/', restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN), plantationController.getAll);

export default router;