import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { GoogleAuthRequest } from '../interfaces/auth.interfaces';
import { OAuthGrantStore } from '../oauth-grant.store';
const COOKIE = 'lumi_oauth_state';
export class OAuthStateStore {
  constructor(
    private readonly grants: OAuthGrantStore,
    private readonly isProd = false,
  ) {}
  private cookie(req: Request, value: string, maxAge: number): void {
    req.res?.appendHeader(
      'Set-Cookie',
      COOKIE +
        '=' +
        value +
        '; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=' +
        maxAge +
        (this.isProd ? '; Secure' : ''),
    );
  }
  async store(
    req: Request,
    verifier: string,
    _state: unknown,
    _meta: unknown,
    callback: (err: Error | null, state?: string) => void,
  ): Promise<void> {
    try {
      const clientState = req.query?.client_state;
      if (
        typeof clientState !== 'string' ||
        !clientState.trim() ||
        clientState.length > 128 ||
        !verifier
      )
        throw new Error('Invalid OAuth request');
      const nonce = await this.grants.create(
        'state',
        { verifier, clientState: clientState.trim() },
        600000,
      );
      this.cookie(req, nonce, 600);
      callback(null, nonce);
    } catch {
      callback(new Error('OAuth state unavailable'));
    }
  }
  async verify(
    req: Request,
    state: string,
    _meta: unknown,
    callback: (
      err: Error | null,
      ok?: boolean | string,
      state?: { message: string } | string,
    ) => void,
  ): Promise<void> {
    try {
      const cookie = req.headers.cookie
        ?.split(';')
        .map((p) => p.trim())
        .find((p) => p.startsWith(COOKIE + '='))
        ?.slice(COOKIE.length + 1);
      if (
        !cookie ||
        typeof state !== 'string' ||
        state.length > 128 ||
        Buffer.byteLength(cookie) !== Buffer.byteLength(state) ||
        !timingSafeEqual(Buffer.from(cookie), Buffer.from(state))
      ) {
        callback(null, false, { message: 'OAuth browser binding mismatch' });
        return;
      }
      const entry = await this.grants.consume(state, 'state');
      if (!entry?.verifier || !entry.clientState) {
        callback(null, false, { message: 'OAuth state expired or consumed' });
        return;
      }
      this.cookie(req, '', 0);
      (req as GoogleAuthRequest).oauthClientState = entry.clientState;
      callback(null, entry.verifier, entry.clientState);
    } catch {
      callback(new Error('OAuth state unavailable'));
    }
  }
}
