import { protectRoute, restrictTo, optionalAuth } from './auth.middleware';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const mockedJwtVerify = jwt.verify as unknown as jest.Mock;
const mockedGetRepository = (AppDataSource.getRepository as unknown as jest.Mock);

describe('auth.middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    jest.clearAllMocks();
  });

  describe('protectRoute', () => {
    it('retourne 401 si aucun token n’est fourni', async () => {
      const req: any = { headers: {}, cookies: {} };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await protectRoute(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('attache req.user et appelle next si token valide et user actif', async () => {
      const token = 'token-1';
      mockedJwtVerify.mockReturnValue({ sub: 'user-1', role: UserRole.FARMER });

      const mockUser = {
        id: 'user-1',
        phone: '+237000000000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: UserRole.FARMER,
        isActive: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      mockedGetRepository.mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      const req: any = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      };
      const res: any = { status: jest.fn(), json: jest.fn() };
      const next = jest.fn();

      await protectRoute(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-1');
      expect(next).toHaveBeenCalled();
    });

    it('retourne 401 si le user est inactif', async () => {
      const token = 'token-2';
      mockedJwtVerify.mockReturnValue({ sub: 'user-2', role: UserRole.FARMER });

      const mockUser = {
        id: 'user-2',
        phone: '+237000000000',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        role: UserRole.FARMER,
        isActive: false,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      mockedGetRepository.mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      const req: any = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await protectRoute(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('restrictTo', () => {
    it('retourne 403 si req.user n’est pas défini', () => {
      const handler = restrictTo(UserRole.TECHNICIAN);
      const req: any = { user: undefined, path: '/x' };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('retourne 403 si role non autorisé', () => {
      const handler = restrictTo(UserRole.ADMIN);
      const req: any = { user: { role: UserRole.FARMER }, path: '/x' };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('appelle next si role autorisé', () => {
      const handler = restrictTo(UserRole.ADMIN);
      const req: any = { user: { role: UserRole.ADMIN }, path: '/x' };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      handler(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('continue sans erreur si token invalide (silencieux)', async () => {
      mockedJwtVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const req: any = {
        headers: { authorization: 'Bearer bad' },
        cookies: {},
      };
      const res: any = {};
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

