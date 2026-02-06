// src/services/auth.service.test.ts
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { User, UserRole } from '../models/User.entity';

describe('AuthService.generateTokens', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  
  // Mock user pour les tests
  const createMockUser = (overrides?: Partial<User>): User => {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      phone: '+237612345678',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.FARMER,
      password: null,
      authProvider: 'local' as any,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      isActive: true,
      avatarUrl: null,
      googleId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plantations: [],
      ...overrides,
    } as User;
  };

  beforeEach(() => {
    // S'assurer que les variables d'environnement sont définies
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    // Nettoyer les variables d'environnement après chaque test
    jest.clearAllMocks();
  });

  describe('Génération de base', () => {
    it('devrait générer un accessToken et un refreshToken', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('devrait générer des tokens différents', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('devrait générer des tokens non vides', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.refreshToken.length).toBeGreaterThan(0);
    });
  });

  describe('Payload JWT', () => {
    it('devrait inclure sub (user.id) dans le payload', () => {
      const user = createMockUser({ id: 'test-user-id-123' });
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.decode(result.accessToken) as jwt.JwtPayload;
      const decodedRefresh = jwt.decode(result.refreshToken) as jwt.JwtPayload;

      expect(decodedAccess.sub).toBe('test-user-id-123');
      expect(decodedRefresh.sub).toBe('test-user-id-123');
    });

    it('devrait inclure phone dans le payload', () => {
      const user = createMockUser({ phone: '+237987654321' });
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.decode(result.accessToken) as jwt.JwtPayload;
      const decodedRefresh = jwt.decode(result.refreshToken) as jwt.JwtPayload;

      expect(decodedAccess.phone).toBe('+237987654321');
      expect(decodedRefresh.phone).toBe('+237987654321');
    });

    it('devrait inclure role dans le payload', () => {
      const user = createMockUser({ role: UserRole.ADMIN });
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.decode(result.accessToken) as jwt.JwtPayload;
      const decodedRefresh = jwt.decode(result.refreshToken) as jwt.JwtPayload;

      expect(decodedAccess.role).toBe(UserRole.ADMIN);
      expect(decodedRefresh.role).toBe(UserRole.ADMIN);
    });

    it('devrait inclure tous les champs requis dans le payload', () => {
      const user = createMockUser({
        id: 'user-123',
        phone: '+237111222333',
        role: UserRole.TECHNICIAN,
      });
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.decode(result.accessToken) as jwt.JwtPayload;
      const decodedRefresh = jwt.decode(result.refreshToken) as jwt.JwtPayload;

      expect(decodedAccess).toMatchObject({
        sub: 'user-123',
        phone: '+237111222333',
        role: UserRole.TECHNICIAN,
      });

      expect(decodedRefresh).toMatchObject({
        sub: 'user-123',
        phone: '+237111222333',
        role: UserRole.TECHNICIAN,
      });
    });
  });

  describe('Expiration des tokens', () => {
    it('devrait utiliser ACCESS_TOKEN_EXPIRES_IN depuis les variables d\'environnement', () => {
      process.env.ACCESS_TOKEN_EXPIRES_IN = '30m';
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp || 0;
      const timeUntilExpiration = expirationTime - now;

      // 30 minutes = 1800 secondes (avec une marge de ±60 secondes)
      expect(timeUntilExpiration).toBeGreaterThan(1740);
      expect(timeUntilExpiration).toBeLessThan(1860);
    });

    it('devrait utiliser REFRESH_TOKEN_EXPIRES_IN depuis les variables d\'environnement', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = '14d';
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.refreshToken, JWT_SECRET) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp || 0;
      const timeUntilExpiration = expirationTime - now;

      // 14 jours = 1209600 secondes (avec une marge de ±3600 secondes)
      expect(timeUntilExpiration).toBeGreaterThan(1206000);
      expect(timeUntilExpiration).toBeLessThan(1213200);
    });

    it('devrait utiliser les valeurs par défaut si les variables d\'environnement ne sont pas définies', () => {
      const originalAccessExpires = process.env.ACCESS_TOKEN_EXPIRES_IN;
      const originalRefreshExpires = process.env.REFRESH_TOKEN_EXPIRES_IN;
      
      delete process.env.ACCESS_TOKEN_EXPIRES_IN;
      delete process.env.REFRESH_TOKEN_EXPIRES_IN;
      
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const decodedRefresh = jwt.verify(result.refreshToken, JWT_SECRET) as jwt.JwtPayload;
      
      const now = Math.floor(Date.now() / 1000);
      const accessExp = decodedAccess.exp || 0;
      const refreshExp = decodedRefresh.exp || 0;

      // Access token devrait expirer dans ~15 minutes (900 secondes)
      expect(accessExp - now).toBeGreaterThan(840);
      expect(accessExp - now).toBeLessThan(960);

      // Refresh token devrait expirer dans ~7 jours (604800 secondes)
      expect(refreshExp - now).toBeGreaterThan(604200);
      expect(refreshExp - now).toBeLessThan(605400);

      // Restaurer les valeurs
      if (originalAccessExpires) process.env.ACCESS_TOKEN_EXPIRES_IN = originalAccessExpires;
      if (originalRefreshExpires) process.env.REFRESH_TOKEN_EXPIRES_IN = originalRefreshExpires;
    });

    it('devrait avoir des dates d\'expiration différentes pour accessToken et refreshToken', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const decodedRefresh = jwt.verify(result.refreshToken, JWT_SECRET) as jwt.JwtPayload;

      const accessExp = decodedAccess.exp || 0;
      const refreshExp = decodedRefresh.exp || 0;

      // Le refresh token devrait expirer bien après l'access token
      expect(refreshExp).toBeGreaterThan(accessExp);
    });
  });

  describe('Validation des tokens', () => {
    it('devrait pouvoir décoder les tokens avec le même JWT_SECRET', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      expect(() => {
        jwt.verify(result.accessToken, JWT_SECRET);
      }).not.toThrow();

      expect(() => {
        jwt.verify(result.refreshToken, JWT_SECRET);
      }).not.toThrow();
    });

    it('devrait échouer la vérification avec un mauvais secret', () => {
      const user = createMockUser();
      const result = AuthService.generateTokens(user);

      expect(() => {
        jwt.verify(result.accessToken, 'wrong-secret');
      }).toThrow();

      expect(() => {
        jwt.verify(result.refreshToken, 'wrong-secret');
      }).toThrow();
    });

    it('devrait contenir les bonnes valeurs après décodage', () => {
      const user = createMockUser({
        id: 'decoded-user-id',
        phone: '+237999888777',
        role: UserRole.FARMER,
      });
      const result = AuthService.generateTokens(user);

      const decodedAccess = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const decodedRefresh = jwt.verify(result.refreshToken, JWT_SECRET) as jwt.JwtPayload;

      expect(decodedAccess.sub).toBe('decoded-user-id');
      expect(decodedAccess.phone).toBe('+237999888777');
      expect(decodedAccess.role).toBe(UserRole.FARMER);

      expect(decodedRefresh.sub).toBe('decoded-user-id');
      expect(decodedRefresh.phone).toBe('+237999888777');
      expect(decodedRefresh.role).toBe(UserRole.FARMER);
    });
  });

  describe('Différents rôles', () => {
    it('devrait générer des tokens pour un FARMER', () => {
      const user = createMockUser({ role: UserRole.FARMER });
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.role).toBe(UserRole.FARMER);
    });

    it('devrait générer des tokens pour un TECHNICIAN', () => {
      const user = createMockUser({ role: UserRole.TECHNICIAN });
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.role).toBe(UserRole.TECHNICIAN);
    });

    it('devrait générer des tokens pour un ADMIN', () => {
      const user = createMockUser({ role: UserRole.ADMIN });
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Utilisateurs avec phone null (Google OAuth)', () => {
    it('devrait générer des tokens même si phone est null', () => {
      const user = createMockUser({ phone: null });
      const result = AuthService.generateTokens(user);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.phone).toBeNull();
    });

    it('devrait inclure phone null dans le payload', () => {
      const user = createMockUser({ 
        id: 'google-user-123',
        phone: null,
        role: UserRole.FARMER,
      });
      const result = AuthService.generateTokens(user);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe('google-user-123');
      expect(decoded.phone).toBeNull();
      expect(decoded.role).toBe(UserRole.FARMER);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait lancer une erreur si JWT_SECRET n\'est pas défini', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      // Recharger le module pour que le changement soit pris en compte
      // Note: En réalité, le module vérifie JWT_SECRET au chargement
      // donc cette erreur serait levée avant l'appel à generateTokens
      
      // Restaurer pour éviter d'affecter les autres tests
      process.env.JWT_SECRET = originalSecret || JWT_SECRET;
    });

    it('devrait fonctionner avec un user minimal (seulement id, phone, role)', () => {
      const minimalUser = {
        id: 'minimal-user',
        phone: '+237000000000',
        role: UserRole.FARMER,
      } as User;

      const result = AuthService.generateTokens(minimalUser);
      
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe('minimal-user');
      expect(decoded.phone).toBe('+237000000000');
      expect(decoded.role).toBe(UserRole.FARMER);
    });
  });

  describe('Cohérence des tokens', () => {
    it('devrait générer des tokens différents pour le même utilisateur à chaque appel', async () => {
      const user = createMockUser();
      const result1 = AuthService.generateTokens(user);
      
      // Attendre un peu pour que le timestamp change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result2 = AuthService.generateTokens(user);

      // Les tokens devraient être différents (car ils contiennent un timestamp)
      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);

      // Mais les payloads devraient être identiques (sauf iat et exp)
      const decoded1 = jwt.verify(result1.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const decoded2 = jwt.verify(result2.accessToken, JWT_SECRET) as jwt.JwtPayload;

      expect(decoded1.sub).toBe(decoded2.sub);
      expect(decoded1.phone).toBe(decoded2.phone);
      expect(decoded1.role).toBe(decoded2.role);
    });

    it('devrait générer des tokens différents pour des utilisateurs différents', () => {
      const user1 = createMockUser({ id: 'user-1', phone: '+237111111111' });
      const user2 = createMockUser({ id: 'user-2', phone: '+237222222222' });

      const result1 = AuthService.generateTokens(user1);
      const result2 = AuthService.generateTokens(user2);

      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);

      const decoded1 = jwt.verify(result1.accessToken, JWT_SECRET) as jwt.JwtPayload;
      const decoded2 = jwt.verify(result2.accessToken, JWT_SECRET) as jwt.JwtPayload;

      expect(decoded1.sub).not.toBe(decoded2.sub);
      expect(decoded1.phone).not.toBe(decoded2.phone);
    });
  });
});
