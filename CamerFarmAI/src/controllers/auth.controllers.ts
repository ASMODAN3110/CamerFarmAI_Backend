// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from '../types/auth.types';
import { validationResult } from 'express-validator';
import { HttpException } from '../utils/HttpException';

/**
 * POST /api/v1/auth/register
 * Inscription d’un nouvel agriculteur (ou conseiller/admin plus tard)
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const dto: RegisterDto = req.body;

  try {
    const user = await AuthService.register(dto);

    // On génère les tokens tout de suite
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    // Cookie HttpOnly + Secure (en prod) pour le refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // 'lax' pour le dev cross-origin
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    return res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    console.error('Erreur inscription - Détails:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    
    // Si c'est une HttpException, utiliser son code de statut
    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    // Pour les autres erreurs, retourner 500 avec le message d'erreur
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de l\'inscription',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error?.message,
        stack: error?.stack 
      }),
    });
  }
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { email, password }: LoginDto = req.body;

  try {
    // Note: Le service utilise phone, mais LoginDto utilise email
    // Vous devrez adapter selon votre logique métier
    // Pour l'instant, on utilise email comme identifiant
    const user = await AuthService.validateUser(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // 'lax' pour le dev cross-origin
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion',
    });
  }
};

/**
 * POST /api/v1/auth/refresh
 * Rafraîchir l'access token avec le refresh token
 */
export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token manquant',
    });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // 'lax' pour le dev cross-origin
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token expiré ou invalide',
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Récupérer les infos de l'utilisateur connecté
 */
export const getMe = async (req: Request, res: Response) => {
  // req.user est ajouté par le middleware protectRoute
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non authentifié',
    });
  }

  return res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
};

/**
 * POST /api/v1/auth/logout
 * Déconnexion : on efface simplement le cookie
 */
export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  return res.json({
    success: true,
    message: 'Déconnexion réussie',
  });
};

/**
 * PUT /api/v1/auth/profile
 * Mettre à jour le profil de l'utilisateur connecté
 */
export const updateProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non authentifié',
    });
  }

  const dto: UpdateProfileDto = req.body;

  try {
    const updatedUser = await AuthService.updateProfile(user.id, dto);

    return res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Erreur mise à jour profil - Détails:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la mise à jour du profil',
      ...(process.env.NODE_ENV === 'development' && {
        error: error?.message,
        stack: error?.stack,
      }),
    });
  }
};

/**
 * POST /api/v1/auth/profile/avatar
 * Upload de l'avatar de l'utilisateur connecté
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non authentifié',
    });
  }

  const anyReq = req as any;

  if (!anyReq.file) {
    return res.status(400).json({
      success: false,
      message: 'Aucun fichier reçu. Le champ \"avatar\" est requis.',
    });
  }

  const file = anyReq.file;

  // Construire l'URL publique de l'avatar
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

  return res.status(201).json({
    success: true,
    message: 'Avatar uploadé avec succès',
    data: {
      userId: user.id,
      avatarUrl,
    },
  });
};
