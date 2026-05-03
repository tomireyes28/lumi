import { Request } from 'express';

// Tipado de lo que nos devuelve Google
export interface GoogleUser {
  email: string;
  name: string;
}

// Tipado de lo que guardamos adentro del Token JWT
export interface JwtPayload {
  sub: string;
  email: string;
}

// Tipado de la Request de Express ya interceptada por el patovica (Guard)
export interface RequestWithUser extends Request {
  user: { 
    userId: string; 
    email?: string; 
  };
}

export interface GoogleAuthRequest extends Request {
  user: GoogleUser;
}

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}