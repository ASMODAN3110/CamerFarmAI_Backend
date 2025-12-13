// src/middleware/sanitize.middleware.ts
import { body } from 'express-validator';

/**
 * Middleware pour sanitizer les inputs et prévenir les injections XSS
 */
export const sanitizeInput = [
  // Sanitize les champs de texte communs
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('email').optional().trim().normalizeEmail(),
  body('phone').optional().trim(),
  body('description').optional().trim().escape(),
  body('name').optional().trim().escape(),
];

/**
 * Middleware pour sanitizer les paramètres de plantation
 */
export const sanitizePlantationInput = [
  body('name').optional().trim().escape(),
  body('location').optional().trim().escape(),
  body('description').optional().trim().escape(),
];

/**
 * Middleware pour sanitizer les paramètres de capteur
 */
export const sanitizeSensorInput = [
  body('type').optional().trim().escape(),
  body('name').optional().trim().escape(),
];

/**
 * Middleware pour sanitizer les paramètres d'actionneur
 */
export const sanitizeActuatorInput = [
  body('name').optional().trim().escape(),
  body('type').optional().trim().escape(),
];

