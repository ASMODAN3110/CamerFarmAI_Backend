
import * as jwt from 'jsonwebtoken';

describe('PasswordResetService', () => {
    const JWT_SECRET = 'test-secret-key';
    let PasswordResetService: any;

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        // Dynamic import/require to ensure env var is read correctly
        jest.resetModules(); // Clear cache to reload module
        const module = require('./password-reset.service');
        PasswordResetService = module.PasswordResetService;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
        jest.resetModules();
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
    });
});
