// src/services/admin.service.ts
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { CreateTechnicianDto } from '../types/admin.types';
import { RegisterDto } from '../types/auth.types';
import { AuthService } from './auth.service';
import { HttpException } from '../utils/HttpException';

const userRepository = AppDataSource.getRepository(User);

export class AdminService {
  /**
   * Récupère tous les utilisateurs (FARMER et TECHNICIAN, exclut ADMIN)
   */
  static async getAllUsers(): Promise<User[]> {
    const users = await userRepository.find({
      where: [
        { role: UserRole.FARMER },
        { role: UserRole.TECHNICIAN },
      ],
      select: [
        'id',
        'phone',
        'email',
        'firstName',
        'lastName',
        'role',
        'twoFactorEnabled',
        'createdAt',
        'updatedAt',
      ],
      relations: ['plantations'],
      order: {
        createdAt: 'DESC',
      },
    });

    return users;
  }

  /**
   * Récupère les détails complets d'un utilisateur avec ses plantations
   */
  static async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'phone',
        'email',
        'firstName',
        'lastName',
        'role',
        'twoFactorEnabled',
        'createdAt',
        'updatedAt',
      ],
      relations: ['plantations'],
    });

    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    // Vérifier que ce n'est pas un ADMIN (on ne veut pas exposer les admins)
    if (user.role === UserRole.ADMIN) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Crée un compte technicien
   */
  static async createTechnician(dto: CreateTechnicianDto): Promise<User> {
    // Convertir CreateTechnicianDto en RegisterDto
    const registerDto: RegisterDto = {
      phone: dto.phone,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    };

    // Utiliser AuthService.register avec le rôle TECHNICIAN
    const technician = await AuthService.register(registerDto, UserRole.TECHNICIAN);

    return technician;
  }

  /**
   * Supprime un utilisateur et ses plantations en cascade
   */
  static async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role'],
    });

    if (!user) {
      throw new HttpException(404, 'Utilisateur non trouvé');
    }

    // Empêcher la suppression d'un ADMIN
    if (user.role === UserRole.ADMIN) {
      throw new HttpException(400, 'Impossible de supprimer un compte administrateur');
    }

    // TypeORM gère automatiquement la suppression en cascade grâce à onDelete: 'CASCADE'
    // Les plantations seront supprimées automatiquement
    // Utiliser delete au lieu de remove pour éviter de charger toute l'entité
    await userRepository.delete(userId);
  }
}

