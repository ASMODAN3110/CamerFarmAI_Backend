// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { CreateTechnicianDto } from '../types/admin.types';
import { HttpException } from '../utils/HttpException';
import { validationResult } from 'express-validator';

/**
 * GET /api/v1/admin/users
 * Récupère tous les utilisateurs (agriculteurs et techniciens)
 */
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await AdminService.getAllUsers();

    // Formater la réponse avec le nombre de plantations
    const formattedUsers = users.map((user) => ({
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      plantationsCount: user.plantations?.length || 0,
    }));

    return res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des utilisateurs',
    });
  }
};

/**
 * GET /api/v1/admin/users/:id
 * Récupère les détails d'un utilisateur spécifique avec ses plantations
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await AdminService.getUserById(id);

    // Formater les plantations pour la réponse
    const formattedPlantations = (user.plantations || []).map((plantation) => ({
      id: plantation.id,
      name: plantation.name,
      location: plantation.location,
      cropType: plantation.cropType,
    }));

    return res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        plantations: formattedPlantations,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'utilisateur',
    });
  }
};

/**
 * POST /api/v1/admin/users/technicians
 * Crée un compte technicien
 */
export const createTechnician = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    });
  }

  try {
    const dto: CreateTechnicianDto = req.body;
    const technician = await AdminService.createTechnician(dto);

    return res.status(201).json({
      success: true,
      message: 'Compte technicien créé avec succès',
      data: {
        id: technician.id,
        phone: technician.phone,
        email: technician.email,
        firstName: technician.firstName,
        lastName: technician.lastName,
        role: technician.role,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création du technicien:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur lors de la création du technicien',
    });
  }
};

/**
 * DELETE /api/v1/admin/users/:id
 * Supprime un utilisateur (et ses plantations en cascade)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await AdminService.deleteUser(id);

    return res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);

    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'utilisateur',
    });
  }
};

