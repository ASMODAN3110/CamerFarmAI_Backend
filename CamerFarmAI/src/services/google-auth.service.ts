// src/services/google-auth.service.ts
import { OAuth2Client } from 'google-auth-library';
import { AppDataSource } from '../config/database';
import { User, UserRole, AuthProvider } from '../models/User.entity';
import { GoogleUserInfo } from '../types/auth.types';
import { HttpException } from '../utils/HttpException';

const userRepository = AppDataSource.getRepository(User);

// Fonction pour obtenir le client OAuth2
function getOAuth2Client(): OAuth2Client {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID n\'est pas défini dans les variables d\'environnement');
  }
  return new OAuth2Client(GOOGLE_CLIENT_ID);
}

export class GoogleAuthService {
  /**
   * Vérifie le token ID Google et retourne les informations utilisateur
   */
  static async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      throw new HttpException(500, 'Configuration Google OAuth manquante. GOOGLE_CLIENT_ID n\'est pas défini.');
    }

    try {
      const client = getOAuth2Client();
      // Vérifier le token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new HttpException(401, 'Token Google invalide');
      }

      // Extraire les informations utilisateur
      const userInfo: GoogleUserInfo = {
        sub: payload.sub,
        email: payload.email || '',
        email_verified: payload.email_verified || false,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };

      // Vérifier que l'email est vérifié
      if (!userInfo.email_verified) {
        throw new HttpException(401, 'L\'email Google n\'est pas vérifié');
      }

      return userInfo;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      console.error('Erreur vérification token Google:', error?.message || error);
      throw new HttpException(401, 'Token Google invalide ou expiré');
    }
  }

  /**
   * Trouve ou crée un utilisateur à partir des informations Google
   */
  static async findOrCreateUser(googleUserInfo: GoogleUserInfo): Promise<User> {
    const { sub: googleId, email, given_name, family_name, picture } = googleUserInfo;

    // 1. Chercher d'abord par googleId
    let user = await userRepository.findOne({ where: { googleId } });

    if (user) {
      // Utilisateur existe déjà avec ce googleId
      // Vérifier que le compte est actif
      if (!user.isActive) {
        throw new HttpException(403, 'Votre compte a été désactivé. Veuillez contacter l\'administrateur.');
      }

      // Mettre à jour les informations si nécessaire
      if (email && email !== user.email) {
        user.email = email;
      }
      if (given_name && given_name !== user.firstName) {
        user.firstName = given_name;
      }
      if (family_name && family_name !== user.lastName) {
        user.lastName = family_name;
      }
      if (picture && picture !== user.avatarUrl) {
        user.avatarUrl = picture;
      }

      return await userRepository.save(user);
    }

    // 2. Chercher par email
    if (email) {
      user = await userRepository.findOne({ where: { email } });

      if (user) {
        // Utilisateur existe avec cet email mais pas avec ce googleId
        // Vérifier le provider
        if (user.authProvider === AuthProvider.LOCAL) {
          // Compte local existant avec le même email
          // On peut soit lier les comptes, soit retourner une erreur
          // Pour l'instant, on retourne une erreur pour éviter les conflits
          throw new HttpException(
            409,
            'Un compte existe déjà avec cet email. Veuillez vous connecter avec votre mot de passe ou utiliser un autre compte Google.'
          );
        } else if (user.authProvider === AuthProvider.GOOGLE) {
          // Compte Google existant mais sans googleId (cas rare)
          // Mettre à jour avec le googleId
          user.googleId = googleId;
          if (given_name) user.firstName = given_name;
          if (family_name) user.lastName = family_name;
          if (picture) user.avatarUrl = picture;

          return await userRepository.save(user);
        }
      }
    }

    // 3. Créer un nouvel utilisateur
    // Les utilisateurs Google pourront ajouter leur téléphone plus tard
    const newUserData: Partial<User> = {
      googleId: googleId,
      email: email || null,
      firstName: given_name || null,
      lastName: family_name || null,
      avatarUrl: picture || null,
      phone: null, // Nullable maintenant, l'utilisateur pourra l'ajouter plus tard
      authProvider: AuthProvider.GOOGLE,
      role: UserRole.FARMER, // Rôle par défaut
      password: null, // Pas de mot de passe pour les utilisateurs Google
      isActive: true,
    };
    
    const newUser = userRepository.create(newUserData);
    const savedUser = await userRepository.save(newUser);
    return savedUser;
  }

  /**
   * Authentifie un utilisateur avec un token Google
   * Combine verifyIdToken et findOrCreateUser
   */
  static async authenticateWithGoogle(idToken: string): Promise<User> {
    // Vérifier le token
    const googleUserInfo = await this.verifyIdToken(idToken);

    // Trouver ou créer l'utilisateur
    return await this.findOrCreateUser(googleUserInfo);
  }
}
