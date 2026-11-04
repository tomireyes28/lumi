import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { GoogleAuthRequest } from '../interfaces/auth.interfaces';

interface SignedOAuthStatePayload {
  nonce: string;
  verifier?: string;
  clientState?: string;
  exp: number;
}

const STATE_COOKIE_NAME = 'lumi_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_CONSUMED_NONCES = 2000;

/**
 * Almacén de estado OAuth 2.0 + PKCE vinculado al navegador mediante cookie HttpOnly firmada.
 * Evita ataques de Login CSRF e inyección de sesiones en el callback OAuth.
 */
export class OAuthStateStore {
  private readonly consumedNonces = new Map<string, number>();

  constructor(
    private readonly secret: string,
    private readonly isProd: boolean = false,
  ) {}

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }

  private parseCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const key = pair.slice(0, idx).trim();
      if (key === name) {
        return decodeURIComponent(pair.slice(idx + 1).trim());
      }
    }
    return null;
  }

  private cleanupConsumedNonces(now: number) {
    for (const [nonce, exp] of this.consumedNonces.entries()) {
      if (exp <= now) {
        this.consumedNonces.delete(nonce);
      }
    }
    while (this.consumedNonces.size >= MAX_CONSUMED_NONCES) {
      const oldestKey = this.consumedNonces.keys().next().value;
      if (!oldestKey) break;
      this.consumedNonces.delete(oldestKey);
    }
  }

  store(
    req: Request,
    verifier: string,
    _state: unknown,
    _meta: unknown,
    callback: (err: Error | null, state?: string) => void,
  ): void {
    try {
      const nonce = randomBytes(24).toString('base64url');
      const rawClientState = req?.query?.client_state;
      const clientState =
        typeof rawClientState === 'string' && rawClientState.trim().length <= 128
          ? rawClientState.trim()
          : undefined;

      const payload: SignedOAuthStatePayload = {
        nonce,
        verifier: typeof verifier === 'string' && verifier.length > 0 ? verifier : undefined,
        clientState,
        exp: Date.now() + STATE_TTL_MS,
      };

      const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
      const signature = this.sign(encodedPayload);
      const signedState = `${encodedPayload}.${signature}`;

      if (req?.res && typeof req.res.setHeader === 'function') {
        const cookieFlags = [
          `${STATE_COOKIE_NAME}=${encodeURIComponent(nonce)}`,
          'Path=/auth/google/callback',
          'HttpOnly',
          'SameSite=Lax',
          `Max-Age=${Math.floor(STATE_TTL_MS / 1000)}`,
        ];
        if (this.isProd) {
          cookieFlags.push('Secure');
        }
        req.res.setHeader('Set-Cookie', cookieFlags.join('; '));
      }

      callback(null, signedState);
    } catch (error) {
      callback(error instanceof Error ? error : new Error('Failed to generate OAuth state'));
    }
  }

  verify(
    req: Request,
    providedState: string,
    _meta: unknown,
    callback: (
      err: Error | null,
      ok?: boolean | string,
      state?: { message: string } | string,
    ) => void,
  ): void {
    try {
      if (typeof providedState !== 'string' || !providedState.includes('.')) {
        callback(null, false, { message: 'Missing or malformed OAuth state parameter.' });
        return;
      }

      const [encodedPayload, providedSignature] = providedState.split('.');
      if (!encodedPayload || !providedSignature) {
        callback(null, false, { message: 'Invalid OAuth state structure.' });
        return;
      }

      const expectedSignature = this.sign(encodedPayload);
      const providedBuf = Buffer.from(providedSignature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');

      if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
        callback(null, false, { message: 'Invalid OAuth state signature.' });
        return;
      }

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SignedOAuthStatePayload;

      const now = Date.now();
      this.cleanupConsumedNonces(now);

      if (!payload.nonce || typeof payload.exp !== 'number' || payload.exp <= now) {
        callback(null, false, { message: 'Expired OAuth state.' });
        return;
      }

      if (this.consumedNonces.has(payload.nonce)) {
        callback(null, false, { message: 'Replayed OAuth state.' });
        return;
      }

      const cookieNonce = this.parseCookie(req?.headers?.cookie, STATE_COOKIE_NAME);
      if (!cookieNonce) {
        callback(null, false, {
          message: 'Missing OAuth state binding cookie in originating browser.',
        });
        return;
      }

      const cookieBuf = Buffer.from(cookieNonce, 'utf8');
      const nonceBuf = Buffer.from(payload.nonce, 'utf8');
      if (cookieBuf.length !== nonceBuf.length || !timingSafeEqual(cookieBuf, nonceBuf)) {
        callback(null, false, {
          message: 'OAuth state does not match originating browser session.',
        });
        return;
      }

      this.consumedNonces.set(payload.nonce, payload.exp);

      if (req?.res && typeof req.res.setHeader === 'function') {
        const clearFlags = [
          `${STATE_COOKIE_NAME}=`,
          'Path=/auth/google/callback',
          'HttpOnly',
          'SameSite=Lax',
          'Max-Age=0',
        ];
        if (this.isProd) {
          clearFlags.push('Secure');
        }
        req.res.setHeader('Set-Cookie', clearFlags.join('; '));
      }

      if (req && payload.clientState) {
        (req as GoogleAuthRequest).oauthClientState = payload.clientState;
      }

      callback(null, payload.verifier || true, payload.clientState || payload.nonce);
    } catch {
      callback(null, false, { message: 'Failed to verify OAuth state.' });
    }
  }
}
