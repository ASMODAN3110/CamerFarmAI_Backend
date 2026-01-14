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
 *   description: Gestion des plantations
 */

/**
 * @swagger
 * /plantations:
 *   post:
 *     summary: Créer une nouvelle plantation
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
 *         description: Plantation créée avec succès
 *       400:
 *         description: Erreur de validation
 */
router.post('/', sanitizePlantationInput, plantationController.create);

/**
 * @swagger
 * /plantations/my:
 *   get:
 *     summary: Récupérer mes plantations
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des plantations de l'utilisateur
 */
router.get('/my', plantationController.getMyPlantations);

/**
 * @swagger
 * /plantations/{id}:
 *   get:
 *     summary: Obtenir les détails de la plantation
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
 *         description: Détails de la plantation
 *       404:
 *         description: Plantation non trouvée
 */
router.get('/:id', validateUUID('id'), plantationController.getOne);

/**
 * @swagger
 * /plantations/{id}:
 *   patch:
 *     summary: Mettre à jour la plantation
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
 *         description: Plantation mise à jour
 */
router.patch('/:id', validateUUID('id'), sanitizePlantationInput, plantationController.update);

/**
 * @swagger
 * /plantations/{id}:
 *   delete:
 *     summary: Supprimer la plantation
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
 *         description: Plantation supprimée
 */
router.delete('/:id', validateUUID('id'), plantationController.remove);

/**
 * @swagger
 * /plantations/{id}/sensors:
 *   post:
 *     summary: Ajouter un capteur à la plantation
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
 *         description: Capteur créé
 */
router.post('/:id/sensors', validateUUID('id'), sanitizeSensorInput, plantationController.createSensor);

/**
 * @swagger
 * /plantations/{id}/sensors:
 *   get:
 *     summary: Récupérer les capteurs de la plantation
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
 *         description: Liste des capteurs
 */
router.get('/:id/sensors', validateUUID('id'), plantationController.getSensors);

/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}:
 *   patch:
 *     summary: Mettre à jour le capteur
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
 *         description: Capteur mis à jour
 */
router.patch('/:id/sensors/:sensorId', validateMultipleUUIDs(['id', 'sensorId']), sanitizeSensorInput, plantationController.updateSensor);

/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}/thresholds:
 *   patch:
 *     summary: Mettre à jour les seuils du capteur
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
 *         description: Seuils mis à jour
 */
router.patch('/:id/sensors/:sensorId/thresholds', validateMultipleUUIDs(['id', 'sensorId']), validateSensorThresholds, restrictTo(UserRole.FARMER), plantationController.updateSensorThresholds);

// Gestion des lectures de capteurs
/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}/readings:
 *   post:
 *     summary: Ajouter une lecture de capteur
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
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Lecture ajoutée
 */
router.post('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.addSensorReading);
/**
 * @swagger
 * /plantations/{id}/sensors/{sensorId}/readings:
 *   get:
 *     summary: Récupérer les lectures du capteur
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
 *     responses:
 *       200:
 *         description: Liste des lectures
 */
router.get('/:id/sensors/:sensorId/readings', validateMultipleUUIDs(['id', 'sensorId']), plantationController.getSensorReadings);

// Gestion des actionneurs
/**
 * @swagger
 * /plantations/{id}/actuators:
 *   post:
 *     summary: Ajouter un actionneur à la plantation
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
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [pompe, ventilateur, eclairage]
 *     responses:
 *       201:
 *         description: Actionneur créé
 */
router.post('/:id/actuators', validateUUID('id'), sanitizeActuatorInput, plantationController.addActuator);
/**
 * @swagger
 * /plantations/{id}/actuators:
 *   get:
 *     summary: Récupérer les actionneurs de la plantation
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
 *         description: Liste des actionneurs
 */
router.get('/:id/actuators', validateUUID('id'), plantationController.getActuators);
/**
 * @swagger
 * /plantations/{id}/actuators/{actuatorId}:
 *   patch:
 *     summary: Mettre à jour l'actionneur
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
 *         name: actuatorId
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
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Actionneur mis à jour
 */
router.patch('/:id/actuators/:actuatorId', validateMultipleUUIDs(['id', 'actuatorId']), sanitizeActuatorInput, plantationController.updateActuator);

/**
 * @swagger
 * /plantations:
 *   get:
 *     summary: Récupérer toutes les plantations (Admin/Technicien)
 *     tags: [Plantations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les plantations
 */
router.get('/', restrictTo(UserRole.TECHNICIAN, UserRole.ADMIN), plantationController.getAll);

export default router;