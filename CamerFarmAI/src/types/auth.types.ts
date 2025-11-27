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
  }

  // UpdateProfileDto
  export class UpdateProfileDto {
    phone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }