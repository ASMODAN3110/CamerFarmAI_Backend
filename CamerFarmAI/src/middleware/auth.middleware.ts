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

// Clé secrète JWT (doit être définie dans les variables d'environnement)
const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

interface JwtPayload {
  sub: string; // ID de l'utilisateur (standard JWT)
  phone?: string;
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
    // Le token contient l'ID dans 'sub' (standard JWT)
    const userId = decoded.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide : ID utilisateur manquant.',
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const currentUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'phone', 'firstName', 'lastName', 'email', 'role', 'isActive', 'avatarUrl', 'createdAt', 'updatedAt'],
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé. Token invalide.',
      });
    }

    // Vérifier que le compte est actif
    if (!currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé. Veuillez contacter un administrateur.',
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
      const userId = decoded.sub;
      
      if (userId) {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
          where: { id: userId },
          select: ['id', 'phone', 'firstName', 'lastName', 'email', 'role', 'isActive', 'avatarUrl', 'createdAt', 'updatedAt'],
      });

      // Ne pas attacher l'utilisateur si le compte est désactivé
      if (user && user.isActive) req.user = user;
      }
    }
  } catch (error) {
    // Silently fail – c'est optionnel
  }

  next();
};

// 3. Middleware de rôle (ex: admin seulement)
export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:restrictTo',message:'restrictTo check',data:{hasUser:!!req.user,userRole:req.user?.role,allowedRoles:roles,path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit.',
      });
    }

    if (!roles.includes(req.user.role)) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:restrictTo',message:'Access denied',data:{userRole:req.user.role,allowedRoles:roles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission d\'effectuer cette action.',
      });
    }

    return next();
  };
};