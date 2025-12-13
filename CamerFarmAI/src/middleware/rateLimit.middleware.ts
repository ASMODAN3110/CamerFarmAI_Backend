// src/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter général pour toutes les routes
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  },
  standardHeaders: true, // Retourne les infos de rate limit dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    });
  },
});

// Rate limiter strict pour les routes d'authentification (protection contre force brute)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 tentatives de connexion par IP
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte pas les requêtes réussies
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      errorCode: 'TOO_MANY_ATTEMPTS',
    });
  },
});

// Rate limiter pour les routes de refresh token
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite à 10 refresh par IP
  message: {
    success: false,
    message: 'Trop de tentatives de rafraîchissement de token. Veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les routes de 2FA
export const twoFactorRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 tentatives de vérification 2FA
  message: {
    success: false,
    message: 'Trop de tentatives de vérification 2FA. Veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les routes d'inscription
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // Limite à 3 inscriptions par IP par heure
  message: {
    success: false,
    message: 'Trop de tentatives d\'inscription. Veuillez réessayer dans 1 heure.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

