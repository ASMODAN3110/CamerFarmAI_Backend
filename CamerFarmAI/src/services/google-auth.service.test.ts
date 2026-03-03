
import { GoogleAuthService } from './google-auth.service';
import { GoogleUserInfo } from '../types/auth.types';
import { User, AuthProvider } from '../models/User.entity';
import { HttpException } from '../utils/HttpException';

// Mock du repository avant les imports si nécessaire, mais ici on le fait via jest.mock
const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockCreate = jest.fn();

jest.mock('../config/database', () => ({
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue({
            findOne: (...args: any[]) => mockFindOne(...args),
            save: (...args: any[]) => mockSave(...args),
            create: (...args: any[]) => mockCreate(...args),
        }),
    },
}));

describe('GoogleAuthService', () => {
    const mockGoogleUserInfo: GoogleUserInfo = {
        sub: 'google-id-123',
        email: 'test@gmail.com',
        email_verified: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findUser', () => {
        it('devrait retourner l\'utilisateur s\'il est trouvé par son googleId et mettre à jour ses infos', async () => {
            const existingUser = {
                id: 'uuid-1',
                googleId: 'google-id-123',
                email: 'old@gmail.com',
                firstName: 'Old',
                lastName: 'Name',
                avatarUrl: 'old-pic',
                isActive: true,
                authProvider: AuthProvider.GOOGLE
            } as User;

            mockFindOne.mockResolvedValueOnce(existingUser);
            mockSave.mockResolvedValueOnce({ ...existingUser, email: 'test@gmail.com' });

            const result = await GoogleAuthService.findUser(mockGoogleUserInfo);

            expect(mockFindOne).toHaveBeenCalledWith({ where: { googleId: 'google-id-123' } });
            expect(existingUser.email).toBe(mockGoogleUserInfo.email);
            expect(existingUser.firstName).toBe(mockGoogleUserInfo.given_name);
            expect(mockSave).toHaveBeenCalledWith(existingUser);
            expect(result).toBeDefined();
        });

        it('devrait lever une erreur 403 si l\'utilisateur trouvé par googleId est inactif', async () => {
            const inactiveUser = {
                googleId: 'google-id-123',
                isActive: false
            } as User;

            mockFindOne.mockResolvedValueOnce(inactiveUser);

            await expect(GoogleAuthService.findUser(mockGoogleUserInfo))
                .rejects.toThrow(HttpException);
        });

        it('devrait trouver l\'utilisateur par email s\'il n\'est pas trouvé par googleId et mettre à jour le googleId', async () => {
            mockFindOne
                .mockResolvedValueOnce(null) // Pas trouvé par googleId
                .mockResolvedValueOnce({
                    id: 'uuid-2',
                    email: 'test@gmail.com',
                    authProvider: AuthProvider.GOOGLE,
                    isActive: true
                } as User); // Trouvé par email

            mockSave.mockImplementation(user => Promise.resolve(user));

            const result = await GoogleAuthService.findUser(mockGoogleUserInfo);

            expect(mockFindOne).toHaveBeenCalledTimes(2);
            expect(result.googleId).toBe(mockGoogleUserInfo.sub);
            expect(mockSave).toHaveBeenCalled();
        });

        it('devrait lever une erreur 409 si l\'email appartient à un compte LOCAL', async () => {
            mockFindOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    email: 'test@gmail.com',
                    authProvider: AuthProvider.LOCAL
                } as User);

            await expect(GoogleAuthService.findUser(mockGoogleUserInfo))
                .rejects.toThrow(HttpException);
        });

        it('devrait lever une erreur 404 si aucun utilisateur n\'est trouvé (ni googleId, ni email)', async () => {
            mockFindOne.mockResolvedValue(null);

            await expect(GoogleAuthService.findUser(mockGoogleUserInfo))
                .rejects.toThrow(HttpException);
        });
    });
});
