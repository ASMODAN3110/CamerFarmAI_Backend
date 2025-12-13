// src/middleware/security.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour limiter la taille des requêtes
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize) || 10;
      
      if (sizeInMB > maxSizeInMB) {
        res.status(413).json({
          success: false,
          message: `La taille de la requête dépasse la limite de ${maxSizeInMB}MB`,
        });
        return;
      }
    }
    next();
  };
};

/**
 * Middleware pour logger les tentatives de connexion échouées
 */
export const logSecurityEvents = (req: Request, res: Response, next: NextFunction) => {
  // Logger les tentatives d'accès non autorisées
  const originalSend = res.send;
  
  res.send = function (body: any) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY] ${res.statusCode} - ${req.method} ${req.path} - IP: ${req.ip} - User: ${req.user?.id || 'anonymous'}`);
    }
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Middleware pour ajouter des headers de sécurité supplémentaires
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Désactiver la mise en cache pour les routes sensibles
  if (req.path.startsWith('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Ajouter un header pour indiquer que l'API nécessite une authentification
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

/**
 * Middleware pour valider l'origine des requêtes (protection CSRF basique)
 */
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  
  const origin = req.headers.origin;
  
  // Autoriser les requêtes sans origin (Postman, curl, etc. en développement)
  if (!origin || process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Origine non autorisée',
    });
  }
  
  next();
};

