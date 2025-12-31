// src/types/admin.types.ts

// DTO pour créer un compte technicien
export class CreateTechnicianDto {
  phone!: string;
  password!: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Format de réponse pour les utilisateurs (sans mot de passe)
export interface UserResponseDto {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt?: Date;
  plantationsCount?: number;
  plantations?: Array<{
    id: string;
    name: string;
    location: string | null;
    cropType: string;
  }>;
}

