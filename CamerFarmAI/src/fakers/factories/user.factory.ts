// src/fakers/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../models/User.entity';
import { generateCameroonPhoneNumber } from '../helpers/cameroon-data';

export interface CreateUserOptions {
  role?: UserRole;
  twoFactorEnabled?: boolean;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

/**
 * Factory pour générer des utilisateurs avec des données réalistes
 */
export class UserFactory {
  /**
   * Génère un utilisateur avec des données réalistes
   */
  static async create(options: CreateUserOptions = {}): Promise<Partial<User>> {
    const {
      role = faker.helpers.arrayElement([UserRole.FARMER, UserRole.TECHNICIAN, UserRole.ADMIN]),
      twoFactorEnabled = faker.datatype.boolean({ probability: 0.2 }),
      phone,
      email,
      firstName,
      lastName,
      password = 'Password!123', // Mot de passe par défaut pour les tests
    } = options;

    const finalPhone = phone || generateCameroonPhoneNumber();
    const finalEmail = email || faker.internet.email({ firstName: firstName || faker.person.firstName(), lastName: lastName || faker.person.lastName() });
    const finalFirstName = firstName || faker.person.firstName();
    const finalLastName = lastName || faker.person.lastName();

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    const user: Partial<User> = {
      phone: finalPhone,
      email: finalEmail,
      firstName: finalFirstName,
      lastName: finalLastName,
      role,
      password: hashedPassword,
      twoFactorEnabled,
      twoFactorSecret: twoFactorEnabled ? faker.string.alphanumeric(32) : null,
    };

    return user;
  }

  /**
   * Génère plusieurs utilisateurs
   */
  static async createBatch(count: number, options: CreateUserOptions = {}): Promise<Partial<User>[]> {
    const users: Partial<User>[] = [];
    const usedPhones = new Set<string>();
    const usedEmails = new Set<string>();

    for (let i = 0; i < count; i++) {
      let phone: string;
      let email: string;

      // Éviter les doublons
      do {
        phone = generateCameroonPhoneNumber();
      } while (usedPhones.has(phone));
      usedPhones.add(phone);

      do {
        email = faker.internet.email();
      } while (usedEmails.has(email));
      usedEmails.add(email);

      const user = await this.create({
        ...options,
        phone,
        email,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Génère un utilisateur farmer
   */
  static async createFarmer(options: Omit<CreateUserOptions, 'role'> = {}): Promise<Partial<User>> {
    return this.create({ ...options, role: UserRole.FARMER });
  }

  /**
   * Génère un utilisateur technician
   */
  static async createTechnician(options: Omit<CreateUserOptions, 'role'> = {}): Promise<Partial<User>> {
    return this.create({ ...options, role: UserRole.TECHNICIAN });
  }

  /**
   * Génère un utilisateur admin
   */
  static async createAdmin(options: Omit<CreateUserOptions, 'role'> = {}): Promise<Partial<User>> {
    return this.create({ ...options, role: UserRole.ADMIN });
  }

  /**
   * Génère un utilisateur avec 2FA activé
   */
  static async createWith2FA(options: Omit<CreateUserOptions, 'twoFactorEnabled'> = {}): Promise<Partial<User>> {
    return this.create({ ...options, twoFactorEnabled: true });
  }
}

