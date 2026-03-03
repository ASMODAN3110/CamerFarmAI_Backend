import { AdminService } from './admin.service';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { AuthService } from './auth.service';
import { HttpException } from '../utils/HttpException';

// Mock du repository TypeORM
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockDelete = jest.fn();
const mockSave = jest.fn();

jest.mock('../config/database', () => ({
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue({
            find: (...args: any[]) => mockFind(...args),
            findOne: (...args: any[]) => mockFindOne(...args),
            delete: (...args: any[]) => mockDelete(...args),
            save: (...args: any[]) => mockSave(...args),
        }),
    },
}));

// Mock implicite de AuthService pour createTechnician
jest.mock('./auth.service', () => ({
    AuthService: {
        register: jest.fn(),
    },
}));

describe('AdminService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllUsers', () => {
        it('devrait retourner les utilisateurs (FARMER et TECHNICIAN)', async () => {
            const mockUsers = [
                { id: '1', role: UserRole.FARMER, firstName: 'John' },
                { id: '2', role: UserRole.TECHNICIAN, firstName: 'Jane' },
            ];

            mockFind.mockResolvedValueOnce(mockUsers);

            const result = await AdminService.getAllUsers();

            expect(mockFind).toHaveBeenCalledWith({
                where: [
                    { role: UserRole.FARMER },
                    { role: UserRole.TECHNICIAN },
                ],
                select: [
                    'id', 'phone', 'email', 'firstName', 'lastName',
                    'role', 'twoFactorEnabled', 'isActive', 'createdAt', 'updatedAt'
                ],
                relations: ['plantations'],
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(mockUsers);
        });
    });

    describe('getUserById', () => {
        it('devrait retourner l\'utilisateur s\'il n\'est pas administrateur', async () => {
            const mockUser = { id: 'uuid-1', role: UserRole.FARMER, firstName: 'Test' };
            mockFindOne.mockResolvedValueOnce(mockUser);

            const result = await AdminService.getUserById('uuid-1');

            expect(mockFindOne).toHaveBeenCalledWith({
                where: { id: 'uuid-1' },
                select: [
                    'id', 'phone', 'email', 'firstName', 'lastName',
                    'role', 'twoFactorEnabled', 'isActive', 'createdAt', 'updatedAt'
                ],
                relations: ['plantations'],
            });
            expect(result).toEqual(mockUser);
        });

        it('devrait lever une erreur 404 si l\'utilisateur n\'existe pas', async () => {
            mockFindOne.mockResolvedValueOnce(null);

            await expect(AdminService.getUserById('uuid-error')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('devrait lever une erreur 404 si l\'utilisateur est un ADMIN', async () => {
            const mockUser = { id: 'uuid-admin', role: UserRole.ADMIN };
            mockFindOne.mockResolvedValueOnce(mockUser);

            await expect(AdminService.getUserById('uuid-admin')).rejects.toMatchObject({ statusCode: 404, message: 'Utilisateur non trouvé' });
        });
    });

    describe('createTechnician', () => {
        it('devrait appeler AuthService.register avec le role TECHNICIAN', async () => {
            const dto = {
                phone: '+237123456789',
                password: 'password123',
                firstName: 'Tech',
                lastName: 'Nician',
                email: 'tech@example.com',
            };

            const mockRegisteredTechnician = { id: 'uuid-tech', ...dto, role: UserRole.TECHNICIAN };

            // Récupération de la méthode mockée
            const mockRegister = AuthService.register as jest.Mock;
            mockRegister.mockResolvedValueOnce(mockRegisteredTechnician);

            const result = await AdminService.createTechnician(dto);

            expect(mockRegister).toHaveBeenCalledWith(
                {
                    phone: dto.phone,
                    password: dto.password,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                },
                UserRole.TECHNICIAN
            );

            expect(result).toEqual(mockRegisteredTechnician);
        });
    });

    describe('deleteUser', () => {
        it('devrait supprimer un utilisateur', async () => {
            const mockUser = { id: 'uuid-1', role: UserRole.FARMER };
            mockFindOne.mockResolvedValueOnce(mockUser);

            await AdminService.deleteUser('uuid-1');

            expect(mockFindOne).toHaveBeenCalledWith({
                where: { id: 'uuid-1' },
                select: ['id', 'role']
            });
            expect(mockDelete).toHaveBeenCalledWith('uuid-1');
        });

        it('devrait lever une erreur 404 si l\'utilisateur n\'existe pas', async () => {
            mockFindOne.mockResolvedValueOnce(null);

            await expect(AdminService.deleteUser('uuid-none')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockDelete).not.toHaveBeenCalled();
        });

        it('devrait lever une erreur 400 si on essaie de supprimer un ADMIN', async () => {
            const mockUser = { id: 'uuid-admin', role: UserRole.ADMIN };
            mockFindOne.mockResolvedValueOnce(mockUser);

            await expect(AdminService.deleteUser('uuid-admin')).rejects.toMatchObject({ statusCode: 400 });
            expect(mockDelete).not.toHaveBeenCalled();
        });
    });

    describe('toggleUserStatus', () => {
        it('devrait mettre à jour le status de l\'utilisateur et sauvegarder', async () => {
            const mockUser = { id: 'uuid-1', role: UserRole.FARMER, isActive: false };
            mockFindOne.mockResolvedValueOnce(mockUser);
            mockSave.mockImplementationOnce((user) => Promise.resolve(user));

            const result = await AdminService.toggleUserStatus('uuid-1', true);

            expect(mockFindOne).toHaveBeenCalledWith({
                where: { id: 'uuid-1' },
                select: ['id', 'role', 'isActive']
            });
            expect(result.isActive).toBe(true);
            expect(mockSave).toHaveBeenCalledWith({ ...mockUser, isActive: true });
        });

        it('devrait lever une erreur 404 si l\'utilisateur n\'existe pas', async () => {
            mockFindOne.mockResolvedValueOnce(null);

            await expect(AdminService.toggleUserStatus('uuid-none', true)).rejects.toMatchObject({ statusCode: 404 });
            expect(mockSave).not.toHaveBeenCalled();
        });

        it('devrait lever une erreur 400 si on essaie de modifier le status d\'un ADMIN', async () => {
            const mockUser = { id: 'uuid-admin', role: UserRole.ADMIN, isActive: true };
            mockFindOne.mockResolvedValueOnce(mockUser);

            await expect(AdminService.toggleUserStatus('uuid-admin', false)).rejects.toMatchObject({ statusCode: 400 });
            expect(mockSave).not.toHaveBeenCalled();
        });
    });
});
