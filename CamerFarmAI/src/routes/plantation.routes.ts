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

/**
 * @swagger
 * tags:
 *   name: Plantations
 *   description: Plantation management
 */

/**
 * @swagger
 * /plantations:
 *   post:
 *     summary: Create a new plantation
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               cropType:
 *                 type: string
 *               area:
 *                 type: number
 *     responses:
 *       201:
 *         description: Plantation created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', sanitizePlantationInput, plantationController.create);

/**
 * @swagger
 * /plantations/my:
 *   get:
 *     summary: Get my plantations
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's plantations
 */
router.get('/my', plantationController.getMyPlantations);

/**
 * @swagger
 * /plantations/{id}:
 *   get:
 *     summary: Get plantation details
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plantation details
 *       404:
 *         description: Plantation not found
 */
router.get('/:id', validateUUID('id'), plantationController.getOne);

/**
 * @swagger
 * /plantations/{id}:
 *   patch:
 *     summary: Update plantation
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plantation updated
 */
router.patch('/:id', validateUUID('id'), sanitizePlantationInput, plantationController.update);

/**
 * @swagger
 * /plantations/{id}:
 *   delete:
 *     summary: Delete plantation
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plantation deleted
 */
router.delete('/:id', validateUUID('id'), plantationController.remove);

/**
 * @swagger
 * /plantations/{id}/sensors:
 *   post:
 *     summary: Add sensor to plantation
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [temperature, humidity, soil_moisture, light, co2]
 *     responses:
 *       201:
 *         description: Sensor created
 */
router.post('/:id/sensors', validateUUID('id'), sanitizeSensorInput, plantationController.createSensor);

/**
 * @swagger
 * /plantations/{id}/sensors:
 *   get:
 *     summary: Get plantation sensors
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sensors
 */
router.get('/:id/sensors', validateUUID('id'), plantationController.getSensors);

/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}:
 *   patch:
 *     summary: Update sensor
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sensor updated
 */
router.patch('/:id/sensors/:sensorId', validateMultipleUUIDs(['id', 'sensorId']), sanitizeSensorInput, plantationController.updateSensor);

/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}/thresholds:
 *   patch:
 *     summary: Update sensor thresholds
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seuilMin:
 *                 type: number
 *               seuilMax:
 *                 type: number
 *     responses:
 *       200:
 *         description: Thresholds updated
 */
router.patch('/:id/sensors/:sensorId/thresholds', validateMultipleUUIDs(['id', 'sensorId']), validateSensorThresholds, restrictTo(UserRole.FARMER), plantationController.updateSensorThresholds);

// Gestion des lectures de capteurs
router.post('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.addSensorReading);
router.get('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.getSensorReadings);

// Gestion des actionneurs
router.post('/:id/actuators', validateUUID('id'), sanitizeActuatorInput, plantationController.addActuator);
router.get('/:id/actuators', validateUUID('id'), plantationController.getActuators);
router.patch('/:id/actuators/:actuatorId', validateMultipleUUIDs(['id', 'actuatorId']), sanitizeActuatorInput, plantationController.updateActuator);

/**
 * @swagger
 * /plantations:
 *   get:
 *     summary: Get all plantations (Admin/Technician)
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all plantations
 */
router.get('/', restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN), plantationController.getAll);

export default router;