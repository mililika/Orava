import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { AppConfig } from '../config/app-config.js';

/**
 * Checks Supabase Auth access tokens locally, against the project's public signing keys (JWKS;
 * the project signs with an asymmetric ES256 key), so no request goes to Supabase per API call.
 * `jose` fetches the keys once and again only when a token names a key it hasn't seen.
 */
@Injectable()
export class TokenVerifier {
  private readonly keys: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(config: AppConfig) {
    this.issuer = `${config.get('SUPABASE_URL')}/auth/v1`;
    this.keys = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  /** The Supabase Auth user id (`sub`) of a valid, unexpired user token; undefined otherwise. */
  async userIdOf(token: string): Promise<string | undefined> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        // Signed-in users only; anonymous and service tokens have other audiences or roles.
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      });
      return payload.role === 'authenticated' ? payload.sub : undefined;
    } catch {
      return undefined;
    }
  }
}
