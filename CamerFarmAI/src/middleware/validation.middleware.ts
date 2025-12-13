// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import validator from 'validator';

/**
 * Middleware pour valider les UUIDs dans les paramètres de route
 */
export const validateUUID = (paramName: string = 'id') => {
  return [
    param(paramName)
      .isUUID()
      .withMessage(`${paramName} doit être un UUID valide`),
    (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Paramètre invalide',
          errors: errors.array(),
        });
        return;
      }
      next();
    },
  ];
};

/**
 * Middleware pour valider plusieurs UUIDs dans les paramètres
 */
export const validateMultipleUUIDs = (paramNames: string[]) => {
  const validators = paramNames.map(name => param(name).isUUID().withMessage(`${name} doit être un UUID valide`));
  
  return [
    ...validators,
    (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Paramètres invalides',
          errors: errors.array(),
        });
        return;
      }
      next();
    },
  ];
};

/**
 * Fonction utilitaire pour valider un UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  return validator.isUUID(uuid);
};

/**
 * Middleware pour valider les query parameters numériques
 */
export const validateQueryParams = (paramNames: string[]) => {
  const validators = paramNames.map(name => 
    param(name).optional().isInt({ min: 1 }).withMessage(`${name} doit être un entier positif`)
  );
  
  return [
    ...validators,
    (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Paramètres de requête invalides',
          errors: errors.array(),
        });
        return;
      }
      next();
    },
  ];
};

