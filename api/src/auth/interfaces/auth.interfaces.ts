import { Request } from 'express';

// Tipado de lo que nos devuelve Google
export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

// Tipado de lo que guardamos adentro del Token JWT
export interface JwtPayload {
  sub: string;
  email: string;
}

export interface GoogleAuthRequest extends Request {
  user: GoogleUser;
}

// Tipado unificado de la Request de Express autenticada por JwtStrategy
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

// Alias de compatibilidad hacia atrás
export type RequestWithUser = AuthenticatedRequest;
