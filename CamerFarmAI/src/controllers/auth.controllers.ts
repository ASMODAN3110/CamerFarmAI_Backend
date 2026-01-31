// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto } from '../types/auth.types';
import { validationResult } from 'express-validator';
import { HttpException } from '../utils/HttpException';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PasswordResetService } from '../services/password-reset.service';
import { GoogleAuthService } from '../services/google-auth.service';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/v1/auth/register
 * Inscription d'un nouvel agriculteur (ou technicien/admin plus tard)
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

    // Envoyer l'email de bienvenue (non bloquant - ne doit pas faire échouer l'inscription)
    AuthService.sendWelcomeEmail(user).catch((err: any) => {
      console.error('Erreur envoi email de bienvenue (non bloquant):', err?.message || err);
      // Ne pas propager l'erreur - l'inscription continue normalement
    });

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
          avatarUrl: user.avatarUrl,
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
    // Vérifier d'abord si l'utilisateur existe et son statut actif
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({
      where: { email },
      select: ['id', 'isActive', 'password', 'twoFactorEnabled'],
    });

    // Si l'utilisateur existe mais est désactivé, retourner un message spécifique
    if (existingUser && !existingUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Votre compte a été désactivé. Veuillez contacter l\'administrateur du système pour plus d\'informations.',
        errorCode: 'ACCOUNT_DISABLED',
      });
    }

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

    // Vérifier si le 2FA est activé pour cet utilisateur
    if (user.twoFactorEnabled) {
      // Générer un token temporaire pour la vérification 2FA
      const temporaryToken = AuthService.generateTemporaryToken(user.id);

      return res.status(200).json({
        success: true,
        message: 'Authentification 2FA requise',
        data: {
          requires2FA: true,
          temporaryToken,
        },
      });
    }

    // Si 2FA n'est pas activé, procéder avec la connexion normale
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
          avatarUrl: user.avatarUrl,
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

  // Récupérer l'utilisateur complet pour obtenir le statut 2FA
  const userRepository = AppDataSource.getRepository(User);
  const fullUser = await userRepository.findOne({
    where: { id: user.id },
    select: ['id', 'phone', 'firstName', 'lastName', 'email', 'role', 'twoFactorEnabled', 'avatarUrl', 'createdAt'],
  });

  if (!fullUser) {
    return res.status(404).json({
      success: false,
      message: 'Utilisateur non trouvé',
    });
  }

  return res.json({
    success: true,
    data: {
      id: fullUser.id,
      phone: fullUser.phone,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      email: fullUser.email,
      role: fullUser.role,
      twoFactorEnabled: fullUser.twoFactorEnabled,
      avatarUrl: fullUser.avatarUrl,
      createdAt: fullUser.createdAt,
    },
  });
};

/**
 * POST /api/v1/auth/logout
 * Déconnexion : on efface simplement le cookie
 */
/**
 * GET /api/v1/auth/health
 * Health check endpoint for monitoring and load balancers
 */
export const health = async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const isConnected = AppDataSource.isInitialized;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
      service: 'camerfarmai-backend',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      service: 'camerfarmai-backend',
    });
  }
};

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

  try {
    // Récupérer l'utilisateur complet depuis la base de données
    const userRepository = AppDataSource.getRepository(User);
    const fullUser = await userRepository.findOne({ where: { id: user.id } });

    if (!fullUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Construire l'URL publique de l'avatar
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    // Supprimer l'ancien fichier avatar s'il existe
    if (fullUser.avatarUrl) {
      try {
        // Extraire le nom de fichier depuis l'URL complète
        const oldFileName = fullUser.avatarUrl.split('/uploads/avatars/')[1];
        if (oldFileName) {
          const oldFilePath = path.join(__dirname, '..', '..', 'uploads', 'avatars', oldFileName);
          // Vérifier que le fichier existe avant de le supprimer
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      } catch (error) {
        // Ne pas faire échouer l'upload si la suppression de l'ancien fichier échoue
        console.error('Erreur lors de la suppression de l\'ancien avatar:', error);
      }
    }

    // Mettre à jour l'URL de l'avatar dans la base de données
    fullUser.avatarUrl = avatarUrl;
    await userRepository.save(fullUser);

    return res.status(201).json({
      success: true,
      message: 'Avatar uploadé avec succès',
      data: {
        userId: fullUser.id,
        avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'upload de l\'avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde de l\'avatar',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error?.message 
      }),
    });
  }
};

/**
 * GET /api/v1/auth/2fa/generate
 * Générer un secret 2FA et un QR code pour l'utilisateur connecté
 */
export const generateTwoFactorSecret = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non authentifié',
    });
  }

  try {
    const { secret, qrCodeUrl } = await AuthService.generateTwoFactorSecret(user.id);

    return res.json({
      success: true,
      message: 'Secret 2FA généré avec succès',
      data: {
        secret,
        qrCodeUrl,
      },
    });
  } catch (error: any) {
    console.error('Erreur génération secret 2FA:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la génération du secret 2FA',
    });
  }
};

/**
 * POST /api/v1/auth/2fa/enable
 * Activer le 2FA pour l'utilisateur connecté
 */
export const enableTwoFactor = async (req: Request, res: Response) => {
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

  const { token } = req.body;

  try {
    const updatedUser = await AuthService.enableTwoFactor(user.id, token);

    return res.json({
      success: true,
      message: '2FA activé avec succès',
      data: {
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error('Erreur activation 2FA:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de l\'activation du 2FA',
    });
  }
};

/**
 * POST /api/v1/auth/2fa/disable
 * Désactiver le 2FA pour l'utilisateur connecté
 */
export const disableTwoFactor = async (req: Request, res: Response) => {
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

  const { token } = req.body;

  try {
    const updatedUser = await AuthService.disableTwoFactor(user.id, token);

    return res.json({
      success: true,
      message: '2FA désactivé avec succès',
      data: {
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error('Erreur désactivation 2FA:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la désactivation du 2FA',
    });
  }
};

/**
 * POST /api/v1/auth/login/verify-2fa
 * Vérifier le code 2FA et compléter la connexion
 */
export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { temporaryToken, twoFactorCode } = req.body;

  if (!temporaryToken) {
    return res.status(400).json({
      success: false,
      message: 'Token temporaire requis',
    });
  }

  try {
    // Vérifier et décoder le token temporaire
    const tokenData = AuthService.verifyTemporaryToken(temporaryToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Token temporaire invalide ou expiré',
      });
    }

    // Récupérer l'utilisateur avec le secret 2FA
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: tokenData.userId },
      select: ['id', 'phone', 'firstName', 'lastName', 'email', 'role', 'twoFactorSecret', 'twoFactorEnabled', 'isActive'],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier que le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Votre compte a été désactivé. Veuillez contacter l\'administrateur du système pour plus d\'informations.',
        errorCode: 'ACCOUNT_DISABLED',
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Le 2FA n\'est pas activé pour cet utilisateur',
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Aucun secret 2FA trouvé',
      });
    }

    // Vérifier le code 2FA
    const isValid = AuthService.verifyTwoFactorToken(user.twoFactorSecret, twoFactorCode);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Code 2FA invalide',
      });
    }

    // Générer les tokens finaux
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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
  } catch (error: any) {
    console.error('Erreur vérification 2FA:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la vérification 2FA',
    });
  }
};

/**
 * POST /api/v1/auth/forgot-password
 * Demande de réinitialisation de mot de passe
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { email }: ForgotPasswordDto = req.body;

  try {
    // Trouver l'utilisateur par email
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    // Toujours retourner succès pour ne pas révéler si l'email existe (sécurité)
    // Si l'utilisateur existe ET a un email, générer le token et envoyer l'email
    if (user && user.email) {
      try {
        // Générer le token de réinitialisation
        const resetToken = PasswordResetService.generateResetToken(user.id);

        // Envoyer l'email de réinitialisation
        await PasswordResetService.sendPasswordResetEmail(user, resetToken);
      } catch (error: any) {
        // Logger l'erreur mais ne pas révéler à l'utilisateur
        console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error?.message);
        // Continuer à retourner succès pour la sécurité
      }
    }

    // Toujours retourner le même message de succès
    return res.status(200).json({
      success: true,
      message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
    });
  } catch (error: any) {
    console.error('Erreur forgot-password:', error);
    
    // Même en cas d'erreur, retourner succès pour la sécurité
    return res.status(200).json({
      success: true,
      message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
    });
  }
};

/**
 * POST /api/v1/auth/reset-password
 * Réinitialisation du mot de passe avec token
 */
export const resetPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { token, newPassword }: ResetPasswordDto = req.body;

  try {
    // Vérifier le token de réinitialisation
    const tokenData = PasswordResetService.verifyResetToken(token);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Token de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.',
      });
    }

    // Récupérer l'utilisateur
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: tokenData.userId } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier que le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Impossible de réinitialiser le mot de passe d\'un compte désactivé',
      });
    }

    // Réinitialiser le mot de passe
    await AuthService.resetPassword(user.id, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (error: any) {
    console.error('Erreur reset-password:', error);
    
    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la réinitialisation du mot de passe',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error?.message,
        stack: error?.stack 
      }),
    });
  }
};

/**
 * POST /api/v1/auth/google/login
 * Connexion avec Google OAuth 2.0 (utilisateur existant)
 */
export const googleLogin = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { idToken }: GoogleAuthDto = req.body;

  try {
    // Trouver l'utilisateur existant
    const user = await GoogleAuthService.loginWithGoogle(idToken);

    // Générer les tokens JWT
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    // Cookie HttpOnly + Secure (en prod) pour le refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    return res.status(200).json({
      success: true,
      message: 'Connexion Google réussie',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          authProvider: user.authProvider,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    console.error('Erreur connexion Google:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la connexion Google',
      ...(process.env.NODE_ENV === 'development' && {
        error: error?.message,
        stack: error?.stack,
      }),
    });
  }
};

/**
 * POST /api/v1/auth/google/register
 * Inscription avec Google OAuth 2.0 (nouvel utilisateur)
 */
export const googleRegister = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { idToken }: GoogleAuthDto = req.body;

  try {
    // Créer un nouvel utilisateur
    const user = await GoogleAuthService.registerWithGoogle(idToken);

    // Générer les tokens JWT
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    // Cookie HttpOnly + Secure (en prod) pour le refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    return res.status(201).json({
      success: true,
      message: 'Inscription Google réussie',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          authProvider: user.authProvider,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    console.error('Erreur inscription Google:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de l\'inscription Google',
      ...(process.env.NODE_ENV === 'development' && {
        error: error?.message,
        stack: error?.stack,
      }),
    });
  }
};

/**
 * POST /api/v1/auth/google
 * Authentification avec Google OAuth 2.0 (méthode legacy - trouve ou crée)
 * @deprecated Utilisez /auth/google/login ou /auth/google/register à la place
 */
export const googleAuth = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  const { idToken }: GoogleAuthDto = req.body;

  try {
    // Authentifier avec Google (trouve ou crée)
    const user = await GoogleAuthService.authenticateWithGoogle(idToken);

    // Générer les tokens JWT
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    // Cookie HttpOnly + Secure (en prod) pour le refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    return res.status(200).json({
      success: true,
      message: 'Authentification Google réussie',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          authProvider: user.authProvider,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    console.error('Erreur authentification Google:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de l\'authentification Google',
      ...(process.env.NODE_ENV === 'development' && {
        error: error?.message,
        stack: error?.stack,
      }),
    });
  }
};