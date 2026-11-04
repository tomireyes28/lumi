import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthStateStore } from './oauth-state.store';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const isProd = configService.get<string>('NODE_ENV') === 'production';
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');
    const stateSecret =
      configService.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET ||
      'dev-oauth-state-fallback-secret';

    if (isProd && (!clientID || !clientSecret || !callbackURL)) {
      throw new Error(
        'CRITICAL: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_CALLBACK_URL son obligatorias en producción.',
      );
    }

    super({
      clientID: clientID || 'google-oauth-disabled-in-dev',
      clientSecret: clientSecret || 'google-oauth-disabled-in-dev',
      callbackURL: callbackURL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      state: true,
      pkce: true,
      store: new OAuthStateStore(stateSecret, isProd),
    } as unknown as StrategyOptions);
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, name, emails, photos } = profile;
    const primaryEmail = emails?.[0];
    const email = primaryEmail?.value?.trim().toLowerCase() || '';
    const emailVerified = primaryEmail?.verified !== false;

    if (!email || !emailVerified) {
      throw new UnauthorizedException(
        'La cuenta de Google debe tener un correo electrónico verificado.',
      );
    }

    return {
      googleId: id,
      email,
      emailVerified,
      name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || email.split('@')[0],
      picture: photos?.[0]?.value || '',
    };
  }
}
