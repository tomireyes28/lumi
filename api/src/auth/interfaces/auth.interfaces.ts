import { Request } from 'express';

// Tipado del perfil verificado devuelto por Google OAuth 2.0
export interface GoogleUser {
  googleId?: string;
  email: string;
  emailVerified?: boolean;
  name: string;
  picture?: string;
}

// Tipado del payload contenido en el Token JWT
export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface GoogleAuthRequest extends Request {
  user: GoogleUser;
  oauthClientState?: string;
}

// Tipado unificado de la Request de Express autenticada por JwtStrategy
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId: string;
    email: string;
    name: string;
    picture: string | null;
    googleId?: string | null;
    emailVerified?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    jti?: string;
    tokenExp?: number;
  };
}

// Alias de compatibilidad hacia atrás
export type RequestWithUser = AuthenticatedRequest;
