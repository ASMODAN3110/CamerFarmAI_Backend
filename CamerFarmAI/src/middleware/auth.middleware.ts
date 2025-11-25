import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';

// Étendre le type Request pour ajouter req.user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Clé secrète (à mettre dans .env plus tard)
const JWT_SECRET = process.env.JWT_SECRET || 'ta_cle_super_secrete_256_bits_ici';

interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// 1. Middleware principal : protection obligatoire des routes
export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // 1. Chercher le token dans l'en-tête Authorization: Bearer <token>
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Si pas dans l'en-tête, chercher dans les cookies (utile pour le refresh)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Aucun token fourni.',
      });
    }

    // 3. Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // 4. Récupérer l'utilisateur depuis la base
    const userRepository = AppDataSource.getRepository(User);
    const currentUser = await userRepository.findOne({
      where: { id: decoded.id },
      select: ['id', 'phone', 'firstName', 'lastName', 'role'],
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé. Token invalide.',
      });
    }

    // 5. Attacher l'utilisateur à la requête
    req.user = currentUser;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Veuillez vous reconnecter.',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token invalide ou corrompu.',
    });
  }
};

// 2. Middleware optionnel : permet d'accéder à req.user si connecté, sinon continue
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.id },
        select: ['id', 'phone', 'firstName', 'lastName', 'role'],
      });

      if (user) req.user = user;
    }
  } catch (error) {
    // Silently fail – c'est optionnel
  }

  next();
};

// 3. Middleware de rôle (ex: admin seulement)
export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission d\'effectuer cette action.',
      });
    }

    return next();
  };
};