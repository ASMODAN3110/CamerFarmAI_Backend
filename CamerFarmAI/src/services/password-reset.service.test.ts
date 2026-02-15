
import * as jwt from 'jsonwebtoken';

describe('PasswordResetService', () => {
    const JWT_SECRET = 'test-secret-key';
    let PasswordResetService: any;
    let mockFindOne: jest.Mock;
    let mockCreate: jest.Mock;
    let mockSave: jest.Mock;

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;

        // Mock AppDataSource
        mockFindOne = jest.fn();
        mockCreate = jest.fn();
        mockSave = jest.fn();
        jest.mock('../config/database', () => ({
            AppDataSource: {
                getRepository: jest.fn().mockReturnValue({
                    findOne: mockFindOne,
                    create: mockCreate,
                    save: mockSave,
                }),
            },
        }));

        // Dynamic import/require to ensure env var is read correctly
        jest.resetModules(); // Clear cache to reload module
        const module = require('./password-reset.service');
        PasswordResetService = module.PasswordResetService;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
        jest.resetModules();
        jest.unmock('../config/database');
    });

    beforeEach(() => {
        mockFindOne.mockClear();
        mockCreate.mockClear();
        mockSave.mockClear();
    });

    describe('generateResetToken', () => {
        it('devrait retourner une chaîne de caractères (token)', () => {
            const userId = 'user-123';
            const token = PasswordResetService.generateResetToken(userId);

            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
        });

        it('devrait générer un token valide vérifiable avec le même secret', () => {
            const userId = 'user-456';
            const token = PasswordResetService.generateResetToken(userId);

            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
            expect(decoded).toBeTruthy();
        });

        it('devrait inclure le userId dans le champ "sub" du payload', () => {
            const userId = 'user-789';
            const token = PasswordResetService.generateResetToken(userId);

            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
            expect(decoded.sub).toBe(userId);
        });

        it('devrait inclure le type "password_reset" dans le payload', () => {
            const userId = 'user-abc';
            const token = PasswordResetService.generateResetToken(userId);

            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { type: string };
            expect(decoded.type).toBe('password_reset');
        });

        it('devrait avoir une expiration définie (environ 1h)', () => {
            const userId = 'user-exp';
            const token = PasswordResetService.generateResetToken(userId);

            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

            // jwt 'expiresIn: 1h' ajoute 3600 secondes à iat
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();

            if (decoded.exp && decoded.iat) {
                const duration = decoded.exp - decoded.iat;
                expect(duration).toBe(3600);
            }
        });

        it('devrait générer des tokens différents pour des utilisateurs différents', () => {
            const token1 = PasswordResetService.generateResetToken('user-1');
            const token2 = PasswordResetService.generateResetToken('user-2');

            expect(token1).not.toBe(token2);
        });
    });

    describe('verifyResetToken', () => {
        // ... (preserving existing tests)
        it('devrait retourner le userId pour un token valide', () => {
            const userId = 'user-valid';
            const token = PasswordResetService.generateResetToken(userId);

            const result = PasswordResetService.verifyResetToken(token);
            expect(result).not.toBeNull();
            expect(result?.userId).toBe(userId);
        });

        it('devrait retourner null pour un token invalide (fausse signature)', () => {
            const token = jwt.sign({ sub: 'user-hack', type: 'password_reset' }, 'wrong-secret');
            const result = PasswordResetService.verifyResetToken(token);
            expect(result).toBeNull();
        });

        it('devrait retourner null pour un token avec un mauvais type', () => {
            const token = jwt.sign({ sub: 'user-wrong-type', type: 'access_token' }, JWT_SECRET);
            const result = PasswordResetService.verifyResetToken(token);
            expect(result).toBeNull();
        });

        it('devrait retourner null pour un token expiré', () => {
            // On signe un token expiré il y a 1 seconde
            const token = jwt.sign(
                { sub: 'user-expired', type: 'password_reset' },
                JWT_SECRET,
                { expiresIn: '-1s' }
            );

            const result = PasswordResetService.verifyResetToken(token);
            expect(result).toBeNull();
        });

        it('devrait retourner null pour une chaîne malformée', () => {
            const result = PasswordResetService.verifyResetToken('not-a-token');
            expect(result).toBeNull();
        });

        it('devrait retourner null si le token ne contient pas de userId (claim "sub")', () => {
            const token = jwt.sign({ type: 'password_reset' }, JWT_SECRET);
            const result = PasswordResetService.verifyResetToken(token);
            expect(result).toBeNull();
        });
    });

    describe('findUser', () => {
        it('devrait retourner l\'utilisateur si l\'email existe', async () => {
            const email = 'test@example.com';
            const mockUser = { id: 'user-123', email, firstName: 'Test', lastName: 'User' };

            mockFindOne.mockResolvedValue(mockUser);

            const user = await PasswordResetService.findUser(email);

            expect(mockFindOne).toHaveBeenCalledWith({ where: { email } });
            expect(user).toEqual(mockUser);
        });

        it('devrait retourner null si l\'utilisateur n\'existe pas', async () => {
            const email = 'unknown@example.com';
            mockFindOne.mockResolvedValue(null);

            const user = await PasswordResetService.findUser(email);

            expect(mockFindOne).toHaveBeenCalledWith({ where: { email } });
            expect(user).toBeNull();
        });

        it('devrait propager les erreurs de la base de données', async () => {
            const email = 'error@example.com';
            const error = new Error('Database connection failed');
            mockFindOne.mockRejectedValue(error);

            await expect(PasswordResetService.findUser(email)).rejects.toThrow('Database connection failed');
        });
    });

    describe('createUser', () => {
        it('devrait créer et sauvegarder un utilisateur', async () => {
            const email = 'newuser@example.com';
            const firstName = 'New';
            const lastName = 'User';

            const userData = { email, firstName, lastName, isActive: true };
            const savedUser = { id: 'generated-id', ...userData };

            mockCreate.mockReturnValue(userData); // Simule la création de l'objet
            mockSave.mockResolvedValue(savedUser); // Simule la sauvegarde

            const user = await PasswordResetService.createUser(email, firstName, lastName);

            expect(mockCreate).toHaveBeenCalledWith(userData);
            expect(mockSave).toHaveBeenCalledWith(userData);
            expect(user).toEqual(savedUser);
        });

        it('devrait propager les erreurs lors de la sauvegarde', async () => {
            const email = 'error@example.com';
            const firstName = 'Error';
            const lastName = 'User';

            mockCreate.mockReturnValue({ email, firstName, lastName, isActive: true });
            mockSave.mockRejectedValue(new Error('Save failed'));

            await expect(PasswordResetService.createUser(email, firstName, lastName))
                .rejects.toThrow('Save failed');
        });
    });
});
