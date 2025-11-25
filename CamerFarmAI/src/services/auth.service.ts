// src/services/auth.service.ts
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { RegisterDto } from '../types/auth.types';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { HttpException } from '../utils/HttpException';

const userRepository = AppDataSource.getRepository(User);

// Définir JWT_SECRET une seule fois au niveau du module
const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

export class AuthService {
    // 1. Inscription
    static async register(dto: RegisterDto): Promise<User> {
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
        role: UserRole.FARMER, // par défaut
      });
  
      return await userRepository.save(user);
    }
    // 2. Validation des identifiants (utilisé pour le login)
  static async validateUser(email: string, plainPassword: string): Promise<User | null> {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) return null;

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
}