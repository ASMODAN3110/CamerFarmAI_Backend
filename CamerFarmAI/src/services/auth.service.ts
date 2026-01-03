// src/services/auth.service.ts
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { RegisterDto, UpdateProfileDto } from '../types/auth.types';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { HttpException } from '../utils/HttpException';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

const userRepository = AppDataSource.getRepository(User);

// Définir JWT_SECRET une seule fois au niveau du module
const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

export class AuthService {
    // 1. Inscription
    static async register(dto: RegisterDto, role?: UserRole): Promise<User> {
      const { phone, password, firstName, lastName, email } = dto;
  
      // Vérifier si le téléphone existe déjà
      const existingUser = await userRepository.findOne({ where: { phone } });
      if (existingUser) {
        throw new HttpException(409, 'Ce numéro de téléphone est déjà utilisé');
      }
  
      // Créer l'utilisateur → le @BeforeInsert dans l'entité hash automatiquement le mot de passe
      const user = userRepository.create({
        phone,
        password, // sera hashé automatiquement
        firstName,
        lastName,
        email: email || null,
        role: role || UserRole.FARMER, // utiliser le rôle fourni ou FARMER par défaut
      });
  
      return await userRepository.save(user);
    }
    // 2. Validation des identifiants (utilisé pour le login)
  static async validateUser(email: string, plainPassword: string): Promise<User | null> {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) return null;

    // Vérifier que le compte est actif
    if (!user.isActive) return null;

    const isPasswordValid = await user.validatePassword(plainPassword);
    if (!isPasswordValid) return null;

    return user;
  }

  // 3. Génération des deux tokens
  static generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
    const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);
    
    return { accessToken, refreshToken };
  }

  // 3.1. Génération d'un token temporaire pour la vérification 2FA (5 minutes)
  static generateTemporaryToken(userId: string): string {
    const payload = {
      sub: userId,
      type: '2fa_verification', // Marqueur pour indiquer que c'est un token temporaire
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '5m', // 5 minutes
    } as SignOptions);
  }

  // 4. Vérification du refresh token + génération d'un nouveau couple
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload;

      const user = await userRepository.findOne({ where: { id: decoded.sub } });
      if (!user) throw new HttpException(401, 'Token invalide');

      // On génère un nouveau couple (rotation simple)
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new HttpException(401, 'Refresh token invalide ou expiré');
      }
      throw error;
    }
  }

  // 5. (Optionnel) Récupérer un utilisateur à partir d'un token (utilisé dans le middleware)
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      return await userRepository.findOne({ where: { id: decoded.sub } });
    } catch {
      return null;
    }
  }

  // 5.1. Vérifier et décoder un token temporaire 2FA
  static verifyTemporaryToken(temporaryToken: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(temporaryToken, JWT_SECRET) as jwt.JwtPayload & { type?: string };
      
      // Vérifier que c'est bien un token temporaire pour la 2FA
      if (decoded.type !== '2fa_verification') {
        return null;
      }

      if (!decoded.sub) {
        return null;
      }

      return { userId: decoded.sub };
    } catch {
      return null;
    }
  }

  // 6. Mise à jour du profil utilisateur
  static async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    // Vérifier l'unicité du téléphone si modifié
    if (dto.phone && dto.phone !== user.phone) {
      const existingUserByPhone = await userRepository.findOne({ where: { phone: dto.phone } });
      if (existingUserByPhone) {
        throw new HttpException(409, 'Ce numéro de téléphone est déjà utilisé');
      }
      user.phone = dto.phone;
    }

    // Vérifier l'unicité de l'email si modifié
    if (dto.email && dto.email !== user.email) {
      const existingUserByEmail = await userRepository.findOne({ where: { email: dto.email } });
      if (existingUserByEmail) {
        throw new HttpException(409, 'Cet email est déjà utilisé');
      }
      user.email = dto.email;
    }

    // Mettre à jour les autres champs
    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }

    return await userRepository.save(user);
  }

  // 7. Générer un secret 2FA et un QR code
  static async generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    // Générer un secret TOTP
    const secret = speakeasy.generateSecret({
      name: `CamerFarmAI (${user.email || user.phone})`,
      issuer: 'CamerFarmAI',
    });

    // Sauvegarder temporairement le secret (pas encore activé)
    user.twoFactorSecret = secret.base32;
    await userRepository.save(user);

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32 || '',
      qrCodeUrl,
    };
  }

  // 8. Vérifier un code 2FA
  static verifyTwoFactorToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Permet une fenêtre de ±2 périodes (60 secondes chacune)
    });
  }

  // 9. Activer le 2FA pour un utilisateur
  static async enableTwoFactor(userId: string, token: string): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    if (!user.twoFactorSecret) {
      throw new HttpException(400, 'Aucun secret 2FA généré. Veuillez d\'abord générer un secret.');
    }

    // Vérifier le code
    const isValid = this.verifyTwoFactorToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new HttpException(400, 'Code 2FA invalide');
    }

    // Activer le 2FA
    user.twoFactorEnabled = true;
    return await userRepository.save(user);
  }

  // 10. Désactiver le 2FA pour un utilisateur
  static async disableTwoFactor(userId: string, token: string): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    if (!user.twoFactorEnabled) {
      throw new HttpException(400, 'Le 2FA n\'est pas activé pour cet utilisateur');
    }

    if (!user.twoFactorSecret) {
      throw new HttpException(400, 'Aucun secret 2FA trouvé');
    }

    // Vérifier le code avant de désactiver
    const isValid = this.verifyTwoFactorToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new HttpException(400, 'Code 2FA invalide');
    }

    // Désactiver le 2FA et supprimer le secret
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    return await userRepository.save(user);
  }

  // 11. Réinitialiser le mot de passe d'un utilisateur
  static async resetPassword(userId: string, newPassword: string): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    // Vérifier que le compte est actif
    if (!user.isActive) {
      throw new HttpException(403, 'Impossible de réinitialiser le mot de passe d\'un compte désactivé');
    }

    // Hasher le nouveau mot de passe (utiliser bcrypt directement car @BeforeInsert ne s'exécute que sur insert)
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Mettre à jour le mot de passe
    user.password = hashedPassword;
    return await userRepository.save(user);
  }
}