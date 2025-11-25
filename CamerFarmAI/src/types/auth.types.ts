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