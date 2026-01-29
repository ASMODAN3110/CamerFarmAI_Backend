// RegisterDto
export class RegisterDto {
    phone!: string;
    password!: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }
  
  // LoginDto
  export class LoginDto {
    email!: string;
    password!: string;
    twoFactorCode?: string; // Code 2FA optionnel
  }

  // UpdateProfileDto
  export class UpdateProfileDto {
    phone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }

  // ForgotPasswordDto
  export interface ForgotPasswordDto {
    email: string;
  }

  // ResetPasswordDto
  export interface ResetPasswordDto {
    token: string;
    newPassword: string;
  }

  // GoogleAuthDto
  export interface GoogleAuthDto {
    idToken: string;
  }

  // GoogleUserInfo
  export interface GoogleUserInfo {
    sub: string;              // Google ID
    email: string;
    email_verified: boolean;
    name?: string;
    given_name?: string;      // Prénom
    family_name?: string;     // Nom
    picture?: string;         // URL de la photo de profil
  }